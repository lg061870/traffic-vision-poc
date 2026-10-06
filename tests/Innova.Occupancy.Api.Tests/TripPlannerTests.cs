using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Transit;
using Innova.Occupancy.Api.Vehicles;
using Innova.Occupancy.Api.Vehicles.Simulation;
using Microsoft.Extensions.Options;

namespace Innova.Occupancy.Api.Tests;

public sealed class TripPlannerTests
{
    // Noon in Costa Rica: off-peak speeds (trunk 20 km/h, feeders 24 km/h).
    private static readonly DateTimeOffset Noon = new(2026, 10, 5, 12, 0, 0, TimeSpan.FromHours(-6));
    private static readonly TimeSpan Margin = TimeSpan.FromSeconds(60);

    private readonly ManualTimeProvider _time = new(Noon);
    private readonly TransitNetwork _network = new(MockFleet.Load(TransitNetworkTests.FleetPath));
    private readonly VehicleStateStore _store;
    private readonly TripPlanner _planner;

    public TripPlannerTests()
    {
        _store = new VehicleStateStore(Options.Create(new OccupancyApiOptions()), _time);
        _planner = new TripPlanner(_network, _store, Options.Create(new MockFleetOptions()), _time);
    }

    private TransitRoute Trunk => _network.Routes["R142"];

    [Fact]
    public void Offers_the_first_bus_the_rider_can_reach_in_time()
    {
        var board = Trunk.Stops[10];
        var alight = Trunk.Stops[5];
        // About 20 s away: gone before the rider, standing at the stop, clears the one-minute margin.
        PlaceBus("SJB-0001", Trunk, board.Meters + 100, TravelDirection.Inbound);
        // About 6 minutes away: the one to take.
        PlaceBus("SJB-0002", Trunk, board.Meters + 2000, TravelDirection.Inbound);
        // Parked right before the stop: not running a trip, so never offered.
        PlaceBus("SJB-0003", Trunk, board.Meters + 300, null);

        var plan = Plan(board.Location, alight.Location);

        var option = Assert.Single(plan.Options);
        var ride = Assert.Single(option.Legs).Bus!;
        Assert.Equal("SJB-0002", ride.VehicleId);
        Assert.Equal(TravelDirection.Inbound, ride.Direction);
        Assert.Equal("San José", ride.Headsign);
        Assert.Equal(board.StopId, option.Legs[0].From.StopId);
        Assert.Equal(alight.StopId, option.Legs[0].To.StopId);
        Assert.Equal(5, ride.Stops);
        Assert.Equal(2000, ride.Vehicle.DistanceToStopMeters);
        Assert.InRange(ride.WaitMinutes, 5.5, 7.5);
        Assert.Null(plan.Message);
    }

    [Fact]
    public void Changes_to_a_feeder_at_the_Coronado_terminal()
    {
        var board = Trunk.Stops[^4];
        var feeder = _network.Routes["R142-03"];
        PlaceBus("SJB-0010", Trunk, board.Meters - 1500, TravelDirection.Outbound);
        PlaceBus("SJB-0011", feeder, 300, TravelDirection.Inbound);

        var plan = Plan(board.Location, feeder.Stops[^1].Location);

        var option = Assert.Single(plan.Options, option => option.Transfers == 1);
        var buses = option.Legs.Where(leg => leg.Type == LegType.Bus).ToArray();
        Assert.Equal(["SJB-0010", "SJB-0011"], buses.Select(leg => leg.Bus!.VehicleId));
        Assert.Equal("Terminal de Coronado", buses[0].To.Name);
        Assert.Equal("Dulce Nombre", buses[1].Bus!.Headsign);
        // The feeder bus first finishes its trip to the terminal and rests there.
        Assert.True(buses[1].DepartAt >= buses[0].ArriveAt + Margin);
    }

    [Fact]
    public void Warns_when_the_bus_is_full()
    {
        var board = Trunk.Stops[10];
        PlaceBus("SJB-0020", Trunk, board.Meters + 2000, TravelDirection.Inbound, passengers: 90);

        var plan = Plan(board.Location, Trunk.Stops[5].Location);

        Assert.Contains(plan.Options[0].Warnings, warning => warning.Contains("SJB-0020 viene lleno"));
        Assert.Equal(OccupancyStatus.Full, plan.Options[0].Legs[0].Bus!.Vehicle.Status);
    }

    [Fact]
    public void Says_why_when_nothing_fits()
    {
        var nightPlan = Plan(Trunk.Stops[10].Location, Trunk.Stops[5].Location);
        Assert.Empty(nightPlan.Options);
        Assert.Contains("No hay buses", nightPlan.Message);

        var farPlan = Plan(new GeoLocation(9.86, -84.15), Trunk.Stops[5].Location);
        Assert.Empty(farPlan.Options);
        Assert.Contains("El origen está a más de 1000 m", farPlan.Message);
    }

    [Fact]
    public void Offers_walking_when_the_destination_is_close()
    {
        var plan = Plan(Trunk.Stops[3].Location, Trunk.Stops[4].Location);

        var walk = Assert.Single(Assert.Single(plan.Options).Legs);
        Assert.Equal(LegType.Walk, walk.Type);
    }

    private TripPlan Plan(GeoLocation from, GeoLocation to) =>
        _planner.Plan(new TripRequest(new GeoPoint(from.Lat, from.Lon), new GeoPoint(to.Lat, to.Lon), 4.5, 1000, Margin));

    private void PlaceBus(string vehicleId, TransitRoute route, double meters, TravelDirection? direction, int passengers = 20) =>
        _store.Apply(vehicleId, new VehicleObservation(
            Noon,
            route.PointAt(meters) with { SpeedKmh = 20 },
            new OccupancyReading(passengers, 90, SensorSource.Simulated),
            null,
            null,
            direction is { } way ? new TripDescriptor(route.RouteId, way) : null));
}
