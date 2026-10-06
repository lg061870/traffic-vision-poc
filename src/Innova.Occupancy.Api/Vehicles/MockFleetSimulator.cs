using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Ingestion;
using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Transit;
using Innova.Occupancy.Api.Vehicles.Simulation;
using Microsoft.Extensions.Options;

namespace Innova.Occupancy.Api.Vehicles;

/// <summary>
/// Simulates the mock fleet in MockData so client apps can be built before real devices report.
/// Simulated buses go through the same store as real observations, marked with source SIMULATED.
/// </summary>
public sealed class MockFleetSimulator(
    VehicleStateStore store,
    RawAggregator rawData,
    IOptions<MockFleetOptions> options,
    IHostEnvironment environment,
    TimeProvider time,
    ILogger<MockFleetSimulator> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            return;
        }

        var path = Path.GetFullPath(options.Value.FleetFile, environment.ContentRootPath);
        var fleet = MockFleet.Load(path);
        var random = new Random(142);
        var buses = CreateBuses(fleet, random);

        // Out-of-service buses report once and then go silent, so apps can test stale data.
        foreach (var bus in fleet.Buses.Where(bus => bus.OutOfService))
        {
            var depot = fleet.Routes.First(route => route.RouteId == bus.RouteId).Corridor[0];
            store.Apply(bus.VehicleId, new VehicleObservation(
                time.GetUtcNow(),
                depot,
                new OccupancyReading(0, bus.Capacity, SensorSource.Simulated),
                null,
                new DeviceStatusReport(false, "sim-2.0")));
        }

        var interval = TimeSpan.FromSeconds(Math.Max(1, options.Value.IntervalSeconds));
        var hourOverride = TransitTiming.ParseTimeOfDay(options.Value.TimeOfDayOverride);

        // Replay the last minutes so loads, door events and history already look lived-in.
        var start = time.GetUtcNow();
        for (var moment = start - TimeSpan.FromMinutes(Math.Max(0, options.Value.WarmUpMinutes)); moment < start; moment += interval)
        {
            foreach (var bus in buses)
            {
                store.Apply(bus.VehicleId, bus.Step(moment, interval, random, hourOverride));
            }
        }

        logger.LogInformation(
            "Mock fleet '{Operator}' started: {Active} buses running, {OutOfService} out of service, demand hour {Hour}",
            fleet.Operator.Name,
            buses.Count,
            fleet.Buses.Count - buses.Count,
            options.Value.TimeOfDayOverride is { Length: > 0 } fixedHour ? fixedHour : "from clock");

        using var timer = new PeriodicTimer(interval, time);
        do
        {
            var now = time.GetUtcNow();
            foreach (var bus in buses)
            {
                // A bus whose OnboardComputerApp is sending raw data is driven by that data.
                if (!rawData.HasRecentRawData(bus.VehicleId, now))
                {
                    store.Apply(bus.VehicleId, bus.Step(now, interval, random, hourOverride));
                }
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    /// <summary>Spreads each route's buses evenly along its corridor, alternating directions.</summary>
    public static IReadOnlyList<SimulatedBus> CreateBuses(MockFleet fleet, Random random)
    {
        var routes = fleet.Routes.ToDictionary(route => route.RouteId, TransitRoute.From);
        return fleet.Buses
            .Where(bus => !bus.OutOfService)
            .GroupBy(bus => bus.RouteId)
            .SelectMany(group =>
            {
                var route = routes[group.Key];
                var onRoute = group.ToArray();
                return onRoute.Select((bus, index) => new SimulatedBus(
                    bus.VehicleId,
                    bus.Capacity,
                    route,
                    (index + 0.5) / onRoute.Length,
                    index % 2 == 0 ? TravelDirection.Inbound : TravelDirection.Outbound,
                    (int)(bus.Capacity * (0.1 + (random.NextDouble() * 0.3))),
                    (index + 0.5) / onRoute.Length));
            })
            .ToArray();
    }
}
