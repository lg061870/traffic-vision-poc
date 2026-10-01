using System.Threading.Channels;
using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Sources;
using Microsoft.Extensions.Options;

namespace Innova.OnboardComputer.App.Sending;

/// <summary>
/// Sends a message every SendIntervalSeconds and right away when a door closes, so boardings
/// reach riders' apps before the bus leaves the stop. Each send also retries anything buffered.
/// </summary>
public sealed class TelemetryWorker(
    MessageBuilder builder,
    MessageOutbox outbox,
    IOccupancyApiClient client,
    IDoorCounterSource doorCounter,
    IOptions<OnboardComputerOptions> options,
    TimeProvider time,
    ILogger<TelemetryWorker> logger) : BackgroundService
{
    private readonly Channel<bool> _doorClosed = Channel.CreateBounded<bool>(
        new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    /// <summary>Builds one message from what the sources collected and sends everything buffered.</summary>
    public async Task SendNowAsync(CancellationToken cancellationToken)
    {
        if (builder.Build() is { } message)
        {
            outbox.Enqueue(message);
        }

        await outbox.FlushAsync(client, cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var settings = options.Value;
        logger.LogInformation(
            "Sending raw data for {VehicleId} to {Url} every {Interval} s and when a door closes.",
            settings.VehicleId,
            settings.OccupancyApiUrl,
            settings.SendIntervalSeconds);

        doorCounter.DoorClosed += OnDoorClosed;
        try
        {
            var interval = TimeSpan.FromSeconds(settings.SendIntervalSeconds);
            while (!stoppingToken.IsCancellationRequested)
            {
                await WaitForIntervalOrDoorAsync(interval, stoppingToken);
                try
                {
                    await SendNowAsync(stoppingToken);
                }
                catch (Exception exception) when (exception is not OperationCanceledException)
                {
                    logger.LogError(exception, "Sending failed; the message stays buffered.");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        finally
        {
            doorCounter.DoorClosed -= OnDoorClosed;
        }
    }

    private void OnDoorClosed(object? sender, Contracts.RawDoorCounterEvent item) => _doorClosed.Writer.TryWrite(true);

    private async Task WaitForIntervalOrDoorAsync(TimeSpan interval, CancellationToken stoppingToken)
    {
        using var waiting = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        var elapsed = Task.Delay(interval, time, waiting.Token);
        var doorClosed = _doorClosed.Reader.WaitToReadAsync(waiting.Token).AsTask();
        await Task.WhenAny(elapsed, doorClosed);
        await waiting.CancelAsync();
        stoppingToken.ThrowIfCancellationRequested();
        _doorClosed.Reader.TryRead(out _);
    }
}
