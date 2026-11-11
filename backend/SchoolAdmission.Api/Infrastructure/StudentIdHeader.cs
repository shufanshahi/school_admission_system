using System.Text.RegularExpressions;

namespace SchoolAdmission.Api.Infrastructure;

public static partial class StudentIdHeader
{
    public const string HeaderName = "X-Student-Id";

    // [0-9], not \d: in .NET \d also matches non-ASCII Unicode digits.
    [GeneratedRegex("^[0-9]{17}$")]
    private static partial Regex Pattern();

    /// <summary>Returns the student's 17-digit birth registration number or throws a 400.</summary>
    public static string Require(HttpContext context)
    {
        var value = context.Request.Headers[HeaderName].ToString().Trim();

        if (value.Length == 0)
            throw ApiException.BadRequest("INVALID_STUDENT_ID",
                "Please enter the student's 17-digit birth registration number.");

        if (!Pattern().IsMatch(value))
            throw ApiException.BadRequest("INVALID_STUDENT_ID",
                "Birth registration number must be exactly 17 digits.");

        return value;
    }
}
