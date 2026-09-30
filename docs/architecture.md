# Bus Passenger Vision architecture

## System boundary

```text
Roboflow (external)
  dataset / training / RF-DETR export
                    |
                    v
  bus-passengers-rfdetr-s-v1.onnx

Browser                                      Server
React + TypeScript  -- HTTP / JSON -->  ASP.NET Core Web API
  onboard video                            |
  canvas/SVG overlay                       +-- Detection
  camera/settings UI                       +-- Tracking
                                            +-- DoorEvents
                                            +-- PassengerAnalytics
                                                     |
                                              ONNX Runtime CPU
```

The cameras are fixed relative to the bus interior. The front view covers the seating area; the rear view looks toward the front door. The browser never executes the model. The server owns inference and returns timestamped metadata for synchronized rendering.

## Detection

Detection reports `sitting` and `standing` passengers for each sampled frame. The target model is RF-DETR Small v1, trained at 640×640 with stretch resize and a suggested 0.40 confidence threshold.

Implementation must begin by logging ONNX Runtime `InputMetadata` and `OutputMetadata`. Tensor names, shapes, data types, class indices, and output ordering must not be hard-coded from expectations. The export is expected—but not guaranteed—to use RGB/CHW float32 input, ImageNet normalization, normalized center-format boxes, and class logits requiring sigmoid.

## Tracking

Tracking associates detections across frames, provides stable passenger IDs, and tolerates short occlusions. It supplies unique-passenger counts and the identities consumed by door-event logic.

POC defaults are IoU matching at 0.30, confirmation after three consecutive detections, and deletion after 30 missed frames at 15 FPS. These values are configuration, not detector assumptions.

## Door events

Door events apply only to the rear camera. The user selects two line points and then selects the side considered inside the bus. Until configured, the line is horizontal at 70% of frame height and inside is above it. Crossing uses the bottom-center (feet point) of each box, a ±20 px hysteresis band, three stable frames beyond the band, and a three-second per-track cooldown. Each track can count at most one boarding and one exit. Events include a timestamp and will later include a thumbnail.

## Passenger analytics

Passenger analytics keeps two concepts separate: `visible now` is the front-camera sitting-plus-standing count, while event occupancy is initial passengers plus boarded minus exited, clamped at zero. The POC does not reconcile them. It also aggregates peak occupancy and unique tracked passengers from validated detector, tracker, and door-event output.

## Implemented request flow

```text
POST /api/passenger-analysis/video
    -> job identifier + queued state

GET /api/passenger-analysis/video/{jobId}
    -> progress or timestamped detections, tracks, door events, and summary

DELETE /api/passenger-analysis/video/{jobId}
    -> cancel a queued or running job
```

The current coordinator keeps jobs in memory, processes one job at a time, stores uploads in a temporary directory, and deletes each upload after completion. React polls progress and renders timestamped SVG overlays over the original local video. Database persistence, authentication, cloud infrastructure, and generated annotated-video files are outside the current POC scope.

## Milestones

1. ✅ **Still image:** inspect the model contract, run one bus frame in C#, and emit aligned annotated JPG and JSON.
2. ✅ **Video frames:** decode at 15 FPS or fewer and emit timestamped detections.
3. ✅ **Tracking:** assign stable IDs with a short lost-track tolerance.
4. 🟡 **Door events:** crossing logic is implemented; real rear-door footage is still required for validation.
5. ✅ **React overlay:** render magenta sitting boxes, purple standing boxes, IDs, confidence, door line, events, and passenger summaries.

The end-to-end front-camera test processed 46 sampled frames from the 45.53-second sample at approximately 1 FPS in 201.5 seconds on the development PC. The two primary seated passengers retained IDs 1 and 2 through the clip. Unique-passenger totals remain experimental because detector false positives and simple IoU track fragmentation can inflate them.
