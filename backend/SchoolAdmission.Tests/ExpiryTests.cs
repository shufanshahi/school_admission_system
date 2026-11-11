using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

[Collection(DbCollection.Name)]
public class ExpiryTests(PostgresFixture db)
{
    [Fact]
    public async Task An_unpaid_hold_expires_by_itself_and_the_seat_is_released()
    {
        // This app instance holds seats for only 2 seconds.
        var client = db.CreateFactory(holdDurationSeconds: 2).CreateClient();
        var classId = await CreateClass(client, 1);
        var holdA = await ApplyOk(client, classId, StudentId(1));

        // While A holds the only seat, B is turned away.
        var early = await Apply(client, classId, StudentId(2));
        Assert.Equal(HttpStatusCode.Conflict, early.StatusCode);
        Assert.Equal("NO_SEATS_AVAILABLE", await ErrorCode(early));
        Assert.Equal("HELD", (await Json(await GetHold(client, holdA))).GetProperty("status").GetString());

        // Nobody calls any API while the hold runs out.
        await Task.Delay(TimeSpan.FromSeconds(3.5));

        Assert.Equal("EXPIRED", (await Json(await GetHold(client, holdA))).GetProperty("status").GetString());
        var info = await GetClass(client, classId);
        Assert.Equal(0, info.HeldSeats);
        Assert.Equal(1, info.AvailableSeats);

        // The paid-too-late attempt is refused...
        var late = await Confirm(client, holdA, StudentId(1));
        Assert.Equal(HttpStatusCode.Conflict, late.StatusCode);
        Assert.Equal("HOLD_EXPIRED", await ErrorCode(late));
        Assert.Equal(0, (await GetClass(client, classId)).ConfirmedSeats);

        // ...and the seat is available to someone else.
        Assert.Equal(HttpStatusCode.Created, (await Apply(client, classId, StudentId(2))).StatusCode);
    }

    [Fact]
    public async Task A_student_whose_hold_expired_can_apply_again_to_the_same_class()
    {
        var client = db.CreateFactory(holdDurationSeconds: 2).CreateClient();
        var classId = await CreateClass(client, 5);
        await ApplyOk(client, classId, StudentId(1));

        await Task.Delay(TimeSpan.FromSeconds(3.5));

        Assert.Equal(HttpStatusCode.Created, (await Apply(client, classId, StudentId(1))).StatusCode);
    }

    [Fact]
    public async Task My_holds_reports_an_expired_hold_as_EXPIRED()
    {
        var client = db.CreateFactory(holdDurationSeconds: 2).CreateClient();
        var classId = await CreateClass(client, 5);
        var me = UniqueStudentId();
        await ApplyOk(client, classId, me);

        await Task.Delay(TimeSpan.FromSeconds(3.5));

        var list = await Json(await MyHolds(client, me));
        Assert.Equal("EXPIRED", list[0].GetProperty("status").GetString());
    }

    [Fact]
    public async Task Confirming_in_time_works_and_the_seat_stays_confirmed_after_the_hold_time_passes()
    {
        var client = db.CreateFactory(holdDurationSeconds: 2).CreateClient();
        var classId = await CreateClass(client, 1);
        var holdId = await ApplyOk(client, classId, StudentId(1));
        Assert.Equal(HttpStatusCode.OK, (await Confirm(client, holdId, StudentId(1))).StatusCode);

        await Task.Delay(TimeSpan.FromSeconds(3.5));   // well past the original hold time

        Assert.Equal("CONFIRMED", (await Json(await GetHold(client, holdId))).GetProperty("status").GetString());
        var info = await GetClass(client, classId);
        Assert.Equal(1, info.ConfirmedSeats);
        Assert.Equal(0, info.AvailableSeats);
    }
}
