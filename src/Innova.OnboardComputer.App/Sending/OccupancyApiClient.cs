using System.Net;
using System.Net.Http.Json;
using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Contracts;
using Microsoft.Extensions.Options;

namespace Innova.OnboardComputer.App.Sending;

public enum SendOutcome
{
    /// <summary>The API took the message (202), including a resend it had already counted.</summary>
    Accepted,

    /// <summary>The API could not be reached or was not ready; keep the message and try later.</summary>
    RetryLater,

    /// <summary>The API refused the message itself (400, 401, 404…); sending it again cannot help.</summary>
    Rejected
}

public sealed record SendResult(SendOutcome Outcome, string Detail);

public interface IOccupancyApiClient
{
    Task<SendResult> SendAsync(RawVehicleMessage message, CancellationToken cancellationToken);
}

/// <summary>Posts to POST /api/v1/vehicles/{vehicleId}/raw with the bus's X-Device-Key.</summary>
public sealed class OccupancyApiClient(HttpClient http, IOptions<OnboardComputerOptions> options) : IOccupancyApiClient
{
    public const string DeviceKeyHeader = "X-Device-Key";

    public async Task<SendResult> SendAsync(RawVehicleMessage message, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"api/v1/vehicles/{Uri.EscapeDataString(settings.VehicleId)}/raw")
        {
            Content = JsonContent.Create(message, options: RawJson.Options)
        };
        if (!string.IsNullOrEmpty(settings.DeviceKey))
        {
            request.Headers.Add(DeviceKeyHeader, settings.DeviceKey);
        }

        try
        {
            using var response = await http.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new SendResult(SendOutcome.Accepted, $"{(int)response.StatusCode}");
            }

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            var detail = $"{(int)response.StatusCode} {body}".Trim();
            return IsTransient(response.StatusCode)
                ? new SendResult(SendOutcome.RetryLater, detail)
                : new SendResult(SendOutcome.Rejected, detail);
        }
        catch (HttpRequestException exception)
        {
            return new SendResult(SendOutcome.RetryLater, exception.Message);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return new SendResult(SendOutcome.RetryLater, "The request timed out.");
        }
    }

    private static bool IsTransient(HttpStatusCode status) =>
        status is HttpStatusCode.RequestTimeout or HttpStatusCode.TooManyRequests || (int)status >= 500;
}
