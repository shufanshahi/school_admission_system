using SchoolAdmission.Api.Data;
using SchoolAdmission.Api.Infrastructure;

namespace SchoolAdmission.Api.Endpoints;

public static class HoldEndpoints
{
    public static void MapHoldEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/classes/{classId}/holds", async (string classId, HttpContext ctx, HoldService holds, CancellationToken ct) =>
        {
            var studentId = StudentIdHeader.Require(ctx);
            var created = await holds.ApplyAsync(classId, studentId, ct);
            return Results.Created($"/holds/{created.HoldId}", created);
        });

        app.MapGet("/holds/{holdId}", async (string holdId, HoldService holds, CancellationToken ct) =>
            Results.Ok(await holds.GetAsync(holdId, ct)));

        app.MapPost("/holds/{holdId}/confirm", async (string holdId, HttpContext ctx, HoldService holds, CancellationToken ct) =>
        {
            var studentId = StudentIdHeader.Require(ctx);
            return Results.Ok(await holds.ConfirmAsync(holdId, studentId, ct));
        });

        app.MapDelete("/holds/{holdId}", async (string holdId, HttpContext ctx, HoldService holds, CancellationToken ct) =>
        {
            var studentId = StudentIdHeader.Require(ctx);
            await holds.CancelAsync(holdId, studentId, ct);
            return Results.NoContent();
        });

        app.MapGet("/me/holds", async (HttpContext ctx, HoldService holds, CancellationToken ct) =>
        {
            var studentId = StudentIdHeader.Require(ctx);
            return Results.Ok(await holds.ListMineAsync(studentId, ct));
        });
    }
}
