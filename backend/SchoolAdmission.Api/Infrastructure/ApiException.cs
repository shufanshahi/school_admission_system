namespace SchoolAdmission.Api.Infrastructure;

/// <summary>
/// A failure we want to report to the client with a specific HTTP status and a
/// machine-readable code plus a human-friendly message.
/// </summary>
public class ApiException(int statusCode, string code, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;

    public static ApiException BadRequest(string code, string message) => new(StatusCodes.Status400BadRequest, code, message);
    public static ApiException Forbidden(string code, string message) => new(StatusCodes.Status403Forbidden, code, message);
    public static ApiException NotFound(string code, string message) => new(StatusCodes.Status404NotFound, code, message);
    public static ApiException Conflict(string code, string message) => new(StatusCodes.Status409Conflict, code, message);
}

/// <summary>The JSON body returned for every error.</summary>
public record ErrorResponse(string Error, string Message);
