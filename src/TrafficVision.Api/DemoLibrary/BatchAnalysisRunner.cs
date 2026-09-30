using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TrafficVision.Api.Configuration;
using TrafficVision.Api.Models;
using TrafficVision.Api.Services;

namespace TrafficVision.Api.DemoLibrary;

/// <summary>
/// Optional per-clip overrides, read from "&lt;video file name&gt;.settings.json" next to the video.
/// </summary>
public sealed record BatchClipSettings(
    string? CameraView,
    int? ProcessingFps,
    float? ConfidenceThreshold,
    int? InitialPassengers,
    NormalizedPoint? DoorLineStart,
    NormalizedPoint? DoorLineEnd,
    NormalizedPoint? InsidePoint,
    bool? MovingCamera);

public sealed record BatchArguments(
    string? InputPath,
    string? OutputPath,
    int ProcessingFps,
    string CameraView,
    float? ConfidenceThreshold,
    bool Force)
{
    public const string Usage = """
        Usage: dotnet run --project src/TrafficVision.Api -- batch [options]

          --input <folder>       Videos to analyze (default: data/demo/videos)
          --output <folder>      Where result JSON files go (default: data/demo/results)
          --fps <1-15>           Frames analyzed per second of video (default: 5)
          --camera <front|rear>  Camera view when a clip has no settings file (default: front)
          --confidence <0-1>     Detection threshold (default: PassengerVision:ConfidenceThreshold)
          --force                Re-analyze clips that already have an up-to-date result

        Per-clip overrides: put "<video file name>.settings.json" next to the video, e.g.
          { "cameraView": "rear", "processingFps": 10, "initialPassengers": 12,
            "doorLineStart": { "x": 0.1, "y": 0.7 }, "doorLineEnd": { "x": 0.9, "y": 0.7 },
            "insidePoint": { "x": 0.5, "y": 0.35 }, "movingCamera": false }
        """;

    public static BatchArguments Parse(IReadOnlyList<string> args)
    {
        string? input = null;
        string? output = null;
        var fps = 5;
        var camera = "front";
        float? confidence = null;
        var force = false;

        for (var index = 0; index < args.Count; index++)
        {
            var name = args[index];
            string Value() => index + 1 < args.Count
                ? args[++index]
                : throw new ArgumentException($"Missing value for {name}.");

            switch (name)
            {
                case "--input": input = Value(); break;
                case "--output": output = Value(); break;
                case "--fps": fps = int.Parse(Value(), CultureInfo.InvariantCulture); break;
                case "--camera": camera = Value().Trim().ToLowerInvariant(); break;
                case "--confidence": confidence = float.Parse(Value(), CultureInfo.InvariantCulture); break;
                case "--force": force = true; break;
                default: throw new ArgumentException($"Unknown option '{name}'.");
            }
        }

        if (fps is < 1 or > 15)
        {
            throw new ArgumentException("--fps must be between 1 and 15.");
        }

        if (camera is not ("front" or "rear"))
        {
            throw new ArgumentException("--camera must be front or rear.");
        }

        if (confidence is < 0.05f or > 0.95f)
        {
            throw new ArgumentException("--confidence must be between 0.05 and 0.95.");
        }

        return new BatchArguments(input, output, fps, camera, confidence, force);
    }
}

