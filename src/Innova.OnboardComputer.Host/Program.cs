using Innova.OnboardComputer.App;
using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Sending;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
// The host's own settings override the appsettings.json that comes from the referenced app;
// environment variables are added again so they still override both (e.g. a local API URL).
builder.Configuration.AddJsonFile("onboard-host.json", optional: false).AddEnvironmentVariables();
builder.Services.AddOnboardComputer(builder.Configuration);

var app = builder.Build();
var startedAt = TimeProvider.System.GetUtcNow();

// What the hosted bus is doing. An uptime monitor that opens /health every few minutes also keeps
// IIS from shutting this site down when nobody visits it.
app.MapGet("/", (IOptions<OnboardComputerOptions> options, MessageOutbox outbox, TimeProvider time) =>
    Results.Json(Status(options.Value, outbox, time, startedAt)));

// 200 while messages are reaching the API, 503 when the last one got through over a minute ago.
// The first minute after a start counts as healthy: the monitor's own visit is what wakes the site,
// and the first message only goes out a few seconds later.
app.MapGet("/health", (IOptions<OnboardComputerOptions> options, MessageOutbox outbox, TimeProvider time) =>
{
    var status = Status(options.Value, outbox, time, startedAt);
    return status.Delivering ? Results.Json(status) : Results.Json(status, statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.Run();

static HostStatus Status(OnboardComputerOptions options, MessageOutbox outbox, TimeProvider time, DateTimeOffset startedAt)
{
    var now = time.GetUtcNow();
    var since = outbox.LastDeliveredAt is { } at ? (int?)(now - at).TotalSeconds : null;
    var starting = since is null && now - startedAt < TimeSpan.FromMinutes(1);
    return new HostStatus(
        options.VehicleId,
        options.OccupancyApiUrl,
        options.Simulation.Enabled ? options.Simulation.ScenarioFile : null,
        outbox.LastDeliveredAt,
        since,
        outbox.Count,
        starting || (since is not null && since < 60),
        starting);
}

internal sealed record HostStatus(
    string VehicleId,
    string OccupancyApiUrl,
    string? Scenario,
    DateTimeOffset? LastDeliveredAt,
    int? SecondsSinceLastDelivery,
    int BufferedMessages,
    bool Delivering,
    bool Starting);
