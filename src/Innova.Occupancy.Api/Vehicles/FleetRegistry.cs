using Innova.Occupancy.Api.Configuration;
using Innova.Occupancy.Api.Vehicles.Simulation;
using Microsoft.Extensions.Options;

namespace Innova.Occupancy.Api.Vehicles;

/// <summary>
/// Registered buses and their capacity, read from the fleet file. Raw sensor data only carries
/// counts, so the capacity needed for "71 % full" comes from here.
/// </summary>
public sealed class FleetRegistry
{
    private readonly Dictionary<string, MockBus> _buses;

    public FleetRegistry(IOptions<FleetOptions> options, IHostEnvironment environment)
    {
        var path = Path.GetFullPath(options.Value.RegistryFile, environment.ContentRootPath);
        _buses = MockFleet.Load(path).Buses.ToDictionary(bus => bus.VehicleId, StringComparer.Ordinal);
    }

    public int? CapacityOf(string vehicleId) => _buses.TryGetValue(vehicleId, out var bus) ? bus.Capacity : null;
}
