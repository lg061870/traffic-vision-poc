using TrafficVision.Api.Models;

namespace TrafficVision.Api.DoorEvents;

public sealed class DoorCrossingCounter
{
    private readonly float _x1;
    private readonly float _y1;
    private readonly float _x2;
    private readonly float _y2;
    private readonly int _insideSign;
    private readonly int _hysteresisPixels;
    private readonly int _stableFrames;
    private readonly double _cooldownSeconds;
    private readonly Dictionary<int, CrossingState> _states = [];

    public DoorCrossingCounter(
        int width,
        int height,
        NormalizedPoint lineStart,
        NormalizedPoint lineEnd,
        NormalizedPoint insidePoint,
        int hysteresisPixels,
        int stableFrames,
        int cooldownSeconds)
    {
        _x1 = lineStart.X * width;
        _y1 = lineStart.Y * height;
        _x2 = lineEnd.X * width;
        _y2 = lineEnd.Y * height;
        _hysteresisPixels = Math.Max(0, hysteresisPixels);
        _stableFrames = Math.Max(1, stableFrames);
        _cooldownSeconds = Math.Max(0, cooldownSeconds);

        var insideCross = Cross(insidePoint.X * width, insidePoint.Y * height);
        _insideSign = insideCross >= 0 ? 1 : -1;
    }

    public IReadOnlyList<PassengerDoorEvent> Update(
        double timestampSeconds,
        IReadOnlyList<TrackedPassengerDetection> detections)
    {
        var events = new List<PassengerDoorEvent>();
        foreach (var detection in detections.Where(item => item.Confirmed))
        {
            var feetX = (detection.Box.X1 + detection.Box.X2) / 2f;
            var feetY = detection.Box.Y2;
            var distance = SignedDistance(feetX, feetY);
            if (Math.Abs(distance) <= _hysteresisPixels)
            {
                continue;
            }

            var side = Math.Sign(distance) == _insideSign ? 1 : -1;
            if (!_states.TryGetValue(detection.TrackId, out var state))
            {
                state = new CrossingState();
                _states[detection.TrackId] = state;
            }

            if (state.StableSide is null)
            {
                AccumulateInitialSide(state, side);
                continue;
            }

            if (state.StableSide == side)
            {
                state.CandidateSide = null;
                state.CandidateFrames = 0;
                continue;
            }

            if (state.CandidateSide != side)
            {
                state.CandidateSide = side;
                state.CandidateFrames = 1;
                continue;
            }

            state.CandidateFrames++;
            if (state.CandidateFrames < _stableFrames)
            {
                continue;
            }

            var previousSide = state.StableSide.Value;
            state.StableSide = side;
            state.CandidateSide = null;
            state.CandidateFrames = 0;

            if (timestampSeconds - state.LastEventSeconds < _cooldownSeconds)
            {
                continue;
            }

            var direction = previousSide == -1 && side == 1 ? "boarded" : "exited";
            state.LastEventSeconds = timestampSeconds;
            events.Add(new PassengerDoorEvent(detection.TrackId, direction, timestampSeconds));
        }

        return events;
    }

    private void AccumulateInitialSide(CrossingState state, int side)
    {
        if (state.CandidateSide != side)
        {
            state.CandidateSide = side;
            state.CandidateFrames = 1;
            return;
        }

        state.CandidateFrames++;
        if (state.CandidateFrames >= _stableFrames)
        {
            state.StableSide = side;
            state.CandidateSide = null;
            state.CandidateFrames = 0;
        }
    }

    private float SignedDistance(float x, float y)
    {
        var lineLength = MathF.Sqrt(((_x2 - _x1) * (_x2 - _x1)) + ((_y2 - _y1) * (_y2 - _y1)));
        return lineLength <= float.Epsilon ? 0f : Cross(x, y) / lineLength;
    }

    private float Cross(float x, float y) => ((_x2 - _x1) * (y - _y1)) - ((_y2 - _y1) * (x - _x1));

    private sealed class CrossingState
    {
        public int? StableSide { get; set; }
        public int? CandidateSide { get; set; }
        public int CandidateFrames { get; set; }
        public double LastEventSeconds { get; set; } = double.NegativeInfinity;
    }
}
