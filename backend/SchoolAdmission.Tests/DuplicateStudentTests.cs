using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

/// <summary>A student can have at most one active application (or confirmed admission) per class.</summary>
[Collection(DbCollection.Name)]
public class DuplicateStudentTests(PostgresFixture db)
{
    [Fact]
    public async Task Second_application_by_the_same_student_is_rejected()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var student = StudentId(1);

        Assert.Equal(HttpStatusCode.Created, (await Apply(client, classId, student)).StatusCode);

        var second = await Apply(client, classId, student);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("ALREADY_APPLIED", await ErrorCode(second));
        Assert.Equal(1, (await GetClass(client, classId)).HeldSeats);   // no second seat was taken
    }

    [Fact]
    public async Task Same_student_applying_20_times_at_once_gets_exactly_one_seat()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 10);

        var responses = await RunConcurrently(20, _ => Apply(client, classId, StudentId(7)));

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(19, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        Assert.Equal(1, (await GetClass(client, classId)).HeldSeats);
    }

    [Fact]
    public async Task Same_student_can_apply_to_different_classes()
    {
        var client = db.Default.CreateClient();
        var morning = await CreateClass(client, 5, "Class 6 - Morning Shift");
        var day = await CreateClass(client, 5, "Class 6 - Day Shift");

        Assert.Equal(HttpStatusCode.Created, (await Apply(client, morning, StudentId(3))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await Apply(client, day, StudentId(3))).StatusCode);
    }

    [Fact]
    public async Task A_confirmed_student_cannot_apply_to_the_same_class_again()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(4));
        Assert.Equal(HttpStatusCode.OK, (await Confirm(client, holdId, StudentId(4))).StatusCode);

        var again = await Apply(client, classId, StudentId(4));
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal("ALREADY_APPLIED", await ErrorCode(again));
    }
}
