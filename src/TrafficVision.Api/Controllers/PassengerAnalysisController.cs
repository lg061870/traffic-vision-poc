using Microsoft.AspNetCore.Mvc;
using TrafficVision.Api.Models;
using TrafficVision.Api.Services;

namespace TrafficVision.Api.Controllers;

[ApiController]
[Route("api/passenger-analysis")]
public sealed class PassengerAnalysisController(PassengerImageAnalyzer analyzer) : ControllerBase
{
    private const long MaximumVideoBytes = 500L * 1024 * 1024;
    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png" };
    private static readonly HashSet<string> AllowedVideoExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".mp4", ".mov", ".avi", ".mkv" };

    [HttpPost("image")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(20 * 1024 * 1024)]
    [ProducesResponseType<PassengerImageResult>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PassengerImageResult>> AnalyzeImage(
        IFormFile image,
        CancellationToken cancellationToken)
    {
        if (image.Length == 0)
        {
            return BadRequest(new ProblemDetails { Title = "The uploaded image is empty." });
        }

        var extension = Path.GetExtension(image.FileName);
        if (!AllowedExtensions.Contains(extension))
        {
            return BadRequest(new ProblemDetails { Title = "Upload a JPG, JPEG, or PNG image." });
        }

        await using var stream = image.OpenReadStream();
        return Ok(await analyzer.AnalyzeAsync(stream, image.FileName, cancellationToken));
    }

    [HttpPost("video")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumVideoBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaximumVideoBytes)]
    [ProducesResponseType<VideoAnalysisAccepted>(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VideoAnalysisAccepted>> AnalyzeVideo(
        [FromServices] PassengerVideoAnalysisCoordinator coordinator,
        [FromForm] VideoAnalysisUploadForm form,
        CancellationToken cancellationToken)
    {
        if (form.Video is null || form.Video.Length == 0)
        {
            return BadRequest(new ProblemDetails { Title = "The uploaded video is empty." });
        }

        if (form.Video.Length > MaximumVideoBytes)
        {
            return BadRequest(new ProblemDetails { Title = "The POC video limit is 500 MB." });
        }

        var extension = Path.GetExtension(form.Video.FileName);
        if (!AllowedVideoExtensions.Contains(extension))
        {
            return BadRequest(new ProblemDetails { Title = "Upload an MP4, MOV, AVI, or MKV video." });
        }

        var cameraView = form.CameraView.Trim().ToLowerInvariant();
        if (cameraView is not ("front" or "rear"))
        {
            return BadRequest(new ProblemDetails { Title = "Camera view must be front or rear." });
        }

        if (form.ConfidenceThreshold is < 0.05f or > 0.95f || form.ProcessingFps is < 1 or > 15)
        {
            return BadRequest(new ProblemDetails { Title = "Analysis settings are outside the supported POC range." });
        }

        var points = new[]
        {
            new NormalizedPoint(form.DoorLineX1, form.DoorLineY1),
            new NormalizedPoint(form.DoorLineX2, form.DoorLineY2),
            new NormalizedPoint(form.InsideX, form.InsideY)
        };
        if (points.Any(point => point.X is < 0 or > 1 || point.Y is < 0 or > 1))
        {
            return BadRequest(new ProblemDetails { Title = "Door-line coordinates must be normalized from 0 to 1." });
        }

        if (cameraView == "rear" &&
            Math.Abs(form.DoorLineX1 - form.DoorLineX2) < 0.001f &&
            Math.Abs(form.DoorLineY1 - form.DoorLineY2) < 0.001f)
        {
            return BadRequest(new ProblemDetails { Title = "The rear-camera door line needs two different points." });
        }

        var requestOptions = new VideoAnalysisRequestOptions(
            cameraView,
            form.ConfidenceThreshold,
            form.ProcessingFps,
            Math.Max(0, form.InitialPassengers),
            points[0],
            points[1],
            points[2]);

        await using var stream = form.Video.OpenReadStream();
        var accepted = await coordinator.EnqueueAsync(
            stream,
            form.Video.FileName,
            requestOptions,
            cancellationToken);
        return AcceptedAtAction(nameof(GetVideoAnalysis), new { jobId = accepted.JobId }, accepted);
    }

    [HttpGet("video/{jobId:guid}")]
    [ProducesResponseType<VideoAnalysisJobResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult<VideoAnalysisJobResponse> GetVideoAnalysis(
        Guid jobId,
        [FromServices] PassengerVideoAnalysisCoordinator coordinator)
    {
        var job = coordinator.Get(jobId);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpDelete("video/{jobId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult CancelVideoAnalysis(
        Guid jobId,
        [FromServices] PassengerVideoAnalysisCoordinator coordinator) =>
        coordinator.Cancel(jobId) ? NoContent() : NotFound();
}

public sealed class VideoAnalysisUploadForm
{
    public IFormFile? Video { get; set; }
    public string CameraView { get; set; } = "front";
    public float ConfidenceThreshold { get; set; } = 0.40f;
    public int ProcessingFps { get; set; } = 1;
    public int InitialPassengers { get; set; }
    public float DoorLineX1 { get; set; } = 0.1f;
    public float DoorLineY1 { get; set; } = 0.7f;
    public float DoorLineX2 { get; set; } = 0.9f;
    public float DoorLineY2 { get; set; } = 0.7f;
    public float InsideX { get; set; } = 0.5f;
    public float InsideY { get; set; } = 0.35f;
}
