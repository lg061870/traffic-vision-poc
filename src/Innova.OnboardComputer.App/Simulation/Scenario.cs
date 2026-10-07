using System.Text.Json;
using Innova.OnboardComputer.App.Contracts;

namespace Innova.OnboardComputer.App.Simulation;

/// <summary>
/// A scripted trip, with every time an offset from the scenario's minute 0. When it is replayed,
/// minute 0 becomes "now", so the API always receives current timestamps.
/// </summary>
public sealed record Scenario(
    string Name,
    string RoutesFile,
    string RouteId,
    TimeSpan Duration,
    GpsScenario Gps,
    IReadOnlyList<ScriptedDoorEvent> DoorEvents,
    VisionScenario Vision,
    int InitialOnBoard = 0)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public static Scenario Load(string file)
    {
        var scenario = JsonSerializer.Deserialize<Scenario>(File.ReadAllText(file), JsonOptions)
                       ?? throw new InvalidDataException($"{file} is empty.");
        scenario.Validate(file);
        return scenario;
    }

    /// <summary>Passengers on board when the scenario ends; a loopable scenario returns to where it began.</summary>
    public int FinalOnBoard =>
        InitialOnBoard + DoorEvents.Sum(item => (item.In ?? 0) - (item.Out ?? 0));

    private void Validate(string file)
    {
        void Require(bool condition, string message)
        {
            if (!condition)
            {
                throw new InvalidDataException($"{file}: {message}");
            }
        }

        Require(Duration > TimeSpan.Zero, "duration must be positive.");
        Require(Gps is { IntervalSeconds: > 0, Track.Count: >= 1 }, "gps needs intervalSeconds and a track.");
        Require(Vision is { FrameIntervalSeconds: > 0 }, "vision needs frameIntervalSeconds.");
        Require(Gps.Track.Zip(Gps.Track.Skip(1)).All(pair => pair.First.At < pair.Second.At), "gps track times must increase.");
        Require(Gps.Track.All(point => point.At >= TimeSpan.Zero && point.At <= Duration && point.Km >= 0), "gps track points must lie within the duration at km >= 0.");
        Require(DoorEvents.All(item => item.At >= TimeSpan.Zero && item.At < Duration), "door events must lie within the duration.");
        Require(DoorEvents.All(item => item.Door >= 1 && item.Type is RawFormats.DoorOpened or RawFormats.DoorCount or RawFormats.DoorClosed),
            "door events need door >= 1 and type DOOR_OPENED, COUNT or DOOR_CLOSED.");
        Require(DoorEvents.All(item => item.Type != RawFormats.DoorCount || item is { In: >= 0, Out: >= 0 }),
            "COUNT events need non-negative in and out.");
    }
}

public sealed record GpsScenario(int IntervalSeconds, IReadOnlyList<TrackPoint> Track);

/// <summary>Where the bus is along the route at a moment; positions in between are interpolated.</summary>
public sealed record TrackPoint(TimeSpan At, double Km);

public sealed record ScriptedDoorEvent(TimeSpan At, int Door, string Type, int? In = null, int? Out = null);

/// <summary>
/// Synthetic results of the vision inference API: one detection per passenger the camera can see,
/// with a few deterministic misses so the API's median filter has something to smooth. When
/// <see cref="Recording"/> is set, the real detections of that analyzed clip are sent instead.
/// </summary>
/// <param name="Recording">A TrafficVision ".result.json", relative to the scenario file.</param>
public sealed record VisionScenario(
    string Model,
    string Camera,
    int FrameIntervalSeconds,
    int SeatsInView = 14,
    int MaxVisible = 30,
    double MissRate = 0.05,
    int Seed = 1,
    string? Recording = null);
