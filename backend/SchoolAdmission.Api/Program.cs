using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api;
using SchoolAdmission.Api.Data;

var builder = WebApplication.CreateBuilder(args);

// HOLD_DURATION_SECONDS (env var or config) -> HoldOptions
var bootstrapLogger = LoggerFactory.Create(b => b.AddConsole()).CreateLogger("Startup");
var holdOptions = HoldOptions.FromConfiguration(builder.Configuration, bootstrapLogger);
builder.Services.AddSingleton(holdOptions);

builder.Services.AddDbContext<AdmissionDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// Create/upgrade the schema before serving traffic (retries until Postgres is reachable).
await DatabaseMigrator.MigrateWithRetryAsync(
    app.Services,
    app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Migrations"));

app.MapGet("/", () => "Hello World!");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// TEMPORARY (Step B2): remove before the final commit.
app.MapGet("/debug/config", (HoldOptions hold, IConfiguration config) => Results.Ok(new
{
    holdDurationSeconds = hold.DurationSeconds,
    connectionStringConfigured = !string.IsNullOrWhiteSpace(config.GetConnectionString("Default"))
}));

app.Run();

// Makes Program visible to WebApplicationFactory<Program> in the test project.
public partial class Program { }
