namespace TrafficVision.Api.Configuration;

public sealed class PassengerVisionOptions
{
    public const string SectionName = "PassengerVision";

    public string ModelPath { get; set; } = "../../models/bus-passengers-rfdetr-s-v1.onnx";

    public float ConfidenceThreshold { get; set; } = 0.40f;

    public int ProcessingFps { get; set; } = 15;
}
