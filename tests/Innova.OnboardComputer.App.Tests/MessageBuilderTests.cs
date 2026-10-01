using System.Text.Json;
using Innova.OnboardComputer.App.Contracts;
using Innova.OnboardComputer.App.Sending;
using Innova.OnboardComputer.App.Sources;
using Microsoft.Extensions.Time.Testing;
using ApiContract = Innova.Occupancy.Api.Ingestion;

namespace Innova.OnboardComputer.App.Tests;

public sealed class MessageBuilderTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 1, 14, 0, 0, TimeSpan.Zero);

    private readonly FakeTimeProvider _time = new(Now);
    private readonly BufferedGpsSource _gps = new();
    private readonly BufferedDoorCounterSource _doors = new();
    private readonly BufferedVisionSource _vision = new("bus-passengers-rfdetr-s-v1", "cabin-front");
    private readonly MessageBuilder _builder;

    public MessageBuilderTests() =>
        _builder = new MessageBuilder(_gps, _doors, _vision, new SequenceGenerator(41), _time);

    [Fact]
    public void Message_holds_everything_collected_since_the_last_one()
    {
        var gga = NmeaWriter.Gga(Now.AddSeconds(-1), 9.9765, -84.0073);
        _gps.Add(gga);
        _doors.Add(new RawDoorCounterEvent(1, RawFormats.DoorClosed, Now.AddSeconds(-1)));
        _doors.Add(new RawDoorCounterEvent(1, RawFormats.DoorOpened, Now.AddSeconds(-9)));
        _vision.Add(new RawVisionFrame(Now.AddSeconds(-2), [new RawVisionDetection(3, "sitting", 0.9, [1, 2, 3, 4])]));

        var message = _builder.Build();

        Assert.NotNull(message);
        Assert.Equal(41, message.Sequence);
        Assert.Equal(Now, message.SentAt);
        Assert.Equal(RawFormats.Nmea0183, message.Gps!.Format);
        Assert.Equal([gga], message.Gps.Sentences);
        Assert.Equal(RawFormats.ApcDoorEventsV1, message.DoorCounter!.Format);
        Assert.Equal([RawFormats.DoorOpened, RawFormats.DoorClosed], message.DoorCounter.Events.Select(item => item.Type));
        Assert.Equal("bus-passengers-rfdetr-s-v1", message.Vision!.Model);
        Assert.Equal("cabin-front", message.Vision.Camera);
        Assert.Single(message.Vision.Frames);
    }

    [Fact]
    public void Each_message_takes_the_next_sequence_and_only_new_readings()
    {
        _gps.Add("$GPGGA,1*00");
        var first = _builder.Build();
        _gps.Add("$GPGGA,2*00");
        var second = _builder.Build();

        Assert.Equal(first!.Sequence + 1, second!.Sequence);
        Assert.Equal(["$GPGGA,2*00"], second.Gps!.Sentences);
    }

    [Fact]
    public void Parts_without_readings_are_left_out_and_an_empty_message_is_not_built()
    {
        Assert.Null(_builder.Build());

        _gps.Add("$GPGGA,1*00");
        var message = _builder.Build();

        Assert.NotNull(message!.Gps);
        Assert.Null(message.DoorCounter);
        Assert.Null(message.Vision);
    }

    [Fact]
    public void Sequence_starts_from_the_clock_so_it_keeps_increasing_after_a_restart()
    {
        var beforeRestart = new SequenceGenerator(new FakeTimeProvider(Now)).Next();
        var afterRestart = new SequenceGenerator(new FakeTimeProvider(Now.AddSeconds(1))).Next();

        Assert.Equal(Now.ToUnixTimeMilliseconds(), beforeRestart);
        Assert.True(afterRestart > beforeRestart);
    }

    [Fact]
    public void Json_uses_the_api_field_names_and_omits_absent_values()
    {
        var message = new RawVehicleMessage(
            7,
            Now,
            null,
            new RawDoorCounter(RawFormats.ApcDoorEventsV1, [
                new RawDoorCounterEvent(1, RawFormats.DoorOpened, Now),
                new RawDoorCounterEvent(1, RawFormats.DoorCount, Now, In: 3, Out: 1)
            ]),
            new RawVision("m", "cabin-front", [new RawVisionFrame(Now, [new RawVisionDetection(12, "standing", 0.71, [132, 80, 248, 352])])]));

        using var json = JsonDocument.Parse(JsonSerializer.Serialize(message, RawJson.Options));
        var root = json.RootElement;

        Assert.Equal(["sequence", "sentAt", "doorCounter", "vision"], root.EnumerateObject().Select(property => property.Name));
        var events = root.GetProperty("doorCounter").GetProperty("events");
        Assert.Equal(["door", "type", "at"], events[0].EnumerateObject().Select(property => property.Name));
        Assert.Equal(["door", "type", "at", "in", "out"], events[1].EnumerateObject().Select(property => property.Name));
        var detection = root.GetProperty("vision").GetProperty("frames")[0].GetProperty("detections")[0];
        Assert.Equal(["trackId", "class", "score", "box"], detection.EnumerateObject().Select(property => property.Name));
    }

    [Fact]
    public void Json_reads_back_as_the_api_contract_without_losing_anything()
    {
        _gps.Add(NmeaWriter.Rmc(Now, 9.9765, -84.0073, 18.5, 87.5));
        _doors.Add(new RawDoorCounterEvent(2, RawFormats.DoorCount, Now, 4, 0));
        _vision.Add(new RawVisionFrame(Now, [new RawVisionDetection(1, "sitting", 0.88, [401, 123, 495, 279])]));
        var sent = _builder.Build()!;

        var json = JsonSerializer.Serialize(sent, RawJson.Options);
        // The API binds with ASP.NET Core's web defaults.
        var received = JsonSerializer.Deserialize<ApiContract.RawVehicleMessage>(json, JsonSerializerOptions.Web)!;

        Assert.Equal(json, JsonSerializer.Serialize(received, RawJson.Options));
        Assert.Equal(4, received.DoorCounter!.Events[0].In);
    }
}
