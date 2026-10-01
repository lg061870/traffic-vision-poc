using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Vehicles;
using Microsoft.Extensions.Options;

namespace Innova.Occupancy.Api.Tests;

public sealed class VehicleStateStoreTests
{
    private static readonly DateTimeOffset Start = new(2026, 10, 5, 8, 0, 0, TimeSpan.FromHours(-6));
    private readonly ManualTimeProvider _time = new(Start);
    private readonly VehicleStateStore _store;

    public VehicleStateStoreTests()
    {
        _store = new VehicleStateStore(Options.Create(new OccupancyApiOptions()), _time);
    }

    [Fact]
    public void Latest_state_reflects_the_observation()
    {
        _store.Apply("SJB-8754", Observation(Start, 78, location: new GeoLocation(9.9352, -84.0431, 22)));

        var state = _store.Get("SJB-8754");

        Assert.NotNull(state);
        Assert.False(state.Stale);
        Assert.Equal(new GeoLocation(9.9352, -84.0431, 22), state.Location);
        Assert.Equal(78, state.Occupancy!.PassengerCount);
        Assert.Equal(71, state.Occupancy.Percent);
        Assert.Equal(OccupancyStatus.FewSeatsAvailable, state.Occupancy.Status);
    }

    [Fact]
    public void Unknown_bus_returns_null()
    {
        Assert.Null(_store.Get("SJB-0000"));
        Assert.Null(_store.GetEvents("SJB-0000", null));
    }

    [Fact]
    public void Bus_becomes_stale_when_it_stops_reporting()
    {
        _store.Apply("SJB-8754", Observation(Start, 10));

        _time.Advance(TimeSpan.FromSeconds(61));
        var state = _store.Get("SJB-8754")!;

        Assert.True(state.Stale);
        Assert.False(state.Device.Online);
    }

    [Fact]
    public void Older_message_does_not_overwrite_newer_state_but_is_kept_in_history()
    {
        _store.Apply("SJB-8754", Observation(Start.AddSeconds(30), 50, location: new GeoLocation(9.94, -84.05)));
        _store.Apply("SJB-8754", Observation(Start, 40, location: new GeoLocation(9.90, -84.00)));

        var state = _store.Get("SJB-8754")!;
        var history = _store.GetHistory("SJB-8754", Start, Start.AddMinutes(1), TimeSpan.FromSeconds(10))!;

        Assert.Equal(50, state.Occupancy!.PassengerCount);
        Assert.Equal(9.94, state.Location!.Lat);
        Assert.Equal(Start.AddSeconds(30), state.AsOf);
        Assert.Equal([40, 50], history.Select(point => point.PassengerCount));
    }

    [Fact]
    public void Door_events_are_filtered_by_since_and_carry_occupancy_after()
    {
        var door = new DoorEventReport(1, 4, 1, Start.AddSeconds(-40), Start.AddSeconds(-5));
        _store.Apply("SJB-8754", Observation(Start, 78, doorEvents: [door]));

        var all = _store.GetEvents("SJB-8754", null)!;
        var none = _store.GetEvents("SJB-8754", Start)!;

        var only = Assert.Single(all);
        Assert.Equal(4, only.Boardings);
        Assert.Equal(78, only.OccupancyAfter);
        Assert.Empty(none);
    }

    [Fact]
    public void History_reports_last_and_peak_per_bucket()
    {
        _store.Apply("SJB-8754", Observation(Start.AddMinutes(0), 30));
        _store.Apply("SJB-8754", Observation(Start.AddMinutes(2), 60));
        _store.Apply("SJB-8754", Observation(Start.AddMinutes(4), 45));
        _store.Apply("SJB-8754", Observation(Start.AddMinutes(6), 20));

        var points = _store.GetHistory("SJB-8754", Start, Start.AddMinutes(10), TimeSpan.FromMinutes(5))!;

        Assert.Collection(
            points,
            first =>
            {
                Assert.Equal(Start, first.Time);
                Assert.Equal(45, first.PassengerCount);
                Assert.Equal(60, first.PeakPassengerCount);
            },
            second =>
            {
                Assert.Equal(Start.AddMinutes(5), second.Time);
                Assert.Equal(20, second.PassengerCount);
            });
    }

    private static VehicleObservation Observation(
        DateTimeOffset timestamp,
        int passengers,
        GeoLocation? location = null,
        IReadOnlyList<DoorEventReport>? doorEvents = null) =>
        new(timestamp, location, new OccupancyReading(passengers, 110, SensorSource.DoorCounter3D), doorEvents, null);
}

internal sealed class ManualTimeProvider(DateTimeOffset now) : TimeProvider
{
    private DateTimeOffset _now = now;

    public override DateTimeOffset GetUtcNow() => _now.ToUniversalTime();

    public void Advance(TimeSpan by) => _now += by;
}
