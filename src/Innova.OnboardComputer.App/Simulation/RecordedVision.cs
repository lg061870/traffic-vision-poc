using System.Text.Json;
using Innova.OnboardComputer.App.Contracts;

namespace Innova.OnboardComputer.App.Simulation;

/// <summary>
/// What the vision model really detected in a recorded clip (a TrafficVision ".result.json"),
/// replayed as if the camera were filming now. The loop is anchored to the Unix epoch, not to when
/// this app started, so a dashboard playing the same clip can show the same moment: the clip is at
/// second (Unix time mod duration).
/// </summary>
public sealed class RecordedVision
{
    private readonly IReadOnlyList<(double Seconds, IReadOnlyList<RawVisionDetection> Detections)> _frames;

    private RecordedVision(string model, double durationSeconds, IReadOnlyList<(double, IReadOnlyList<RawVisionDetection>)> frames)
    {
        Model = model;
        DurationSeconds = durationSeconds;
        _frames = frames;
    }

    public string Model { get; }

    public double DurationSeconds { get; }

    public int FrameCount => _frames.Count;

    public static RecordedVision Load(string file)
    {
        var result = JsonSerializer.Deserialize<ResultFile>(File.ReadAllText(file), new JsonSerializerOptions(JsonSerializerDefaults.Web))
                     ?? throw new InvalidDataException($"{file} is empty.");
        if (result is not { DurationSeconds: > 0, Frames.Count: > 0 })
        {
            throw new InvalidDataException($"{file} needs durationSeconds and frames.");
        }

        // Unconfirmed tracks are mostly one-frame flickers; the vision app does not show them either.
        var frames = result.Frames
            .OrderBy(frame => frame.TimestampSeconds)
            .Select(frame => (frame.TimestampSeconds, (IReadOnlyList<RawVisionDetection>)frame.Detections
                .Where(detection => detection.Confirmed)
                .Select(detection => new RawVisionDetection(
                    detection.TrackId,
                    detection.ClassName,
                    Math.Round(detection.Score, 3),
                    [Math.Round(detection.Box.X1, 1), Math.Round(detection.Box.Y1, 1), Math.Round(detection.Box.X2, 1), Math.Round(detection.Box.Y2, 1)]))
                .ToArray()))
            .ToArray();
        return new RecordedVision(result.Model ?? "unknown", result.DurationSeconds, frames);
    }

    /// <summary>Frames stamped after <paramref name="from"/> and up to and including <paramref name="to"/>.</summary>
    public IReadOnlyList<RawVisionFrame> Between(DateTimeOffset from, DateTimeOffset to)
    {
        var frames = new List<RawVisionFrame>();
        if (to <= from)
        {
            return frames;
        }

        var firstLoop = (long)Math.Floor(UnixSeconds(from) / DurationSeconds);
        var lastLoop = (long)Math.Floor(UnixSeconds(to) / DurationSeconds);
        for (var loop = firstLoop; loop <= lastLoop; loop++)
        {
            var loopStart = DateTimeOffset.UnixEpoch.AddSeconds(loop * DurationSeconds);
            foreach (var (seconds, detections) in _frames)
            {
                var at = loopStart.AddSeconds(seconds);
                if (at > from && at <= to)
                {
                    frames.Add(new RawVisionFrame(at, detections));
                }
            }
        }

        return frames;
    }

    private static double UnixSeconds(DateTimeOffset moment) => (moment - DateTimeOffset.UnixEpoch).TotalSeconds;

    private sealed record ResultFile(string? Model, double DurationSeconds, IReadOnlyList<ResultFrame> Frames);

    private sealed record ResultFrame(double TimestampSeconds, IReadOnlyList<ResultDetection> Detections);

    private sealed record ResultDetection(int TrackId, bool Confirmed, string ClassName, double Score, ResultBox Box);

    private sealed record ResultBox(double X1, double Y1, double X2, double Y2);
}
