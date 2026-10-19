using Innova.Occupancy.Api.Models;
using Innova.Occupancy.Api.Transit;

namespace Innova.Occupancy.Api.Vehicles.Simulation;

/// <summary>
/// One bus driving back and forth along its route: it stops at each of the route's stops, empties
/// at each end of the line, and boards passengers according to Costa Rica rush hours.
/// </summary>
public sealed class SimulatedBus
{
    private readonly int _capacity;
    private readonly TransitRoute _route;
    private double _metersAlong;
    private TravelDirection _direction;
    private bool _atStop;
    private bool _atTerminal;
    private bool _parked;
    private TimeSpan _waitRemaining;
    private readonly double _scheduledDepartureHour;
    private readonly bool _isEarlyPrepositioning;
    private bool _isPrepositioningTrip;

    public SimulatedBus(
        string vehicleId,
        int capacity,
        TransitRoute route,
        double startFraction,
        TravelDirection startDirection,
        int initialPassengers,
        double serviceRank,
        double scheduledDepartureHour = 4.5,
        bool isEarlyPrepositioning = false)
    {
        ServiceRank = serviceRank;
        VehicleId = vehicleId;
        _capacity = capacity;
        _route = route;
        _scheduledDepartureHour = scheduledDepartureHour;
        _isEarlyPrepositioning = isEarlyPrepositioning;
        _metersAlong = Math.Clamp(startFraction, 0, 1) * route.Length;
        _direction = startDirection;
        Passengers = Math.Clamp(initialPassengers, 0, capacity);
        _parked = IsAtDepot;
    }

    public string VehicleId { get; }

    /// <summary>0..1: buses with a low rank stay in service when the operator runs fewer buses.</summary>
    public double ServiceRank { get; }

    public int Passengers { get; private set; }

    /// <summary>Everyone who boarded since the bus was created (used to calibrate daily ridership).</summary>
    public int TotalBoardings { get; private set; }

    private bool Inbound => _direction == TravelDirection.Inbound;

    private int Sign => Inbound ? -1 : 1;

    private int MaximumLoad => (int)(_capacity * 1.15);

    /// <summary>
    /// The home depot for the entire Coronado concession fleet is Terminal Central de Coronado.
    /// For the trunk line (R142), this is at the end of the route (meters = Length, Outbound terminus).
    /// For feeders (Ramales), this is at the origin of the route (meters = 0, Inbound terminus).
    /// </summary>
    private bool IsAtDepot => _route.IsTrunk
        ? _metersAlong >= _route.Length - 15
        : _metersAlong <= 15;

