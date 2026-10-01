using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Innova.Occupancy.Api.Tests;

public sealed class VehiclesApiTests
{
    private static readonly string ValidObservation = """
        {
          "timestamp": "{NOW}",
          "location": { "lat": 9.9352, "lon": -84.0431, "speedKmh": 22 },
          "occupancy": { "passengerCount": 78, "capacity": 110, "source": "DOOR_COUNTER_3D" },
          "doorEvents": [ { "door": 1, "boardings": 4, "alightings": 1,
                            "openedAt": "{OPENED}", "closedAt": "{CLOSED}" } ],
          "device": { "cameraOnline": true, "firmware": "1.0.3" }
        }
        """
        .Replace("{NOW}", DateTimeOffset.UtcNow.ToString("O"))
        .Replace("{OPENED}", DateTimeOffset.UtcNow.AddSeconds(-40).ToString("O"))
        .Replace("{CLOSED}", DateTimeOffset.UtcNow.AddSeconds(-5).ToString("O"));

    [Fact]
    public async Task Posted_observation_is_served_as_latest_state()
    {
        using var client = CreateClient();

        var post = await PostAsync(client, "sjb 8754", ValidObservation);
        var state = await client.GetFromJsonAsync<JsonElement>("/api/v1/vehicles/SJB-8754");
        var list = await client.GetFromJsonAsync<JsonElement>("/api/v1/vehicles");
        var events = await client.GetFromJsonAsync<JsonElement>("/api/v1/vehicles/SJB-8754/events");

        Assert.Equal(HttpStatusCode.Accepted, post.StatusCode);
        Assert.Equal("SJB-8754", state.GetProperty("vehicleId").GetString());
        var occupancy = state.GetProperty("occupancy");
        Assert.Equal(78, occupancy.GetProperty("passengerCount").GetInt32());
        Assert.Equal(71, occupancy.GetProperty("percent").GetInt32());
        Assert.Equal("FEW_SEATS_AVAILABLE", occupancy.GetProperty("status").GetString());
        Assert.Equal("DOOR_COUNTER_3D", occupancy.GetProperty("source").GetString());
        Assert.Equal(1, list.GetProperty("vehicles").GetArrayLength());
        Assert.Equal(4, events.GetProperty("events")[0].GetProperty("boardings").GetInt32());
    }

    [Fact]
    public async Task Unknown_bus_is_404()
    {
        using var client = CreateClient();

        var response = await client.GetAsync("/api/v1/vehicles/SJB-0000");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Invalid_observation_is_400()
    {
        using var client = CreateClient();

        var response = await PostAsync(client, "SJB-8754",
            ValidObservation.Replace("\"capacity\": 110", "\"capacity\": 0"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Configured_device_key_is_required()
    {
        using var client = CreateClient(("Ingestion:DeviceKeys:SJB-8754", "secret-key"));

        var missing = await PostAsync(client, "SJB-8754", ValidObservation);
        var wrong = await PostAsync(client, "SJB-8754", ValidObservation, "other-key");
        var otherBus = await PostAsync(client, "SJB-9120", ValidObservation, "secret-key");
        var accepted = await PostAsync(client, "SJB-8754", ValidObservation, "secret-key");

        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, otherBus.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
    }

    [Fact]
    public async Task Openapi_contract_is_published()
    {
        using var client = CreateClient();

        var document = await client.GetFromJsonAsync<JsonElement>("/openapi/v1.json");

        Assert.True(document.GetProperty("paths").TryGetProperty("/api/v1/vehicles/{vehicleId}/observations", out _));
    }

    private static HttpClient CreateClient(params (string Key, string Value)[] settings)
    {
        var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("MockFleet:Enabled", "false");
            foreach (var (key, value) in settings)
            {
                builder.UseSetting(key, value);
            }
        });
        return factory.CreateClient();
    }

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, string vehicleId, string json, string? key = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/vehicles/{Uri.EscapeDataString(vehicleId)}/observations")
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
        };
        if (key is not null)
        {
            request.Headers.Add("X-Device-Key", key);
        }

        return client.SendAsync(request);
    }
}
