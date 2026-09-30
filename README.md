# Bus Passenger Vision — Prueba de concepto (POC)

Bus Passenger Vision es una **prueba de concepto (POC)** para analizar video de cámaras fijas dentro de un autobús. El objetivo es detectar pasajeros `sitting` y `standing`, mantener su identidad entre fotogramas y contar abordajes y salidas en la cámara orientada hacia la puerta delantera.

> **Referencia institucional:** Promotora Costarricense de Innovación e Investigación.

## Estado actual

- Interfaz React + TypeScript adaptada a cámaras internas de autobús.
- Selector de cámara: frontal para el área de asientos y trasera para la puerta delantera.
- Selección local, arrastrar y soltar, metadatos y vista previa del video.
- Configuración enviada al backend de umbral de confianza y velocidad de muestreo (1–15 FPS; 1 FPS recomendado en CPU para la demostración).
- Editor visual de dos puntos para la línea de eventos de puerta en la cámara trasera.
- Estados explícitos para detecciones, seguimiento, eventos de puerta y analítica de pasajeros.
- Endpoint `GET /api/health` con indicador visible de conexión entre frontend y backend.
- Inferencia real de imágenes en C# con ONNX Runtime para CPU.
- Endpoint `POST /api/passenger-analysis/image` que devuelve detecciones y un JPG anotado en Base64.
- Endpoint asíncrono `POST /api/passenger-analysis/video`, consulta de progreso y cancelación.
- Decodificación real con OpenCV, inferencia RF-DETR por fotograma y seguimiento IoU con IDs persistentes.
- Overlay SVG sincronizado durante la reproducción, tablas de detecciones, historial de tracks y eventos de puerta.
- Modelo verificado en `models/bus-passengers-rfdetr-s-v1.onnx` y dos fotogramas dorados.

La interfaz no genera resultados de IA simulados. El video `bus_interior_cctv.mp4` fue procesado de extremo a extremo a 1 FPS: 46 muestras en 201.5 segundos en la computadora de desarrollo. Los dos pasajeros primarios conservaron los IDs 1 y 2 durante el clip. Los eventos de puerta están implementados, pero siguen pendientes de validación con un video real orientado hacia la puerta.

## Modelo previsto

- Proyecto Roboflow: `guillermo-jimenez/bus-passenger-detection`
- Versión del conjunto de datos: v1
- Arquitectura: RF-DETR Small
- Tamaño de entrenamiento: 640×640 con redimensionamiento por estiramiento
- Columnas ONNX verificadas: `0 = passenger` sin uso, `1 = sitting`, `2 = standing`
- Umbral sugerido: 0.40

El modelo usa `input [1,3,640,640]`, `dets [1,300,4]` y `labels [1,300,3]`, todos `float32`. El parser fue comprobado contra `bus_0010.jpg` y `bus_0043.jpg`; las cajas primarias quedaron dentro de la tolerancia de ±10 px y ±0.05 de confianza.

## Arquitectura

```text
Cámara fija del autobús
          |
          v
React + TypeScript  -- HTTP / JSON -->  ASP.NET Core
  video + overlay                         |
                                  RF-DETR / ONNX Runtime
                                           |
                    +----------------------+-------------------+
                    |                      |                   |
                Detección             Seguimiento      Eventos de puerta
                    |                      |                   |
                    +----------------------+-------------------+
                                           |
                                  Analítica de pasajeros
```

El navegador no ejecutará el modelo. ASP.NET Core realizará la inferencia y devolverá metadatos sincronizados por tiempo para que React dibuje las cajas, los identificadores de seguimiento y la línea de puerta.

Consulte [docs/architecture.md](docs/architecture.md) para ver los límites de cada capa y la secuencia de hitos.

## Tecnologías

- .NET 10 / ASP.NET Core Web API
- C#
- Microsoft.ML.OnnxRuntime para CPU
- OpenCvSharp para decodificación de video
- React
- TypeScript
- Vite

La aplicación no utiliza Python en tiempo de ejecución. La conversión offline autorizada se realizó con RF-DETR 1.11.0; la API usa C#, ONNX Runtime, OpenCvSharp y SkiaSharp.

## Probar una imagen

```powershell
curl.exe -F "image=@C:\ruta\bus_0010.jpg" `
  http://localhost:5169/api/passenger-analysis/image
```

La respuesta incluye las cajas `x1/y1/x2/y2`, clase, confianza y `annotatedImageBase64` con el JPG anotado.

## Probar un video

```powershell
curl.exe -F "video=@C:\ruta\bus_interior_cctv.mp4" `
  -F "cameraView=front" `
  -F "confidenceThreshold=0.40" `
  -F "processingFps=1" `
  http://localhost:5169/api/passenger-analysis/video
```

La respuesta `202 Accepted` contiene un `jobId`. Consulte `GET /api/passenger-analysis/video/{jobId}` para leer progreso y resultados, o use `DELETE` sobre la misma ruta para cancelar. El trabajador procesa un video a la vez y elimina el archivo temporal al terminar.

## Ejecutar el backend

```powershell
dotnet run --project src/TrafficVision.Api
```

La API de desarrollo escucha en `http://localhost:5169`.

## Ejecutar el frontend

```powershell
cd src/traffic-vision-web
npm install
npm run dev
```

Abra `http://localhost:5173`. Vite redirige `/api` hacia ASP.NET Core.

## Compilar

```powershell
dotnet build TrafficVision.sln
cd src/traffic-vision-web
npm run build
```

## Hitos de visión

1. ✅ Inspeccionar el ONNX y ejecutar una imagen fija en C#, produciendo JPG anotado y JSON.
2. ✅ Decodificar y procesar video a una tasa configurable de 1–15 FPS.
3. ✅ Mantener identificadores mediante seguimiento IoU con confirmación y tolerancia a pérdidas cortas.
4. 🟡 Contar `boarded` y `exited` al cruzar la línea de puerta; implementado, pendiente de validación con video real de puerta.
5. ✅ Sincronizar cajas, IDs y métricas con la reproducción en React.

La cantidad de pasajeros únicos todavía es sensible a falsos positivos y fragmentación de tracks. Debe considerarse una métrica experimental hasta reentrenar el modelo con video real del autobús y validar el tracker.

## Archivos del modelo y pruebas

El modelo debe colocarse en `models/bus-passengers-rfdetr-s-v1.onnx`. Los modelos, videos y salidas generadas están excluidos de Git.

Los recursos previstos son:

- `bus_interior_cctv.mp4`: clip principal, 640 px de ancho y 15 FPS.
- `bus_interior_dark.mp4`: prueba de baja iluminación.
- `bus_stop_cctv.mp4`: prueba posterior fuera del autobús.
- `frames/bus_0010.jpg` y `frames/bus_0043.jpg`: fotogramas dorados validados para M1.

## Atribución

- Video interior del autobús por **dae jeung kim**, Pixabay, video 142755: https://pixabay.com/users/kimdaejeung-7703165/
- Video de parada de autobús por **Expatsiam**, Pixabay, video 31967: https://pixabay.com/users/expatsiam-1490930/
- Los datos de entrenamiento incluyen los conjuntos de Roboflow Universe “Passenger” (Deakin) y “passenger” (MSU), ambos bajo licencia CC BY 4.0.
