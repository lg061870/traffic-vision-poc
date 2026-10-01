using Innova.OnboardComputer.App.Contracts;

namespace Innova.OnboardComputer.App.Simulation;

public sealed record GpsSample(DateTimeOffset At, double Lat, double Lon, double SpeedKmh, double CourseDegrees);

/// <summary>Everything the scenario's devices produce within a time window, already re-stamped.</summary>
public sealed record ScenarioBatch(
    IReadOnlyList<GpsSample> Gps,
    IReadOnlyList<RawDoorCounterEvent> DoorEvents,
    IReadOnlyList<RawVisionFrame> VisionFrames);

/// <summary>
/// Lays a scenario onto real time: its minute 0 is <see cref="Epoch"/>, and when looping, pass n
/// starts at Epoch + n × Duration. Pure, so any window can be asked for in any order.
/// </summary>
public sealed class ScenarioTimeline
{
    private const int FrameWidth = 640;
    private const int FrameHeight = 480;

    private readonly Scenario _scenario;
    private readonly IReadOnlyList<(TimeSpan At, double Lat, double Lon, double SpeedKmh, double Course)> _gps;
    private readonly IReadOnlyList<ScriptedDoorEvent> _doorEvents;
    private readonly IReadOnlyList<(TimeSpan At, int Index, int OnBoard)> _frames;

    public ScenarioTimeline(Scenario scenario, RoutePath route, DateTimeOffset epoch, bool loop)
    {
        _scenario = scenario;
        Epoch = epoch;
        Loop = loop;
        _doorEvents = scenario.DoorEvents.OrderBy(item => item.At).ToArray();
        _gps = PlanGps(scenario, route);
        _frames = PlanFrames(scenario, _doorEvents);
    }

    public DateTimeOffset Epoch { get; }

    public bool Loop { get; }

    public TimeSpan Duration => _scenario.Duration;

    public string VisionModel => _scenario.Vision.Model;

    public string VisionCamera => _scenario.Vision.Camera;

    /// <summary>Items stamped after <paramref name="from"/> and up to and including <paramref name="to"/>.</summary>
    public ScenarioBatch Between(DateTimeOffset from, DateTimeOffset to)
    {
        var gps = new List<GpsSample>();
        var doors = new List<RawDoorCounterEvent>();
        var frames = new List<RawVisionFrame>();
        if (to <= from || to < Epoch)
        {
            return new ScenarioBatch(gps, doors, frames);
        }

        var firstPass = Math.Max(0, PassAt(from));
        var lastPass = Loop ? PassAt(to) : 0;
        for (var pass = firstPass; pass <= lastPass; pass++)
        {
            var start = Epoch + (Duration * pass);
            bool InWindow(TimeSpan offset) => start + offset > from && start + offset <= to;

            gps.AddRange(_gps.Where(item => InWindow(item.At))
                .Select(item => new GpsSample(start + item.At, item.Lat, item.Lon, item.SpeedKmh, item.Course)));
            doors.AddRange(_doorEvents.Where(item => InWindow(item.At))
                .Select(item => new RawDoorCounterEvent(item.Door, item.Type, start + item.At, item.In, item.Out)));
            frames.AddRange(_frames.Where(item => InWindow(item.At))
                .Select(item => new RawVisionFrame(start + item.At, Detect(item.OnBoard, pass, item.Index))));
        }

        return new ScenarioBatch(gps, doors, frames);
    }

    private long PassAt(DateTimeOffset time) => (long)Math.Floor((time - Epoch) / Duration);

    private static List<(TimeSpan, double, double, double, double)> PlanGps(Scenario scenario, RoutePath route)
    {
        var track = scenario.Gps.Track;
        var samples = new List<(TimeSpan, double, double, double, double)>();
        var heading = 1;
        for (var at = TimeSpan.Zero; at < scenario.Duration; at += TimeSpan.FromSeconds(scenario.Gps.IntervalSeconds))
        {
            var next = track.Count(point => point.At <= at);
            double km, speed = 0;
            if (next == 0)
            {
                km = track[0].Km;
            }
            else if (next == track.Count)
            {
                km = track[^1].Km;
            }
            else
            {
                var (a, b) = (track[next - 1], track[next]);
                var fraction = (at - a.At) / (b.At - a.At);
                km = a.Km + ((b.Km - a.Km) * fraction);
                speed = Math.Abs(b.Km - a.Km) / (b.At - a.At).TotalHours;
                heading = b.Km > a.Km ? 1 : b.Km < a.Km ? -1 : heading;
            }

            // A stopped bus keeps reporting the direction it was last driving.
            var point = route.At(km);
            var course = heading > 0 ? point.BearingDegrees : (point.BearingDegrees + 180) % 360;
            samples.Add((at, point.Lat, point.Lon, speed, course));
        }

        return samples;
    }

    private static List<(TimeSpan, int, int)> PlanFrames(Scenario scenario, IReadOnlyList<ScriptedDoorEvent> doorEvents)
    {
        // Who the cabin camera can see changes slightly before the door counter does: people
        // getting off walk to the door, out of view, as soon as it opens, while people getting
        // on appear when they are counted. So the camera never sees more than the counter.
        var changes = new List<(TimeSpan At, int Change)>();
        var openedAt = new Dictionary<int, TimeSpan>();
        foreach (var item in doorEvents)
        {
            if (item.Type == RawFormats.DoorOpened)
            {
                openedAt[item.Door] = item.At;
            }

            changes.Add((item.At, item.In ?? 0));
            changes.Add((openedAt.GetValueOrDefault(item.Door, item.At), -(item.Out ?? 0)));
        }

        var frames = new List<(TimeSpan, int, int)>();
        var index = 0;
        for (var at = TimeSpan.Zero; at < scenario.Duration; at += TimeSpan.FromSeconds(scenario.Vision.FrameIntervalSeconds))
        {
            var inView = scenario.InitialOnBoard + changes.Where(change => change.At <= at).Sum(change => change.Change);
            frames.Add((at, index++, Math.Max(0, inView)));
        }

        return frames;
    }

    private IReadOnlyList<RawVisionDetection> Detect(int onBoard, long pass, int frameIndex)
    {
        var vision = _scenario.Vision;
        var detections = new List<RawVisionDetection>();
        for (var slot = 0; slot < Math.Min(onBoard, vision.MaxVisible); slot++)
        {
            // Seeded per pass, frame and passenger, so a window gives the same answer however it is cut.
            var random = new Random(unchecked((int)((vision.Seed * 73856093L) ^ (pass * 19349663L) ^ (frameIndex * 83492791L) ^ (slot * 2654435761L))));
            if (random.NextDouble() < vision.MissRate)
            {
                continue;
            }

            var sitting = slot < vision.SeatsInView;
            detections.Add(new RawVisionDetection(
                slot + 1,
                sitting ? "sitting" : "standing",
                Math.Round(0.55 + (random.NextDouble() * 0.4), 2),
                sitting ? SeatBox(slot) : StandingBox(slot - vision.SeatsInView)));
        }

        return detections;
    }

    // Seated passengers in two rows of seven; standing passengers in a row in the aisle.
    private static double[] SeatBox(int seat)
    {
        var (column, row) = (seat % 7, seat / 7 % 2);
        var (x, y) = (10 + (column * 90), 200 + (row * 140));
        return [x, y, x + 80, Math.Min(FrameHeight, y + 120)];
    }

    private static double[] StandingBox(int index)
    {
        var x = 15 + (index % 8 * 78);
        return [x, 40, Math.Min(FrameWidth, x + 70), 300];
    }
}
