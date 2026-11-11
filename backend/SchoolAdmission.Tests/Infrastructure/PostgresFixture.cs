using Testcontainers.PostgreSql;

namespace SchoolAdmission.Tests.Infrastructure;

/// <summary>
/// Starts ONE throw-away Postgres container for the whole test run and exposes ready-made app instances.
/// Each test creates its own class, so tests never interfere with each other.
/// </summary>
public class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16").Build();

    private readonly List<AppFactory> _factories = new();

    public string ConnectionString => _container.GetConnectionString();

    /// <summary>A normal app instance (default 10-minute holds).</summary>
    public AppFactory Default { get; private set; } = default!;

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        Default = CreateFactory();
        _ = Default.Server;   // boot it now so migrations run once, before any test
    }

    /// <summary>Another app instance on the same database, optionally with a custom hold duration.</summary>
    public AppFactory CreateFactory(int? holdDurationSeconds = null)
    {
        var factory = new AppFactory(ConnectionString, holdDurationSeconds);
        lock (_factories) _factories.Add(factory);
        return factory;
    }

    public async Task DisposeAsync()
    {
        foreach (var f in _factories) await f.DisposeAsync();
        await _container.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public class DbCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "db";
}
