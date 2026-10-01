using System.Net;
using Innova.OnboardComputer.App.Sending;

namespace Innova.OnboardComputer.App.Tests;

public sealed class OccupancyApiClientTests
{
    [Theory]
    [InlineData(HttpStatusCode.Accepted, SendOutcome.Accepted)]
    [InlineData(HttpStatusCode.InternalServerError, SendOutcome.RetryLater)]
    [InlineData(HttpStatusCode.ServiceUnavailable, SendOutcome.RetryLater)]
    [InlineData(HttpStatusCode.TooManyRequests, SendOutcome.RetryLater)]
    [InlineData(HttpStatusCode.RequestTimeout, SendOutcome.RetryLater)]
    [InlineData(HttpStatusCode.BadRequest, SendOutcome.Rejected)]
    [InlineData(HttpStatusCode.Unauthorized, SendOutcome.Rejected)]
    [InlineData(HttpStatusCode.NotFound, SendOutcome.Rejected)]
    public async Task Status_codes_decide_whether_to_retry(HttpStatusCode status, SendOutcome expected)
    {
        var client = Client(new StubHandler(_ => new HttpResponseMessage(status)));

        var result = await client.SendAsync(TestSupport.Message(1), CancellationToken.None);

        Assert.Equal(expected, result.Outcome);
    }

    [Fact]
    public async Task An_unreachable_api_means_retry_later()
    {
        var client = Client(new StubHandler(_ => throw new HttpRequestException("Connection refused")));

        var result = await client.SendAsync(TestSupport.Message(1), CancellationToken.None);

        Assert.Equal(SendOutcome.RetryLater, result.Outcome);
    }

    [Fact]
    public async Task Posts_json_to_the_raw_endpoint_with_the_device_key()
    {
        HttpRequestMessage? seen = null;
        string? body = null;
        var client = Client(
            new StubHandler(request =>
            {
                seen = request;
                body = request.Content!.ReadAsStringAsync().Result;
                return new HttpResponseMessage(HttpStatusCode.Accepted);
            }),
            deviceKey: "secret-key");

        await client.SendAsync(TestSupport.Message(9), CancellationToken.None);

        Assert.Equal(HttpMethod.Post, seen!.Method);
        Assert.Equal("http://api.test/api/v1/vehicles/SJB-10662/raw", seen.RequestUri!.ToString());
        Assert.Equal(["secret-key"], seen.Headers.GetValues(OccupancyApiClient.DeviceKeyHeader));
        Assert.Equal("application/json", seen.Content!.Headers.ContentType!.MediaType);
        Assert.StartsWith("{\"sequence\":9,", body);
    }

    private static OccupancyApiClient Client(HttpMessageHandler handler, string deviceKey = "") =>
        new(new HttpClient(handler) { BaseAddress = new Uri("http://api.test/") }, TestSupport.Options(deviceKey: deviceKey));

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(respond(request));
    }
}
