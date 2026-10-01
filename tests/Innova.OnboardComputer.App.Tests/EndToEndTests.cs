using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Innova.OnboardComputer.App.Sending;
using Innova.OnboardComputer.App.Simulation;
using Innova.OnboardComputer.App.Sources;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;

namespace Innova.OnboardComputer.App.Tests;

/// <summary>
/// The whole app against the real Occupancy API, hosted in-process: the scenario feeds the
/// sources, messages are built and posted to /raw, and the API's read endpoints show the result.
/// </summary>
public sealed class EndToEndTests : IDisposable
{
    private const string DeviceKey = "bus-secret";

    private readonly WebApplicationFactory<Program> _api = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    {
        builder.UseSetting("MockFleet:Enabled", "false");
        builder.UseSetting($"Ingestion:DeviceKeys:{TestSupport.Bus}", DeviceKey);
    });

    // The API rejects messages from the future, so the scenario starts at the real time.
    private readonly FakeTimeProvider _time = new(DateTimeOffset.UtcNow);

    public void Dispose() => _api.Dispose();

    [Fact]
    public async Task Terminal_stop_reaches_the_api_as_position_door_event_and_occupancy()
    {
        var bus = CreateBus(new OccupancyApiClient(_api.CreateClient(), TestSupport.Options(deviceKey: DeviceKey)));

        // The first minute: 18 people board at the Coronado terminal and the doors close at 00:50.
        await bus.RunAsync(TimeSpan.FromSeconds(60));

        var reader = _api.CreateClient();
        var state = await reader.GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{TestSupport.Bus}");
        var events = await reader.GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{TestSupport.Bus}/events");

        Assert.Equal(0, bus.Outbox.Count);
        // One message per 10 s; the doors close at 00:50, on a 10-s tick, so that is one message too.
        Assert.Equal(6, bus.Sent);
        var location = state.GetProperty("location");
        Assert.Equal(9.976, location.GetProperty("lat").GetDouble(), 2);
        Assert.Equal(-84.007, location.GetProperty("lon").GetDouble(), 2);
        var occupancy = state.GetProperty("occupancy");
        Assert.Equal(18, occupancy.GetProperty("passengerCount").GetInt32());
        Assert.Equal(50, occupancy.GetProperty("capacity").GetInt32());
        var doorEvent = Assert.Single(events.GetProperty("events").EnumerateArray());
        Assert.Equal(18, doorEvent.GetProperty("boardings").GetInt32());
        Assert.Equal(0, doorEvent.GetProperty("alightings").GetInt32());
    }

    [Fact]
    public async Task Messages_buffered_during_an_outage_arrive_in_order_and_count_once()
    {
        var outage = new SwitchableHandler(_api.Server.CreateHandler());
        var http = new HttpClient(outage) { BaseAddress = _api.Server.BaseAddress };
        var bus = CreateBus(new OccupancyApiClient(http, TestSupport.Options(deviceKey: DeviceKey)));

        // Offline through the terminal stop, then back online for the drive to the first stop.
        outage.Online = false;
        await bus.RunAsync(TimeSpan.FromSeconds(60));
        var buffered = bus.Outbox.Count;
        outage.Online = true;
        await bus.RunAsync(TimeSpan.FromSeconds(240));

        var events = await _api.CreateClient().GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{TestSupport.Bus}/events");
        var state = await _api.CreateClient().GetFromJsonAsync<JsonElement>($"/api/v1/vehicles/{TestSupport.Bus}");

        Assert.True(buffered >= 6, $"expected the first minute to be buffered, got {buffered}");
        Assert.Equal(0, bus.Outbox.Count);
        Assert.Equal(outage.Accepted.Order(), outage.Accepted);
        Assert.Equal(outage.Accepted.Distinct().Count(), outage.Accepted.Count);
        Assert.Equal(
            [(18, 0), (2, 4)],
            events.GetProperty("events").EnumerateArray()
                .Select(item => (item.GetProperty("boardings").GetInt32(), item.GetProperty("alightings").GetInt32())));
        Assert.Equal(16, state.GetProperty("occupancy").GetProperty("passengerCount").GetInt32());
    }

    [Fact]
    public async Task A_wrong_device_key_is_rejected_and_not_retried_forever()
    {
        var bus = CreateBus(new OccupancyApiClient(_api.CreateClient(), TestSupport.Options(deviceKey: "wrong")));

        await bus.RunAsync(TimeSpan.FromSeconds(20));

        var response = await _api.CreateClient().GetAsync($"/api/v1/vehicles/{TestSupport.Bus}");
        Assert.Equal(0, bus.Outbox.Count);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private SimulatedBus CreateBus(IOccupancyApiClient client)
    {
        var timeline = TestSupport.Timeline(_time.GetUtcNow());
        var gps = new BufferedGpsSource();
        var doors = new BufferedDoorCounterSource();
        var vision = new BufferedVisionSource(timeline.VisionModel, timeline.VisionCamera);
        var player = new ScenarioPlayer(timeline, gps, doors, vision, _time, NullLogger<ScenarioPlayer>.Instance);
        var outbox = TestSupport.Outbox(1000);
        var builder = new MessageBuilder(gps, doors, vision, new SequenceGenerator(_time), _time);
        var worker = new TelemetryWorker(builder, outbox, client, doors, TestSupport.Options(), _time, NullLogger<TelemetryWorker>.Instance);
        return new SimulatedBus(_time, player, doors, worker, outbox);
    }

    /// <summary>Steps the clock a second at a time, sending as the worker would: every 10 s and on door close.</summary>
    private sealed class SimulatedBus
    {
        private readonly FakeTimeProvider _time;
        private readonly ScenarioPlayer _player;
        private readonly TelemetryWorker _worker;
        private bool _doorClosed;
        private int _seconds;

        public SimulatedBus(FakeTimeProvider time, ScenarioPlayer player, BufferedDoorCounterSource doors, TelemetryWorker worker, MessageOutbox outbox)
        {
            (_time, _player, _worker, Outbox) = (time, player, worker, outbox);
            doors.DoorClosed += (_, _) => _doorClosed = true;
            _player.PlayUntil(_time.GetUtcNow());
        }

        public MessageOutbox Outbox { get; }

        public int Sent { get; private set; }

        public async Task RunAsync(TimeSpan duration)
        {
            for (var second = 0; second < duration.TotalSeconds; second++)
            {
                _time.Advance(TimeSpan.FromSeconds(1));
                _player.PlayUntil(_time.GetUtcNow());
                if (_doorClosed || ++_seconds % 10 == 0)
                {
                    _doorClosed = false;
                    Sent++;
                    await _worker.SendNowAsync(CancellationToken.None);
                }
            }
        }
    }

    /// <summary>Fails every request while offline, as if the bus had no signal.</summary>
    private sealed class SwitchableHandler(HttpMessageHandler inner) : DelegatingHandler(inner)
    {
        public bool Online { get; set; } = true;

        public List<long> Accepted { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (!Online)
            {
                throw new HttpRequestException("No route to host");
            }

            var body = await request.Content!.ReadFromJsonAsync<JsonElement>(cancellationToken);
            var response = await base.SendAsync(request, cancellationToken);
            if (response.StatusCode == HttpStatusCode.Accepted)
            {
                Accepted.Add(body.GetProperty("sequence").GetInt64());
            }

            return response;
        }
    }
}
