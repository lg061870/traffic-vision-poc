# Occupancy API

Sirve **solo el resultado** del procesamiento de sensores y video de cada bus: ocupación, eventos de abordaje y salida, y posición. Rutas, paradas, tarifas, lugares y planificación de viajes pertenecen a otras APIs, que pueden leer de esta.

Por ahora todo se guarda **en memoria** (se pierde al reiniciar). Un simulador (`MockFleet`) genera buses que se mueven y cambian de ocupación para que la app móvil y el dashboard puedan desarrollarse antes de que existan dispositivos reales.

## Ejecutar

```powershell
dotnet run --project src/Innova.Occupancy.Api
```

- API: `http://localhost:5189/api/v1/vehicles`
- Contrato OpenAPI (para generar tipos en la app): `http://localhost:5189/openapi/v1.json`
- Ejemplos listos: `Innova.Occupancy.Api.http`

## Endpoints

**Lectura** (app móvil, dashboard de operadores, otras APIs):

| # | Endpoint | Qué devuelve | Sensor de origen (supuesto) | Requerimiento |
|---|---|---|---|---|
| 1 | `GET /api/v1/vehicles` | Último estado de todos los buses: ocupación, posición, frescura | Contador 3D cenital de puerta; cámara CCTV interior + IA; GPS | RF-04; diagrama pasos 6–7 |
| 2 | `GET /api/v1/vehicles/{vehicleId}` | Último estado de un bus | Igual que #1 | RF-04; diagrama paso 6 |
| 3 | `GET /api/v1/vehicles/{vehicleId}/events?since=` | Abordajes y salidas por puerta, con hora y lugar | Contador 3D cenital de puerta; GPS | RF-02; RF-07/RF-08 |
| 4 | `GET /api/v1/vehicles/{vehicleId}/history?from=&to=&interval=` | Ocupación en el tiempo (último valor y pico por intervalo) | Igual que #1, almacenado | RF-05; RF-06 |

**Escritura** (solo el equipo a bordo de cada bus):

| # | Endpoint | Qué recibe | Sensor de origen (supuesto) | Requerimiento |
|---|---|---|---|---|
| 5 | `POST /api/v1/vehicles/{vehicleId}/observations` | Resultado ya procesado: conteos, ocupación, GPS, estado del equipo | Todos los anteriores, combinados por la computadora edge del bus | RF-02; RF-03 |
| 6 | `POST /api/v1/vehicles/{vehicleId}/raw` | **Datos crudos** del OnboardComputerApp: GPS en NMEA 0183, eventos del contador de puerta y resultados de la API de inferencia de visión. Esta API hace todos los cálculos. | GPS; contador 3D de puerta; API de visión (sin imágenes) | RF-02; RF-03; RF-07; RF-08 |

## Convenciones

- **`vehicleId`** es la placa o el número de flota, configurado en el equipo del bus. Se normaliza a mayúsculas con guiones: `sjb 8754`, `SJB_8754` y `SJB-8754` son el mismo bus.
- **`status`** usa los niveles de GTFS-Realtime (`EMPTY`, `MANY_SEATS_AVAILABLE`, `FEW_SEATS_AVAILABLE`, `STANDING_ROOM_ONLY`, `CRUSHED_STANDING_ROOM_ONLY`, `FULL`). Los umbrales por porcentaje están en `OccupancyApi:Thresholds`.
- **`source`** indica de dónde viene el número: `DOOR_COUNTER_3D`, `CABIN_CAMERA`, `DOOR_CAMERA` o `SIMULATED`.
- **`location.headingDeg`** es la dirección de avance en grados desde el norte verdadero, en sentido horario (`0` = norte, `90` = este). Es opcional: viene vacío cuando el bus está detenido (menos de 2 km/h) o el GPS no da rumbo.
- **`stale: true`** cuando el bus no reporta hace más de `OccupancyApi:StaleAfterSeconds` (60 s).
- **Horas** en ISO-8601 con zona horaria; la API responde en UTC.
- **Errores** en formato Problem Details: 400 datos inválidos, 401 llave de dispositivo inválida, 404 bus sin datos.
- Un mensaje más viejo que el último recibido no reemplaza la posición ni la ocupación actual, pero sí cuenta en eventos e historial.

## Datos crudos (`POST /raw`)

El **OnboardComputerApp** (en el bus o en un servidor) envía un mensaje cada ~10 s y al cerrarse las puertas. Cada parte conserva el formato de su fuente, así que reemplazar un sensor simulado por uno real solo requiere un adaptador:

