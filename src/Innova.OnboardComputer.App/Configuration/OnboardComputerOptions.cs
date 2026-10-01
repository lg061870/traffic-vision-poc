using System.ComponentModel.DataAnnotations;

namespace Innova.OnboardComputer.App.Configuration;

public sealed class OnboardComputerOptions
{
    public const string SectionName = "OnboardComputer";

    /// <summary>Base URL of the Occupancy API, for example http://localhost:5189.</summary>
    [Required, Url]
    public string OccupancyApiUrl { get; set; } = "http://localhost:5189";

    /// <summary>Plate or fleet number registered in the Occupancy API, for example SJB-10662.</summary>
    [Required, RegularExpression("^[A-Za-z0-9 _-]{1,32}$")]
    public string VehicleId { get; set; } = "";

    /// <summary>Sent as X-Device-Key. Keep it out of appsettings.json: use OnboardComputer__DeviceKey.</summary>
    public string DeviceKey { get; set; } = "";

    [Range(1, 3600)]
    public int SendIntervalSeconds { get; set; } = 10;

    /// <summary>Messages kept while the API is unreachable; 8640 is 24 hours at 10 s.</summary>
    [Range(1, 1_000_000)]
    public int MaxBufferedMessages { get; set; } = 8640;

    [Range(1, 300)]
    public int RequestTimeoutSeconds { get; set; } = 10;

    public SimulationOptions Simulation { get; set; } = new();
}

public sealed class SimulationOptions
{
    /// <summary>Replays <see cref="ScenarioFile"/> instead of reading real devices.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Path relative to the app folder.</summary>
    public string ScenarioFile { get; set; } = "Scenarios/ramal-san-rafael.json";

    /// <summary>Starts the scenario again when it ends; otherwise the sources go quiet.</summary>
    public bool Loop { get; set; } = true;
}
