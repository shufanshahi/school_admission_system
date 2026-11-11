using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

[Collection(DbCollection.Name)]
public class ConfirmTests(PostgresFixture db)
{
    [Fact]
    public async Task Confirming_moves_a_held_seat_to_confirmed()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 3);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var response = await Confirm(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("CONFIRMED", (await Json(response)).GetProperty("status").GetString());
        var info = await GetClass(client, classId);
        Assert.Equal(0, info.HeldSeats);
        Assert.Equal(1, info.ConfirmedSeats);
        Assert.Equal(2, info.AvailableSeats);
    }

    [Fact]
    public async Task Confirming_the_same_hold_many_times_at_once_counts_one_seat()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var responses = await RunConcurrently(10, _ => Confirm(client, holdId, StudentId(1)));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        Assert.Equal(1, (await GetClass(client, classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task Confirming_twice_one_after_another_counts_one_seat()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        await Confirm(client, holdId, StudentId(1));
        var second = await Confirm(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(1, (await GetClass(client, classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task Another_student_cannot_confirm_someone_elses_hold()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var response = await Confirm(client, holdId, StudentId(2));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("NOT_YOUR_HOLD", await ErrorCode(response));
        Assert.Equal(0, (await GetClass(client, classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task A_cancelled_hold_cannot_be_confirmed()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));
        await Cancel(client, holdId, StudentId(1));

        var response = await Confirm(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("HOLD_CANCELLED", await ErrorCode(response));
    }

    [Fact]
    public async Task Confirming_an_unknown_hold_is_404()
    {
        var client = db.Default.CreateClient();
        var response = await Confirm(client, "h_doesnotexist", StudentId(1));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("HOLD_NOT_FOUND", await ErrorCode(response));
    }
}
