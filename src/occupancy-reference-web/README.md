# Occupancy Reference Web

App de referencia para equipos que consumen la [Occupancy API](../Innova.Occupancy.Api/README.md). Usa **solo los endpoints de lectura**; no envía datos.

- **Mapa** (Leaflet + teselas de OpenStreetMap): un ícono de bus por unidad, color según `status`, gris cuando `stale: true`. Una flecha en el borde del ícono apunta según `location.headingDeg`; no aparece si el bus está detenido, no hay rumbo o el bus está `stale`. Las líneas de ruta salen de `data/routes/coronado-routes-osm.geojson` como fondo estático: la Occupancy API no sirve rutas.
- **Lista de buses:** placa, pasajeros/capacidad, estado, fuente (`source`) y "último reporte hace x s" (`device.lastSeen`). Los más llenos primero; los `stale` al final.
- **Detalle del bus:** ocupación de la última hora por minuto (`/history?interval=1m`) y eventos de puerta recientes (`/events?since=`).

| Endpoint | Frecuencia |
|---|---|
| `GET /api/v1/vehicles` | cada 5 s |
| `GET /api/v1/vehicles/{id}/history` | cada 15 s, solo con un bus abierto |
| `GET /api/v1/vehicles/{id}/events` | cada 15 s, solo con un bus abierto |

Si la API no responde, la app conserva los últimos datos y muestra el error.

## Ejecutar

```powershell
dotnet run --project src/Innova.Occupancy.Api
cd src/occupancy-reference-web
npm install
npm run dev
```

Abra `http://localhost:5174`. Vite redirige `/api` a `http://localhost:5189`; `API_URL` cambia el destino. Para llamar una API desplegada sin proxy, defina `VITE_OCCUPANCY_API_URL` (la API permite `GET` desde cualquier origen).

Para ver todos los colores fuera de hora pico, arranque la API con `MockFleet__TimeOfDayOverride=07:30`.

## Tipos

`src/types/occupancy.ts` sigue el JSON que la API envía realmente. El documento OpenAPI declara `status` y `source` como enteros y los números como `integer | string`, así que los tipos generados desde `/openapi/v1.json` no coincidirían con las respuestas.