| Parte | Formato | Adaptador |
|---|---|---|
| `gps` | `NMEA-0183`: oraciones `$--RMC` y `$--GGA` de cualquier receptor, con checksum | `NmeaParser` |
| `doorCounter` | `apc-door-events-v1`: `DOOR_OPENED`, `COUNT` (`in`/`out`) y `DOOR_CLOSED` por puerta. No hay estándar universal; otro fabricante = otro adaptador (`IDoorCounterAdapter`) | `ApcDoorEventsV1Adapter` |
| `vision` | Resultados de la API de inferencia por cuadro: `trackId`, `class` (`sitting`/`standing`), `score`, `box`. Nunca imágenes | `VisionReading` |

Cálculos de la API:

- **Posición:** la última lectura GPS válida (se descartan oraciones con checksum incorrecto o sin señal). La velocidad y el rumbo (`headingDeg`) vienen del campo *course over ground* de `$--RMC`; si una `$--GGA` llega con la misma hora, se usa la RMC porque la GGA no trae ninguno de los dos.
- **Puertas:** cada apertura y cierre produce un evento con abordajes y salidas; una puerta puede abrirse en un mensaje y cerrarse en el siguiente.
- **Pasajeros:** conteo acumulado del contador de puerta. La cámara no puede ver más personas de las que hay a bordo, así que si ve más, el conteo se corrige hacia arriba (`source: CABIN_CAMERA`). Un bus solo con cámara usa lo que la cámara ve (mediana de los cuadros del mensaje).
- **`sequence`:** número creciente por bus. Un mensaje reenviado tras un error de red se acepta pero no se cuenta dos veces (`duplicate: true`).
- **Capacidad:** viene del registro de flota (`Fleet:RegistryFile`); un bus no registrado recibe 404.
- Cuando un bus envía datos crudos, el simulador deja de moverlo durante 2 minutos.

Ejemplo completo en `Innova.Occupancy.Api.http`.

## Configuración

| Clave | Uso |
|---|---|
| `Fleet:RegistryFile` | Registro de flota: buses y su capacidad (`MockData/coronado-fleet.json`). |
| `MockFleet:Enabled` | Activa la flota simulada (ver abajo). Desactivar cuando haya dispositivos reales. |
| `MockFleet:FleetFile` | Archivo con la flota y los corredores simulados (`MockData/coronado-fleet.json`). |
| `MockFleet:WarmUpMinutes` | Minutos simulados al arrancar, para que la ocupación, los eventos y el historial ya tengan datos (60). |
| `MockFleet:TimeOfDayOverride` | Hora de Costa Rica cuya demanda se simula, por ejemplo `07:30`, para mostrar la hora pico en cualquier momento. Vacío = reloj real. |
| `Ingestion:DeviceKeys:{vehicleId}` | Llave de cada bus, enviada en el header `X-Device-Key`. Si no hay llaves configuradas, cualquiera puede enviar observaciones: solo para desarrollo. |
| `OccupancyApi:HistoryRetentionHours` | Horas de historial en memoria (24). |

Las llaves no deben guardarse en `appsettings.json`; use variables de entorno, por ejemplo `Ingestion__DeviceKeys__SJB-8754`.

## Flota simulada: Autobuses Unidos de Coronado

Los datos simulados representan a **Autobuses Unidos de Coronado S.A.** con su modelo troncal-alimentador:

- **43 buses:** 27 troncales en la **Ruta 142** (San José ↔ San Isidro de Coronado) y 16 alimentadores en **10 ramales** que llevan pasajeros a la terminal de Coronado.
- **Unos 28 000 pasajeros al día.** Una prueba simula 24 horas completas y verifica el total (±20 %; hoy da unos 27 000) y que los buses troncales se llenen en ambas horas pico.
- **Horas pico:** de mañana hacia San José y hacia la terminal; de tarde de regreso. Los buses van más lentos en hora pico, se detienen unos 20 s por parada y descansan 5 min en cada terminal.
- **Servicio:** toda la flota en hora pico, cerca de la mitad al mediodía y en la noche, ninguna de 11 p. m. a 5 a. m. (los buses estacionados siguen reportando, vacíos).
- **`SJB-7090` está fuera de servicio:** reporta una vez y luego aparece como `stale`.

> **Datos ficticios.** Los totales (43 buses, 27 + 16, 10 ramales, ~28 000 pasajeros/día) vienen de la investigación del equipo y no están verificados. Las placas, capacidades (90 troncal, 50 alimentador) y los ramales marcados "por definir" son inventados. Las rutas del archivo solo mueven la simulación: esta API nunca sirve rutas.

**Recorridos:** siguen calles reales de OpenStreetMap, calculadas con OSRM desde la Parroquia San Isidro Labrador (Coronado) hasta el centro de cada destino; la Ruta 142 va Parque Central (San José) → Guadalupe → Ipís → Coronado. Se aproximan a los recorridos reales del operador, pero no los copian. El trazado completo está en `data/routes/coronado-routes-osm.geojson` (puede verse arrastrándolo a geojson.io). Datos de mapa © colaboradores de OpenStreetMap (ODbL).
