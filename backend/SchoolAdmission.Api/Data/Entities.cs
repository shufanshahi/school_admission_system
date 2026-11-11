namespace SchoolAdmission.Api.Data;

public static class HoldStatus
{
    public const string Held = "HELD";
    public const string Confirmed = "CONFIRMED";
    public const string Expired = "EXPIRED";
    public const string Cancelled = "CANCELLED";
}

public class ClassEntity
{
    public string Id { get; set; } = default!;
    public string Name { get; set; } = default!;
    public int TotalSeats { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class HoldEntity
{
    public string Id { get; set; } = default!;
    public string ClassId { get; set; } = default!;
    public string StudentId { get; set; } = default!;
    public string Status { get; set; } = HoldStatus.Held;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}
