# Comparación: panel del operador (site5) e InnoBus

Comparación lado a lado de dos clientes de la Occupancy API (site2). Describe qué hace cada uno; no evalúa cuál es mejor.

- **Panel del operador:** `src/operator-dashboard-web` + `src/Innova.OperatorDashboard`, publicado en site5.
- **InnoBus:** repositorio github.com/CruzBas/InnoBus, rama `master`, commit `be9c29f` (2026-10-07). Se revisaron también todas las ramas remotas hasta `feat/home-screen-refactor` (2026-10-08).

> InnoBus no tiene un panel del operador: es una app para pasajeros. Por eso esta comparación pone frente a frente dos productos con públicos distintos.

## Resumen

| | Panel del operador | InnoBus |
|---|---|---|
| Público | Dueño de la flota (Autobuses Unidos de Coronado) | Pasajeros |
| Tipo de app | Web (React + Vite), servida como archivos estáticos por ASP.NET Core | Móvil y web (Expo / React Native) con un backend propio en ASP.NET Core |
| Cómo llega a la API | El navegador llama directo a la Occupancy API | La app llama a su backend (`/api/buses`, `/api/viajes`…), y el backend llama a la Occupancy API |
| Actualización | Flota cada 5 s; uso por hora cada 60 s | Flota cada 5 s (en Diagnóstico y en las pantallas que la usan) |
| Datos | Simulados, salvo el bus SJB-10662 (conteo del modelo de visión); la interfaz lo indica | Los de la Occupancy API más JSON locales (lugares, tarifas y alertas) |

## Funciones

| Área | Panel del operador | InnoBus |
|---|---|---|
| Rentabilidad | Pestaña «Rentabilidad»: abordajes, ingreso estimado (abordajes × tarifa ARESEP), costo de operación (costo por hora-bus), pérdida en horas bajo el punto de equilibrio; gráfico por hora, mapa de calor ruta × hora, tiempo por nivel de ocupación; botón «Explicar resultado» | — |
| Supuestos | Panel para ajustar el costo por hora-bus y el porcentaje de adultos mayores (viajan gratis); muestra las tarifas ARESEP por ruta, con las fuentes en `docs/supuestos-dashboard-operador.md` | Tarifas estimadas fijas en `tarifas.json` (₡400 la troncal, ₡300 los ramales) |
| Vista en vivo | Pestaña «En vivo»: buses en servicio, pasajeros a bordo, ocupación total, fuente del conteo, mapa de la flota, franja de ocupación por ruta | Pantalla «Tiempo real» e inicio con los buses en el mapa |
| Detalle de un bus | Panel con la ocupación y las horas que pagaron su costo | Consulta de un bus (`obtenerBus`) en Tiempo real |
| Alertas | Calculadas de la flota en vivo: saturados, casi vacíos, agrupados, sin reporte | Avisos de servicio (retrasos, desvíos) cargados de `alertas.json` |
| Cámara | Video de demostración con las detecciones del modelo (`/demo`) | — |
| Planificar viajes | — | Origen y destino, propuestas, alternativas, detalle de ruta; búsqueda de direcciones con geocodificación y Google |
| Usuario | — | Ingreso, registro, perfil, asistente |
| Diagnóstico | — | Pantalla que prueba la conexión con el backend y cuenta los buses en línea |
| Rutas en el mapa | GeoJSON de OSM del repositorio (`data/routes/coronado-routes-osm.geojson`) | `rutas.json` local y el trazado (`path`) que trae `/trips/plan` |

## Endpoints de la Occupancy API

| Endpoint | Panel del operador | InnoBus |
|---|---|---|
| `GET /api/v1/vehicles` | Sí | Sí (`/api/buses`) |
| `GET /api/v1/vehicles/{id}` | No (toma el bus de la lista) | Sí (`/api/buses/{placa}`) |
| `GET /api/v1/vehicles/{id}/history` | No | El backend la expone (`/api/buses/{placa}/historial`); ninguna pantalla la llama todavía |
| `GET /api/v1/vehicles/{id}/events` | No | Tiene el método en el cliente (`ObtenerEventosAsync`), sin uso |
| `GET /api/v1/trips/plan` | No | Sí (`/api/viajes/plan`) |
| `GET /api/v1/fleet/hourly` | Sí | No |

## Campos de `occupancy` que se leen

| Campo | Panel del operador | InnoBus |
|---|---|---|
| `passengerCount`, `capacity`, `percent` | Sí | Sí |
| `status` | Sí | Sí |
| `source` (cámara IA o simulado) | Sí, en el indicador «Fuente del conteo» | Está en el contrato; no se muestra |
| Sentados / de pie | No existe en la API | No se usa |

## Sentados y de pie

Ninguno de los dos clientes necesita hoy el conteo de sentados y de pie. La API ya recibe `Sitting` y `Standing` del modelo de visión (`src/Innova.Occupancy.Api/Ingestion/VisionReading.cs`), pero `/vehicles` no los publica. Si más adelante se quisieran mostrar, se podrían agregar como campos opcionales en `occupancy` sin romper a InnoBus: su backend lee la respuesta en tipos fijos de C# e ignora los campos que no conoce.
