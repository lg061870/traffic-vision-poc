namespace TrafficVision.Api.Models;

public sealed record PixelBoundingBox(float X1, float Y1, float X2, float Y2);

public sealed record PassengerImageDetection(
    int ClassId,
    string ClassName,
    float Score,
    PixelBoundingBox Box);

public sealed record PassengerImageResult(
    string Image,
    int Width,
    int Height,
    string Model,
    IReadOnlyList<PassengerImageDetection> Detections,
    string AnnotatedImageMediaType,
    string AnnotatedImageBase64);
