using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Sending;
using Innova.OnboardComputer.App.Simulation;
using Innova.OnboardComputer.App.Sources;
using Microsoft.Extensions.Options;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddOptions<OnboardComputerOptions>()
    .Bind(builder.Configuration.GetSection(OnboardComputerOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
var settings = builder.Configuration.GetSection(OnboardComputerOptions.SectionName).Get<OnboardComputerOptions>()
               ?? new OnboardComputerOptions();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton(services => new SequenceGenerator(services.GetRequiredService<TimeProvider>()));
builder.Services.AddSingleton<MessageBuilder>();
builder.Services.AddSingleton<MessageOutbox>();
builder.Services.AddHttpClient<IOccupancyApiClient, OccupancyApiClient>((services, http) =>
{
    var options = services.GetRequiredService<IOptions<OnboardComputerOptions>>().Value;
    http.BaseAddress = new Uri(options.OccupancyApiUrl.TrimEnd('/') + "/");
    http.Timeout = TimeSpan.FromSeconds(options.RequestTimeoutSeconds);
});
builder.Services.AddHostedService<TelemetryWorker>();

// The sources are the only part that differs between simulation and a real bus: a real GPS
// receiver, door counter or vision client registers its own IGpsSource, IDoorCounterSource or
// IVisionSource here instead of the buffered ones the scenario feeds.
builder.Services.AddSingleton<BufferedGpsSource>();
builder.Services.AddSingleton<BufferedDoorCounterSource>();
builder.Services.AddSingleton<IGpsSource>(services => services.GetRequiredService<BufferedGpsSource>());
builder.Services.AddSingleton<IDoorCounterSource>(services => services.GetRequiredService<BufferedDoorCounterSource>());
builder.Services.AddSingleton<IVisionSource>(services => services.GetRequiredService<BufferedVisionSource>());

if (settings.Simulation.Enabled)
{
    builder.Services.AddSingleton(services =>
    {
        var file = Path.Combine(AppContext.BaseDirectory, settings.Simulation.ScenarioFile);
        var scenario = Scenario.Load(file);
        var route = RoutePath.Load(Path.Combine(Path.GetDirectoryName(file)!, scenario.RoutesFile), scenario.RouteId);
        var now = services.GetRequiredService<TimeProvider>().GetUtcNow();
        // Minute 0 of the scenario is now, to the whole second so NMEA times read cleanly.
        var epoch = new DateTimeOffset(now.Ticks - (now.Ticks % TimeSpan.TicksPerSecond), TimeSpan.Zero);
        return new ScenarioTimeline(scenario, route, epoch, settings.Simulation.Loop);
    });
    builder.Services.AddSingleton(services =>
    {
        var timeline = services.GetRequiredService<ScenarioTimeline>();
        return new BufferedVisionSource(timeline.VisionModel, timeline.VisionCamera);
    });
    builder.Services.AddHostedService<ScenarioPlayer>();
}
else
{
    builder.Services.AddSingleton(new BufferedVisionSource("bus-passengers-rfdetr-s-v1", "cabin-front"));
}

var host = builder.Build();
if (!settings.Simulation.Enabled)
{
    host.Services.GetRequiredService<ILogger<Program>>().LogWarning(
        "Simulation is off and no real device adapters are registered yet: nothing will be sent.");
}

host.Run();
