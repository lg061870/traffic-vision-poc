# Traffic Vision POC

Traffic Vision is a proof-of-concept application for analyzing road footage captured from a moving vehicle. This milestone establishes a presentation-quality React workspace, an ASP.NET Core API, and their development-time connection. It does **not** perform object detection yet.

## Current status

- React + TypeScript upload workspace based on the approved demo mockup
- Local video selection, drag-and-drop, metadata display, and browser preview
- Explicit empty states for detections, tracking, direction, and analytics
- ASP.NET Core `GET /api/health` endpoint with visible frontend connection status
- Development CORS and Vite API proxy configuration
- ONNX Runtime CPU dependency installed for a later milestone
- Detection, tracking, direction, and analytics layers kept separate

No fake AI results are shown. The analysis action explains that inference is not connected yet.

## Architecture

```text
Browser
  React + TypeScript
          |
          | HTTP / JSON
          v
  ASP.NET Core Web API
          |
     Detection service (future)
          |
  Microsoft ONNX Runtime
          |
  Roboflow-exported traffic.onnx (future)
```

Roboflow training, model selection, and ONNX export happen outside this repository. The frontend will eventually combine the original video with timestamped detection metadata using a canvas or SVG overlay; it will not run the model directly.

See [docs/architecture.md](docs/architecture.md) for the responsibility boundaries and future request flow.

## Technology stack

- .NET 10 / ASP.NET Core Web API
- C#
- Microsoft.ML.OnnxRuntime (CPU)
- React
- TypeScript
- Vite

There is no Python runtime, service, dependency, or script in this application.

## Prerequisites

- .NET SDK 10.0 or newer
- Node.js 20 or newer
- npm 10 or newer

## Run the backend

From the repository root:

```powershell
dotnet run --project src/TrafficVision.Api
```

The development API listens on `http://localhost:5169`. Verify it at:

```text
GET http://localhost:5169/api/health
```

## Run the frontend

In a second terminal:

```powershell
cd src/traffic-vision-web
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` calls to the ASP.NET Core API.

## Build

```powershell
dotnet build TrafficVision.sln
cd src/traffic-vision-web
npm run build
```

## Repository structure

```text
TrafficVision.sln
src/
  TrafficVision.Api/
    Analytics/
    Controllers/
    Detection/
    Direction/
    Models/
    Services/
    Tracking/
  traffic-vision-web/
    public/
    src/
      components/
      services/
      types/
data/
  samples/
  output/
docs/
models/
```

## Model files

Large `.onnx` files are intentionally ignored by Git. When a model is selected, follow [models/README.md](models/README.md) and place the local file at `models/traffic.onnx`.

## Next milestone

Select and inspect one appropriate pretrained traffic-detection ONNX model, then prove a single still-image inference in C#. Input/output tensor formats, preprocessing, class mappings, and post-processing must be derived from that actual model before implementation.
