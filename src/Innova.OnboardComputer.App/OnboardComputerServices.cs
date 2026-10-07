using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Sending;
using Innova.OnboardComputer.App.Simulation;
using Innova.OnboardComputer.App.Sources;
using Microsoft.Extensions.Options;

namespace Innova.OnboardComputer.App;

/// <summary>
/// Everything the on-board computer runs. The console app (Program.cs) and the web host that keeps
/// it online (Innova.OnboardComputer.Host) both call this, so they behave the same.
/// </summary>
public static class OnboardComputerServices
{
    public static OnboardComputerOptions AddOnboardComputer(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<OnboardComputerOptions>()
            .Bind(configuration.GetSection(OnboardComputerOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        var settings = configuration.GetSection(OnboardComputerOptions.SectionName).Get<OnboardComputerOptions>()
                       ?? new OnboardComputerOptions();

        services.AddSingleton(TimeProvider.System);
        services.AddSingleton(provider => new SequenceGenerator(provider.GetRequiredService<TimeProvider>()));
        services.AddSingleton<MessageBuilder>();
        services.AddSingleton<MessageOutbox>();
        services.AddHttpClient<IOccupancyApiClient, OccupancyApiClient>((provider, http) =>
        {
            var options = provider.GetRequiredService<IOptions<OnboardComputerOptions>>().Value;
            http.BaseAddress = new Uri(options.OccupancyApiUrl.TrimEnd('/') + "/");
            http.Timeout = TimeSpan.FromSeconds(options.RequestTimeoutSeconds);
        });
        services.AddHostedService<TelemetryWorker>();

        // The sources are the only part that differs between simulation and a real bus: a real GPS
        // receiver, door counter or vision client registers its own IGpsSource, IDoorCounterSource or
        // IVisionSource here instead of the buffered ones the scenario feeds.
        services.AddSingleton<BufferedGpsSource>();
        services.AddSingleton<BufferedDoorCounterSource>();
        services.AddSingleton<IGpsSource>(provider => provider.GetRequiredService<BufferedGpsSource>());
        services.AddSingleton<IDoorCounterSource>(provider => provider.GetRequiredService<BufferedDoorCounterSource>());
        services.AddSingleton<IVisionSource>(provider => provider.GetRequiredService<BufferedVisionSource>());

        if (settings.Simulation.Enabled)
        {
            services.AddSingleton(provider =>
            {
                var file = Path.Combine(AppContext.BaseDirectory, settings.Simulation.ScenarioFile);
                var scenario = Scenario.Load(file);
                var route = RoutePath.Load(Path.Combine(Path.GetDirectoryName(file)!, scenario.RoutesFile), scenario.RouteId);
                var recording = scenario.Vision.Recording is { Length: > 0 } recordingFile
                    ? RecordedVision.Load(Path.Combine(Path.GetDirectoryName(file)!, recordingFile))
                    : null;
                var now = provider.GetRequiredService<TimeProvider>().GetUtcNow();
                // Minute 0 of the scenario is now, to the whole second so NMEA times read cleanly.
                var epoch = new DateTimeOffset(now.Ticks - (now.Ticks % TimeSpan.TicksPerSecond), TimeSpan.Zero);
                return new ScenarioTimeline(scenario, route, epoch, settings.Simulation.Loop, recording);
            });
            services.AddSingleton(provider =>
            {
                var timeline = provider.GetRequiredService<ScenarioTimeline>();
                return new BufferedVisionSource(timeline.VisionModel, timeline.VisionCamera);
            });
            services.AddHostedService<ScenarioPlayer>();
        }
        else
        {
            services.AddSingleton(new BufferedVisionSource("bus-passengers-rfdetr-s-v1", "cabin-front"));
        }

        return settings;
    }
}
