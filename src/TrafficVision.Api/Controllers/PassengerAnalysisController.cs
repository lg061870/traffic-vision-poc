using Microsoft.AspNetCore.Mvc;
using TrafficVision.Api.Models;
using TrafficVision.Api.Services;

namespace TrafficVision.Api.Controllers;

[ApiController]
[Route("api/passenger-analysis")]
public sealed class PassengerAnalysisController(PassengerImageAnalyzer analyzer) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png" };

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
}
