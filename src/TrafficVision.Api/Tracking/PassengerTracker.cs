using TrafficVision.Api.Models;

namespace TrafficVision.Api.Tracking;

public sealed class PassengerTracker
{
    private readonly float _matchIouThreshold;
    private readonly int _confirmAfterDetections;
    private readonly int _lostTrackFrames;
    private readonly List<TrackState> _tracks = [];
    private int _nextTrackId = 1;

    public PassengerTracker(
        float matchIouThreshold,
        int confirmAfterDetections,
        int lostTrackFrames)
    {
        _matchIouThreshold = matchIouThreshold;
        _confirmAfterDetections = Math.Max(1, confirmAfterDetections);
        _lostTrackFrames = Math.Max(1, lostTrackFrames);
    }

    public int ConfirmedTrackCount { get; private set; }

    public IReadOnlyList<TrackedPassengerDetection> Update(
        IReadOnlyList<PassengerImageDetection> detections)
    {
        var matches = new List<(int TrackIndex, int DetectionIndex, float Iou)>();
        for (var trackIndex = 0; trackIndex < _tracks.Count; trackIndex++)
        {
            for (var detectionIndex = 0; detectionIndex < detections.Count; detectionIndex++)
            {
                var iou = IntersectionOverUnion(_tracks[trackIndex].Box, detections[detectionIndex].Box);
                if (iou >= _matchIouThreshold)
                {
                    matches.Add((trackIndex, detectionIndex, iou));
                }
            }
        }

        var assignedTracks = new HashSet<int>();
        var assignedDetections = new HashSet<int>();
        var detectionTracks = new TrackState?[detections.Count];

        foreach (var match in matches.OrderByDescending(candidate => candidate.Iou))
        {
            if (!assignedTracks.Add(match.TrackIndex) || !assignedDetections.Add(match.DetectionIndex))
            {
                continue;
            }

            var detection = detections[match.DetectionIndex];
            var track = _tracks[match.TrackIndex];
            track.Box = detection.Box;
            track.ClassId = detection.ClassId;
            track.ClassName = detection.ClassName;
            track.Score = detection.Score;
            track.Hits++;
            track.MissedFrames = 0;
            Confirm(track);
            detectionTracks[match.DetectionIndex] = track;
        }

        for (var trackIndex = 0; trackIndex < _tracks.Count; trackIndex++)
        {
            if (!assignedTracks.Contains(trackIndex))
            {
                _tracks[trackIndex].MissedFrames++;
            }
        }

        for (var detectionIndex = 0; detectionIndex < detections.Count; detectionIndex++)
        {
            if (assignedDetections.Contains(detectionIndex))
            {
                continue;
            }

            var detection = detections[detectionIndex];
            var track = new TrackState
            {
                Id = _nextTrackId++,
                Box = detection.Box,
                ClassId = detection.ClassId,
                ClassName = detection.ClassName,
                Score = detection.Score,
                Hits = 1
            };
            Confirm(track);
            _tracks.Add(track);
            detectionTracks[detectionIndex] = track;
        }

        _tracks.RemoveAll(track => track.MissedFrames > _lostTrackFrames);

        return detections.Select((detection, index) =>
        {
            var track = detectionTracks[index]
                ?? throw new InvalidOperationException("Every detection must be assigned to a track.");
            return new TrackedPassengerDetection(
                track.Id,
                track.Confirmed,
                detection.ClassId,
                detection.ClassName,
                detection.Score,
                detection.Box);
        }).ToArray();
    }

    private void Confirm(TrackState track)
    {
        if (!track.Confirmed && track.Hits >= _confirmAfterDetections)
        {
            track.Confirmed = true;
            ConfirmedTrackCount++;
        }
    }

    private static float IntersectionOverUnion(PixelBoundingBox first, PixelBoundingBox second)
    {
        var intersectionWidth = Math.Max(0f, Math.Min(first.X2, second.X2) - Math.Max(first.X1, second.X1));
        var intersectionHeight = Math.Max(0f, Math.Min(first.Y2, second.Y2) - Math.Max(first.Y1, second.Y1));
        var intersection = intersectionWidth * intersectionHeight;
        if (intersection <= 0f)
        {
            return 0f;
        }

        var firstArea = Math.Max(0f, first.X2 - first.X1) * Math.Max(0f, first.Y2 - first.Y1);
        var secondArea = Math.Max(0f, second.X2 - second.X1) * Math.Max(0f, second.Y2 - second.Y1);
        return intersection / Math.Max(float.Epsilon, firstArea + secondArea - intersection);
    }

    private sealed class TrackState
    {
        public int Id { get; init; }
        public PixelBoundingBox Box { get; set; } = new(0, 0, 0, 0);
        public int ClassId { get; set; }
        public string ClassName { get; set; } = string.Empty;
        public float Score { get; set; }
        public int Hits { get; set; }
        public int MissedFrames { get; set; }
        public bool Confirmed { get; set; }
    }
}
