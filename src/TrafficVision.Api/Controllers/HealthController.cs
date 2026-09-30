using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TrafficVision.Api.Configuration;

namespace TrafficVision.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class HealthController(IOptions<FeatureOptions> features) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<HealthResponse>(StatusCodes.Status200OK)]
    public ActionResult<HealthResponse> Get()
    {
        return Ok(new HealthResponse("ok", "TrafficVision.Api", DateTimeOffset.UtcNow, features.Value.UploadsEnabled));
    }
}

public sealed record HealthResponse(string Status, string Service, DateTimeOffset TimestampUtc, bool UploadsEnabled);
