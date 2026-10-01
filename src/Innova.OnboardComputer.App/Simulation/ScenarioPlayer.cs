using Innova.OnboardComputer.App.Sources;

namespace Innova.OnboardComputer.App.Simulation;

/// <summary>
/// Plays the scenario in real time: once a second it pushes what the simulated GPS receiver,
/// door counter and vision API produced into the same sources real devices would feed.
/// </summary>
public sealed class ScenarioPlayer(
    ScenarioTimeline timeline,
    BufferedGpsSource gps,
    BufferedDoorCounterSource doorCounter,
    BufferedVisionSource vision,
    TimeProvider time,
    ILogger<ScenarioPlayer> logger) : BackgroundService
{
    private DateTimeOffset _playedUntil = timeline.Epoch - TimeSpan.FromTicks(1);

    /// <summary>Publishes everything stamped since the last call up to now.</summary>
    public void PlayUntil(DateTimeOffset now)
    {
        if (now <= _playedUntil)
        {
            return;
        }

        var batch = timeline.Between(_playedUntil, now);
        _playedUntil = now;

        foreach (var sample in batch.Gps)
        {
            // GGA before RMC: the API keeps the last fix of a second, and only RMC carries speed.
            gps.Add(NmeaWriter.Gga(sample.At, sample.Lat, sample.Lon));
            gps.Add(NmeaWriter.Rmc(sample.At, sample.Lat, sample.Lon, sample.SpeedKmh, sample.CourseDegrees));
        }

        foreach (var frame in batch.VisionFrames)
        {
            vision.Add(frame);
        }

        // Last, so a door closing triggers a message that already holds this second's GPS and vision.
        foreach (var item in batch.DoorEvents)
        {
            doorCounter.Add(item);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "Replaying scenario from {Epoch:O}, {Duration} per pass{Loop}.",
            timeline.Epoch,
            timeline.Duration,
            timeline.Loop ? ", looping" : "");

        using var ticks = new PeriodicTimer(TimeSpan.FromSeconds(1), time);
        try
        {
            do
            {
                PlayUntil(time.GetUtcNow());
            }
            while (await ticks.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }
}
