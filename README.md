# Traffic Vision — Prueba de concepto (POC)

Traffic Vision es una **prueba de concepto (POC)** para analizar videos de carretera capturados desde un vehículo en movimiento. Este primer hito establece una interfaz de demostración en React, una API en ASP.NET Core y la comunicación entre ambas aplicaciones. Todavía no ejecuta detección de objetos.

> **Referencia institucional:** Promotora Costarricense de Innovación e Investigación.

## Estado actual

- Espacio de trabajo en React + TypeScript basado en el diseño aprobado para la demostración.
- Selección local de video, arrastrar y soltar, visualización de metadatos y vista previa en el navegador.
- Estados vacíos explícitos para detecciones, seguimiento, dirección y analítica.
- Endpoint `GET /api/health` en ASP.NET Core con indicador visible del estado de conexión.
- Configuración de CORS para desarrollo y proxy de API mediante Vite.
- Dependencia de ONNX Runtime para CPU instalada para un hito posterior.
- Separación clara entre las capas de detección, seguimiento, dirección y analítica.

La interfaz no muestra resultados de IA simulados. La acción de análisis explica claramente que la inferencia todavía no está conectada.

## Arquitectura

```text
Navegador
  React + TypeScript
          |
          | HTTP / JSON
          v
  API web ASP.NET Core
          |
     Servicio de detección (futuro)
          |
  Microsoft ONNX Runtime
          |
  traffic.onnx exportado desde Roboflow (futuro)
```

El entrenamiento, la selección del modelo y la exportación a ONNX mediante Roboflow se realizan fuera de este repositorio. En el futuro, la aplicación combinará el video original con metadatos de detección sincronizados por tiempo y los dibujará mediante una capa Canvas o SVG. El modelo no se ejecutará directamente en el navegador.

Consulte [docs/architecture.md](docs/architecture.md) para conocer los límites de responsabilidad y el flujo previsto de las solicitudes.

## Tecnologías

- .NET 10 / ASP.NET Core Web API
- C#
- Microsoft.ML.OnnxRuntime para CPU
- React
- TypeScript
- Vite

La aplicación no contiene servicios, dependencias, scripts ni entornos de ejecución de Python.

## Requisitos

- .NET SDK 10.0 o posterior
- Node.js 20 o posterior
- npm 10 o posterior

## Ejecutar el backend

Desde la raíz del repositorio:

```powershell
dotnet run --project src/TrafficVision.Api
```

La API de desarrollo escucha en `http://localhost:5169`. Puede comprobarla en:

```text
GET http://localhost:5169/api/health
```

## Ejecutar el frontend

En una segunda terminal:

```powershell
cd src/traffic-vision-web
npm install
npm run dev
```

Abra `http://localhost:5173`. Vite redirige las solicitudes a `/api` hacia la API de ASP.NET Core.

## Compilar

```powershell
dotnet build TrafficVision.sln
cd src/traffic-vision-web
npm run build
```

## Estructura del repositorio

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

## Archivos del modelo

Los archivos `.onnx` de gran tamaño están excluidos de Git. Cuando se seleccione el modelo, siga las instrucciones de [models/README.md](models/README.md) y coloque el archivo local en `models/traffic.onnx`.

## Próximo hito

Seleccionar e inspeccionar un modelo ONNX preentrenado apropiado para detección de tránsito y comprobar una primera inferencia sobre una imagen fija desde C#. Los formatos de los tensores de entrada y salida, el preprocesamiento, el mapa de clases y el posprocesamiento deberán obtenerse del modelo real antes de implementar la inferencia.
