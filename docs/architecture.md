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

## Door events

Door events apply only to the rear camera. A configurable line or polygon near the front door classifies a track crossing inward as `boarded` and outward as `exited`. Each track must be counted once per event direction. Events include a timestamp and will later include a thumbnail.

## Passenger analytics

Passenger analytics aggregates sitting, standing, boarded, exited, current occupancy, peak occupancy, and unique tracked passengers. It consumes validated detector, tracker, and door-event output rather than performing those responsibilities itself.

## Planned request flow

```text
POST /api/videos
    -> video identifier + camera view

POST /api/videos/{id}/analyze
    -> analysis state

GET /api/videos/{id}/results
    -> timestamped detections, tracks, door events, and summary
```

SignalR progress is optional. Database, authentication, cloud infrastructure, and generated annotated videos are outside the current POC scope.

## Milestones

1. **Still image:** inspect the model contract, run one bus frame in C#, and emit aligned annotated JPG and JSON.
2. **Video frames:** decode at 15 FPS or fewer and emit timestamped detections.
3. **Tracking:** assign stable IDs with a short lost-track tolerance.
4. **Door events:** count rear-camera line crossings once per track.
5. **React overlay:** render magenta sitting boxes, purple standing boxes, IDs, confidence, door line, events, and passenger summaries.

Do not begin M2 until M1 boxes align with passengers. Do not fabricate analysis results in the UI.
