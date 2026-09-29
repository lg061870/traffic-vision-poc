using Microsoft.AspNetCore.Mvc;

namespace TrafficVision.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> Get()
    {
        return Ok(new HealthResponse("ok", "TrafficVision.Api", DateTimeOffset.UtcNow));
    }
}

public sealed record HealthResponse(string Status, string Service, DateTimeOffset TimestampUtc);
