# Demo library

Pre-analyzed clips for the demo player. Contents are ignored by Git.

- `videos/` — put demo clips here (MP4, MOV, AVI, MKV).
- `results/` — `<video file name>.result.json`, written by the batch command.

Run the batch from the repository root:

```bash
dotnet run --project src/TrafficVision.Api -- batch --fps 5
```

It skips clips whose result is newer than the video, so it can be re-run after an interruption. Other options include `--camera rear`, `--fps 10` and `--force`; run with `--help` to list them all.

Rear (door) clips need a door line. Put `<video file name>.settings.json` next to the clip:

```json
{
  "cameraView": "rear",
  "processingFps": 10,
  "initialPassengers": 12,
  "doorLineStart": { "x": 0.1, "y": 0.7 },
  "doorLineEnd": { "x": 0.9, "y": 0.7 },
  "insidePoint": { "x": 0.5, "y": 0.35 }
}
```

Coordinates are fractions of the frame width and height; `insidePoint` is any point on the inside-the-bus side of the line.
