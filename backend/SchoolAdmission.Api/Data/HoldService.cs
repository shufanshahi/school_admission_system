using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Data;

// ---- API response shapes (brief §1.4) -------------------------------------------------------
public record HoldCreatedResponse(string HoldId, string ClassId, string StudentId, string Status, DateTime ExpiresAt);
public record HoldResponse(string HoldId, string ClassId, string ClassName, string StudentId, string Status, DateTime ExpiresAt);
public record MyHoldResponse(string HoldId, string ClassId, string ClassName, string Status, DateTime ExpiresAt);
public record HoldStatusResponse(string HoldId, string Status);

/// <summary>
/// All seat-hold logic. Every write runs in a transaction that first locks the class row
/// (SELECT ... FOR UPDATE). Because the lock lives in Postgres, it serialises requests for the
/// same class across threads AND across separate backend processes.
///
/// Lock order is always: class row, then hold row. Using one order everywhere prevents deadlocks.
/// Inside locked transactions we use clock_timestamp() (real time), not now() (transaction start).
/// </summary>
public class HoldService(AdmissionDbContext db, HoldOptions options)
{
    // ===== D1: apply for a seat =================================================================
    public async Task<HoldCreatedResponse> ApplyAsync(string classId, string studentId, CancellationToken ct)
    {
        var conn = await OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);   // disposed without commit => rollback

