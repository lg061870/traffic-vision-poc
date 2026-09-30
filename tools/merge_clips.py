"""Join la_bus_riders_* clips into one video and merge their batch results.

Timestamps and frame numbers are offset by the exact frame count of the
clips before them; track IDs are offset so they stay unique across clips.
"""
import glob
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

demo = sys.argv[1]
name = "la_bus_riders_full.mp4"
videos = sorted(glob.glob(os.path.join(demo, "videos", "la_bus_riders_0*.mp4")))


def frame_count(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
         "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout
    return int(out.strip().split(",")[0])


results = []
for video in videos:
    with open(os.path.join(demo, "results", os.path.basename(video) + ".result.json"), encoding="utf-8") as f:
        results.append(json.load(f))

fps = 30.0
counts = [frame_count(v) for v in videos]
for video, count, result in zip(videos, counts, results):
    expected = round(result["durationSeconds"] * result["sourceFps"])
    if count != expected or abs(result["sourceFps"] - fps) > 0.1:
        sys.exit(f"{os.path.basename(video)}: {count} frames on disk vs {expected} in result; not merging")

frames, events = [], []
frame_offset = 0
track_offset = 0
for count, result in zip(counts, results):
    time_offset = frame_offset / fps
    max_track = 0
    for frame in result["frames"]:
        detections = []
        for d in frame["detections"]:
            max_track = max(max_track, d["trackId"])
            detections.append({**d, "trackId": d["trackId"] + track_offset})
        frames.append({
            "frameNumber": frame["frameNumber"] + frame_offset,
            "timestampSeconds": (frame["frameNumber"] + frame_offset) / fps,
            "detections": detections,
        })
    for e in result["doorEvents"]:
        events.append({**e, "trackId": e["trackId"] + track_offset,
                       "timestampSeconds": e["timestampSeconds"] + time_offset})
    frame_offset += count
    track_offset += max_track

summaries = [r["summary"] for r in results]
duration = frame_offset / fps
first = results[0]
merged = {
    **{k: first[k] for k in ("cameraView", "width", "height", "model", "settings")},
    "sourceFps": fps,
    "video": name,
    "durationSeconds": duration,
    "processingFps": len(frames) / duration,
    "elapsedSeconds": sum(r["elapsedSeconds"] for r in results),
    "analyzedAtUtc": datetime.now(timezone.utc).isoformat(),
    "frames": frames,
    "doorEvents": events,
    "summary": {
        "sittingPeak": max(s["sittingPeak"] for s in summaries),
        "standingPeak": max(s["standingPeak"] for s in summaries),
        "visiblePeak": max(s["visiblePeak"] for s in summaries),
        "uniquePassengers": sum(s["uniquePassengers"] for s in summaries),
        "boarded": sum(s["boarded"] for s in summaries),
        "exited": sum(s["exited"] for s in summaries),
        "finalEventOccupancy": summaries[-1]["finalEventOccupancy"],
        "peakEventOccupancy": max(s["peakEventOccupancy"] for s in summaries),
    },
}

# Re-encode (no audio) so the joined timeline is exactly the sum of the frames; 960x540 keeps it web-friendly.
list_path = os.path.join(demo, "concat.txt")
with open(list_path, "w", encoding="utf-8") as f:
    for v in videos:
        f.write(f"file '{os.path.abspath(v)}'\n")
out_video = os.path.join(demo, "videos", name)
subprocess.run(["ffmpeg", "-v", "error", "-stats", "-y", "-f", "concat", "-safe", "0", "-i", list_path,
                "-an", "-vf", "setpts=N/(30*TB),scale=960:540", "-fps_mode", "passthrough", "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", out_video], check=True)
os.remove(list_path)

joined = frame_count(out_video)
if joined != frame_offset:
    sys.exit(f"joined video has {joined} frames, expected {frame_offset}; result not written")

# Written last so the result is never newer than a mismatched video (the batch would skip it).
with open(os.path.join(demo, "results", name + ".result.json"), "w", encoding="utf-8") as f:
    json.dump(merged, f)
print(f"{name}: {len(videos)} clips, {frame_offset} frames, {duration / 60:.1f} min, "
      f"{len(frames)} analyzed frames, {os.path.getsize(out_video) / 1e6:.0f} MB")
