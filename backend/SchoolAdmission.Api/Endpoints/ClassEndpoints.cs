using System.Text.Json;
using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Endpoints;

public static class ClassEndpoints
{
    public const int MaxNameLength = 200;
    public const int MaxTotalSeats = 100_000;

    public static void MapClassEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes", CreateClass);
        app.MapGet("/classes", ListClasses);
        app.MapGet("/classes/{classId}", GetClass);
    }

    private static async Task<IResult> ListClasses(AdmissionDbContext db, CancellationToken ct)
        => Results.Ok(await ClassQueries.ListAsync(db, ct));

    private static async Task<IResult> GetClass(string classId, AdmissionDbContext db, CancellationToken ct)
    {
        var result = await ClassQueries.GetAsync(db, classId, ct);
        if (result is null)
            throw ApiException.NotFound("CLASS_NOT_FOUND", "We couldn't find that class.");
        return Results.Ok(result);
    }

    // The body is read as raw JSON so we can tell the user exactly which field is wrong
    // ("totalSeats must be a whole number") instead of a generic "bad request".
    private static async Task<IResult> CreateClass(JsonElement body, AdmissionDbContext db, CancellationToken ct)
    {
        var (name, totalSeats) = ValidateCreateClass(body);

        var entity = new ClassEntity
        {
            Id = "c_" + Guid.NewGuid().ToString("N"),
            Name = name,
            TotalSeats = totalSeats
        };

        db.Classes.Add(entity);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/classes/{entity.Id}", new { id = entity.Id, name = entity.Name, totalSeats = entity.TotalSeats });
    }

    internal static (string Name, int TotalSeats) ValidateCreateClass(JsonElement body)
    {
        if (body.ValueKind != JsonValueKind.Object)
            throw ApiException.BadRequest("INVALID_REQUEST", "The request must be a JSON object with \"name\" and \"totalSeats\".");

        // name
        if (!body.TryGetProperty("name", out var nameEl) || nameEl.ValueKind != JsonValueKind.String)
            throw ApiException.BadRequest("INVALID_REQUEST", "Class name is required.");

        var name = nameEl.GetString()!.Trim();
        if (name.Length == 0)
            throw ApiException.BadRequest("INVALID_REQUEST", "Class name is required.");
        if (name.Length > MaxNameLength)
            throw ApiException.BadRequest("INVALID_REQUEST", $"Class name must be at most {MaxNameLength} characters.");

        // totalSeats
        if (!body.TryGetProperty("totalSeats", out var seatsEl) ||
            seatsEl.ValueKind != JsonValueKind.Number ||
            !seatsEl.TryGetInt32(out var totalSeats))
            throw ApiException.BadRequest("INVALID_REQUEST", "Total seats must be a whole number.");

        if (totalSeats < 1 || totalSeats > MaxTotalSeats)
            throw ApiException.BadRequest("INVALID_REQUEST", $"Total seats must be between 1 and {MaxTotalSeats}.");

        return (name, totalSeats);
    }
}
