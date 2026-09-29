namespace TrafficVision.Api.Configuration;

public sealed class PassengerVisionOptions
{
    public const string SectionName = "PassengerVision";

    public string ModelPath { get; set; } = "../../models/bus-passengers-rfdetr-s-v1.onnx";

    public float ConfidenceThreshold { get; set; } = 0.40f;

    public int ProcessingFps { get; set; } = 15;

    public int InitialPassengers { get; set; }

    public string[] ClassNames { get; set; } = ["sitting", "standing"];

    public TrackingOptions Tracking { get; set; } = new();

    public DoorEventOptions DoorEvents { get; set; } = new();
}

public sealed class TrackingOptions
{
    public float MatchIouThreshold { get; set; } = 0.30f;

    public int ConfirmAfterDetections { get; set; } = 3;

    public int LostTrackFrames { get; set; } = 30;
}

public sealed class DoorEventOptions
{
    public float DefaultLineY { get; set; } = 0.70f;

    public string DefaultInsideSide { get; set; } = "above";

    public int HysteresisPixels { get; set; } = 20;

    public int StableFrames { get; set; } = 3;

    public int CooldownSeconds { get; set; } = 3;
}
