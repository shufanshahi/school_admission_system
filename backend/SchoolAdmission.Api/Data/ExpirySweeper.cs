namespace SchoolAdmission.Api.Data;

/// <summary>
/// Every couple of seconds, flips timed-out HELD rows to EXPIRED so the stored status matches reality.
/// Seat counts and reads do NOT depend on this (they compare expires_at to the clock), so a late or
/// failed sweep never causes a wrong seat count. The UPDATE is idempotent, so several backend
/// processes can run this at once without harm.
/// </summary>
public class ExpirySweeper(IServiceScopeFactory scopes, ILogger<ExpirySweeper> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        try
        {
            do
            {
                try
                {
                    await using var scope = scopes.CreateAsyncScope();
                    var holds = scope.ServiceProvider.GetRequiredService<HoldService>();
                    var expired = await holds.ExpireDueHoldsAsync(stoppingToken);
                    if (expired > 0)
                        logger.LogInformation("Expired {Count} hold(s).", expired);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    // Never let the loop die (e.g. DB briefly unreachable); try again next tick.
                    logger.LogWarning(ex, "Expiry sweep failed; will retry.");
                }
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException)
        {
            // normal shutdown
        }
    }
}