public sealed class BatchAnalysisRunner(
    PassengerVideoProcessor processor,
    DemoVideoLibrary library,
    IOptions<PassengerVisionOptions> visionOptions)
{
    private static readonly NormalizedPoint DefaultLineStart = new(0.1f, 0.7f);
    private static readonly NormalizedPoint DefaultLineEnd = new(0.9f, 0.7f);
    private static readonly NormalizedPoint DefaultInsidePoint = new(0.5f, 0.35f);

    public async Task<int> RunAsync(BatchArguments arguments, CancellationToken cancellationToken)
    {
        var inputPath = arguments.InputPath is null ? library.VideosPath : Path.GetFullPath(arguments.InputPath);
        var outputPath = arguments.OutputPath is null ? library.ResultsPath : Path.GetFullPath(arguments.OutputPath);
        if (!Directory.Exists(inputPath))
        {
            Log($"Input folder not found: {inputPath}");
            return 1;
        }

        Directory.CreateDirectory(outputPath);
        var videos = Directory.EnumerateFiles(inputPath)
            .Where(path => DemoVideoLibrary.VideoExtensions.Contains(Path.GetExtension(path)))
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        Log($"Input:  {inputPath}");
        Log($"Output: {outputPath}");
        Log($"Found {videos.Length} video(s). Default rate {arguments.ProcessingFps} FPS, camera {arguments.CameraView}.");

        var batchTimer = Stopwatch.StartNew();
        int completed = 0, skipped = 0, failed = 0;
        for (var index = 0; index < videos.Length; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var videoPath = videos[index];
            var fileName = Path.GetFileName(videoPath);
            var resultPath = Path.Combine(outputPath, DemoVideoLibrary.ResultFileName(fileName));
            var settingsPath = videoPath + ".settings.json";
            var label = $"[{index + 1}/{videos.Length}] {fileName}";

            if (!arguments.Force && IsUpToDate(resultPath, videoPath, settingsPath))
            {
                Log($"{label}: result is up to date, skipping.");
                skipped++;
                continue;
            }

            try
            {
                var options = await BuildOptionsAsync(arguments, settingsPath, cancellationToken);
                Log($"{label}: analyzing ({options.CameraView}, {options.ProcessingFps} FPS, confidence {options.ConfidenceThreshold:0.00})...");
                var clipTimer = Stopwatch.StartNew();
                var lastReport = TimeSpan.Zero;
                var lastPercent = -10;

                var result = processor.Process(videoPath, fileName, options, progress =>
                {
                    if (progress.Percent < lastPercent + 10 &&
                        clipTimer.Elapsed - lastReport < TimeSpan.FromMinutes(1))
                    {
                        return;
                    }

                    lastPercent = progress.Percent;
                    lastReport = clipTimer.Elapsed;
                    var eta = progress.Percent > 0
                        ? TimeSpan.FromSeconds(clipTimer.Elapsed.TotalSeconds * (100 - progress.Percent) / progress.Percent)
                        : (TimeSpan?)null;
                    Log($"{label}: {progress.Percent,3}% · {progress.AnalyzedFrames} frames analyzed · elapsed {Format(clipTimer.Elapsed)}" +
                        (eta is null ? string.Empty : $" · ~{Format(eta.Value)} left"));
                }, cancellationToken);

                await WriteResultAsync(resultPath, result, cancellationToken);
                completed++;
                Log($"{label}: done in {Format(clipTimer.Elapsed)} · {result.Frames.Count} frames · " +
                    $"peak visible {result.Summary.VisiblePeak} · tracked {result.Summary.UniquePassengers} · " +
                    $"boarded {result.Summary.Boarded} · exited {result.Summary.Exited}");
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception exception)
            {
                failed++;
                Log($"{label}: FAILED · {exception.Message}");
            }
        }

        Log($"Batch finished in {Format(batchTimer.Elapsed)}: {completed} analyzed, {skipped} skipped, {failed} failed.");
        return failed == 0 ? 0 : 2;
    }

    private async Task<VideoAnalysisRequestOptions> BuildOptionsAsync(
        BatchArguments arguments,
        string settingsPath,
        CancellationToken cancellationToken)
    {
        BatchClipSettings? clip = null;
        if (File.Exists(settingsPath))
        {
            await using var stream = File.OpenRead(settingsPath);
            clip = await JsonSerializer.DeserializeAsync<BatchClipSettings>(stream, DemoVideoLibrary.JsonOptions, cancellationToken);
        }

        var cameraView = (clip?.CameraView ?? arguments.CameraView).Trim().ToLowerInvariant();
        if (cameraView is not ("front" or "rear"))
        {
            throw new InvalidDataException($"cameraView in {Path.GetFileName(settingsPath)} must be front or rear.");
        }

        return new VideoAnalysisRequestOptions(
            cameraView,
            Math.Clamp(clip?.ConfidenceThreshold ?? arguments.ConfidenceThreshold ?? visionOptions.Value.ConfidenceThreshold, 0.05f, 0.95f),
            Math.Clamp(clip?.ProcessingFps ?? arguments.ProcessingFps, 1, 15),
            Math.Max(0, clip?.InitialPassengers ?? visionOptions.Value.InitialPassengers),
            clip?.DoorLineStart ?? DefaultLineStart,
            clip?.DoorLineEnd ?? DefaultLineEnd,
            clip?.InsidePoint ?? DefaultInsidePoint,
            clip?.MovingCamera ?? false);
    }

    private static bool IsUpToDate(string resultPath, string videoPath, string settingsPath)
    {
        if (!File.Exists(resultPath))
        {
            return false;
        }

        var resultTime = File.GetLastWriteTimeUtc(resultPath);
        return resultTime >= File.GetLastWriteTimeUtc(videoPath) &&
               (!File.Exists(settingsPath) || resultTime >= File.GetLastWriteTimeUtc(settingsPath));
    }

    private static async Task WriteResultAsync(string resultPath, PassengerVideoResult result, CancellationToken cancellationToken)
    {
        var temporaryPath = resultPath + ".tmp";
        await using (var stream = File.Create(temporaryPath))
        {
            await JsonSerializer.SerializeAsync(stream, result, DemoVideoLibrary.JsonOptions, cancellationToken);
        }

        File.Move(temporaryPath, resultPath, overwrite: true);
    }

    private static string Format(TimeSpan value) =>
        value.TotalHours >= 1 ? value.ToString(@"h\:mm\:ss") : value.ToString(@"m\:ss");

    private static void Log(string message) =>
        Console.WriteLine($"{DateTime.Now:HH:mm:ss} {message}");
}
