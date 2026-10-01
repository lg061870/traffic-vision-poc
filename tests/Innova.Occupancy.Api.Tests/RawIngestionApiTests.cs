using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Innova.Occupancy.Api.Tests;

public sealed class RawIngestionApiTests
{
    // A bus from MockData/coronado-fleet.json (capacity 90), stopped at Guadalupe.
    private const string Bus = "SJB-16959";

    [Fact]
    public async Task Raw_message_is_aggregated_into_the_served_state()
    {
        using var client = CreateClient();

        var response = await PostAsync(client, Bus, SampleMessage(sequence: 1));
        var accepted = await response.Content.ReadFromJsonAsync<JsonElement>();
        var state = await client.GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{Bus}");
        var events = await client.GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{Bus}/events");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(2, accepted.GetProperty("gpsFixes").GetInt32());
        Assert.Equal(1, accepted.GetProperty("doorEventsCompleted").GetInt32());

        var location = state.GetProperty("location");
        Assert.Equal(9.94653, location.GetProperty("lat").GetDouble(), 5);
        Assert.Equal(-84.05351, location.GetProperty("lon").GetDouble(), 5);

        // The door counter says 3 in, 1 out (2 on board) but the camera sees 2 people too.
        var occupancy = state.GetProperty("occupancy");
        Assert.Equal(2, occupancy.GetProperty("passengerCount").GetInt32());
        Assert.Equal(90, occupancy.GetProperty("capacity").GetInt32());
        Assert.Equal("DOOR_COUNTER_3D", occupancy.GetProperty("source").GetString());
        Assert.Equal(3, events.GetProperty("events")[0].GetProperty("boardings").GetInt32());
    }

    [Fact]
    public async Task Resending_the_same_sequence_is_acknowledged_but_not_counted()
    {
        using var client = CreateClient();

        await PostAsync(client, Bus, SampleMessage(sequence: 5));
        var resent = await PostAsync(client, Bus, SampleMessage(sequence: 5));
        var body = await resent.Content.ReadFromJsonAsync<JsonElement>();
        var events = await client.GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{Bus}/events");

        Assert.Equal(HttpStatusCode.Accepted, resent.StatusCode);
        Assert.True(body.GetProperty("duplicate").GetBoolean());
        Assert.Equal(1, events.GetProperty("events").GetArrayLength());
    }

    [Fact]
    public async Task Unregistered_bus_is_404()
    {
        using var client = CreateClient();

        var response = await PostAsync(client, "SJB-0000", SampleMessage(sequence: 1));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unsupported_door_counter_format_is_400()
    {
        using var client = CreateClient();

        var response = await PostAsync(client, Bus, SampleMessage(sequence: 1).Replace("apc-door-events-v1", "acme-counter-v9"));
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("apc-door-events-v1", problem.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Device_key_is_checked_like_observations()
    {
        using var client = CreateClient(("Ingestion:DeviceKeys:SJB-16959", "secret-key"));

        var missing = await PostAsync(client, Bus, SampleMessage(sequence: 1));
        var accepted = await PostAsync(client, Bus, SampleMessage(sequence: 1), "secret-key");

        Assert.Equal(HttpStatusCode.Unauthorized, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
    }

    /// <summary>The sample payload from the design discussion, with times moved to now.</summary>
    private static string SampleMessage(long sequence)
    {
        var now = DateTimeOffset.UtcNow;
        string At(int secondsAgo) => now.AddSeconds(-secondsAgo).ToString("O");
        var time = now.AddSeconds(-2);
        var hhmmss = time.ToString("HHmmss.ff", CultureInfo.InvariantCulture);
        var ddmmyy = time.ToString("ddMMyy", CultureInfo.InvariantCulture);

        return $$"""
            {
              "sequence": {{sequence}},
              "sentAt": "{{now:O}}",
              "gps": {
                "format": "NMEA-0183",
                "sentences": [
                  "{{NmeaParserTests.Sentence($"GPRMC,{hhmmss},A,0956.7918,N,08403.2106,W,0.0,87.5,{ddmmyy},,,A")}}",
                  "{{NmeaParserTests.Sentence($"GPGGA,{hhmmss},0956.7918,N,08403.2106,W,1,09,0.9,1191.0,M,,M,,")}}",
                  "$GPRMC,corrupted*00"
                ]
              },
              "doorCounter": {
                "format": "apc-door-events-v1",
                "events": [
                  { "door": 1, "type": "DOOR_OPENED", "at": "{{At(10)}}" },
                  { "door": 1, "type": "COUNT", "in": 3, "out": 1, "at": "{{At(3)}}" },
                  { "door": 1, "type": "DOOR_CLOSED", "at": "{{At(1)}}" }
                ]
              },
              "vision": {
                "model": "bus-passengers-rfdetr-s-v1",
                "camera": "cabin-front",
                "frames": [
                  { "at": "{{At(2)}}", "detections": [
                    { "trackId": 12, "class": "sitting", "score": 0.88, "box": [401, 123, 495, 279] },
                    { "trackId": 15, "class": "standing", "score": 0.71, "box": [132, 80, 248, 352] } ] },
                  { "at": "{{At(1)}}", "detections": [
                    { "trackId": 12, "class": "sitting", "score": 0.87, "box": [401, 124, 495, 279] },
                    { "trackId": 15, "class": "standing", "score": 0.73, "box": [134, 80, 249, 352] } ] }
                ]
              }
            }
            """;
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
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/vehicles/{vehicleId}/raw")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        if (key is not null)
        {
            request.Headers.Add("X-Device-Key", key);
        }

        return client.SendAsync(request);
    }
}
