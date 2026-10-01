using Innova.Occupancy.Api.Models;

namespace Innova.Occupancy.Api.Vehicles.Simulation;

/// <summary>
/// One bus driving back and forth along its corridor: it stops every few hundred meters, empties
/// at each end of the line, and boards passengers according to Costa Rica rush hours.
/// </summary>
public sealed class SimulatedBus
{
    private static readonly TimeSpan CostaRicaOffset = TimeSpan.FromHours(-6);
    private static readonly TimeSpan StopDwell = TimeSpan.FromSeconds(20);
    private static readonly TimeSpan TerminalLayover = TimeSpan.FromMinutes(5);

    private readonly int _capacity;
    private readonly MockRouteKind _kind;
    private readonly IReadOnlyList<GeoLocation> _corridor;
    private readonly double[] _segmentMeters;
    private readonly double _totalMeters;
    private double _metersAlong;
    private int _direction;
    private double _metersSinceStop;
    private double _nextStopMeters;
    private bool _atTerminal;
    private bool _parked;
    private TimeSpan _waitRemaining;

    public SimulatedBus(
        string vehicleId,
        int capacity,
        MockRouteKind kind,
        IReadOnlyList<GeoLocation> corridor,
        double startFraction,
        int startDirection,
        int initialPassengers,
        double serviceRank,
        Random random)
    {
        ServiceRank = serviceRank;
        VehicleId = vehicleId;
        _capacity = capacity;
        _kind = kind;
        _corridor = corridor;
        _segmentMeters = corridor.Zip(corridor.Skip(1), DistanceMeters).ToArray();
        _totalMeters = _segmentMeters.Sum();
        _metersAlong = Math.Clamp(startFraction, 0, 1) * _totalMeters;
        _direction = startDirection >= 0 ? 1 : -1;
        Passengers = Math.Clamp(initialPassengers, 0, capacity);
        _nextStopMeters = NextStopSpacing(random);
    }

    public string VehicleId { get; }

    /// <summary>0..1: buses with a low rank stay in service when the operator runs fewer buses.</summary>
    public double ServiceRank { get; }

    public int Passengers { get; private set; }

    /// <summary>Everyone who boarded since the bus was created (used to calibrate daily ridership).</summary>
    public int TotalBoardings { get; private set; }

    private bool Inbound => _direction < 0;

    private int MaximumLoad => (int)(_capacity * 1.15);

    public VehicleObservation Step(DateTimeOffset now, TimeSpan elapsed, Random random, double? hourOverride = null)
    {
        var hour = hourOverride ?? now.ToOffset(CostaRicaOffset).TimeOfDay.TotalHours;
        DoorEventReport? doorEvent = null;
        double speedKmh = 0;
        var inService = ServiceRank < ActiveShare(hour);

        if (_waitRemaining > TimeSpan.Zero)
        {
            // Doors open at a stop, or resting at the terminal.
            _waitRemaining -= elapsed;
        }
        else if (_parked)
        {
            // Waiting at the terminal, empty, until the schedule needs this bus again.
            _parked = !inService;
        }
        else if (_atTerminal && !inService)
        {
            // Last trip done: drop everyone and park.
            doorEvent = Board(now, 0, Passengers);
            _atTerminal = false;
            _parked = true;
        }
        else if (_atTerminal)
        {
            // End of the line: everyone gets off, then the bus loads for the trip back. Terminals
            // fill buses at rush hour: San José in the evening, and Coronado in the morning,
            // where feeder passengers transfer to the trunk line.
            var alightings = Passengers;
            _direction = -_direction;
            _atTerminal = false;
            var terminalBoardings = (int)Math.Round(_capacity * Demand(hour) * (0.5 + (random.NextDouble() * 0.5)));
            doorEvent = Board(now, terminalBoardings, alightings);
            _waitRemaining = TerminalLayover;
        }
        else if (_metersSinceStop >= _nextStopMeters)
        {
            var share = Inbound ? 0.03 : 0.15;
            var alightings = (int)Math.Round(Passengers * random.NextDouble() * share * 2);
            var boardings = (int)Math.Round(random.NextDouble() * StopBoardingMaximum * Demand(hour));
            doorEvent = Board(now, boardings, alightings);
            _waitRemaining = StopDwell - elapsed;
            _metersSinceStop = 0;
            _nextStopMeters = NextStopSpacing(random);
        }
        else
        {
            speedKmh = CruiseKmh(hour) + random.Next(-4, 5);
            var meters = speedKmh / 3.6 * elapsed.TotalSeconds;
            _metersSinceStop += meters;
            _metersAlong += meters * _direction;
            if (_metersAlong <= 0 || _metersAlong >= _totalMeters)
            {
                _metersAlong = Math.Clamp(_metersAlong, 0, _totalMeters);
                _atTerminal = true;
            }
        }

        return new VehicleObservation(
            now,
            Position() with { SpeedKmh = speedKmh },
            new OccupancyReading(Passengers, _capacity, SensorSource.Simulated),
            doorEvent is null ? null : [doorEvent],
            new DeviceStatusReport(true, "sim-2.0"));
    }