        try
        {
            // 1) Lock the class row. Everyone applying to this class now queues here.
            int totalSeats;
            await using (var cmd = Cmd(conn, tx, "SELECT total_seats FROM classes WHERE id = @id FOR UPDATE", ("id", classId)))
            {
                var result = await cmd.ExecuteScalarAsync(ct);
                if (result is null)
                    throw ApiException.NotFound("CLASS_NOT_FOUND", "We couldn't find that class.");
                totalSeats = (int)result;
            }

            // 2) This student's own timed-out-but-not-yet-swept hold must not block a fresh application
            //    (it would still occupy the partial unique index slot).
            await using (var cmd = Cmd(conn, tx, """
                UPDATE holds SET status = 'EXPIRED'
                WHERE class_id = @c AND student_id = @s AND status = 'HELD' AND expires_at <= clock_timestamp()
                """, ("c", classId), ("s", studentId)))
                await cmd.ExecuteNonQueryAsync(ct);

            // 3) One active application (HELD or CONFIRMED) per student per class.
            await using (var cmd = Cmd(conn, tx, """
                SELECT 1 FROM holds
                WHERE class_id = @c AND student_id = @s AND status IN ('HELD','CONFIRMED')
                """, ("c", classId), ("s", studentId)))
            {
                if (await cmd.ExecuteScalarAsync(ct) is not null)
                    throw ApiException.Conflict("ALREADY_APPLIED", "You already have an application in this class.");
            }

            // 4) Count seats in use. Safe: nobody else can insert for this class while we hold the lock.
            long confirmed, held;
            await using (var cmd = Cmd(conn, tx, """
                SELECT COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
                       COUNT(*) FILTER (WHERE status = 'HELD' AND expires_at > clock_timestamp())
                FROM holds WHERE class_id = @c
                """, ("c", classId)))
            await using (var r = await cmd.ExecuteReaderAsync(ct))
            {
                await r.ReadAsync(ct);
                confirmed = r.GetInt64(0);
                held = r.GetInt64(1);
            }

            if (confirmed + held >= totalSeats)
                throw ApiException.Conflict("NO_SEATS_AVAILABLE", "Sorry, no seats are left in this class.");

            // 5) Take the seat.
            var holdId = "h_" + Guid.NewGuid().ToString("N");
            DateTime expiresAt;
            await using (var cmd = Cmd(conn, tx, """
                INSERT INTO holds (id, class_id, student_id, status, created_at, expires_at)
                VALUES (@id, @c, @s, 'HELD', clock_timestamp(), clock_timestamp() + make_interval(secs => @secs))
                RETURNING expires_at
                """, ("id", holdId), ("c", classId), ("s", studentId), ("secs", (double)options.DurationSeconds)))
            {
                expiresAt = AsUtc((DateTime)(await cmd.ExecuteScalarAsync(ct))!);
            }

            await tx.CommitAsync(ct);
            return new HoldCreatedResponse(holdId, classId, studentId, HoldStatus.Held, expiresAt);
        }
        // Last-line backstop: the partial unique index fired (should be unreachable thanks to the lock).
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw ApiException.Conflict("ALREADY_APPLIED", "You already have an application in this class.");
        }
    }

    // ===== D2: read one hold ====================================================================
    // "Effective status": a HELD row past its expiry is reported as EXPIRED even if the sweeper
    // has not flipped it yet, so clients never see a stale HELD.
    private const string EffectiveStatusSql =
        "CASE WHEN h.status = 'HELD' AND h.expires_at <= now() THEN 'EXPIRED' ELSE h.status END";

    public async Task<HoldResponse> GetAsync(string holdId, CancellationToken ct)
    {
        var conn = await OpenAsync(ct);
        await using var cmd = Cmd(conn, null, $"""
            SELECT h.id, h.class_id, c.name, h.student_id, {EffectiveStatusSql}, h.expires_at
            FROM holds h JOIN classes c ON c.id = h.class_id
            WHERE h.id = @id
            """, ("id", holdId));
        await using var r = await cmd.ExecuteReaderAsync(ct);

        if (!await r.ReadAsync(ct))
            throw ApiException.NotFound("HOLD_NOT_FOUND", "We couldn't find that application.");

        return new HoldResponse(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3), r.GetString(4),
            AsUtc(r.GetDateTime(5)));
    }

    // ===== D3: all holds of one student =========================================================
    public async Task<List<MyHoldResponse>> ListMineAsync(string studentId, CancellationToken ct)
    {
        var conn = await OpenAsync(ct);
        await using var cmd = Cmd(conn, null, $"""
            SELECT h.id, h.class_id, c.name, {EffectiveStatusSql}, h.expires_at
            FROM holds h JOIN classes c ON c.id = h.class_id
            WHERE h.student_id = @s
            ORDER BY h.created_at DESC, h.id
            """, ("s", studentId));
        await using var r = await cmd.ExecuteReaderAsync(ct);

        var list = new List<MyHoldResponse>();
        while (await r.ReadAsync(ct))
            list.Add(new MyHoldResponse(r.GetString(0), r.GetString(1), r.GetString(2), r.GetString(3),
                AsUtc(r.GetDateTime(4))));
        return list;
    }

    // ===== D4: confirm (pay the fee) ============================================================
    public async Task<HoldStatusResponse> ConfirmAsync(string holdId, string studentId, CancellationToken ct)
    {
        var conn = await OpenAsync(ct);
        var classId = await FindClassIdAsync(conn, holdId, ct);

        await using var tx = await conn.BeginTransactionAsync(ct);
        var hold = await LockHoldAsync(conn, tx, classId, holdId, ct);

        if (hold.StudentId != studentId)
            throw ApiException.Forbidden("NOT_YOUR_HOLD", "This application belongs to another student.");

        switch (hold.Status)
        {
            case HoldStatus.Confirmed:       // idempotent: already done, change nothing
                return new HoldStatusResponse(holdId, HoldStatus.Confirmed);

            case HoldStatus.Cancelled:
                throw ApiException.Conflict("HOLD_CANCELLED", "This application was cancelled.");
        }

        if (hold.Status == HoldStatus.Expired || hold.IsExpired)
        {
            await MarkExpiredAsync(conn, tx, holdId, ct);
            await tx.CommitAsync(ct);        // commit BEFORE failing, or the rollback would undo the EXPIRED mark
            throw ApiException.Conflict("HOLD_EXPIRED", "Your hold has expired. Please apply again.");
        }

        await using (var cmd = Cmd(conn, tx,
            "UPDATE holds SET status = 'CONFIRMED', confirmed_at = clock_timestamp() WHERE id = @id", ("id", holdId)))
            await cmd.ExecuteNonQueryAsync(ct);

        await tx.CommitAsync(ct);
        return new HoldStatusResponse(holdId, HoldStatus.Confirmed);
    }

    // ===== D5: cancel ===========================================================================
    public async Task CancelAsync(string holdId, string studentId, CancellationToken ct)
    {
        var conn = await OpenAsync(ct);
        var classId = await FindClassIdAsync(conn, holdId, ct);

        await using var tx = await conn.BeginTransactionAsync(ct);
        var hold = await LockHoldAsync(conn, tx, classId, holdId, ct);

        if (hold.StudentId != studentId)
            throw ApiException.Forbidden("NOT_YOUR_HOLD", "This application belongs to another student.");

        switch (hold.Status)
        {
            case HoldStatus.Cancelled:       // idempotent
                return;

            case HoldStatus.Confirmed:
                throw ApiException.Conflict("ALREADY_CONFIRMED",
                    "This admission is already confirmed and can't be cancelled here.");
        }

        if (hold.Status == HoldStatus.Expired || hold.IsExpired)
        {
            await MarkExpiredAsync(conn, tx, holdId, ct);
            await tx.CommitAsync(ct);
            throw ApiException.Conflict("HOLD_EXPIRED", "This application has already expired.");
        }

        await using (var cmd = Cmd(conn, tx,
            "UPDATE holds SET status = 'CANCELLED', cancelled_at = clock_timestamp() WHERE id = @id", ("id", holdId)))
            await cmd.ExecuteNonQueryAsync(ct);

        await tx.CommitAsync(ct);
    }

    // ===== D6: sweeper (called by the background service) =======================================
    public async Task<int> ExpireDueHoldsAsync(CancellationToken ct)
    {
        var conn = await OpenAsync(ct);
        await using var cmd = Cmd(conn, null,
            "UPDATE holds SET status = 'EXPIRED' WHERE status = 'HELD' AND expires_at <= clock_timestamp()");
        return await cmd.ExecuteNonQueryAsync(ct);
    }

    // ===== helpers ==============================================================================
    private sealed record LockedHold(string Status, string StudentId, bool IsExpired);

    /// <summary>Finds the hold's class (no lock yet) so we can lock the class row FIRST.</summary>
    private static async Task<string> FindClassIdAsync(NpgsqlConnection conn, string holdId, CancellationToken ct)
    {
        await using var cmd = Cmd(conn, null, "SELECT class_id FROM holds WHERE id = @id", ("id", holdId));
        return await cmd.ExecuteScalarAsync(ct) as string
               ?? throw ApiException.NotFound("HOLD_NOT_FOUND", "We couldn't find that application.");
    }

    /// <summary>Locks class row, then hold row (the fixed lock order) and returns the hold's current state.</summary>
    private static async Task<LockedHold> LockHoldAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, string classId, string holdId, CancellationToken ct)
    {
        await using (var cmd = Cmd(conn, tx, "SELECT 1 FROM classes WHERE id = @id FOR UPDATE", ("id", classId)))
            await cmd.ExecuteScalarAsync(ct);

        await using var cmd2 = Cmd(conn, tx, """
            SELECT status, student_id, expires_at <= clock_timestamp()
            FROM holds WHERE id = @id FOR UPDATE
            """, ("id", holdId));
        await using var r = await cmd2.ExecuteReaderAsync(ct);
        if (!await r.ReadAsync(ct))
            throw ApiException.NotFound("HOLD_NOT_FOUND", "We couldn't find that application.");
        return new LockedHold(r.GetString(0), r.GetString(1), r.GetBoolean(2));
    }

    private static async Task MarkExpiredAsync(NpgsqlConnection conn, NpgsqlTransaction tx, string holdId, CancellationToken ct)
    {
        await using var cmd = Cmd(conn, tx,
            "UPDATE holds SET status = 'EXPIRED' WHERE id = @id AND status = 'HELD'", ("id", holdId));
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken ct)
    {
        await db.Database.OpenConnectionAsync(ct);          // the DbContext closes it when the request ends
        return (NpgsqlConnection)db.Database.GetDbConnection();
    }

    private static NpgsqlCommand Cmd(NpgsqlConnection conn, NpgsqlTransaction? tx, string sql,
        params (string Name, object Value)[] parameters)
    {
        var cmd = new NpgsqlCommand(sql, conn, tx);
        foreach (var (name, value) in parameters)
            cmd.Parameters.AddWithValue(name, value);
        return cmd;
    }

    // Always UTC (serialises with a trailing "Z"), trimmed to milliseconds for easy parsing in any client.
    private static DateTime AsUtc(DateTime d)
    {
        var ticks = d.Ticks - d.Ticks % TimeSpan.TicksPerMillisecond;
        return new DateTime(ticks, DateTimeKind.Utc);
    }
}
