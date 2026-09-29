namespace TrafficVision.Api.Models;

public sealed class Detection
{
    public int FrameNumber { get; set; }

    public double TimestampSeconds { get; set; }

    public int ClassId { get; set; }

    public string ClassName { get; set; } = string.Empty;

    public float Confidence { get; set; }

    public BoundingBox BoundingBox { get; set; } = new();
}
