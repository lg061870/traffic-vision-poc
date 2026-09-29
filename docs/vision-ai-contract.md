# Vision AI handoff contract

This document records the verified model contract and acceptance results for the Bus Passenger Vision POC.

## Export provenance

- Roboflow model: `guillermo-jimenez/bus-passenger-detection-1-rfdetr-small-t1`
- Architecture: RF-DETR Small, Apache-2.0
- Export date: 2026-09-29
- Export package: RF-DETR 1.11.0
- ONNX opset: 17
- Source `weights.pt` SHA-256: `560DD9CDECCFF8ED0312C3200CCC3E8AFFF2AC6CB979B37F5AC6DD5832CFBBF7`
- `bus-passengers-rfdetr-s-v1.onnx` SHA-256: `DDBFBDD9315B9549905CAF5EE4E5C9E27F89DF15A9921217BDA4225E9CE07E6E`
- ONNX size: 123,469,705 bytes

## Authoritative tensor contract

| Direction | Name | Type | Shape | Meaning |
|---|---|---|---|---|
| Input | `input` | float32 | `[1,3,640,640]` | RGB, NCHW, stretch resize |
| Output | `dets` | float32 | `[1,300,4]` | normalized `cx,cy,w,h` |
| Output | `labels` | float32 | `[1,300,3]` | per-class logits; apply sigmoid |

Preprocessing divides RGB pixels by 255 and applies ImageNet mean `(0.485, 0.456, 0.406)` and standard deviation `(0.229, 0.224, 0.225)`. Coordinates are scaled from normalized boxes to the original image dimensions. No NMS is applied.

The output-column mapping was established empirically rather than inferred:

- Column 0: unused empty `passenger` class
- Column 1: `sitting` (`class_id 0` in hosted inference)
- Column 2: `standing` (`class_id 1` in hosted inference)

## Golden-frame validation

Both images are 640×360 and were processed through the C# ONNX Runtime implementation.

| Frame | Class | Hosted reference | C# result | Status |
|---|---|---:|---:|---|
| `bus_0010.jpg` | sitting | 0.897 · `(399,122,495,279)` | 0.88 · `(401,123,495,279)` | Pass |
| `bus_0010.jpg` | sitting | 0.870 · `(126,116,249,340)` | 0.87 · `(126,116,249,340)` | Pass |
| `bus_0043.jpg` | sitting | 0.799 · `(420,93,513,247)` | 0.82 · `(416,93,513,247)` | Pass |
| `bus_0043.jpg` | sitting | 0.700 · `(142,78,261,297)` | 0.73 · `(142,78,261,296)` | Pass |

All primary boxes pass the ±10 px and ±0.05 confidence acceptance rule. Optional detections near 0.50 also reproduced. Results below 0.50 may appear in the application because its operational threshold is 0.40.

Generated local artifacts:

- `data/output/bus_0010-annotated.jpg`
- `data/output/bus_0010-result.json`
- `data/output/bus_0043-annotated.jpg`
- `data/output/bus_0043-result.json`

## Camera assets

- `bus_interior_cctv.mp4`: 640×360, 15 FPS, 45.53 s; front/seating role
- `bus_interior_dark.mp4`: 640×360, 15 FPS, 45.53 s; low-light front/seating test
- `bus_stop_cctv.mp4`: 640×360, 15 FPS, 37.80 s; outside footage, not a target camera
- No real rear/door-camera clip is available yet. Door events will first be unit-tested with synthetic tracks.

## Attribution

- [Deakin Passenger dataset](https://universe.roboflow.com/deakin-07shj/passenger-mmpbi), CC BY 4.0
- [MSU passenger dataset](https://universe.roboflow.com/msu-4qpkq/passenger-utkuj), CC BY 4.0
- [Bus interior video creator dae jeung kim](https://pixabay.com/users/kimdaejeung-7703165/), Pixabay video 142755
- [Bus stop video creator Expatsiam](https://pixabay.com/users/expatsiam-1490930/), Pixabay video 31967

## Still pending

1. Video decoding and batched/timestamped frame processing (M2).
2. Tracking and synthetic door-crossing validation (M3–M4).
3. A real rear-door clip and manually verified boarding/exit totals.
4. React overlay integration with real API output (M5).
