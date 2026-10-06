using Innova.Occupancy.Api.Transit;
using Innova.Occupancy.Api.Vehicles.Simulation;

namespace Innova.Occupancy.Api.Tests;

public sealed class TransitNetworkTests
{
    internal static readonly string FleetPath = Path.Combine(AppContext.BaseDirectory, "MockData", "coronado-fleet.json");
    private readonly TransitNetwork _network = new(MockFleet.Load(FleetPath));

    [Fact]
    public void Stops_are_evenly_spaced_and_named_after_the_ends_of_the_line()
    {
        var trunk = _network.Routes["R142"];

        Assert.Equal("R142-00", trunk.Stops[0].StopId);
        Assert.Equal("San José", trunk.Stops[0].Name);
        Assert.Equal("Terminal de Coronado", trunk.Stops[^1].Name);
        Assert.Equal("Ruta 142 · Parada 1", trunk.Stops[1].Name);
        Assert.Equal(trunk.Length, trunk.Stops[^1].Meters, 3);
        Assert.All(trunk.Stops.Zip(trunk.Stops.Skip(1)), pair => Assert.InRange(pair.Second.Meters - pair.First.Meters, 300, 500));

        var feeder = _network.Routes["R142-01"];
        Assert.Equal("Terminal de Coronado", feeder.Stops[0].Name);
        Assert.Equal("Cascajal", feeder.Headsign(TravelDirection.Outbound));
        Assert.Equal("Ramal 07", _network.Routes["R142-07"].Headsign(TravelDirection.Outbound));
    }

    [Fact]
    public void Every_feeder_meets_the_trunk_at_the_Coronado_terminal()
    {
        var terminal = _network.Routes["R142"].Stops[^1];

        foreach (var feeder in _network.Routes.Values.Where(route => !route.IsTrunk))
        {
            Assert.Contains(_network.Transfers, link =>
                link.From == terminal && link.To == feeder.Stops[0] && link.Meters < 1);
        }
    }

    [Fact]
    public void A_position_on_the_route_is_located_by_its_meters_along_it()
    {
        var trunk = _network.Routes["R142"];

        var (meters, off) = trunk.Locate(trunk.PointAt(1234));

        Assert.InRange(meters, 1229, 1239);
        Assert.InRange(off, 0, 2);
    }
}
