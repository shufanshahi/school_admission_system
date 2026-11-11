using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

[Collection(DbCollection.Name)]
public class CancelTests(PostgresFixture db)
{
    [Fact]
    public async Task Cancelling_frees_the_seat_and_a_second_cancel_is_harmless()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 1);
        var holdId = await ApplyOk(client, classId, StudentId(1));
        Assert.Equal(0, (await GetClass(client, classId)).AvailableSeats);

        Assert.Equal(HttpStatusCode.NoContent, (await Cancel(client, holdId, StudentId(1))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Cancel(client, holdId, StudentId(1))).StatusCode);

        Assert.Equal(1, (await GetClass(client, classId)).AvailableSeats);
        Assert.Equal("CANCELLED", (await Json(await GetHold(client, holdId))).GetProperty("status").GetString());
    }

    [Fact]
    public async Task A_student_can_apply_again_after_cancelling()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 3);
        var holdId = await ApplyOk(client, classId, StudentId(1));
        await Cancel(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.Created, (await Apply(client, classId, StudentId(1))).StatusCode);
    }

    [Fact]
    public async Task A_confirmed_admission_cannot_be_cancelled()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 3);
        var holdId = await ApplyOk(client, classId, StudentId(1));
        await Confirm(client, holdId, StudentId(1));

        var response = await Cancel(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("ALREADY_CONFIRMED", await ErrorCode(response));
        Assert.Equal(1, (await GetClass(client, classId)).ConfirmedSeats);
    }

    [Fact]
    public async Task Another_student_cannot_cancel_someone_elses_hold()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 3);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var response = await Cancel(client, holdId, StudentId(2));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(1, (await GetClass(client, classId)).HeldSeats);   // still held
    }

    [Fact]
    public async Task Cancelling_an_unknown_hold_is_404()
    {
        var client = db.Default.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await Cancel(client, "h_doesnotexist", StudentId(1))).StatusCode);
    }
}
