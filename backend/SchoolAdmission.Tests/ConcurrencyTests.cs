using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

/// <summary>The brief's core rule: held + confirmed must never exceed totalSeats, however many requests arrive at once.</summary>
[Collection(DbCollection.Name)]
public class ConcurrencyTests(PostgresFixture db)
{
    [Fact]
    public async Task Only_as_many_students_get_a_seat_as_there_are_seats()
    {
        const int seats = 20, applicants = 200;
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, seats);

        // 200 different students apply at the same instant.
        var responses = await RunConcurrently(applicants,
            i => Apply(client, classId, StudentId(i + 1)));

        var created = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflicts = responses.Count(r => r.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(seats, created);
        Assert.Equal(applicants - seats, conflicts);           // nothing else: no 500s, no timeouts

        var info = await GetClass(client, classId);
        Assert.Equal(seats, info.HeldSeats);
        Assert.Equal(0, info.ConfirmedSeats);
        Assert.Equal(0, info.AvailableSeats);
        Assert.True(info.HeldSeats + info.ConfirmedSeats <= info.TotalSeats);
    }

    [Fact]
    public async Task Capacity_is_never_exceeded_while_applying_confirming_and_cancelling_at_once()
    {
        const int seats = 30, students = 100;
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, seats);

        // A watcher keeps reading the seat counts the whole time and records the worst moment it saw.
        using var stop = new CancellationTokenSource();
        var maxInUse = 0;
        var watcher = Task.Run(async () =>
        {
            while (!stop.IsCancellationRequested)
            {
                var c = await GetClass(client, classId);
                Interlocked.Exchange(ref maxInUse, Math.Max(maxInUse, c.HeldSeats + c.ConfirmedSeats));
                await Task.Delay(3);
            }
        });

        var confirmedOk = 0;
        await RunConcurrently<int>(students, async i =>
        {
            var student = StudentId(i + 1);
            var apply = await Apply(client, classId, student);
            if (apply.StatusCode != HttpStatusCode.Created) return 0;

            var holdId = (await Json(apply)).GetProperty("holdId").GetString()!;
            switch (i % 3)
            {
                case 0:   // pays
                    var confirm = await Confirm(client, holdId, student);
                    if (confirm.StatusCode == HttpStatusCode.OK) Interlocked.Increment(ref confirmedOk);
                    break;
                case 1:   // gives the seat back
                    Assert.Equal(HttpStatusCode.NoContent, (await Cancel(client, holdId, student)).StatusCode);
                    break;
                // case 2: just holds it
            }
            return 0;
        });

        stop.Cancel();
        await watcher;

        Assert.True(maxInUse <= seats, $"Seen {maxInUse} seats in use with only {seats} seats");

        var final = await GetClass(client, classId);
        Assert.True(final.HeldSeats + final.ConfirmedSeats <= seats);
        Assert.Equal(confirmedOk, final.ConfirmedSeats);       // every successful confirm counted exactly once
        Assert.Equal(seats - final.HeldSeats - final.ConfirmedSeats, final.AvailableSeats);
    }
}
