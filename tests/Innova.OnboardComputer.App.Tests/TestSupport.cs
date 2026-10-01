using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Contracts;
using Innova.OnboardComputer.App.Sending;
using Innova.OnboardComputer.App.Simulation;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Innova.OnboardComputer.App.Tests;

internal static class TestSupport
{
    /// <summary>A feeder bus on Ramal San Rafael in the API's MockData/coronado-fleet.json (capacity 50).</summary>
    public const string Bus = "SJB-10662";

    public static readonly string ScenarioFile = Path.Combine(AppContext.BaseDirectory, "Scenarios", "ramal-san-rafael.json");

    public static IOptions<OnboardComputerOptions> Options(int maxBuffered = 100, string deviceKey = "") =>
        Microsoft.Extensions.Options.Options.Create(new OnboardComputerOptions
        {
            VehicleId = Bus,
            DeviceKey = deviceKey,
            MaxBufferedMessages = maxBuffered
        });

    public static MessageOutbox Outbox(int maxBuffered = 100) =>
        new(Options(maxBuffered), NullLogger<MessageOutbox>.Instance);

    public static RawVehicleMessage Message(long sequence) =>
        new(sequence, DateTimeOffset.UnixEpoch.AddSeconds(sequence), new RawGps(RawFormats.Nmea0183, ["$GPGGA*56"]), null, null);

    public static ScenarioTimeline Timeline(DateTimeOffset epoch, bool loop = true)
    {
        var scenario = Scenario.Load(ScenarioFile);
        var route = RoutePath.Load(Path.Combine(Path.GetDirectoryName(ScenarioFile)!, scenario.RoutesFile), scenario.RouteId);
        return new ScenarioTimeline(scenario, route, epoch, loop);
    }
}

/// <summary>Answers each send with the next scripted outcome (Accepted once the script runs out).</summary>
internal sealed class ScriptedApiClient(params SendOutcome[] script) : IOccupancyApiClient
{
    private readonly Queue<SendOutcome> _script = new(script);

    public List<(RawVehicleMessage Message, SendOutcome Outcome)> Calls { get; } = [];

    public IEnumerable<long> Delivered => Calls.Where(call => call.Outcome == SendOutcome.Accepted).Select(call => call.Message.Sequence);

    public Task<SendResult> SendAsync(RawVehicleMessage message, CancellationToken cancellationToken)
    {
        var outcome = _script.TryDequeue(out var next) ? next : SendOutcome.Accepted;
        lock (Calls)
        {
            Calls.Add((message, outcome));
        }

        return Task.FromResult(new SendResult(outcome, outcome.ToString()));
    }
}
