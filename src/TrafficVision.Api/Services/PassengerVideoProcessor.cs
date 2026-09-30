using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.Extensions.Options;
using OpenCvSharp;
using SkiaSharp;
using TrafficVision.Api.Configuration;
using TrafficVision.Api.DoorEvents;
using TrafficVision.Api.Models;
using TrafficVision.Api.Tracking;

namespace TrafficVision.Api.Services;

public sealed record VideoProcessingProgress(int Percent, int SourceFrame, int TotalSourceFrames, int AnalyzedFrames);

public sealed class PassengerVideoProcessor(
    PassengerImageAnalyzer analyzer,
    IOptions<PassengerVisionOptions> visionOptions)
{
    private readonly PassengerVisionOptions _visionOptions = visionOptions.Value;

    public PassengerVideoResult Process(
        string videoPath,
        string originalFileName,
        VideoAnalysisRequestOptions options,
        Action<VideoProcessingProgress>? progress,
        CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        using var capture = new VideoCapture(videoPath);
        if (!capture.IsOpened())
        {
            throw new InvalidDataException("The uploaded video could not be decoded.");
        }

        var sourceFps = capture.Get(VideoCaptureProperties.Fps);
        if (!double.IsFinite(sourceFps) || sourceFps <= 0)
        {
            sourceFps = 30;
        }

        var totalSourceFrames = Math.Max(0, (int)Math.Round(capture.Get(VideoCaptureProperties.FrameCount)));
        var width = Math.Max(1, (int)Math.Round(capture.Get(VideoCaptureProperties.FrameWidth)));
        var height = Math.Max(1, (int)Math.Round(capture.Get(VideoCaptureProperties.FrameHeight)));
        var durationSeconds = totalSourceFrames > 0 ? totalSourceFrames / sourceFps : 0;
        var processingFps = Math.Clamp(options.ProcessingFps, 1, 15);
        processingFps = Math.Min(processingFps, Math.Max(1, (int)Math.Ceiling(sourceFps)));
        var sampleIntervalSeconds = 1d / processingFps;
        var lostTrackFrames = Math.Max(
            2,
            (int)Math.Ceiling(
                _visionOptions.Tracking.LostTrackFrames *
                (processingFps / 15d)));
        var tracker = new PassengerTracker(
            _visionOptions.Tracking.MatchIouThreshold,
            _visionOptions.Tracking.ConfirmAfterDetections,
            lostTrackFrames);
        var doorCounter = string.Equals(options.CameraView, "rear", StringComparison.OrdinalIgnoreCase)
            ? new DoorCrossingCounter(
                width,
                height,
                options.DoorLineStart,
                options.DoorLineEnd,
                options.InsidePoint,
                _visionOptions.DoorEvents.HysteresisPixels,
                _visionOptions.DoorEvents.StableFrames,
                _visionOptions.DoorEvents.CooldownSeconds)
            : null;

        var frames = new List<PassengerVideoFrame>();
        var doorEvents = new List<PassengerDoorEvent>();
        var nextSampleSeconds = 0d;
        var sourceFrameNumber = 0;
        var sittingPeak = 0;
        var standingPeak = 0;
        var visiblePeak = 0;
        var eventOccupancy = options.InitialPassengers;
        var peakEventOccupancy = eventOccupancy;

        using var frame = new Mat();
        using var rgba = new Mat();
        while (capture.Read(frame))
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (frame.Empty())
            {
                break;
            }

            var timestampSeconds = sourceFrameNumber / sourceFps;
            if (timestampSeconds + 0.0001 >= nextSampleSeconds)
            {
                progress?.Invoke(new VideoProcessingProgress(
                    CalculateProgress(sourceFrameNumber, totalSourceFrames),
                    sourceFrameNumber,
                    totalSourceFrames,
                    frames.Count));

                using var bitmap = ToBitmap(frame, rgba);
                var detections = analyzer.AnalyzeBitmap(
                    bitmap,
                    options.ConfidenceThreshold,
                    cancellationToken);
                var trackedDetections = tracker.Update(detections);
                var frameEvents = doorCounter?.Update(timestampSeconds, trackedDetections) ?? [];
                doorEvents.AddRange(frameEvents);

                foreach (var doorEvent in frameEvents)
                {
                    eventOccupancy += doorEvent.Direction == "boarded" ? 1 : -1;
                    eventOccupancy = Math.Max(0, eventOccupancy);
                    peakEventOccupancy = Math.Max(peakEventOccupancy, eventOccupancy);
                }

                var sitting = trackedDetections.Count(detection => detection.ClassName == "sitting");
                var standing = trackedDetections.Count(detection => detection.ClassName == "standing");
                sittingPeak = Math.Max(sittingPeak, sitting);
                standingPeak = Math.Max(standingPeak, standing);
                visiblePeak = Math.Max(visiblePeak, sitting + standing);
                frames.Add(new PassengerVideoFrame(sourceFrameNumber, timestampSeconds, trackedDetections));

                do
                {
                    nextSampleSeconds += sampleIntervalSeconds;
                }
                while (nextSampleSeconds <= timestampSeconds);
            }

            sourceFrameNumber++;
        }

        if (sourceFrameNumber == 0)
        {
            throw new InvalidDataException("The uploaded video contains no readable frames.");
        }

        if (durationSeconds <= 0)
        {
            durationSeconds = sourceFrameNumber / sourceFps;
        }

        stopwatch.Stop();
        var boarded = doorEvents.Count(item => item.Direction == "boarded");
        var exited = doorEvents.Count(item => item.Direction == "exited");
        var actualProcessingFps = durationSeconds > 0 ? frames.Count / durationSeconds : processingFps;

        return new PassengerVideoResult(
            originalFileName,
            options.CameraView,
            width,
            height,
            durationSeconds,
            sourceFps,
            actualProcessingFps,
            stopwatch.Elapsed.TotalSeconds,
            "bus-passengers-rfdetr-s-v1",
            DateTimeOffset.UtcNow,
            new PassengerVideoSettings(
                options.ConfidenceThreshold,
                options.InitialPassengers,
                options.DoorLineStart,
                options.DoorLineEnd,
                options.InsidePoint),
            frames,
            doorEvents,
            new PassengerVideoSummary(
                sittingPeak,
                standingPeak,
                visiblePeak,
                tracker.ConfirmedTrackCount,
                boarded,
                exited,
                eventOccupancy,
                peakEventOccupancy));
    }

    private static SKBitmap ToBitmap(Mat bgrFrame, Mat rgba)
    {
        Cv2.CvtColor(bgrFrame, rgba, ColorConversionCodes.BGR2RGBA);
        var bitmap = new SKBitmap(new SKImageInfo(rgba.Width, rgba.Height, SKColorType.Rgba8888, SKAlphaType.Opaque));
        var sourceRowBytes = (int)rgba.Step();
        var targetRowBytes = bitmap.RowBytes;
        var rowLength = rgba.Width * 4;
        var buffer = new byte[rowLength];
        var target = bitmap.GetPixels();
        for (var y = 0; y < rgba.Height; y++)
        {
            Marshal.Copy(rgba.Data + (y * sourceRowBytes), buffer, 0, rowLength);
            Marshal.Copy(buffer, 0, target + (y * targetRowBytes), rowLength);
        }

        return bitmap;
    }

    private static int CalculateProgress(int frameNumber, int totalFrames) =>
        totalFrames <= 0 ? 0 : Math.Clamp((int)Math.Round(frameNumber * 100d / totalFrames), 0, 99);
}
