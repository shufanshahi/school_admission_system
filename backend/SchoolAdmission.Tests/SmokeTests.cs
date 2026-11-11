using SchoolAdmission.Tests.Infrastructure;
using static SchoolAdmission.Tests.Infrastructure.Api;

namespace SchoolAdmission.Tests;

[Collection(DbCollection.Name)]
public class SmokeTests(PostgresFixture db)
{
    [Fact]
    public async Task Create_class_then_get_it_back()
    {
        var client = db.Default.CreateClient();

        var id = await CreateClass(client, 12, "Smoke class");
        var info = await GetClass(client, id);

        Assert.Equal("Smoke class", info.Name);
        Assert.Equal(12, info.TotalSeats);
        Assert.Equal(0, info.HeldSeats);
        Assert.Equal(0, info.ConfirmedSeats);
        Assert.Equal(12, info.AvailableSeats);
    }
}
