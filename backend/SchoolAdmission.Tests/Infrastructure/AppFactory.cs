using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace SchoolAdmission.Tests.Infrastructure;

/// <summary>
/// A full in-memory instance of the API pointed at a given Postgres database.
/// Creating several factories against the same database simulates several backend processes.
/// </summary>
public class AppFactory(string connectionString, int? holdDurationSeconds = null) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        // UseSetting is visible to Program.cs at startup (it reads these values while building).
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Logging:LogLevel:Default", "Warning");   // keep test output readable
        builder.UseSetting("Logging:LogLevel:Microsoft.EntityFrameworkCore", "Warning");
        if (holdDurationSeconds is { } seconds)
            builder.UseSetting("HOLD_DURATION_SECONDS", seconds.ToString());
    }
}
