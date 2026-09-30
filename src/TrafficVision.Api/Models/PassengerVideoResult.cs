namespace TrafficVision.Api.Models;

public enum VideoAnalysisStatus
{
    Queued,
    Processing,
    Completed,
    Failed,
    Cancelled
}

public sealed record TrackedPassengerDetection(
    int TrackId,
    bool Confirmed,
    int ClassId,
    string ClassName,
    float Score,
    PixelBoundingBox Box);

public sealed record PassengerVideoFrame(
    int FrameNumber,
    double TimestampSeconds,
    IReadOnlyList<TrackedPassengerDetection> Detections);

public sealed record PassengerDoorEvent(
    int TrackId,
    string Direction,
    double TimestampSeconds);

public sealed record PassengerVideoSummary(
    int SittingPeak,
    int StandingPeak,
    int VisiblePeak,
    int UniquePassengers,
    int Boarded,
    int Exited,
    int FinalEventOccupancy,
    int PeakEventOccupancy);

public sealed record PassengerVideoResult(
    string Video,
    string CameraView,
    int Width,
    int Height,
    double DurationSeconds,
    double SourceFps,
    double ProcessingFps,
    double ElapsedSeconds,
    string Model,
    DateTimeOffset AnalyzedAtUtc,
    PassengerVideoSettings Settings,
    IReadOnlyList<PassengerVideoFrame> Frames,
    IReadOnlyList<PassengerDoorEvent> DoorEvents,
    PassengerVideoSummary Summary);

public sealed record PassengerVideoSettings(
    float ConfidenceThreshold,
    int InitialPassengers,
    NormalizedPoint DoorLineStart,
    NormalizedPoint DoorLineEnd,
    NormalizedPoint InsidePoint);

public sealed record VideoAnalysisAccepted(
    Guid JobId,
    VideoAnalysisStatus Status,
    DateTimeOffset CreatedAtUtc);

public sealed record VideoAnalysisJobResponse(
    Guid JobId,
    VideoAnalysisStatus Status,
    int ProgressPercent,
    string Stage,
    string? Error,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? StartedAtUtc,
    DateTimeOffset? CompletedAtUtc,
    PassengerVideoResult? Result);

public sealed record NormalizedPoint(float X, float Y);

public sealed record VideoAnalysisRequestOptions(
    string CameraView,
    float ConfidenceThreshold,
    int ProcessingFps,
    int InitialPassengers,
    NormalizedPoint DoorLineStart,
    NormalizedPoint DoorLineEnd,
    NormalizedPoint InsidePoint);
