# Vision AI handoff contract

This document records the decisions supplied for the Bus Passenger Vision POC. ONNX metadata remains authoritative and must be inspected from the actual exported file before the parser is implemented.

## Model and preprocessing

- Roboflow model: `guillermo-jimenez/bus-passenger-detection-1-rfdetr-small-t1`
- Architecture: RF-DETR Small, Apache-2.0
- Training resolution: 640×640 stretch resize, RGB, NCHW float32
- Candidate normalization pending export verification: divide by 255, then ImageNet mean `(0.485, 0.456, 0.406)` and standard deviation `(0.229, 0.224, 0.225)`
- Hosted inference class IDs: `0 = sitting`, `1 = standing`; raw ONNX logit columns must still be verified empirically
- Candidate decoding pending export verification: normalized `cxcywh`, sigmoid per class, threshold 0.40, no NMS unless testing exposes duplicates

## Golden frame

The reference frame is 640×360. Guillermo still needs to identify its source frame number.

```json
[
  {"class":"sitting",  "x":205.0, "y":188.5, "width":118, "height":217, "confidence":0.796},
  {"class":"sitting",  "x":470.5, "y":174.5, "width":85,  "height":157, "confidence":0.727},
  {"class":"standing", "x":67.5,  "y":67.5,  "width":93,  "height":101, "confidence":0.580},
  {"class":"standing", "x":187.0, "y":102.0, "width":68,  "height":44,  "confidence":0.557}
]
```

The two sitting detections are the reliable parser check. The low-confidence standing results are known model-v1 behavior. M1 passes when boxes reproduce the hosted result within approximately ±10 px and ±0.05 confidence.

## Camera assets

- `bus_interior_cctv.mp4`: front/seating role
- `bus_interior_dark.mp4`: low-light front/seating test
- `bus_stop_cctv.mp4`: outside footage, not a target camera
- No real rear/door-camera clip is available yet. Door events will first be unit-tested with synthetic tracks.

## Result shapes

Still-image and video results follow the JSON examples in the Vision AI response. The API contract will be finalized alongside M1 so its coordinates and class scores are backed by real inference rather than fixtures displayed as results.

## Attribution

- [Deakin Passenger dataset](https://universe.roboflow.com/deakin-07shj/passenger-mmpbi), CC BY 4.0
- [MSU passenger dataset](https://universe.roboflow.com/msu-4qpkq/passenger-utkuj), CC BY 4.0
- [Bus interior video creator dae jeung kim](https://pixabay.com/users/kimdaejeung-7703165/), Pixabay video 142755
- [Bus stop video creator Expatsiam](https://pixabay.com/users/expatsiam-1490930/), Pixabay video 31967

## Still pending

1. The ONNX file (or `.pt` checkpoint for the approved one-time conversion).
2. Authoritative ONNX input/output metadata and empirical class-logit mapping.
3. SHA-256 checksum and export date.
4. The golden frame filename/frame number.
5. A real rear-door clip and manually verified boarding/exit totals.
