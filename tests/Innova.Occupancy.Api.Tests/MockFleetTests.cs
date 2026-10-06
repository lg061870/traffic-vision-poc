using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Transit;
using Innova.Occupancy.Api.Vehicles;
using Innova.Occupancy.Api.Vehicles.Simulation;
using Xunit.Abstractions;

namespace Innova.Occupancy.Api.Tests;

public sealed class MockFleetTests(ITestOutputHelper output)
{
    private static readonly string FleetPath = Path.Combine(AppContext.BaseDirectory, "MockData", "coronado-fleet.json");
    private static readonly DateTimeOffset Midnight = new(2026, 10, 5, 0, 0, 0, TimeSpan.FromHours(-6));

    [Fact]
    public void Fleet_matches_the_coronado_scenario()
    {
        var fleet = MockFleet.Load(FleetPath);

        Assert.Equal(43, fleet.Buses.Count);
        Assert.Equal(43, fleet.Buses.Select(bus => bus.VehicleId).Distinct().Count());
        Assert.Equal(27, fleet.Buses.Count(bus => bus.RouteId == "R142"));
        Assert.Equal(16, fleet.Buses.Count(bus => bus.RouteId != "R142"));
        Assert.Equal(10, fleet.Routes.Count(route => route.Kind == MockRouteKind.Feeder));
        Assert.All(fleet.Buses, bus => Assert.True(VehicleId.TryNormalize(bus.VehicleId, out var id) && id == bus.VehicleId));
    }

    [Fact]
    public void Simulated_heading_follows_the_street_and_is_empty_when_stopped()
    {
        // A street running due north; the bus starts near the south end heading north.
        GeoLocation[] corridor = [new(9.90, -84.0), new(9.95, -84.0)];
        var route = TransitRoute.From(new MockRoute("T1", "Ruta T1 · Sur – Norte", MockRouteKind.Trunk, corridor));
        var bus = new SimulatedBus("SJB-0001", 90, route, 0.1, TravelDirection.Outbound, 0, 0);
        var noon = Midnight.AddHours(12);

        var moving = bus.Step(noon, TimeSpan.FromSeconds(5), new Random(1)).Location!;
        Assert.True(moving.SpeedKmh > 0);
        Assert.Equal(0, moving.HeadingDeg);

        var southbound = new SimulatedBus("SJB-0002", 90, route, 0.9, TravelDirection.Inbound, 0, 0);
        Assert.Equal(180, southbound.Step(noon, TimeSpan.FromSeconds(5), new Random(1)).Location!.HeadingDeg);

        // Run until the bus stops; a stopped bus has no heading.
        var stopped = Enumerable.Range(1, 200)
            .Select(i => bus.Step(noon.AddSeconds(5 * i), TimeSpan.FromSeconds(5), new Random(i)).Location!)
            .First(location => location.SpeedKmh == 0);
        Assert.Null(stopped.HeadingDeg);
    }

    [Fact]
    public void A_simulated_day_carries_about_the_operators_daily_ridership()
    {
        var fleet = MockFleet.Load(FleetPath);
        var random = new Random(142);
        var buses = MockFleetSimulator.CreateBuses(fleet, random);
        var step = TimeSpan.FromSeconds(5);
        var morningPeak = 0;
        var eveningPeak = 0;

        for (var now = Midnight; now < Midnight.AddDays(1); now += step)
        {
            foreach (var bus in buses)
            {
                var observation = bus.Step(now, step, random);
                if (observation.Occupancy is { Capacity: 90 } trunk)
                {
                    var percent = trunk.PassengerCount * 100 / trunk.Capacity;
                    if (now.Hour is >= 6 and < 8) morningPeak = Math.Max(morningPeak, percent);
                    if (now.Hour is >= 16 and < 19) eveningPeak = Math.Max(eveningPeak, percent);
                }
            }
        }

        var riders = buses.Sum(bus => bus.TotalBoardings);
        output.WriteLine($"Simulated riders in 24 h: {riders:N0} (target {fleet.Operator.DailyRiders:N0}); busiest trunk bus 6-8 a.m.: {morningPeak}%, 4-7 p.m.: {eveningPeak}%");

        Assert.InRange(riders, fleet.Operator.DailyRiders * 0.8, fleet.Operator.DailyRiders * 1.2);
        Assert.True(morningPeak >= 80, $"Morning rush should crowd trunk buses; busiest was {morningPeak}%.");
        Assert.True(eveningPeak >= 80, $"Evening rush should crowd trunk buses; busiest was {eveningPeak}%.");
    }
}
