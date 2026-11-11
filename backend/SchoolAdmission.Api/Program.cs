using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Endpoints;
using SchoolAdmission.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// HOLD_DURATION_SECONDS (env var or config) -> HoldOptions
var bootstrapLogger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger("Startup");
var holdOptions = HoldOptions.FromConfiguration(builder.Configuration, bootstrapLogger);
builder.Services.AddSingleton(holdOptions);

// Postgres allows ~100 connections by default and a request waiting on a class lock holds one,
// so cap each process's pool well below that. Excess requests then queue inside the app
// (cheap) instead of failing with "too many clients". An explicit "Maximum Pool Size" wins.
var rawConnectionString = builder.Configuration.GetConnectionString("Default");
var connectionString = new NpgsqlConnectionStringBuilder(rawConnectionString);
// Look at the raw text: the builder reports every known keyword as "contained", set or not.
var poolSizeIsExplicit = System.Text.RegularExpressions.Regex.IsMatch(
    rawConnectionString ?? "", @"(max(imum)?[ _]?pool[ _]?size)\s*=", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
if (!poolSizeIsExplicit)
    connectionString.MaxPoolSize = 40;
bootstrapLogger.LogInformation("Database connection pool: max {Size} connections per process.", connectionString.MaxPoolSize);

builder.Services.AddDbContext<AdmissionDbContext>(o => o.UseNpgsql(connectionString.ConnectionString));

builder.Services.AddScoped<HoldService>();
builder.Services.AddHostedService<ExpirySweeper>();

// Always throw on bad request bodies (not only in Development) so our middleware
// can answer with the standard JSON error instead of an empty 400.
builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = true);

// The brief has no login and the UI runs on another origin, so the API is open to any origin.
// Expose "Date" so the browser can read the server time (clock-skew correction in the UI).
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .WithHeaders("Content-Type", StudentIdHeader.HeaderName)
    .WithExposedHeaders("Date")));

var app = builder.Build();

app.UseCors();                                   // first, so error responses also carry CORS headers
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Create/upgrade the schema before serving traffic (retries until Postgres is reachable).
await DatabaseMigrator.MigrateWithRetryAsync(
    app.Services,
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Migrations"));

app.MapGet("/", () => "Hello World!");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapClassEndpoints();
app.MapHoldEndpoints();

app.Run();

// Makes Program visible to WebApplicationFactory<Program> in the test project.
public partial class Program { }
