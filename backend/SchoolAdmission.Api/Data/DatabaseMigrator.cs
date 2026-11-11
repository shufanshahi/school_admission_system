using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Data;

public static class DatabaseMigrator
{
    /// <summary>
    /// Applies pending EF migrations, retrying while the database is not reachable yet
    /// (e.g. the Postgres container is still starting). Throws after the last attempt.
    /// </summary>
    public static async Task MigrateWithRetryAsync(
        IServiceProvider services,
        ILogger logger,
        int maxAttempts = 20,
        TimeSpan? delay = null,
        CancellationToken ct = default)
    {
        var wait = delay ?? TimeSpan.FromSeconds(2);

        for (var attempt = 1; ; attempt++)
        {
            try
            {
                await using var scope = services.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AdmissionDbContext>();
                await db.Database.MigrateAsync(ct);
                logger.LogInformation("Database is up to date (attempt {Attempt}).", attempt);
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts && !ct.IsCancellationRequested)
            {
                logger.LogWarning(
                    "Database migration failed (attempt {Attempt}/{Max}): {Message}. Retrying in {Seconds}s...",
                    attempt, maxAttempts, ex.Message, wait.TotalSeconds);
                await Task.Delay(wait, ct);
            }
        }
    }
}
