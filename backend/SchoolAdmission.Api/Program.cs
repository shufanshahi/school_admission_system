var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

// Makes Program visible to WebApplicationFactory<Program> in the test project.
public partial class Program { }
