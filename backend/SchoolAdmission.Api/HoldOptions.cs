namespace SchoolAdmission.Api;

/// <summary>How long a seat is held before it expires.</summary>
public sealed class HoldOptions
{
    public const int DefaultDurationSeconds = 600;

    public int DurationSeconds { get; init; } = DefaultDurationSeconds;

    /// <summary>
    /// Reads HOLD_DURATION_SECONDS from configuration (environment variables are a
    /// configuration source, so this works in Docker and can be overridden in tests).
    /// Missing, non-numeric or non-positive values fall back to the default.
    /// </summary>
    public static HoldOptions FromConfiguration(IConfiguration config, ILogger logger)
    {
        var raw = config["HOLD_DURATION_SECONDS"];
        if (string.IsNullOrWhiteSpace(raw))
            return new HoldOptions();

        if (int.TryParse(raw, out var seconds) && seconds > 0)
            return new HoldOptions { DurationSeconds = seconds };

        logger.LogWarning(
            "Invalid HOLD_DURATION_SECONDS '{Value}'; using default {Default}s.",
            raw, DefaultDurationSeconds);
        return new HoldOptions();
    }
}
