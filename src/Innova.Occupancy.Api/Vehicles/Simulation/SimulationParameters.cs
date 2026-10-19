using Innova.Occupancy.Api.Transit;

namespace Innova.Occupancy.Api.Vehicles.Simulation;

/// <summary>
/// Allocation of buses to a specific route or ramal branch.
/// </summary>
public sealed class RamalAllocation
{
    public string RouteId { get; set; } = "";
    public string Name { get; set; } = "";
    public int BusCount { get; set; } = 1;
    public double? Fare { get; set; }
}

/// <summary>
/// Operational, demand, and economic rules that govern fleet simulation and forecasting.
/// Can be adjusted dynamically via the API to test different dispatch and demand scenarios.
/// </summary>
public sealed class SimulationParameters
{
    /// <summary>Operating cost of one bus for one hour in service, in colones (₡).</summary>
    public double CostPerBusHour { get; set; } = 12950;

    /// <summary>Share of boardings by seniors (0–1), who ride free on all routes.</summary>
    public double SeniorShare { get; set; } = 0.12;

    /// <summary>
    /// Total number of buses in the simulated fleet (defaults to 39 for the Coronado concession).
    /// </summary>
    public int TotalFleetSize { get; set; } = 39;

    /// <summary>
    /// Explicit breakdown of fleet allocation per route/ramal. If set, this determines how many buses run on each branch.
    /// </summary>
    public List<RamalAllocation>? Ramales { get; set; }

    /// <summary>
    /// Global demand scale multiplier (1.75 = fully calibrated peak & valley ridership).
    /// </summary>
    public double DemandScale { get; set; } = 1.75;

    /// <summary>Morning peak demand factor (05:00–09:00).</summary>
    public double MorningPeakDemand { get; set; } = 1.0;

    /// <summary>Evening peak demand factor (16:00–19:00).</summary>
    public double EveningPeakDemand { get; set; } = 1.0;

    /// <summary>Midday valley demand factor (09:00–16:00).</summary>
    public double MiddayDemand { get; set; } = 0.20;

    /// <summary>Late night demand factor (23:00–05:00).</summary>
    public double LateNightDemand { get; set; } = 0.03;

    /// <summary>Share of fleet active during rush hours (05:00–09:00, 16:00–19:00), 0–1.</summary>
    public double PeakActiveShare { get; set; } = 1.0;

    /// <summary>Share of fleet active during midday valley (09:00–16:00), 0–1.</summary>
    public double ValleyActiveShare { get; set; } = 0.55;

    /// <summary>Share of fleet active during evening/night (19:00–23:00), 0–1.</summary>
    public double NightActiveShare { get; set; } = 0.50;

    /// <summary>Optional route fare overrides in colones (₡).</summary>
    public Dictionary<string, double>? Fares { get; set; }

    public static List<RamalAllocation> DefaultRamales =>
    [
        new RamalAllocation { RouteId = "R142", Name = "Ruta 142 · San José – Coronado", BusCount = 24, Fare = 460 },
        new RamalAllocation { RouteId = "R142-01", Name = "Ramal Cascajal", BusCount = 2, Fare = 460 },
        new RamalAllocation { RouteId = "R142-02", Name = "Ramal Las Nubes", BusCount = 2, Fare = 460 },
        new RamalAllocation { RouteId = "R142-03", Name = "Ramal Dulce Nombre", BusCount = 2, Fare = 400 },
        new RamalAllocation { RouteId = "R142-04", Name = "Ramal Patio de Agua", BusCount = 2, Fare = 400 },
        new RamalAllocation { RouteId = "R142-05", Name = "Ramal San Rafael", BusCount = 2, Fare = 400 },
        new RamalAllocation { RouteId = "R142-06", Name = "Ramal Patalillo", BusCount = 2, Fare = 400 },
        new RamalAllocation { RouteId = "R142-07", Name = "Ramal San Pedro", BusCount = 1, Fare = 400 },
        new RamalAllocation { RouteId = "R142-08", Name = "Ramal El Rodeo", BusCount = 1, Fare = 400 },
        new RamalAllocation { RouteId = "R142-09", Name = "Ramal San Francisco", BusCount = 1, Fare = 400 },
        new RamalAllocation { RouteId = "R142-10", Name = "Ramal La Colmena", BusCount = 0, Fare = 400 }
    ];

    public static SimulationParameters Default => new()
    {
        TotalFleetSize = 39,
        DemandScale = 1.75,
        Ramales = DefaultRamales
    };

    /// <summary>Active day schedule type ("weekday", "saturday", "sunday_holiday").</summary>
    public string ActiveScheduleType { get; set; } = "weekday";

    /// <summary>Share of the fleet in service for a given hour of the day.</summary>
    public double ActiveShare(double hour)
    {
        if (ActiveScheduleType == "saturday")
        {
            return hour switch
            {
                >= 10 and < 15 => Math.Clamp(PeakActiveShare, 0, 1),
                >= 6 and < 10 => Math.Clamp(ValleyActiveShare, 0, 1),
                >= 15 and < 19 => Math.Clamp(ValleyActiveShare, 0, 1),
                >= 19 and < 23 => Math.Clamp(NightActiveShare, 0, 1),
                _ => 0
            };
        }

        if (ActiveScheduleType == "sunday_holiday")
        {
            return hour switch
            {
                >= 10 and < 16 => Math.Clamp(PeakActiveShare, 0, 1),
                >= 6 and < 10 => Math.Clamp(ValleyActiveShare, 0, 1),
                >= 16 and < 22 => Math.Clamp(NightActiveShare, 0, 1),
                _ => 0
            };
        }

        // weekday default
        return hour switch
        {
            >= 4.5 and < 9 => Math.Clamp(PeakActiveShare, 0, 1),
            >= 9 and < 16 => Math.Clamp(ValleyActiveShare, 0, 1),
            >= 16 and < 19 => Math.Clamp(PeakActiveShare, 0, 1),
            >= 19 and < 23 => Math.Clamp(NightActiveShare, 0, 1),
            _ => 0
        };
    }

    /// <summary>Relative passenger demand for a given hour and direction.</summary>
    public double Demand(double hour, bool inbound)
    {
        var scale = Math.Max(0, DemandScale);
        var baseDemand = hour switch
        {
            >= 4.5 and < 8 => inbound ? MorningPeakDemand : 0.25 * MorningPeakDemand,
            >= 8 and < 9 => inbound ? 0.45 * MorningPeakDemand : 0.25 * MorningPeakDemand,
            >= 9 and < 16 => MiddayDemand,
            >= 16 and < 19 => inbound ? 0.25 * EveningPeakDemand : EveningPeakDemand,
            >= 19 and < 22 => inbound ? 0.20 : 0.26,
            _ => LateNightDemand
        };

        return baseDemand * scale;
    }
}
