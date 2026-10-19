# Planificador de viajes: referencia de la API

**Fecha:** 6 de octubre de 2026 · **Autor:** Guillermo Jimenez

---

## Llamada

```
GET https://lg0618pp-002-site2.htempurl.com/api/v1/trips/plan?from={lat},{lon}&to={lat},{lon}
```

| Parámetro | Obligatorio | Por defecto | Valores |
|---|---|---|---|
| `from` | sí | | Origen, `lat,lon` (ej. `9.9620,-84.0300`) |
| `to` | sí | | Destino, `lat,lon` |
| `walkKmh` | no | `4.5` | 1 a 8 |
| `maxWalkMeters` | no | `1000` | 100 a 3000 |
| `marginSeconds` | no | `60` | 0 a 600 |

Sin autenticación. Respuesta en JSON. Horas en ISO-8601 UTC. Error `400` (Problem Details, ver `title`) si los parámetros no son válidos.

## Respuesta

```
TripPlan
├─ from: { lat, lon }
├─ to: { lat, lon }
├─ generatedAt: fecha
├─ message: texto | null              motivo cuando options está vacío
└─ options: TripOption[]              la mejor primero (máx. 5)

TripOption
├─ departAt: fecha                    ahora
├─ arriveAt: fecha                    llegada al destino
├─ durationMinutes: número
├─ transfers: 0 | 1
├─ warnings: texto[]                  avisos en español, listos para mostrar
└─ legs: TripLeg[]                    tramos en orden

TripLeg
├─ type: "WALK" | "BUS"
├─ from: TripPlace
├─ to: TripPlace
├─ departAt: fecha                    en BUS: cuando el bus pasa por la parada
├─ arriveAt: fecha
├─ minutes: número
├─ meters: entero
└─ bus: BusRide | null                solo en BUS

TripPlace
├─ name: texto                        "Origen", "Destino" o nombre de la parada
├─ lat, lon: número
└─ stopId: texto | null               ej. "R142-18"

BusRide
├─ routeId: texto                     "R142", "R142-01"…"R142-10"
├─ routeName: texto                   "Ruta 142", "Ramal Cascajal"
├─ direction: "INBOUND" | "OUTBOUND"
├─ headsign: texto                    destino del bus, ej. "San José"
├─ vehicleId: texto                   placa del bus a tomar
├─ waitMinutes: número                espera en la parada
├─ stops: entero                      paradas hasta bajarse
├─ vehicle: BusNow                    el bus en este momento
├─ laterBuses: UpcomingBus[]          los siguientes por esa parada (máx. 2)
└─ path: { lat, lon }[]               recorrido del tramo

BusNow
├─ location: { lat, lon }
├─ speedKmh: número | null
├─ headingDeg: número | null          0 = norte, 90 = este
├─ passengerCount: entero | null
├─ capacity: entero | null
├─ percent: entero | null
├─ status: OccupancyStatus | null
└─ distanceToStopMeters: entero

UpcomingBus
├─ vehicleId: texto
├─ arriveAt: fecha
├─ passengerCount: entero | null
├─ capacity: entero | null
└─ status: OccupancyStatus | null

OccupancyStatus: "EMPTY" | "MANY_SEATS_AVAILABLE" | "FEW_SEATS_AVAILABLE"
               | "STANDING_ROOM_ONLY" | "CRUSHED_STANDING_ROOM_ONLY" | "FULL"
```

## Ejemplo

`GET /api/v1/trips/plan?from=9.9620,-84.0300&to=9.9330,-84.0790` (recortado):

```json
{
  "from": { "lat": 9.962, "lon": -84.03 },
  "to": { "lat": 9.933, "lon": -84.079 },
  "generatedAt": "2026-10-06T06:37:41Z",
  "message": null,
  "options": [
    {
      "departAt": "2026-10-06T06:37:41Z",
      "arriveAt": "2026-10-06T07:29:23Z",
      "durationMinutes": 51.7,
      "transfers": 0,
      "warnings": [],
      "legs": [
        {
          "type": "WALK",
          "from": { "name": "Origen", "lat": 9.962, "lon": -84.03, "stopId": null },
          "to": { "name": "Ruta 142 · Parada 18", "lat": 9.964298, "lon": -84.032894, "stopId": "R142-18" },
          "departAt": "2026-10-06T06:37:41Z", "arriveAt": "2026-10-06T06:44:43Z",
          "minutes": 7, "meters": 528, "bus": null
        },
        {
          "type": "BUS",
          "from": { "name": "Ruta 142 · Parada 18", "lat": 9.964298, "lon": -84.032894, "stopId": "R142-18" },
          "to": { "name": "San José", "lat": 9.932732, "lon": -84.079187, "stopId": "R142-00" },
          "departAt": "2026-10-06T06:46:27Z", "arriveAt": "2026-10-06T07:28:45Z",
          "minutes": 42.3, "meters": 7262,
          "bus": {
            "routeId": "R142", "routeName": "Ruta 142", "direction": "INBOUND", "headsign": "San José",
            "vehicleId": "SJB-2267", "waitMinutes": 1.7, "stops": 18,
            "vehicle": {
              "location": { "lat": 9.966079, "lon": -84.019441 }, "speedKmh": 15, "headingDeg": 273.9,
              "passengerCount": 68, "capacity": 90, "percent": 76, "status": "FEW_SEATS_AVAILABLE",
              "distanceToStopMeters": 1554
            },
            "laterBuses": [
              { "vehicleId": "SJB-12726", "arriveAt": "2026-10-06T06:51:27Z", "passengerCount": 86, "capacity": 90, "status": "CRUSHED_STANDING_ROOM_ONLY" }
            ],
            "path": [ { "lat": 9.964298, "lon": -84.032894 }, { "lat": 9.964296, "lon": -84.0331 } ]
          }
        },
        {
          "type": "WALK",
          "from": { "name": "San José", "lat": 9.932732, "lon": -84.079187, "stopId": "R142-00" },
          "to": { "name": "Destino", "lat": 9.933, "lon": -84.079, "stopId": null },
          "departAt": "2026-10-06T07:28:45Z", "arriveAt": "2026-10-06T07:29:23Z",
          "minutes": 0.6, "meters": 47, "bus": null
        }
      ]
    }
  ]
}
```

Sin opciones (de noche, o lejos de la línea):

```json
{ "from": { "lat": 9.86, "lon": -84.15 }, "to": { "lat": 9.933, "lon": -84.079 }, "generatedAt": "2026-10-06T06:40:02Z",
  "options": [], "message": "El origen está a más de 1000 m de cualquier parada de la línea de Coronado." }
```
