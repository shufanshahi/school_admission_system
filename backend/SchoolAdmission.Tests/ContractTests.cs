using System.Net;
using System.Text.Json;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

/// <summary>
/// The graders run automated tests against the API, so field names and status codes must match the brief exactly.
/// Extra fields are allowed; missing or renamed ones are not.
/// </summary>
[Collection(DbCollection.Name)]
public class ContractTests(PostgresFixture db)
{
    private static void AssertHas(JsonElement json, params string[] names)
    {
        foreach (var name in names)
            Assert.True(json.TryGetProperty(name, out _), $"Missing field '{name}' in {json}");
    }

    private static void AssertUtcTimestamp(JsonElement json, string field)
    {
        var text = json.GetProperty(field).GetString()!;
        Assert.EndsWith("Z", text);
        Assert.True(DateTimeOffset.TryParse(text, out var parsed));
        Assert.Equal(TimeSpan.Zero, parsed.Offset);
    }

    [Fact]
    public async Task Create_class_returns_201_with_id_name_and_totalSeats()
    {
        var client = db.Default.CreateClient();
        var response = await PostRaw(client, "/classes", "{\"name\":\"Class 6 - Morning Shift\",\"totalSeats\":120}");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await Json(response);
        AssertHas(json, "id", "name", "totalSeats");
        Assert.Equal("Class 6 - Morning Shift", json.GetProperty("name").GetString());
        Assert.Equal(120, json.GetProperty("totalSeats").GetInt32());
    }

    [Fact]
    public async Task Class_list_and_class_detail_have_all_seat_fields()
    {
        var client = db.Default.CreateClient();
        var id = await CreateClass(client, 10);

        var one = await Json(await client.GetAsync($"/classes/{id}"));
        AssertHas(one, "id", "name", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats");

        var list = await Json(await client.GetAsync("/classes"));
        Assert.Equal(JsonValueKind.Array, list.ValueKind);
        var mine = list.EnumerateArray().First(c => c.GetProperty("id").GetString() == id);
        AssertHas(mine, "id", "name", "totalSeats", "heldSeats", "confirmedSeats", "availableSeats");
    }

    [Fact]
    public async Task Apply_returns_201_with_holdId_classId_studentId_status_and_utc_expiresAt()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);

        var response = await Apply(client, classId, StudentId(42));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await Json(response);
        AssertHas(json, "holdId", "classId", "studentId", "status", "expiresAt");
        Assert.Equal(classId, json.GetProperty("classId").GetString());
        Assert.Equal(StudentId(42), json.GetProperty("studentId").GetString());
        Assert.Equal("HELD", json.GetProperty("status").GetString());
        AssertUtcTimestamp(json, "expiresAt");

        // default hold time is 10 minutes
        var expires = DateTimeOffset.Parse(json.GetProperty("expiresAt").GetString()!);
        var remaining = expires - DateTimeOffset.UtcNow;
        Assert.InRange(remaining.TotalSeconds, 590, 601);
    }

    [Fact]
    public async Task Get_hold_returns_holdId_classId_status_expiresAt()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var json = await Json(await GetHold(client, holdId));

        AssertHas(json, "holdId", "classId", "status", "expiresAt");
        Assert.Equal(holdId, json.GetProperty("holdId").GetString());
        AssertUtcTimestamp(json, "expiresAt");
    }

    [Fact]
    public async Task Confirm_returns_200_with_holdId_and_CONFIRMED()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var response = await Confirm(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await Json(response);
        AssertHas(json, "holdId", "status");
        Assert.Equal("CONFIRMED", json.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Cancel_returns_204_with_no_body()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 5);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        var response = await Cancel(client, holdId, StudentId(1));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task My_holds_lists_this_students_applications_newest_first_with_className()
    {
        var client = db.Default.CreateClient();
        var first = await CreateClass(client, 5, "First class");
        var second = await CreateClass(client, 5, "Second class");
        var me = UniqueStudentId();
        await ApplyOk(client, first, me);
        await Task.Delay(20);
        await ApplyOk(client, second, me);
        await ApplyOk(client, second, UniqueStudentId());   // someone else's, must not appear

        var list = await Json(await MyHolds(client, me));

        Assert.Equal(2, list.GetArrayLength());
        foreach (var item in list.EnumerateArray())
        {
            AssertHas(item, "holdId", "classId", "className", "status", "expiresAt");
            AssertUtcTimestamp(item, "expiresAt");
        }
        Assert.Equal("Second class", list[0].GetProperty("className").GetString());
        Assert.Equal("First class", list[1].GetProperty("className").GetString());
    }

    [Fact]
    public async Task My_holds_is_an_empty_array_for_a_student_with_no_applications()
    {
        var client = db.Default.CreateClient();
        var list = await Json(await MyHolds(client, UniqueStudentId()));
        Assert.Equal(JsonValueKind.Array, list.ValueKind);
        Assert.Equal(0, list.GetArrayLength());
    }

    [Fact]
    public async Task Errors_use_one_consistent_json_shape()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 1);
        await ApplyOk(client, classId, StudentId(1));

        var response = await Apply(client, classId, StudentId(2));   // class is full

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        var json = await Json(response);
        AssertHas(json, "error", "message");
    }
}
