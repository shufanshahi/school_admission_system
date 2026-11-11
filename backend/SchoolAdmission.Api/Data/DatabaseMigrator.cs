using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace SchoolAdmission.Api.Data;

public static class DatabaseMigrator
{
    // Any fixed number works; every backend process uses the same one.
    private const long MigrationLockKey = 7_270_736_901;

    /// <summary>
    /// Applies pending EF migrations, retrying while the database is not reachable yet
    /// (e.g. the Postgres container is still starting). Throws after the last attempt.
    ///
    /// Several backend processes may start at the same moment against the same database.
    /// A Postgres advisory lock makes them migrate one at a time: the first applies the
    /// migrations, the others wait and then find nothing left to do.
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
                await MigrateUnderLockAsync(db, ct);
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

    private static async Task MigrateUnderLockAsync(AdmissionDbContext db, CancellationToken ct)
    {
        try
        {
            await db.Database.OpenConnectionAsync(ct);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.InvalidCatalogName)
        {
            // The database itself does not exist yet: nothing to lock on. EF creates it here.
            await db.Database.MigrateAsync(ct);
            return;
        }

        try
        {
            // Session-level lock on the context's own (now open) connection, which MigrateAsync reuses.
            await db.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_lock({MigrationLockKey})", ct);
            try
            {
                await db.Database.MigrateAsync(ct);
            }
            finally
            {
                await db.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_unlock({MigrationLockKey})", CancellationToken.None);
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
