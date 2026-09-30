using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Channels;
using Microsoft.Extensions.Options;
using OpenCvSharp;
using SkiaSharp;
using TrafficVision.Api.Configuration;
using TrafficVision.Api.DoorEvents;
using TrafficVision.Api.Models;
using TrafficVision.Api.Tracking;

namespace TrafficVision.Api.Services;

public sealed class PassengerVideoAnalysisCoordinator : BackgroundService
{
    private readonly ConcurrentDictionary<Guid, VideoJob> _jobs = new();
    private readonly Channel<VideoJob> _queue = Channel.CreateUnbounded<VideoJob>(
        new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });
    private readonly PassengerImageAnalyzer _analyzer;
    private readonly PassengerVisionOptions _visionOptions;
    private readonly ILogger<PassengerVideoAnalysisCoordinator> _logger;
    private readonly string _temporaryDirectory;

    public PassengerVideoAnalysisCoordinator(
        PassengerImageAnalyzer analyzer,
        IOptions<PassengerVisionOptions> visionOptions,
        ILogger<PassengerVideoAnalysisCoordinator> logger)
    {
        _analyzer = analyzer;
        _visionOptions = visionOptions.Value;
        _logger = logger;
        _temporaryDirectory = Path.Combine(Path.GetTempPath(), "traffic-vision-poc", "video-jobs");
        Directory.CreateDirectory(_temporaryDirectory);
    }

    public async Task<VideoAnalysisAccepted> EnqueueAsync(
        Stream videoStream,
        string fileName,
        VideoAnalysisRequestOptions requestOptions,
        CancellationToken cancellationToken)
    {
        var jobId = Guid.NewGuid();
        var extension = Path.GetExtension(fileName);
        var temporaryPath = Path.Combine(_temporaryDirectory, $"{jobId:N}{extension}");
        await using (var output = new FileStream(
            temporaryPath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            1024 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan))
        {
            await videoStream.CopyToAsync(output, cancellationToken);
        }

        var job = new VideoJob(jobId, Path.GetFileName(fileName), temporaryPath, requestOptions);
        if (!_jobs.TryAdd(jobId, job))
        {
            File.Delete(temporaryPath);
            throw new InvalidOperationException("Unable to register the video-analysis job.");
        }

        await _queue.Writer.WriteAsync(job, cancellationToken);
        return new VideoAnalysisAccepted(job.Id, job.Status, job.CreatedAtUtc);
    }

    public VideoAnalysisJobResponse? Get(Guid jobId) =>
        _jobs.TryGetValue(jobId, out var job) ? job.Snapshot() : null;

    public bool Cancel(Guid jobId)
    {
        if (!_jobs.TryGetValue(jobId, out var job) ||
            job.Status is VideoAnalysisStatus.Completed or VideoAnalysisStatus.Failed or VideoAnalysisStatus.Cancelled)
        {
            return false;
        }

        job.Cancellation.Cancel();
        return true;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            using var linkedCancellation = CancellationTokenSource.CreateLinkedTokenSource(
                stoppingToken,
                job.Cancellation.Token);
            try
            {
                job.MarkProcessing();
                var result = ProcessVideo(job, linkedCancellation.Token);
                job.MarkCompleted(result);
            }
            catch (OperationCanceledException) when (job.Cancellation.IsCancellationRequested)
            {
                job.MarkCancelled();
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                job.MarkCancelled();
                return;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Video analysis {JobId} failed", job.Id);
                job.MarkFailed(exception.Message);
            }
            finally
            {
                TryDelete(job.TemporaryPath);
            }
        }
    }

    private PassengerVideoResult ProcessVideo(VideoJob job, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        using var capture = new VideoCapture(job.TemporaryPath);
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
        var processingFps = Math.Clamp(job.Options.ProcessingFps, 1, 15);
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
        var doorCounter = string.Equals(job.Options.CameraView, "rear", StringComparison.OrdinalIgnoreCase)
            ? new DoorCrossingCounter(
                width,
                height,
                job.Options.DoorLineStart,
                job.Options.DoorLineEnd,
                job.Options.InsidePoint,
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
        var eventOccupancy = job.Options.InitialPassengers;
        var peakEventOccupancy = eventOccupancy;

        using var frame = new Mat();
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
                job.UpdateProgress(
                    CalculateProgress(sourceFrameNumber, totalSourceFrames),
                    $"Analyzing frame {sourceFrameNumber:N0}");

                Cv2.ImEncode(
                    ".jpg",
                    frame,
                    out var encodedFrame,
                    [(int)ImwriteFlags.JpegQuality, 95]);
                using var bitmap = SKBitmap.Decode(encodedFrame)
                    ?? throw new InvalidDataException("A video frame could not be converted for inference.");
                var detections = _analyzer.AnalyzeBitmap(
                    bitmap,
                    job.Options.ConfidenceThreshold,
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
            job.OriginalFileName,
            job.Options.CameraView,
            width,
            height,
            durationSeconds,
            sourceFps,
            actualProcessingFps,
            stopwatch.Elapsed.TotalSeconds,
            "bus-passengers-rfdetr-s-v1",
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

    private static int CalculateProgress(int frameNumber, int totalFrames) =>
        totalFrames <= 0 ? 0 : Math.Clamp((int)Math.Round(frameNumber * 100d / totalFrames), 0, 99);

    private void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (Exception exception)
        {
            _logger.LogWarning(exception, "Could not remove temporary video {Path}", path);
        }
    }

    private sealed class VideoJob
    {
        private readonly object _sync = new();
        private VideoAnalysisStatus _status = VideoAnalysisStatus.Queued;
        private int _progressPercent;
        private string _stage = "Waiting for the analysis worker";
        private string? _error;
        private DateTimeOffset? _startedAtUtc;
        private DateTimeOffset? _completedAtUtc;
        private PassengerVideoResult? _result;

        public VideoJob(
            Guid id,
            string originalFileName,
            string temporaryPath,
            VideoAnalysisRequestOptions options)
        {
            Id = id;
            OriginalFileName = originalFileName;
            TemporaryPath = temporaryPath;
            Options = options;
        }

        public Guid Id { get; }
        public string OriginalFileName { get; }
        public string TemporaryPath { get; }
        public VideoAnalysisRequestOptions Options { get; }
        public DateTimeOffset CreatedAtUtc { get; } = DateTimeOffset.UtcNow;
        public CancellationTokenSource Cancellation { get; } = new();

        public VideoAnalysisStatus Status
        {
            get { lock (_sync) return _status; }
        }

        public void MarkProcessing()
        {
            lock (_sync)
            {
                _status = VideoAnalysisStatus.Processing;
                _stage = "Opening video";
                _startedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        public void UpdateProgress(int progressPercent, string stage)
        {
            lock (_sync)
            {
                _progressPercent = progressPercent;
                _stage = stage;
            }
        }

        public void MarkCompleted(PassengerVideoResult result)
        {
            lock (_sync)
            {
                _status = VideoAnalysisStatus.Completed;
                _progressPercent = 100;
                _stage = "Analysis complete";
                _result = result;
                _completedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        public void MarkFailed(string error)
        {
            lock (_sync)
            {
                _status = VideoAnalysisStatus.Failed;
                _stage = "Analysis failed";
                _error = error;
                _completedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        public void MarkCancelled()
        {
            lock (_sync)
            {
                _status = VideoAnalysisStatus.Cancelled;
                _stage = "Analysis cancelled";
                _completedAtUtc = DateTimeOffset.UtcNow;
            }
        }

        public VideoAnalysisJobResponse Snapshot()
        {
            lock (_sync)
            {
                return new VideoAnalysisJobResponse(
                    Id,
                    _status,
                    _progressPercent,
                    _stage,
                    _error,
                    CreatedAtUtc,
                    _startedAtUtc,
                    _completedAtUtc,
                    _result);
            }
        }
    }
}
