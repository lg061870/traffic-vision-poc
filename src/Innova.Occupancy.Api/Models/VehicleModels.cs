using System.Text.Json.Serialization;

namespace Innova.Occupancy.Api.Models;

/// <summary>Where an occupancy number came from.</summary>
public enum SensorSource
{
    [JsonStringEnumMemberName("DOOR_COUNTER_3D")]
    DoorCounter3D,
    CabinCamera,
    DoorCamera,
    Simulated
}

/// <summary>GTFS-Realtime occupancy levels, so feeds can be published in the standard format.</summary>
public enum OccupancyStatus
{
    Empty,
    ManySeatsAvailable,
    FewSeatsAvailable,
    StandingRoomOnly,
    CrushedStandingRoomOnly,
    Full
}

public sealed record GeoLocation(double Lat, double Lon, double? SpeedKmh = null);

// ---- Sent by the on-board equipment (write side) ----

public sealed record VehicleObservation(
    DateTimeOffset Timestamp,
    GeoLocation? Location,
    OccupancyReading? Occupancy,
    IReadOnlyList<DoorEventReport>? DoorEvents,
    DeviceStatusReport? Device);

public sealed record OccupancyReading(int PassengerCount, int Capacity, SensorSource Source);

public sealed record DoorEventReport(
    int Door,
    int Boardings,
    int Alightings,
    DateTimeOffset OpenedAt,
    DateTimeOffset ClosedAt);

public sealed record DeviceStatusReport(bool? CameraOnline, string? Firmware);

// ---- Served to consumers (read side) ----

public sealed record VehicleState(
    string VehicleId,
    DateTimeOffset AsOf,
    bool Stale,
    GeoLocation? Location,
    OccupancySnapshot? Occupancy,
    DeviceHealth Device);

public sealed record OccupancySnapshot(
    int PassengerCount,
    int Capacity,
    int Percent,
    OccupancyStatus Status,
    SensorSource Source,
    DateTimeOffset MeasuredAt);

public sealed record DeviceHealth(bool Online, DateTimeOffset LastSeen, bool? CameraOnline, string? Firmware);

public sealed record VehicleList(IReadOnlyList<VehicleState> Vehicles);

public sealed record VehicleDoorEvent(
    int Door,
    int Boardings,
    int Alightings,
    GeoLocation? Location,
    DateTimeOffset OpenedAt,
    DateTimeOffset ClosedAt,
    int? OccupancyAfter);

public sealed record VehicleEventList(string VehicleId, IReadOnlyList<VehicleDoorEvent> Events);

public sealed record OccupancyHistoryPoint(
    DateTimeOffset Time,
    int PassengerCount,
    int PeakPassengerCount,
    int Capacity,
    int Percent);

public sealed record OccupancyHistory(
    string VehicleId,
    DateTimeOffset From,
    DateTimeOffset To,
    string Interval,
    IReadOnlyList<OccupancyHistoryPoint> Points);

public sealed record ObservationAccepted(string VehicleId, DateTimeOffset ReceivedAt);
