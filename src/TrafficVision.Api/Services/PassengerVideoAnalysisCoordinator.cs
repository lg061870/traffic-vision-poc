using System.Collections.Concurrent;
using System.Threading.Channels;
using TrafficVision.Api.Models;

namespace TrafficVision.Api.Services;

public sealed class PassengerVideoAnalysisCoordinator : BackgroundService
{
    private readonly ConcurrentDictionary<Guid, VideoJob> _jobs = new();
    private readonly Channel<VideoJob> _queue = Channel.CreateUnbounded<VideoJob>(
        new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });
    private readonly PassengerVideoProcessor _processor;
    private readonly ILogger<PassengerVideoAnalysisCoordinator> _logger;
    private readonly string _temporaryDirectory;

    public PassengerVideoAnalysisCoordinator(
        PassengerVideoProcessor processor,
        ILogger<PassengerVideoAnalysisCoordinator> logger)
    {
        _processor = processor;
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
                var result = _processor.Process(
                    job.TemporaryPath,
                    job.OriginalFileName,
                    job.Options,
                    progress => job.UpdateProgress(
                        progress.Percent,
                        $"Analyzing frame {progress.SourceFrame:N0}"),
                    linkedCancellation.Token);
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
