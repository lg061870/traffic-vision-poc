using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Ingestion;
using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Vehicles;
using Microsoft.Extensions.Options;

namespace Innova.Occupancy.Api.Tests;

public sealed class RawAggregatorTests
{
    private const string Bus = "SJB-16959";
    private static readonly DateTimeOffset Start = new(2026, 10, 1, 0, 15, 0, TimeSpan.Zero);
    private readonly ManualTimeProvider _time = new(Start);
    private readonly VehicleStateStore _store;
    private readonly RawAggregator _aggregator;

    public RawAggregatorTests()
    {
        _store = new VehicleStateStore(Options.Create(new OccupancyApiOptions()), _time);
        _aggregator = new RawAggregator(_store, _time);
    }

    [Fact]
    public void Door_counts_build_a_running_total_and_a_door_event()
    {
        Send(1, doors:
        [
            Door(DoorSignalType.Opened, 0),
            Door(DoorSignalType.Count, 5, boardings: 3, alightings: 1),
            Door(DoorSignalType.Closed, 9)
        ]);

        var state = _store.Get(Bus)!;
        var doorEvent = Assert.Single(_store.GetEvents(Bus, null)!);

        Assert.Equal(2, state.Occupancy!.PassengerCount);
        Assert.Equal(SensorSource.DoorCounter3D, state.Occupancy.Source);
        Assert.Equal((3, 1), (doorEvent.Boardings, doorEvent.Alightings));
        Assert.Equal(Start, doorEvent.OpenedAt);
        Assert.Equal(Start.AddSeconds(9), doorEvent.ClosedAt);
    }

    [Fact]
    public void A_door_can_open_in_one_message_and_close_in_the_next()
    {
        Send(1, doors: [Door(DoorSignalType.Opened, 0), Door(DoorSignalType.Count, 3, boardings: 4)]);
        Assert.Equal(4, _store.Get(Bus)!.Occupancy!.PassengerCount);
        Assert.Empty(_store.GetEvents(Bus, null)!);

        Send(2, doors: [Door(DoorSignalType.Count, 11, boardings: 2, alightings: 1), Door(DoorSignalType.Closed, 12)]);

        var doorEvent = Assert.Single(_store.GetEvents(Bus, null)!);
        Assert.Equal((6, 1), (doorEvent.Boardings, doorEvent.Alightings));
        Assert.Equal(5, _store.Get(Bus)!.Occupancy!.PassengerCount);
    }

    [Fact]
    public void A_resent_message_is_not_counted_twice()
    {
        IReadOnlyList<DoorSignal> doors = [Door(DoorSignalType.Opened, 0), Door(DoorSignalType.Count, 2, boardings: 5), Door(DoorSignalType.Closed, 4)];
        var first = Send(7, doors: doors);
        var resent = Send(7, doors: doors);

        Assert.False(first.Duplicate);
        Assert.True(resent.Duplicate);
        Assert.Equal(5, _store.Get(Bus)!.Occupancy!.PassengerCount);
        Assert.Single(_store.GetEvents(Bus, null)!);
    }

    [Fact]
    public void Camera_raises_a_door_count_that_has_drifted_low()
    {
        Send(1, doors: [Door(DoorSignalType.Count, 1, boardings: 3)]);

        Send(2, vision: new VisionReading(Start.AddSeconds(15), 7, 5, 2));

        var occupancy = _store.Get(Bus)!.Occupancy!;
        Assert.Equal(7, occupancy.PassengerCount);
        Assert.Equal(SensorSource.CabinCamera, occupancy.Source);
    }

    [Fact]
    public void Camera_does_not_lower_the_door_count()
    {
        Send(1, doors: [Door(DoorSignalType.Count, 1, boardings: 12)]);

        Send(2, vision: new VisionReading(Start.AddSeconds(15), 8, 8, 0));

        var occupancy = _store.Get(Bus)!.Occupancy!;
        Assert.Equal(12, occupancy.PassengerCount);
        Assert.Equal(SensorSource.DoorCounter3D, occupancy.Source);
    }

    [Fact]
    public void A_camera_only_bus_reports_what_the_camera_sees()
    {
        Send(1, vision: new VisionReading(Start.AddSeconds(5), 9, 6, 3));

        var occupancy = _store.Get(Bus)!.Occupancy!;
        Assert.Equal(9, occupancy.PassengerCount);
        Assert.Equal(SensorSource.CabinCamera, occupancy.Source);
    }

    [Fact]
    public void Gps_sets_the_position_and_marks_the_bus_as_raw_driven()
    {
        Send(1, fixes: [new GpsFix(Start.AddSeconds(10), 9.94653, -84.05351, 0)]);

        Assert.Equal(new GeoLocation(9.94653, -84.05351, 0), _store.Get(Bus)!.Location);
        Assert.True(_aggregator.HasRecentRawData(Bus, Start));
        Assert.False(_aggregator.HasRecentRawData(Bus, Start + RawAggregator.RawDataTakeover + TimeSpan.FromSeconds(1)));
    }

    private RawMessageAccepted Send(
        long sequence,
        IReadOnlyList<DoorSignal>? doors = null,
        VisionReading? vision = null,
        IReadOnlyList<GpsFix>? fixes = null) =>
        _aggregator.Apply(
            Bus,
            90,
            new RawVehicleMessage(sequence, Start.AddSeconds(sequence * 10), null, null, null),
            fixes ?? [],
            0,
            doors ?? [],
            vision);

    private static DoorSignal Door(DoorSignalType type, int second, int boardings = 0, int alightings = 0) =>
        new(1, type, Start.AddSeconds(second), boardings, alightings);
}
