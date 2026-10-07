using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Vehicles;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Innova.Occupancy.Api.Tests;

public sealed class UsageCalculatorTests
{
    private static readonly DateTimeOffset SevenAm = new(2026, 10, 6, 7, 0, 0, TimeSpan.FromHours(-6));

    private static HistoryEntry Reading(DateTimeOffset at, int passengers, string? routeId = "R142", SensorSource source = SensorSource.Simulated) =>
        new(at, passengers, 100, source, routeId);

    [Fact]
    public void A_reading_counts_until_the_next_one_and_is_split_at_the_hour()
    {
        HistoryEntry[] history =
        [
            Reading(SevenAm.AddMinutes(59).AddSeconds(30), 50),
            Reading(SevenAm.AddMinutes(60).AddSeconds(20), 95),
        ];

        var hours = UsageCalculator.Hourly(history, [], SevenAm, SevenAm.AddMinutes(60).AddSeconds(30));

        Assert.Equal(2, hours.Count);
        Assert.Equal(30, hours[0].ServiceSeconds);
        Assert.Equal(30, hours[0].SecondsByBand[5]);
        Assert.Equal(30, hours[1].ServiceSeconds);
        Assert.Equal(20, hours[1].SecondsByBand[5]);
        Assert.Equal(10, hours[1].SecondsByBand[9]);
        Assert.Equal(95, hours[1].PeakPercent);
        Assert.Equal(65, hours[1].AveragePercent);
    }

    [Fact]
    public void Gaps_without_reports_and_parked_time_are_not_service()
    {
        HistoryEntry[] history =
        [
            Reading(SevenAm, 10),
            // 10 minutes of silence: only the first 60 s of the reading count.
            Reading(SevenAm.AddMinutes(10), 10, routeId: null),
            Reading(SevenAm.AddMinutes(11), 10),
        ];

        var hour = Assert.Single(UsageCalculator.Hourly(history, [], SevenAm, SevenAm.AddMinutes(12)));

        Assert.Equal(60 + 60, hour.ServiceSeconds);
        Assert.Equal("R142", hour.RouteId);
    }

    [Fact]
    public void A_device_bus_without_a_trip_is_in_service()
    {
        HistoryEntry[] history = [Reading(SevenAm, 10, routeId: null, source: SensorSource.CabinCamera)];

        var hour = Assert.Single(UsageCalculator.Hourly(history, [], SevenAm, SevenAm.AddSeconds(30)));

        Assert.Equal(30, hour.ServiceSeconds);
        Assert.Equal(SensorSource.CabinCamera, hour.Source);
        Assert.Null(hour.RouteId);
    }

    [Fact]
    public void Boardings_count_in_the_hour_the_door_closed()
    {
        VehicleDoorEvent[] events =
        [
            new(1, 12, 3, null, SevenAm.AddMinutes(5), SevenAm.AddMinutes(5).AddSeconds(20), 40),
            new(1, 4, 1, null, SevenAm.AddMinutes(65), SevenAm.AddMinutes(65).AddSeconds(20), 43),
        ];

        var hours = UsageCalculator.Hourly([], events, SevenAm, SevenAm.AddHours(2));

        Assert.Equal([12, 4], hours.Select(hour => hour.Boardings));
        Assert.Equal([3, 1], hours.Select(hour => hour.Alightings));
        Assert.All(hours, hour => Assert.Equal(0, hour.ServiceSeconds));
    }

    [Theory]
    [InlineData("10:30", "05:00", "05:00")]
    [InlineData("05:20", "05:00", "04:20")]
    [InlineData("04:00", "05:00", "-19:00")]
    [InlineData("10:30", "", "09:30")]
    public void The_startup_replay_covers_the_day_since_the_backfill_hour(string now, string backfillFrom, string expected)
    {
        var day = new DateTimeOffset(2026, 10, 6, 0, 0, 0, TimeSpan.FromHours(-6));
        var options = new MockFleetOptions { WarmUpMinutes = 60, BackfillFrom = backfillFrom };

        var start = MockFleetSimulator.ReplayStart(day + TimeSpan.Parse(now), options, hourOverride: null);

        Assert.Equal(day + TimeSpan.Parse(expected), start);
    }

    [Fact]
    public void A_fixed_demand_hour_only_warms_up()
    {
        var now = new DateTimeOffset(2026, 10, 6, 10, 30, 0, TimeSpan.FromHours(-6));
        var options = new MockFleetOptions { WarmUpMinutes = 60, BackfillFrom = "05:00" };

        Assert.Equal(now.AddHours(-1), MockFleetSimulator.ReplayStart(now, options, hourOverride: 7.5));
    }

    [Fact]
    public void Backfilled_hours_feed_the_fleet_totals_but_never_the_per_bus_endpoints()
    {
        var clock = new FakeTimeProvider(SevenAm.AddHours(3));
        var store = new VehicleStateStore(Options.Create(new OccupancyApiOptions()), clock);
        VehicleObservation At(DateTimeOffset moment, int boardings) => new(
            moment,
            new GeoLocation(9.95, -84.03),
            new OccupancyReading(40, 90, SensorSource.Simulated),
            [new DoorEventReport(1, boardings, 0, moment.AddSeconds(-20), moment)],
            null,
            new TripDescriptor("R142", Innova.Occupancy.Api.Transit.TravelDirection.Inbound));

        store.Apply("SJB-1", At(SevenAm, 12), backfill: true);
        Assert.Empty(store.List());
        store.Apply("SJB-1", At(SevenAm.AddHours(2).AddMinutes(30), 5));

        var history = store.GetHistory("SJB-1", SevenAm, clock.GetUtcNow(), TimeSpan.FromHours(1))!;
        var events = store.GetEvents("SJB-1", since: null)!;
        var hours = store.GetHourlyUsage(SevenAm, clock.GetUtcNow()).Single().Hours;

        Assert.Equal(SevenAm.AddHours(2), Assert.Single(history).Time);
        Assert.Equal(5, Assert.Single(events).Boardings);
        Assert.Equal([12, 5], hours.Select(hour => hour.Boardings));
    }
}