    public GeoLocation Position()
    {
        var remaining = _metersAlong;
        for (var index = 0; index < _segmentMeters.Length; index++)
        {
            if (remaining <= _segmentMeters[index] || index == _segmentMeters.Length - 1)
            {
                var fraction = _segmentMeters[index] <= 0 ? 0 : Math.Clamp(remaining / _segmentMeters[index], 0, 1);
                var start = _corridor[index];
                var end = _corridor[index + 1];
                return new GeoLocation(
                    Math.Round(start.Lat + ((end.Lat - start.Lat) * fraction), 6),
                    Math.Round(start.Lon + ((end.Lon - start.Lon) * fraction), 6));
            }

            remaining -= _segmentMeters[index];
        }

        return _corridor[0];
    }

    /// <summary>Share of the fleet in service: everyone at rush hour, about half otherwise, none at night.</summary>
    public static double ActiveShare(double hour) => hour switch
    {
        >= 5 and < 9 => 1.0,
        >= 9 and < 16 => 0.55,
        >= 16 and < 19 => 1.0,
        >= 19 and < 23 => 0.5,
        _ => 0
    };

    /// <summary>Relative demand: mornings flow toward San José and the terminal, evenings back out.</summary>
    public double Demand(double hour) => hour switch
    {
        >= 5 and < 8 => Inbound ? 1.0 : 0.25,
        >= 8 and < 9 => Inbound ? 0.45 : 0.25,
        >= 9 and < 16 => 0.11,
        >= 16 and < 19 => Inbound ? 0.25 : 1.0,
        >= 19 and < 22 => Inbound ? 0.12 : 0.17,
        _ => 0.03
    };

    /// <summary>GAM traffic: much slower at rush hour.</summary>
    private double CruiseKmh(double hour)
    {
        var rushHour = hour is (>= 6 and < 9) or (>= 16 and < 19);
        return _kind == MockRouteKind.Trunk ? (rushHour ? 12 : 20) : (rushHour ? 16 : 24);
    }

    private int StopBoardingMaximum => _kind == MockRouteKind.Trunk ? 4 : 2;

    private DoorEventReport Board(DateTimeOffset now, int boardings, int alightings)
    {
        alightings = Math.Clamp(alightings, 0, Passengers);
        // A full bus leaves people at the stop; they are not counted as riders.
        boardings = Math.Clamp(boardings, 0, MaximumLoad - (Passengers - alightings));
        Passengers = Passengers - alightings + boardings;
        TotalBoardings += boardings;
        return new DoorEventReport(1, boardings, alightings, now.AddSeconds(-25), now.AddSeconds(-5));
    }

    private double NextStopSpacing(Random random) =>
        (_kind == MockRouteKind.Trunk ? 450 : 400) * (0.7 + (random.NextDouble() * 0.6));

    private static double DistanceMeters(GeoLocation first, GeoLocation second)
    {
        // Equirectangular approximation: accurate enough over a few kilometers.
        var meanLat = (first.Lat + second.Lat) / 2 * Math.PI / 180;
        var dx = (second.Lon - first.Lon) * Math.Cos(meanLat) * 111_320;
        var dy = (second.Lat - first.Lat) * 110_540;
        return Math.Sqrt((dx * dx) + (dy * dy));
    }
}
