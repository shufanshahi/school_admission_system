using System.Text.Json;

namespace SchoolAdmission.Api.Infrastructure;

/// <summary>
/// Turns every exception into the same JSON error shape:
/// { "error": "CODE", "message": "Friendly text" }.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            if (context.Response.HasStarted)
            {
                logger.LogError(ex, "Exception after the response had started; cannot write an error body.");
                throw;
            }

            var (status, body) = Map(ex);

            if (status >= 500)
                logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            else
                logger.LogInformation("Request rejected ({Status} {Code}) for {Method} {Path}: {Message}",
                    status, body.Error, context.Request.Method, context.Request.Path, body.Message);

            context.Response.Clear();
            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(body, JsonOptions));
        }
    }

    private static (int Status, ErrorResponse Body) Map(Exception ex) => ex switch
    {
        ApiException api => (api.StatusCode, new ErrorResponse(api.Code, api.Message)),

        // Malformed JSON, wrong types (e.g. "totalSeats":"abc"), missing/invalid body, etc.
        BadHttpRequestException or JsonException => (StatusCodes.Status400BadRequest,
            new ErrorResponse("INVALID_REQUEST", "The request is not valid. Please check the values and try again.")),

        _ => (StatusCodes.Status500InternalServerError,
            new ErrorResponse("INTERNAL_ERROR", "Something went wrong. Please try again."))
    };

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
}
