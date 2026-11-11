using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace SchoolAdmission.Tests.Infrastructure;

public record ClassInfo(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);

/// <summary>Small helpers so tests read like the API contract.</summary>
public static class Api
{
    /// <summary>A valid 17-digit student id, distinct for each n.</summary>
    public static string StudentId(int n) => n.ToString("D17");

    private static long _nextUniqueStudent = 5_000_000_000;

    /// <summary>
    /// A student id no other test uses. Needed when a test looks at ALL of one student's applications
    /// (e.g. /me/holds), because the database is shared by every test in the run.
    /// </summary>
    public static string UniqueStudentId() => Interlocked.Increment(ref _nextUniqueStudent).ToString("D17");

    public static async Task<string> CreateClass(HttpClient client, int seats, string? name = null)
    {
        var response = await client.PostAsJsonAsync("/classes",
            new { name = name ?? $"Test class {Guid.NewGuid():N}", totalSeats = seats });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await Json(response)).GetProperty("id").GetString()!;
    }

    public static Task<HttpResponseMessage> Apply(HttpClient c, string classId, string? studentId)
        => Send(c, HttpMethod.Post, $"/classes/{classId}/holds", studentId);

    public static Task<HttpResponseMessage> Confirm(HttpClient c, string holdId, string? studentId)
        => Send(c, HttpMethod.Post, $"/holds/{holdId}/confirm", studentId);

    public static Task<HttpResponseMessage> Cancel(HttpClient c, string holdId, string? studentId)
        => Send(c, HttpMethod.Delete, $"/holds/{holdId}", studentId);

    public static Task<HttpResponseMessage> GetHold(HttpClient c, string holdId)
        => Send(c, HttpMethod.Get, $"/holds/{holdId}", null);

    public static Task<HttpResponseMessage> MyHolds(HttpClient c, string? studentId)
        => Send(c, HttpMethod.Get, "/me/holds", studentId);

    /// <summary>Applies and returns the new hold id (asserts success).</summary>
    public static async Task<string> ApplyOk(HttpClient c, string classId, string studentId)
    {
        var r = await Apply(c, classId, studentId);
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        return (await Json(r)).GetProperty("holdId").GetString()!;
    }

    public static async Task<ClassInfo> GetClass(HttpClient c, string classId)
    {
        var r = await c.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await Json(r);
        return new ClassInfo(
            j.GetProperty("id").GetString()!, j.GetProperty("name").GetString()!,
            j.GetProperty("totalSeats").GetInt32(), j.GetProperty("heldSeats").GetInt32(),
            j.GetProperty("confirmedSeats").GetInt32(), j.GetProperty("availableSeats").GetInt32());
    }

    public static async Task<JsonElement> Json(HttpResponseMessage r)
    {
        var text = await r.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(text);
        return doc.RootElement.Clone();
    }

    public static async Task<string> ErrorCode(HttpResponseMessage r)
        => (await Json(r)).GetProperty("error").GetString()!;

    /// <summary>Posts raw text as JSON (for malformed-body tests).</summary>
    public static Task<HttpResponseMessage> PostRaw(HttpClient c, string path, string body)
        => c.PostAsync(path, new StringContent(body, Encoding.UTF8, "application/json"));

    private static Task<HttpResponseMessage> Send(HttpClient c, HttpMethod method, string path, string? studentId)
    {
        var request = new HttpRequestMessage(method, path);
        if (studentId is not null) request.Headers.Add("X-Student-Id", studentId);
        return c.SendAsync(request);
    }

    /// <summary>
    /// Starts all actions at (almost) the same instant and waits for them all.
    /// A gate makes every task wait until all are created, so they genuinely overlap.
    /// </summary>
    public static async Task<T[]> RunConcurrently<T>(int count, Func<int, Task<T>> action)
    {
        var gate = new TaskCompletionSource();
        var tasks = Enumerable.Range(0, count)
            .Select(i => Task.Run(async () => { await gate.Task; return await action(i); }))
            .ToArray();
        gate.SetResult();
        return await Task.WhenAll(tasks);
    }
}
