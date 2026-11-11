using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

/// <summary>
/// Bonus: two separate backend instances sharing one database must still never oversell.
/// (Each factory is a full, independent copy of the app with its own connection pool.)
/// </summary>
[Collection(DbCollection.Name)]
public class MultiInstanceTests(PostgresFixture db)
{
    [Fact]
    public async Task Two_backends_on_one_database_never_oversell()
    {
        const int seats = 20, applicants = 150;
        var backendA = db.Default.CreateClient();
        var backendB = db.CreateFactory().CreateClient();
        var classId = await CreateClass(backendA, seats);

        // Requests alternate between the two backends.
        var responses = await RunConcurrently(applicants,
            i => Apply(i % 2 == 0 ? backendA : backendB, classId, StudentId(i + 1)));

        Assert.Equal(seats, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(applicants - seats, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

        // Both backends report the same, correct numbers.
        foreach (var client in new[] { backendA, backendB })
        {
            var info = await GetClass(client, classId);
            Assert.Equal(seats, info.HeldSeats);
            Assert.Equal(0, info.AvailableSeats);
        }
    }

    [Fact]
    public async Task The_same_student_cannot_get_two_seats_by_using_two_backends()
    {
        var backendA = db.Default.CreateClient();
        var backendB = db.CreateFactory().CreateClient();
        var classId = await CreateClass(backendA, 10);

        var responses = await RunConcurrently(20,
            i => Apply(i % 2 == 0 ? backendA : backendB, classId, StudentId(5)));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(1, (await GetClass(backendA, classId)).HeldSeats);
    }

    [Fact]
    public async Task One_backend_sees_a_confirmation_made_through_the_other()
    {
        var backendA = db.Default.CreateClient();
        var backendB = db.CreateFactory().CreateClient();
        var classId = await CreateClass(backendA, 5);
        var holdId = await ApplyOk(backendA, classId, StudentId(1));

        Assert.Equal(HttpStatusCode.OK, (await Confirm(backendB, holdId, StudentId(1))).StatusCode);

        Assert.Equal(1, (await GetClass(backendA, classId)).ConfirmedSeats);
    }
}
