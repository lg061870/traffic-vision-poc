using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SkiaSharp;
using TrafficVision.Api.Configuration;
using TrafficVision.Api.Models;

namespace TrafficVision.Api.Services;

public sealed class PassengerImageAnalyzer : IDisposable
{
    private const int ModelSize = 640;
    private const string InputName = "input";
    private const string BoxesOutputName = "dets";
    private const string LabelsOutputName = "labels";
    private static readonly float[] Means = [0.485f, 0.456f, 0.406f];
    private static readonly float[] StandardDeviations = [0.229f, 0.224f, 0.225f];

    private readonly PassengerVisionOptions _options;
    private readonly InferenceSession _session;
    private readonly ILogger<PassengerImageAnalyzer> _logger;

    public PassengerImageAnalyzer(
        IOptions<PassengerVisionOptions> options,
        IHostEnvironment environment,
        ILogger<PassengerImageAnalyzer> logger)
    {
        _options = options.Value;
        _logger = logger;

        var modelPath = Path.GetFullPath(_options.ModelPath, environment.ContentRootPath);
        if (!File.Exists(modelPath))
        {
            throw new FileNotFoundException(
                $"Passenger model not found. Place bus-passengers-rfdetr-s-v1.onnx at '{modelPath}'.",
                modelPath);
        }

        _session = new InferenceSession(modelPath, new Microsoft.ML.OnnxRuntime.SessionOptions
        {
            GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL
        });

        ValidateModelContract();
        _logger.LogInformation("Loaded passenger model from {ModelPath}", modelPath);
    }

    public Task<PassengerImageResult> AnalyzeAsync(
        Stream imageStream,
        string imageName,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        using var source = SKBitmap.Decode(imageStream)
            ?? throw new InvalidDataException("The uploaded file is not a supported image.");
        var originalWidth = source.Width;
        var originalHeight = source.Height;
        using var resized = source.Resize(
            new SKImageInfo(ModelSize, ModelSize, SKColorType.Rgb888x, SKAlphaType.Opaque),
            new SKSamplingOptions(SKCubicResampler.Mitchell));

        var input = CreateInputTensor(resized);
        using var results = _session.Run(
        [
            NamedOnnxValue.CreateFromTensor(InputName, input)
        ]);

        var boxes = results.Single(result => result.Name == BoxesOutputName).AsTensor<float>();
        var labels = results.Single(result => result.Name == LabelsOutputName).AsTensor<float>();
        var detections = Decode(boxes, labels, originalWidth, originalHeight);
        var annotatedBytes = Annotate(source, detections);

        return Task.FromResult(new PassengerImageResult(
            Path.GetFileName(imageName),
            originalWidth,
            originalHeight,
            "bus-passengers-rfdetr-s-v1",
            detections,
            "image/jpeg",
            Convert.ToBase64String(annotatedBytes)));
    }

    private static DenseTensor<float> CreateInputTensor(SKBitmap image)
    {
        var tensor = new DenseTensor<float>([1, 3, ModelSize, ModelSize]);

        for (var y = 0; y < ModelSize; y++)
        {
            for (var x = 0; x < ModelSize; x++)
            {
                var pixel = image.GetPixel(x, y);
                tensor[0, 0, y, x] = ((pixel.Red / 255f) - Means[0]) / StandardDeviations[0];
                tensor[0, 1, y, x] = ((pixel.Green / 255f) - Means[1]) / StandardDeviations[1];
                tensor[0, 2, y, x] = ((pixel.Blue / 255f) - Means[2]) / StandardDeviations[2];
            }
        }

        return tensor;
    }

    private IReadOnlyList<PassengerImageDetection> Decode(
        Tensor<float> boxes,
        Tensor<float> labels,
        int imageWidth,
        int imageHeight)
    {
        var detections = new List<PassengerImageDetection>();
        var queryCount = boxes.Dimensions[1];

        for (var query = 0; query < queryCount; query++)
        {
            PassengerClassOptions? selectedClass = null;
            var selectedScore = float.MinValue;

            foreach (var modelClass in _options.Classes)
            {
                var score = Sigmoid(labels[0, query, modelClass.OutputIndex]);
                if (score > selectedScore)
                {
                    selectedScore = score;
                    selectedClass = modelClass;
                }
            }

            if (selectedClass is null || selectedScore < _options.ConfidenceThreshold)
            {
                continue;
            }

            var centerX = boxes[0, query, 0];
            var centerY = boxes[0, query, 1];
            var width = boxes[0, query, 2];
            var height = boxes[0, query, 3];

            var x1 = Math.Clamp((centerX - (width / 2f)) * imageWidth, 0f, imageWidth);
            var y1 = Math.Clamp((centerY - (height / 2f)) * imageHeight, 0f, imageHeight);
            var x2 = Math.Clamp((centerX + (width / 2f)) * imageWidth, 0f, imageWidth);
            var y2 = Math.Clamp((centerY + (height / 2f)) * imageHeight, 0f, imageHeight);

            detections.Add(new PassengerImageDetection(
                selectedClass.ClassId,
                selectedClass.Name,
                selectedScore,
                new PixelBoundingBox(x1, y1, x2, y2)));
        }

        return detections.OrderByDescending(detection => detection.Score).ToArray();
    }

    private static byte[] Annotate(
        SKBitmap source,
        IReadOnlyList<PassengerImageDetection> detections)
    {
        using var annotated = source.Copy();
        using var canvas = new SKCanvas(annotated);
        using var paint = new SKPaint
        {
            IsAntialias = true,
            Style = SKPaintStyle.Stroke,
            StrokeWidth = 3f
        };

        foreach (var detection in detections)
        {
            paint.Color = detection.ClassName == "sitting"
                ? new SKColor(236, 63, 200)
                : new SKColor(132, 63, 229);
            var box = detection.Box;
            canvas.DrawRect(new SKRect(box.X1, box.Y1, box.X2, box.Y2), paint);
        }

        using var image = SKImage.FromBitmap(annotated);
        using var encoded = image.Encode(SKEncodedImageFormat.Jpeg, 92);
        return encoded.ToArray();
    }

    private void ValidateModelContract()
    {
        if (!_session.InputMetadata.TryGetValue(InputName, out var input) ||
            input.Dimensions is not [1, 3, ModelSize, ModelSize])
        {
            throw new InvalidOperationException("Unexpected ONNX input contract; expected input float32 [1,3,640,640].");
        }

        if (!_session.OutputMetadata.TryGetValue(BoxesOutputName, out var boxes) ||
            boxes.Dimensions is not [1, 300, 4] ||
            !_session.OutputMetadata.TryGetValue(LabelsOutputName, out var labels) ||
            labels.Dimensions is not [1, 300, 3])
        {
            throw new InvalidOperationException("Unexpected ONNX output contract; expected dets [1,300,4] and labels [1,300,3].");
        }

        if (_options.Classes.Any(modelClass => modelClass.OutputIndex < 0 || modelClass.OutputIndex >= 3))
        {
            throw new InvalidOperationException("Passenger class output indices must be within the three-column labels tensor.");
        }
    }

    private static float Sigmoid(float value) => 1f / (1f + MathF.Exp(-value));

    public void Dispose() => _session.Dispose();
}
