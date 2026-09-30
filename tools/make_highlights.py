"""Cut highlight segments out of la_bus_riders_full.mp4 and remap its results.

Segments are cut by frame number (30 FPS) so every analyzed frame keeps its
exact picture; timestamps are renumbered to the new, shorter timeline.
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

demo = sys.argv[1]
source_name = "la_bus_riders_full.mp4"
name = "la_bus_highlights.mp4"
fps = 30

# (start, end) in m:ss of the full video: continuous stretches with 3+ confirmed passengers
# in view, before the vlogger segment at 18:00 (camera swings to the street or driver drop out);
# 0:40-0:49 is left out because the person filming is in frame.
segments = [("1:38", "1:46"), ("2:36", "2:48"), ("6:39", "6:48"), ("8:50", "9:04"),
            ("10:26", "10:34"), ("11:50", "12:06"), ("12:29", "12:44"), ("13:27", "13:40"),
            ("16:02", "16:10"), ("16:21", "16:37")]


def seconds(text):
    minutes, secs = text.split(":")
    return int(minutes) * 60 + int(secs)


def frame_count(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
         "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout
    return int(out.strip().split(",")[0])


with open(os.path.join(demo, "results", source_name + ".result.json"), encoding="utf-8") as f:
    source = json.load(f)

ranges = [(seconds(a) * fps, seconds(b) * fps) for a, b in segments]
frames, offset = [], 0
for start, end in ranges:
    for frame in source["frames"]:
        if start <= frame["frameNumber"] < end:
            number = offset + frame["frameNumber"] - start
            frames.append({**frame, "frameNumber": number, "timestampSeconds": number / fps})
    offset += end - start
total_frames = offset

confirmed = [[d for d in f["detections"] if d["confirmed"]] for f in frames]
duration = total_frames / fps
result = {
    **{k: source[k] for k in ("cameraView", "width", "height", "sourceFps", "model", "settings")},
    "video": name,
    "durationSeconds": duration,
    "processingFps": len(frames) / duration,
    "elapsedSeconds": source["elapsedSeconds"] * len(frames) / len(source["frames"]),
    "analyzedAtUtc": datetime.now(timezone.utc).isoformat(),
    "frames": frames,
    "doorEvents": [],
    "summary": {
        "sittingPeak": max(sum(d["className"] == "sitting" for d in c) for c in confirmed),
        "standingPeak": max(sum(d["className"] == "standing" for d in c) for c in confirmed),
        "visiblePeak": max(len(c) for c in confirmed),
        "uniquePassengers": len({d["trackId"] for c in confirmed for d in c}),
        "boarded": 0,
        "exited": 0,
        "finalEventOccupancy": source["settings"]["initialPassengers"],
        "peakEventOccupancy": source["settings"]["initialPassengers"],
    },
}

parts = [f"[0:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS[v{i}]" for i, (a, b) in enumerate(ranges)]
chain = "".join(f"[v{i}]" for i in range(len(ranges)))
graph = ";".join(parts) + f";{chain}concat=n={len(ranges)}:v=1:a=0,setpts=N/({fps}*TB)[out]"
out_video = os.path.join(demo, "videos", name)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(demo, "videos", source_name),
                "-filter_complex", graph, "-map", "[out]", "-fps_mode", "passthrough",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", out_video], check=True)

actual = frame_count(out_video)
if actual != total_frames:
    sys.exit(f"highlights video has {actual} frames, expected {total_frames}; result not written")

with open(os.path.join(demo, "results", name + ".result.json"), "w", encoding="utf-8") as f:
    json.dump(result, f)

print(f"{name}: {len(segments)} segments, {duration:.0f}s ({duration / 60:.1f} min), "
      f"{len(frames)} analyzed frames, {os.path.getsize(out_video) / 1e6:.0f} MB")
print("segment starts in the highlights video:")
position = 0
for (a, b), (start, end) in zip(segments, ranges):
    print(f"  {int(position // 60)}:{int(position % 60):02d}  (full video {a}-{b})")
    position += (end - start) / fps
