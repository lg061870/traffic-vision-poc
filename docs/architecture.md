# Traffic Vision architecture

## System boundary

```text
Roboflow (external)
  dataset / training / model selection / ONNX export
                         |
                         v
                    traffic.onnx

Browser                                      Server
React + TypeScript  -- HTTP / JSON -->  ASP.NET Core Web API
  video element                            |
  canvas/SVG overlay                       +-- Detection
  upload and results UI                    +-- Tracking
                                            +-- Direction
                                            +-- Analytics
                                                   |
                                            Microsoft ONNX Runtime
```

The browser never executes the ONNX model. The server owns inference and will return structured metadata that the React application synchronizes with the original video's playback time.

## Responsibility boundaries

### Detection

Reports what is visible in a frame, including class, confidence, and bounding box. Model-specific preprocessing and output parsing remain unimplemented until the actual ONNX export is inspected.

### Tracking

Associates detections across frames and assigns stable identities. Tracking is a separate stage so detection code does not own temporal identity.

### Direction

Classifies the motion of tracked objects. Because footage comes from a moving vehicle, observed screen motion combines camera motion and object motion. Raw changes in image coordinates are therefore not a valid direction classifier.

### Analytics

Aggregates validated detection and tracking results into counts and traffic metrics. It does not perform inference or identity association.

## Current request flow

```text
React starts
    |
    +-- GET /api/health
            |
            +-- 200 { status: "ok", ... }
                    |
                    +-- UI shows "Backend connected"
```

The selected video currently stays in the browser and is used only for local preview. There is no upload or analysis endpoint in this scaffold.

## Planned request flow

```text
POST /api/videos
    -> video identifier

POST /api/analysis/{videoId}
    -> analysis identifier / state

GET /api/analysis/{analysisId}
    -> timestamped detection metadata
```

Job infrastructure, persistence, authentication, cloud deployment, tracking, direction logic, and video rendering are intentionally deferred.
