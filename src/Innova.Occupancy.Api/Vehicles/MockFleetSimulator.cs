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
/// Can be reconfigured on the fly via the API to test what-if scenarios.
/// </summary>
public sealed class MockFleetSimulator(
    VehicleStateStore store,
    RawAggregator rawData,
    IOptions<MockFleetOptions> options,
    IHostEnvironment environment,
    TimeProvider time,
    ILogger<MockFleetSimulator> logger) : BackgroundService
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private SimulationParameters _parameters = SimulationParameters.Default;
    private MockFleet? _fleet;
    private IReadOnlyList<SimulatedBus> _buses = [];
    private TimeSpan _interval = TimeSpan.FromSeconds(5);
    private double? _hourOverride;

    public SimulationParameters Parameters => _parameters;

    public async Task<SimulationParameters> ReconfigureAsync(SimulationParameters newParameters, CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            _parameters = newParameters;
            if (_fleet is null)
            {
                return _parameters;
            }

            store.ResetSimulated();

            // Out-of-service buses report once and then go silent
            foreach (var bus in _fleet.Buses.Where(bus => bus.OutOfService))
            {
                var depot = _fleet.Routes.First(route => route.RouteId == bus.RouteId).Corridor[0];
                store.Apply(bus.VehicleId, new VehicleObservation(
                    time.GetUtcNow(),
                    depot,
                    new OccupancyReading(0, bus.Capacity, SensorSource.Simulated),
                    null,
                    new DeviceStatusReport(false, "sim-2.0")));
            }

            var random = new Random(142);
            _buses = CreateBuses(_fleet, random, _parameters);

            var start = time.GetUtcNow();
            var replayFrom = ReplayStart(start, options.Value, _hourOverride);
            var warmUpFrom = start - TimeSpan.FromMinutes(Math.Max(0, options.Value.WarmUpMinutes));
            for (var moment = replayFrom; moment < start; moment += _interval)
            {
                foreach (var bus in _buses)
                {
                    store.Apply(bus.VehicleId, bus.Step(moment, _interval, random, _hourOverride, _parameters), backfill: moment < warmUpFrom);
                }
            }

            logger.LogInformation(
                "Mock fleet reconfigured: demand scale={Scale:0.00}, peak active={PeakActive:P0}, valley active={ValleyActive:P0}, replayed since {ReplayFrom:HH:mm}",
                _parameters.DemandScale,
                _parameters.PeakActiveShare,
                _parameters.ValleyActiveShare,
                replayFrom.ToOffset(TransitTiming.CostaRicaOffset));

            return _parameters;
        }
        finally
        {
            _gate.Release();
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            return;
        }

        var path = Path.GetFullPath(options.Value.FleetFile, environment.ContentRootPath);
        _fleet = MockFleet.Load(path);
        _interval = TimeSpan.FromSeconds(Math.Max(1, options.Value.IntervalSeconds));
        _hourOverride = TransitTiming.ParseTimeOfDay(options.Value.TimeOfDayOverride);

        var random = new Random(142);
        _buses = CreateBuses(_fleet, random, _parameters);

        // Out-of-service buses report once and then go silent, so apps can test stale data.
        foreach (var bus in _fleet.Buses.Where(bus => bus.OutOfService))
        {
            var depot = _fleet.Routes.First(route => route.RouteId == bus.RouteId).Corridor[0];
            store.Apply(bus.VehicleId, new VehicleObservation(
                time.GetUtcNow(),
                depot,
                new OccupancyReading(0, bus.Capacity, SensorSource.Simulated),
                null,
                new DeviceStatusReport(false, "sim-2.0")));
        }

        // Replay the last minutes so loads, door events and history already look lived-in. Earlier
        // replayed hours (the day since BackfillFrom) only feed the fleet totals, so the per-bus
        // history and events endpoints answer exactly as they did before backfill existed.
        var start = time.GetUtcNow();
        var replayFrom = ReplayStart(start, options.Value, _hourOverride);
        var warmUpFrom = start - TimeSpan.FromMinutes(Math.Max(0, options.Value.WarmUpMinutes));
        for (var moment = replayFrom; moment < start; moment += _interval)
        {
            foreach (var bus in _buses)
            {
                store.Apply(bus.VehicleId, bus.Step(moment, _interval, random, _hourOverride, _parameters), backfill: moment < warmUpFrom);
            }
        }

        logger.LogInformation(
            "Mock fleet '{Operator}' started: {Active} buses running (target fleet size {Target}), {OutOfService} out of service, replayed since {ReplayFrom:HH:mm} Costa Rica time, demand hour {Hour}",
            _fleet.Operator.Name,
            _buses.Count,
            _parameters.TotalFleetSize,
            _fleet.Buses.Count - _buses.Count,
            replayFrom.ToOffset(TransitTiming.CostaRicaOffset),
            options.Value.TimeOfDayOverride is { Length: > 0 } fixedHour ? fixedHour : "from clock");

        using var timer = new PeriodicTimer(_interval, time);
        do
        {
            var now = time.GetUtcNow();
            await _gate.WaitAsync(stoppingToken);
            try
            {
                foreach (var bus in _buses)
                {
                    // A bus whose OnboardComputerApp is sending raw data is driven by that data.
                    if (!rawData.HasRecentRawData(bus.VehicleId, now))
                    {
                        store.Apply(bus.VehicleId, bus.Step(now, _interval, random, _hourOverride, _parameters));
                    }
                }
            }
            finally
            {
                _gate.Release();
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    /// <summary>
    /// Where the startup replay begins: the backfill hour of the current service day, or the
    /// warm-up minutes if earlier. Before the backfill hour (overnight) the service day is
    /// yesterday's, so a restart at 1 a.m. still has the day that just ended.
    /// </summary>
    public static DateTimeOffset ReplayStart(DateTimeOffset now, MockFleetOptions options, double? hourOverride)
    {
        var warmUp = now - TimeSpan.FromMinutes(Math.Max(0, options.WarmUpMinutes));
        if (hourOverride is not null || TransitTiming.ParseTimeOfDay(options.BackfillFrom, "MockFleet:BackfillFrom") is not { } backfillHour)
        {
            return warmUp;
        }

        var local = now.ToOffset(TransitTiming.CostaRicaOffset);
        var backfill = new DateTimeOffset(local.Date, TransitTiming.CostaRicaOffset).AddHours(backfillHour);
        if (backfill > now)
        {
            backfill = backfill.AddDays(-1);
        }

        return backfill < warmUp ? backfill : warmUp;
    }

    /// <summary>Spreads each route's buses evenly along its corridor, alternating directions.</summary>
    public static IReadOnlyList<SimulatedBus> CreateBuses(MockFleet fleet, Random random, SimulationParameters? parameters = null, int? targetFleetSize = null)
    {
        var routes = fleet.Routes.ToDictionary(route => route.RouteId, TransitRoute.From);
        var activeBuses = fleet.Buses.Where(bus => !bus.OutOfService).ToList();

        if (parameters?.Ramales is { Count: > 0 } ramales)
        {
            var simulated = new List<SimulatedBus>();
            var platePool = activeBuses.Select(b => b.VehicleId).ToList();
            var plateIndex = 0;

            foreach (var ramal in ramales.Where(r => r.BusCount > 0))
            {
                var route = routes.TryGetValue(ramal.RouteId, out var r) ? r : routes.Values.First();
                var capacity = route.IsTrunk ? 90 : 50;

                for (var i = 0; i < ramal.BusCount; i++)
                {
                    string plate;
                    if (plateIndex < platePool.Count)
                    {
                        plate = platePool[plateIndex++];
                    }
                    else
                    {
                        plate = $"SJB-X{plateIndex + 1:D3}";
                        plateIndex++;
                    }

                    double scheduledDeparture;
                    bool isPrepositioning = false;

                    if (route.IsTrunk)
                    {
                        // Staggered 6-minute headway spacing on Trunk 142
                        // Bus 0 departs at 04:30 in commercial inbound service
                        // Bus 1 departs at 04:30 in express deadhead to San José to open 05:00 outbound service
                        // Bus 2 departs at 04:36 in commercial inbound service (6 min after Bus 0)
                        // Bus 3 departs at 04:42 in commercial inbound service ...
                        if (i == 0)
                        {
                            scheduledDeparture = 4.5; // 04:30
                        }
                        else if (i == 1)
                        {
                            scheduledDeparture = 4.5; // 04:30 Deadhead to SJ
                            isPrepositioning = true;
                        }
                        else
                        {
                            scheduledDeparture = 4.5 + ((i - 1) * 0.1); // 04:36, 04:42, 04:48...
                        }
                    }
                    else
                    {
                        // Feeder departures: 15-minute headway spacing
                        scheduledDeparture = 4.5 + (i * 0.25);
                    }

                    simulated.Add(new SimulatedBus(
                        plate,
                        capacity,
                        route,
                        startFraction: route.IsTrunk ? 1.0 : 0.0,
                        startDirection: route.IsTrunk ? TravelDirection.Inbound : TravelDirection.Outbound,
                        initialPassengers: 0,
                        serviceRank: (i + 0.5) / ramal.BusCount,
                        scheduledDepartureHour: scheduledDeparture,
                        isEarlyPrepositioning: isPrepositioning));
                }
            }

            return simulated;
        }

        var target = targetFleetSize ?? parameters?.TotalFleetSize ?? activeBuses.Count;
        if (target <= 0) target = activeBuses.Count;

        List<MockBus> selectedBuses;
        if (target >= activeBuses.Count)
        {
            selectedBuses = [.. activeBuses];
            var trunkRoute = fleet.Routes.First(r => r.Kind == MockRouteKind.Trunk);
            for (var i = activeBuses.Count; i < target; i++)
            {
                selectedBuses.Add(new MockBus($"SJB-X{i + 1:D3}", i + 1, trunkRoute.RouteId, 90, false));
            }
        }
        else
        {
            // Proportionally sample buses: ensure trunk and primary feeders get representation
            var grouped = activeBuses.GroupBy(b => b.RouteId).OrderByDescending(g => g.Count()).ToList();
            selectedBuses = [];
            foreach (var g in grouped)
            {
                if (selectedBuses.Count < target)
                {
                    selectedBuses.Add(g.First());
                }
            }
            var remaining = activeBuses.Except(selectedBuses).ToList();
            for (var i = 0; selectedBuses.Count < target && i < remaining.Count; i++)
            {
                selectedBuses.Add(remaining[i]);
            }
        }

        return selectedBuses
            .GroupBy(bus => bus.RouteId)
            .SelectMany(group =>
            {
                var route = routes.TryGetValue(group.Key, out var r) ? r : routes.Values.First();
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