    public VehicleObservation Step(
        DateTimeOffset now,
        TimeSpan elapsed,
        Random random,
        double? hourOverride = null,
        SimulationParameters? parameters = null)
    {
        var rules = parameters ?? SimulationParameters.Default;
        var hour = TransitTiming.HourOfDay(now, hourOverride);
        DoorEventReport? doorEvent = null;
        double speedKmh = 0;
        var inService = hour >= _scheduledDepartureHour && ServiceRank < rules.ActiveShare(hour);

        if (_waitRemaining > TimeSpan.Zero)
        {
            // Doors open at a stop, or resting at the terminal.
            _waitRemaining -= elapsed;
        }
        else if (_parked)
        {
            // Waiting at the terminal depot, empty, until the schedule needs this bus again.
            if (inService)
            {
                _parked = false;
                if (_isEarlyPrepositioning)
                {
                    _isPrepositioningTrip = true;
                }
                _direction = _route.IsTrunk ? TravelDirection.Inbound : TravelDirection.Outbound;
                _metersAlong = _route.IsTrunk ? _route.Length : 0;
            }
            else if (!IsAtDepot)
            {
                // All parked buses stay overnight at the Coronado depot
                _metersAlong = _route.IsTrunk ? _route.Length : 0;
                _direction = _route.IsTrunk ? TravelDirection.Inbound : TravelDirection.Outbound;
            }
        }
        else if (_isPrepositioningTrip)
        {
            // Early morning express deadhead trip directly to San José terminal (no passenger boarding)
            speedKmh = 36 + random.Next(-2, 3);
            var target = _metersAlong + (speedKmh / 3.6 * elapsed.TotalSeconds * Sign);
            var end = _route.EndOf(_direction);
            if (Sign * (target - end) >= 0)
            {
                _metersAlong = end;
                _direction = TravelDirection.Outbound; // Face Coronado for commercial outbound departure
                _isPrepositioningTrip = false;
                _atTerminal = true;
                _waitRemaining = TimeSpan.FromMinutes(5); // Layover at Parque Central before 05:00 departure
            }
            else
            {
                _metersAlong = target;
            }
        }
        else if (_atTerminal && !inService)
        {
            // If the bus has reached the home depot in Coronado: park overnight.
            if (IsAtDepot)
            {
                doorEvent = Board(now, 0, Passengers);
                _atTerminal = false;
                _parked = true;
            }
            else
            {
                // Last commercial trip finished at external terminal (San José or feeder mountain end).
                // Disembark all remaining passengers, reverse direction towards Coronado depot, and return EMPTY.
                var alightings = Passengers;
                _direction = Inbound ? TravelDirection.Outbound : TravelDirection.Inbound;
                _atTerminal = false;
                doorEvent = Board(now, 0, alightings); // 0 boardings: returns empty to depot
                _waitRemaining = TimeSpan.FromSeconds(30);
            }
        }
        else if (_atTerminal)
        {
            // End of the line: everyone gets off, then the bus loads for the trip back. Terminals
            // fill buses at rush hour: San José in the evening, and Coronado in the morning,
            // where feeder passengers transfer to the trunk line.
            var alightings = Passengers;
            _direction = Inbound ? TravelDirection.Outbound : TravelDirection.Inbound;
            _atTerminal = false;
            var terminalBoardings = (int)Math.Round(_capacity * rules.Demand(hour, Inbound) * (0.5 + (random.NextDouble() * 0.5)));
            doorEvent = Board(now, terminalBoardings, alightings);
            _waitRemaining = TransitTiming.TerminalLayover;
        }
        else if (_atStop)
        {
            var share = Inbound ? 0.03 : 0.15;
            var alightings = (int)Math.Round(Passengers * random.NextDouble() * share * 2);
            // If returning to depot after schedule end, do not board new passengers!
            var boardings = inService ? (int)Math.Round(random.NextDouble() * StopBoardingMaximum * rules.Demand(hour, Inbound)) : 0;
            doorEvent = Board(now, boardings, alightings);
            _waitRemaining = TransitTiming.StopDwell - elapsed;
            _atStop = false;
        }
        else
        {
            speedKmh = TransitTiming.CruiseKmh(_route.IsTrunk, hour) + random.Next(-4, 5);
            var target = _metersAlong + (speedKmh / 3.6 * elapsed.TotalSeconds * Sign);
            var nextStop = NextStop();
            var end = _route.EndOf(_direction);
            if (Sign * (target - end) >= 0)
            {
                _metersAlong = end;
                _atTerminal = true;
            }
            else if (inService && nextStop is { } stop && Sign * (target - stop) >= 0)
            {
                // Normal intermediate passenger stop while in service
                _metersAlong = stop;
                _atStop = true;
            }
            else if (!inService && Passengers > 0 && nextStop is { } dropStop && Sign * (target - dropStop) >= 0)
            {
                // Disembark passengers on final trip to terminal
                _metersAlong = dropStop;
                _atStop = true;
            }
            else
            {
                _metersAlong = target;
            }
        }

        // A parked bus runs no trip, so riders are never offered it.
        var trip = _parked ? null : new TripDescriptor(_route.RouteId, _direction);
        return new VehicleObservation(
            now,
            Position() with { SpeedKmh = speedKmh, HeadingDeg = speedKmh > 0 ? Heading() : null },
            new OccupancyReading(Passengers, _capacity, SensorSource.Simulated),
            doorEvent is null ? null : [doorEvent],
            new DeviceStatusReport(true, "sim-2.0"),
            trip);
    }

    public GeoLocation Position() => _route.PointAt(_metersAlong);

    /// <summary>Direction of travel along the current street segment, in degrees from north.</summary>
    public double Heading() => _route.HeadingAt(_metersAlong, _direction);

    /// <summary>Share of the fleet in service: everyone at rush hour, about half otherwise, none at night.</summary>
    public static double ActiveShare(double hour) => SimulationParameters.Default.ActiveShare(hour);

    /// <summary>Relative demand: mornings flow toward San José and the terminal, evenings back out.</summary>
    public double Demand(double hour) => SimulationParameters.Default.Demand(hour, Inbound);

    private int StopBoardingMaximum => _route.IsTrunk ? 4 : 2;

    /// <summary>The next intermediate stop ahead; the ends of the line are terminals, handled apart.</summary>
    private double? NextStop()
    {
        var ahead = _route.Stops
            .Select(stop => stop.Meters)
            .Where(meters => meters > 1 && meters < _route.Length - 1 && Sign * (meters - _metersAlong) > 0.5);
        return Inbound ? ahead.Cast<double?>().LastOrDefault() : ahead.Cast<double?>().FirstOrDefault();
    }

    private DoorEventReport Board(DateTimeOffset now, int boardings, int alightings)
    {
        alightings = Math.Clamp(alightings, 0, Passengers);
        // A full bus leaves people at the stop; they are not counted as riders.
        boardings = Math.Clamp(boardings, 0, MaximumLoad - (Passengers - alightings));
        Passengers = Passengers - alightings + boardings;
        TotalBoardings += boardings;
        return new DoorEventReport(1, boardings, alightings, now.AddSeconds(-25), now.AddSeconds(-5));
    }
}
