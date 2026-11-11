using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Endpoints;
using SchoolAdmission.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// HOLD_DURATION_SECONDS (env var or config) -> HoldOptions
var bootstrapLogger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger("Startup");
var holdOptions = HoldOptions.FromConfiguration(builder.Configuration, bootstrapLogger);
builder.Services.AddSingleton(holdOptions);

builder.Services.AddDbContext<AdmissionDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

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

// TEMPORARY (Step B2): remove before the final commit.
app.MapGet("/debug/config", (HoldOptions hold, IConfiguration config) => Results.Ok(new
{
    holdDurationSeconds = hold.DurationSeconds,
    connectionStringConfigured = !string.IsNullOrWhiteSpace(config.GetConnectionString("Default"))
}));

app.Run();

// Makes Program visible to WebApplicationFactory<Program> in the test project.
public partial class Program { }
