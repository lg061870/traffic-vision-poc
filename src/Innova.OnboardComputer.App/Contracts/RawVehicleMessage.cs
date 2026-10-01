using System.Text.Json;
using System.Text.Json.Serialization;

namespace Innova.OnboardComputer.App.Contracts;

// The body of POST /api/v1/vehicles/{vehicleId}/raw, field for field the RawVehicleMessage of
// src/Innova.Occupancy.Api/Ingestion/RawModels.cs. This app runs on the bus, so it keeps its own
// copy of the contract instead of referencing the API; a test checks the two stay identical.

/// <summary>One message per send interval: each part keeps its source's own raw format.</summary>
public sealed record RawVehicleMessage(
    long Sequence,
    DateTimeOffset SentAt,
    RawGps? Gps,
    RawDoorCounter? DoorCounter,
    RawVision? Vision);

/// <summary>GPS receiver output as NMEA 0183 sentences ($GPRMC, $GPGGA…).</summary>
public sealed record RawGps(string Format, IReadOnlyList<string> Sentences);

/// <summary>Door-counter output; <see cref="Format"/> selects the API adapter that reads it.</summary>
public sealed record RawDoorCounter(string Format, IReadOnlyList<RawDoorCounterEvent> Events);

/// <summary>An event in the apc-door-events-v1 format: DOOR_OPENED, COUNT or DOOR_CLOSED.</summary>
public sealed record RawDoorCounterEvent(int Door, string Type, DateTimeOffset At, int? In = null, int? Out = null);

/// <summary>Results returned by the vision inference API for one camera; never images.</summary>
public sealed record RawVision(string Model, string Camera, IReadOnlyList<RawVisionFrame> Frames);

public sealed record RawVisionFrame(DateTimeOffset At, IReadOnlyList<RawVisionDetection> Detections);

/// <summary>Box is [x1, y1, x2, y2] in pixels of the camera frame.</summary>
public sealed record RawVisionDetection(int TrackId, string Class, double Score, IReadOnlyList<double> Box);

public static class RawFormats
{
    public const string Nmea0183 = "NMEA-0183";
    public const string ApcDoorEventsV1 = "apc-door-events-v1";

    public const string DoorOpened = "DOOR_OPENED";
    public const string DoorCount = "COUNT";
    public const string DoorClosed = "DOOR_CLOSED";
}

public static class RawJson
{
    /// <summary>camelCase like the API; absent parts and COUNT-only fields are left out.</summary>
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}
