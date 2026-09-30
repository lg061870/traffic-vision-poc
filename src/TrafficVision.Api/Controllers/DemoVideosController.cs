using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using TrafficVision.Api.DemoLibrary;

namespace TrafficVision.Api.Controllers;

[ApiController]
[Route("api/demo-videos")]
public sealed class DemoVideosController(DemoVideoLibrary library) : ControllerBase
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<DemoVideoSummary>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<DemoVideoSummary>> List() => Ok(library.List());

    [HttpGet("{id}/result")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetResult(string id)
    {
        var path = library.FindResult(id);
        return path is null ? NotFound() : PhysicalFile(path, "application/json");
    }

    [HttpGet("{id}/video")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status206PartialContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetVideo(string id)
    {
        var path = library.FindVideo(id);
        if (path is null)
        {
            return NotFound();
        }

        var contentType = ContentTypes.TryGetContentType(path, out var type) ? type : "application/octet-stream";
        return PhysicalFile(path, contentType, enableRangeProcessing: true);
    }
}
