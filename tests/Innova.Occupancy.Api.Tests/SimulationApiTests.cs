using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Innova.Occupancy.Api.Vehicles.Simulation;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Innova.Occupancy.Api.Tests;

public sealed class SimulationApiTests
{
    [Fact]
    public async Task Can_read_and_update_simulation_parameters()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        // 1. Read default parameters
        var parameters = await client.GetFromJsonAsync<SimulationParameters>("/api/v1/simulation/parameters");
        Assert.NotNull(parameters);
        Assert.Equal(0.47, parameters.DemandScale);
        Assert.Equal(1.0, parameters.PeakActiveShare);
        Assert.Equal(12950, parameters.CostPerBusHour);

        // 2. Update parameters (10-bus pilot scenario test)
        var updatedParams = new SimulationParameters
        {
            TotalFleetSize = 10,
            DemandScale = 0.47,
            PeakActiveShare = 0.90,
            ValleyActiveShare = 0.40,
            NightActiveShare = 0.35,
            CostPerBusHour = 13500,
            SeniorShare = 0.15
        };

        var putResponse = await client.PutAsJsonAsync("/api/v1/simulation/parameters", updatedParams);
        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);

        var verifyParams = await client.GetFromJsonAsync<SimulationParameters>("/api/v1/simulation/parameters");
        Assert.NotNull(verifyParams);
        Assert.Equal(10, verifyParams.TotalFleetSize);
        Assert.Equal(0.47, verifyParams.DemandScale);
        Assert.Equal(0.90, verifyParams.PeakActiveShare);
        Assert.Equal(0.40, verifyParams.ValleyActiveShare);
        Assert.Equal(13500, verifyParams.CostPerBusHour);

        // Verify the vehicles endpoint reflects the requested fleet size (10 in service + 1 out-of-service bus)
        var vehiclesResponse = await client.GetFromJsonAsync<JsonElement>("/api/v1/vehicles");
        var busesCount = vehiclesResponse.GetProperty("vehicles").GetArrayLength();
        Assert.Equal(11, busesCount);

        // 3. Reset parameters
        var resetResponse = await client.PostAsync("/api/v1/simulation/reset", null);
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var resetParams = await client.GetFromJsonAsync<SimulationParameters>("/api/v1/simulation/parameters");
        Assert.NotNull(resetParams);
        Assert.Equal(39, resetParams.TotalFleetSize);
        Assert.Equal(0.47, resetParams.DemandScale);
        Assert.Equal(1.0, resetParams.PeakActiveShare);
    }

    [Fact]
    public async Task Invalid_simulation_parameters_return_400()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var invalid = new SimulationParameters
        {
            TotalFleetSize = 0 // fleet size must be at least 1
        };

        var response = await client.PutAsJsonAsync("/api/v1/simulation/parameters", invalid);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Can_reconfigure_specific_ramales_and_fleet_distribution()
    {
        using var factory = new WebApplicationFactory<Program>();
        using var client = factory.CreateClient();

        var customRamales = new SimulationParameters
        {
            Ramales =
            [
                new RamalAllocation { RouteId = "R142", Name = "Ruta 142 Troncal", BusCount = 5, Fare = 460 },
                new RamalAllocation { RouteId = "R142-01", Name = "Ramal Cascajal", BusCount = 3, Fare = 460 }
            ]
        };

        var putResponse = await client.PutAsJsonAsync("/api/v1/simulation/parameters", customRamales);
        Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);

        var verifyParams = await client.GetFromJsonAsync<SimulationParameters>("/api/v1/simulation/parameters");
        Assert.NotNull(verifyParams);
        Assert.Equal(8, verifyParams.TotalFleetSize); // 5 + 3
        Assert.Equal(2, verifyParams.Ramales?.Count);

        // Verify vehicles endpoint returns 8 active buses + 1 out-of-service bus = 9
        var vehiclesResponse = await client.GetFromJsonAsync<JsonElement>("/api/v1/vehicles");
        var busesCount = vehiclesResponse.GetProperty("vehicles").GetArrayLength();
        Assert.Equal(9, busesCount);
    }
}
