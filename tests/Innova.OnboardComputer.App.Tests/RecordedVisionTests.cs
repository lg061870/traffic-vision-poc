using Innova.OnboardComputer.App.Simulation;

namespace Innova.OnboardComputer.App.Tests;

public sealed class RecordedVisionTests : IDisposable
{
    // A 10-second clip with frames at 0 s, 1 s and 5 s, in the TrafficVision result format.
    private const string ResultJson = """
        {
          "model": "bus-passengers-rfdetr-s-v1",
          "durationSeconds": 10.0,
          "frames": [
            { "timestampSeconds": 0.0, "detections": [] },
            { "timestampSeconds": 1.0, "detections": [
              { "trackId": 7, "confirmed": true, "classId": 0, "className": "sitting", "score": 0.81234, "box": { "x1": 10.04, "y1": 20, "x2": 110, "y2": 220 } },
              { "trackId": 8, "confirmed": false, "classId": 1, "className": "standing", "score": 0.41, "box": { "x1": 0, "y1": 0, "x2": 5, "y2": 5 } }
            ] },
            { "timestampSeconds": 5.0, "detections": [
              { "trackId": 9, "confirmed": true, "classId": 1, "className": "standing", "score": 0.6, "box": { "x1": 300, "y1": 40, "x2": 380, "y2": 400 } }
            ] }
          ]
        }
        """;

    private readonly string _file = Path.Combine(Path.GetTempPath(), $"recorded-vision-{Guid.NewGuid():N}.result.json");

    public RecordedVisionTests() => File.WriteAllText(_file, ResultJson);

    public void Dispose() => File.Delete(_file);

    [Fact]
    public void Sends_only_confirmed_detections_as_raw_boxes()
    {
        var recording = RecordedVision.Load(_file);
        var loopStart = DateTimeOffset.UnixEpoch.AddSeconds(10 * 177_000_000L);

        var frame = recording.Between(loopStart.AddSeconds(0.5), loopStart.AddSeconds(1.5)).Single();

        Assert.Equal("bus-passengers-rfdetr-s-v1", recording.Model);
        Assert.Equal(loopStart.AddSeconds(1), frame.At);
        var detection = Assert.Single(frame.Detections);
        Assert.Equal((7, "sitting", 0.812), (detection.TrackId, detection.Class, detection.Score));
        Assert.Equal([10.0, 20, 110, 220], detection.Box);
    }

    [Fact]
    public void The_clip_loops_on_the_unix_clock_so_any_viewer_finds_the_same_moment()
    {
        var recording = RecordedVision.Load(_file);
        // Unix second 1 770 000 003 is second 3 of a loop (it is a multiple of 10 plus 3).
        var from = DateTimeOffset.FromUnixTimeSeconds(1_770_000_003);

        var frames = recording.Between(from, from.AddSeconds(10));

        Assert.Equal(
            [from.AddSeconds(2), from.AddSeconds(7), from.AddSeconds(8)],
            frames.Select(frame => frame.At));
    }

    [Fact]
    public void A_scenario_with_a_recording_sends_the_recorded_frames_instead_of_synthetic_ones()
    {
        var scenario = Scenario.Load(TestSupport.ScenarioFile);
        var route = RoutePath.Load(Path.Combine(Path.GetDirectoryName(TestSupport.ScenarioFile)!, scenario.RoutesFile), scenario.RouteId);
        var epoch = DateTimeOffset.FromUnixTimeSeconds(1_770_000_000);
        var timeline = new ScenarioTimeline(scenario, route, epoch, loop: true, RecordedVision.Load(_file));

        var batch = timeline.Between(epoch.AddTicks(-1), epoch.AddSeconds(10));

        Assert.Equal("bus-passengers-rfdetr-s-v1", timeline.VisionModel);
        Assert.Equal([epoch, epoch.AddSeconds(1), epoch.AddSeconds(5), epoch.AddSeconds(10)], batch.VisionFrames.Select(frame => frame.At));
        Assert.NotEmpty(batch.Gps);
    }

    [Fact]
    public void Shipped_camera_scenario_has_no_door_counter_and_points_at_a_recording()
    {
        var scenario = Scenario.Load(Path.Combine(AppContext.BaseDirectory, "Scenarios", "ramal-san-rafael-camara.json"));

        Assert.Equal("R142-05", scenario.RouteId);
        Assert.Empty(scenario.DoorEvents);
        Assert.Equal("recordings/la_bus_highlights.mp4.result.json", scenario.Vision.Recording);
    }
}
