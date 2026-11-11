using System.Net;
using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

[Collection(DbCollection.Name)]
public class ValidationTests(PostgresFixture db)
{
    // ----- student id header -----------------------------------------------------------------
    [Theory]
    [InlineData(null)]                         // missing
    [InlineData("")]
    [InlineData("123")]                        // too short
    [InlineData("123456789012345678")]         // 18 digits
    [InlineData("1234567890123456a")]          // letter
    [InlineData("1234 678901234567")]          // space inside
    [InlineData("١٢٣٤٥٦٧٨٩٠١٢٣٤٥٦٧")]          // 17 Arabic-Indic digits: digits, but not 0-9
    public async Task A_bad_student_id_is_rejected_with_400(string? studentId)
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 3);

        var response = await Apply(client, classId, studentId);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("INVALID_STUDENT_ID", await ErrorCode(response));
        Assert.Equal(0, (await GetClass(client, classId)).HeldSeats);
    }

    [Fact]
    public async Task Every_student_endpoint_requires_the_header()
    {
        var client = db.Default.CreateClient();
        var classId = await CreateClass(client, 3);
        var holdId = await ApplyOk(client, classId, StudentId(1));

        Assert.Equal(HttpStatusCode.BadRequest, (await MyHolds(client, null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Confirm(client, holdId, null)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await Cancel(client, holdId, null)).StatusCode);
    }

    // ----- create class ----------------------------------------------------------------------
    [Theory]
    [InlineData("{\"name\":\"\",\"totalSeats\":10}")]
    [InlineData("{\"name\":\"   \",\"totalSeats\":10}")]
    [InlineData("{\"totalSeats\":10}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":0}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":-1}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":\"abc\"}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":\"10\"}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":1.5}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":null}")]
    [InlineData("{\"name\":\"X\"}")]
    [InlineData("{\"name\":\"X\",\"totalSeats\":100001}")]
    [InlineData("{bad json")]
    [InlineData("[]")]
    public async Task Creating_a_class_with_invalid_input_is_400(string body)
    {
        var client = db.Default.CreateClient();
        var response = await PostRaw(client, "/classes", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await Json(response);
        Assert.Equal("INVALID_REQUEST", error.GetProperty("error").GetString());
        Assert.False(string.IsNullOrWhiteSpace(error.GetProperty("message").GetString()));
    }

    [Fact]
    public async Task Class_name_is_trimmed_and_limited_to_200_characters()
    {
        var client = db.Default.CreateClient();

        var ok = await PostRaw(client, "/classes", "{\"name\":\"  Class 7  \",\"totalSeats\":5}");
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        Assert.Equal("Class 7", (await Json(ok)).GetProperty("name").GetString());

        var tooLong = await PostRaw(client, "/classes", $"{{\"name\":\"{new string('a', 201)}\",\"totalSeats\":5}}");
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
    }

    // ----- not found -------------------------------------------------------------------------
    [Fact]
    public async Task Unknown_class_and_hold_are_404_with_a_readable_message()
    {
        var client = db.Default.CreateClient();

        var cls = await client.GetAsync("/classes/c_doesnotexist");
        Assert.Equal(HttpStatusCode.NotFound, cls.StatusCode);
        Assert.Equal("CLASS_NOT_FOUND", await ErrorCode(cls));

        Assert.Equal(HttpStatusCode.NotFound, (await Apply(client, "c_doesnotexist", StudentId(1))).StatusCode);

        var hold = await GetHold(client, "h_doesnotexist");
        Assert.Equal(HttpStatusCode.NotFound, hold.StatusCode);
        Assert.Equal("HOLD_NOT_FOUND", await ErrorCode(hold));
    }

    [Fact]
    public async Task Odd_ids_in_the_url_do_not_cause_server_errors()
    {
        var client = db.Default.CreateClient();
        foreach (var id in new[] { "a'b", "a%20b", "'; DROP TABLE holds;--", new string('x', 500) })
        {
            var response = await client.GetAsync($"/classes/{Uri.EscapeDataString(id)}");
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    }
}
