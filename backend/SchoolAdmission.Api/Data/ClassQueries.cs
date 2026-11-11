using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Data;

/// <summary>Public shape of a class with live seat counts (API contract, brief §1.4 #2 and #3).</summary>
public record ClassResponse(
    string Id,
    string Name,
    int TotalSeats,
    int HeldSeats,
    int ConfirmedSeats,
    int AvailableSeats);

public static class ClassQueries
{
    // Raw result row. Property names must match the column aliases below.
    private sealed class SeatRow
    {
        public string Id { get; set; } = default!;
        public string Name { get; set; } = default!;
        public int TotalSeats { get; set; }
        public long Held { get; set; }
        public long Confirmed { get; set; }
    }

    // Counts are computed from the holds rows every time, never stored in a counter.
    // A HELD row only counts while expires_at is in the future, so a seat returns the
    // instant its hold expires, even if the background sweeper has not run yet.
    public static async Task<List<ClassResponse>> ListAsync(AdmissionDbContext db, CancellationToken ct)
    {
        var rows = await db.Database.SqlQuery<SeatRow>($"""
            SELECT c.id AS "Id", c.name AS "Name", c.total_seats AS "TotalSeats",
                   COUNT(h.id) FILTER (WHERE h.status = 'HELD' AND h.expires_at > now()) AS "Held",
                   COUNT(h.id) FILTER (WHERE h.status = 'CONFIRMED')                      AS "Confirmed"
            FROM classes c
            LEFT JOIN holds h ON h.class_id = c.id
            GROUP BY c.id
            ORDER BY c.created_at, c.id
            """).ToListAsync(ct);

        return rows.Select(ToResponse).ToList();
    }

    public static async Task<ClassResponse?> GetAsync(AdmissionDbContext db, string id, CancellationToken ct)
    {
        var rows = await db.Database.SqlQuery<SeatRow>($"""
            SELECT c.id AS "Id", c.name AS "Name", c.total_seats AS "TotalSeats",
                   COUNT(h.id) FILTER (WHERE h.status = 'HELD' AND h.expires_at > now()) AS "Held",
                   COUNT(h.id) FILTER (WHERE h.status = 'CONFIRMED')                      AS "Confirmed"
            FROM classes c
            LEFT JOIN holds h ON h.class_id = c.id
            WHERE c.id = {id}
            GROUP BY c.id
            """).ToListAsync(ct);

        return rows.Count == 0 ? null : ToResponse(rows[0]);
    }

    private static ClassResponse ToResponse(SeatRow r)
    {
        var held = (int)r.Held;
        var confirmed = (int)r.Confirmed;
        var available = Math.Max(0, r.TotalSeats - held - confirmed);
        return new ClassResponse(r.Id, r.Name, r.TotalSeats, held, confirmed, available);
    }
}
