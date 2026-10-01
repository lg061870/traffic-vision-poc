using Innova.OnboardComputer.App.Contracts;
using Innova.OnboardComputer.App.Simulation;

namespace Innova.OnboardComputer.App.Tests;

public sealed class ScenarioTimelineTests
{
    private static readonly DateTimeOffset Epoch = new(2026, 10, 1, 13, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Shipped_scenario_is_valid_and_balanced_so_it_can_loop()
    {
        var scenario = Scenario.Load(TestSupport.ScenarioFile);

        Assert.Equal("R142-05", scenario.RouteId);
        Assert.Equal(scenario.InitialOnBoard, scenario.FinalOnBoard);
        Assert.Equal(scenario.DoorEvents.Count(item => item.Type == RawFormats.DoorOpened),
                     scenario.DoorEvents.Count(item => item.Type == RawFormats.DoorClosed));
    }

    [Fact]
    public void Minute_zero_of_the_scenario_is_the_epoch()
    {
        var timeline = TestSupport.Timeline(Epoch);

        var batch = timeline.Between(Epoch.AddTicks(-1), Epoch.AddSeconds(30));

        Assert.Equal(Epoch, batch.Gps[0].At);
        Assert.Equal(31, batch.Gps.Count);
        Assert.Equal(Epoch, batch.VisionFrames[0].At);
        Assert.Equal([Epoch.AddSeconds(5), Epoch.AddSeconds(20)], batch.DoorEvents.Select(item => item.At));
        Assert.All(batch.Gps, sample => Assert.InRange(sample.At, Epoch, Epoch.AddSeconds(30)));
    }

    [Fact]
    public void Gps_follows_the_route_from_its_geojson()
    {
        var timeline = TestSupport.Timeline(Epoch);
        var route = RoutePath.Load(Path.Combine(Path.GetDirectoryName(TestSupport.ScenarioFile)!, "coronado-routes-osm.geojson"), "R142-05");

        var trip = timeline.Between(Epoch.AddTicks(-1), Epoch + timeline.Duration).Gps;
        var atTerminal = trip[0];
        var atSanRafael = trip.Single(sample => sample.At == Epoch.AddMinutes(10));
        var driving = trip.Single(sample => sample.At == Epoch.AddMinutes(2));

        Assert.Equal(9.976073, atTerminal.Lat, 6);
        Assert.Equal(-84.007282, atTerminal.Lon, 6);
        Assert.Equal(route.At(route.LengthKm).Lat, atSanRafael.Lat, 4);
        Assert.Equal(route.At(route.LengthKm).Lon, atSanRafael.Lon, 4);
        Assert.Equal(0, atSanRafael.SpeedKmh);
        Assert.InRange(driving.SpeedKmh, 15, 25);
        // Every sample lies on the route line.
        Assert.All(trip, sample => Assert.InRange(sample.Lat, 9.97, 9.99));
    }

    [Fact]
    public void Looping_restamps_each_pass_after_the_previous_one()
    {
        var timeline = TestSupport.Timeline(Epoch);
        var thirdPass = Epoch + (2 * timeline.Duration);

        var first = timeline.Between(Epoch.AddTicks(-1), Epoch.AddMinutes(1));
        var third = timeline.Between(thirdPass.AddTicks(-1), thirdPass.AddMinutes(1));

        Assert.Equal(
            first.DoorEvents.Select(item => item with { At = item.At + (2 * timeline.Duration) }),
            third.DoorEvents);
        Assert.Equal(
            first.Gps.Select(sample => (sample.Lat, sample.Lon)),
            third.Gps.Select(sample => (sample.Lat, sample.Lon)));
    }

    [Fact]
    public void Without_looping_the_sources_go_quiet_after_one_pass()
    {
        var timeline = TestSupport.Timeline(Epoch, loop: false);

        var after = timeline.Between(Epoch + timeline.Duration, Epoch + (3 * timeline.Duration));

        Assert.Empty(after.Gps);
        Assert.Empty(after.DoorEvents);
        Assert.Empty(after.VisionFrames);
    }

    [Fact]
    public void A_window_cut_into_pieces_yields_the_same_items()
    {
        var timeline = TestSupport.Timeline(Epoch);
        var from = Epoch.AddMinutes(18);
        var to = Epoch.AddMinutes(23);

        var whole = timeline.Between(from, to);
        var pieces = Enumerable.Range(0, 300)
            .Select(second => timeline.Between(from.AddSeconds(second), from.AddSeconds(second + 1)))
            .ToArray();

        Assert.Equal(whole.Gps, pieces.SelectMany(batch => batch.Gps));
        Assert.Equal(whole.DoorEvents, pieces.SelectMany(batch => batch.DoorEvents));
        Assert.Equal(
            whole.VisionFrames.Select(frame => frame.Detections.Count),
            pieces.SelectMany(batch => batch.VisionFrames).Select(frame => frame.Detections.Count));
    }

    [Fact]
    public void Vision_sees_the_passengers_on_board_with_valid_detections()
    {
        var timeline = TestSupport.Timeline(Epoch);

        // 18 boarded at the terminal by 00:00:40; the camera misses a few now and then.
        var frames = timeline.Between(Epoch.AddSeconds(41), Epoch.AddSeconds(160)).VisionFrames;

        Assert.All(frames, frame => Assert.InRange(frame.Detections.Count, 14, 18));
        Assert.Equal(18, frames.Max(frame => frame.Detections.Count));
        Assert.All(frames.SelectMany(frame => frame.Detections), detection =>
        {
            Assert.Contains(detection.Class, new[] { "sitting", "standing" });
            Assert.InRange(detection.Score, 0, 1);
            Assert.Equal(4, detection.Box.Count);
            Assert.True(detection.Box[0] < detection.Box[2] && detection.Box[1] < detection.Box[3]);
        });
    }
}
