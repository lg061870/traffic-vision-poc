using Innova.Occupancy.Api.Vehicles;
using Innova.Occupancy.Api.Vehicles.Simulation;
using Microsoft.AspNetCore.Mvc;

namespace Innova.Occupancy.Api.Controllers;

/// <summary>
/// Controls the fleet simulator parameters, dispatch rules, demand scale, and financial assumptions in real time.
/// </summary>
[ApiController]
[Route("api/v1/simulation")]
[Produces("application/json")]
public sealed class SimulationController(MockFleetSimulator simulator) : ControllerBase
{
    /// <summary>
    /// Gets the current active simulation parameters and operational rules.
    /// </summary>
    [HttpGet("parameters")]
    [ProducesResponseType<SimulationParameters>(StatusCodes.Status200OK)]
    public ActionResult<SimulationParameters> GetParameters()
    {
        return Ok(simulator.Parameters);
    }

    /// <summary>
    /// Reconfigures the simulator with new operational, demand, or economic rules and replays the service day.
    /// </summary>
    [HttpPut("parameters")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateParameters([FromBody] SimulationParameters parameters, CancellationToken cancellationToken)
    {
        if (parameters.DemandScale < 0 || parameters.DemandScale > 10)
        {
            return Problem(
                title: "Demand scale must be between 0.0 and 10.0.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (parameters.PeakActiveShare < 0 || parameters.PeakActiveShare > 1 ||
            parameters.ValleyActiveShare < 0 || parameters.ValleyActiveShare > 1 ||
            parameters.NightActiveShare < 0 || parameters.NightActiveShare > 1)
        {
            return Problem(
                title: "Active fleet shares must be between 0.0 (0%) and 1.0 (100%).",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (parameters.CostPerBusHour < 0)
        {
            return Problem(
                title: "Cost per bus-hour cannot be negative.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (parameters.SeniorShare < 0 || parameters.SeniorShare >= 1)
        {
            return Problem(
                title: "Senior share must be between 0.0 and 1.0.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (parameters.Ramales is { Count: > 0 } ramales)
        {
            if (ramales.Any(r => r.BusCount < 0))
            {
                return Problem(
                    title: "Bus count for a ramal cannot be negative.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            parameters.TotalFleetSize = ramales.Sum(r => r.BusCount);
        }

        if (parameters.TotalFleetSize < 1 || parameters.TotalFleetSize > 100)
        {
            return Problem(
                title: "Total fleet size must be between 1 and 100 buses across all active ramales.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var updated = await simulator.ReconfigureAsync(parameters, cancellationToken);
        return Ok(new
        {
            status = "reconfigured",
            parameters = updated
        });
    }

    /// <summary>
    /// Resets the simulation parameters to their default baseline.
    /// </summary>
    [HttpPost("reset")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reset(CancellationToken cancellationToken)
    {
        var updated = await simulator.ReconfigureAsync(SimulationParameters.Default, cancellationToken);
        return Ok(new
        {
            status = "reset",
            parameters = updated
        });
    }
}
