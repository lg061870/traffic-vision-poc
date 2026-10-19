# Compatibilidad: Occupancy API ↔ InnoBus

Comparación de los records de InnoBus (`backend/InnoBus.Api/Ocupacion/ContratosOcupacion.cs`) con respuestas reales de la Occupancy API publicada (https://lg0618pp-002-site2.htempurl.com), tomadas el 07/10/2026 a las 12:41 (hora local).

Cada fila es una propiedad de un record de InnoBus: el campo JSON que ASP.NET Core le asigna (camelCase), si viene en la respuesta, su tipo y un valor de ejemplo. ✅ significa que el valor se deserializa en el tipo C# declarado.

**Resultado: 118 de 118 propiedades coinciden: no falta ningún campo y ningún tipo es distinto.** Se revisaron con datos reales los 18 records de InnoBus.

## `GET /api/v1/vehicles`

| Record | Propiedad C# | Tipo C# | Campo JSON | Tipo JSON | Ejemplo | |
|---|---|---|---|---|---|---|
| VehicleList | `Vehicles` | `IReadOnlyList<VehicleState>` | `vehicles` | array | `[43 elementos]` | ✅ |
| VehicleState | `VehicleId` | `string` | `vehicleId` | string | `"SJB-10356"` | ✅ |
| VehicleState | `AsOf` | `DateTimeOffset` | `asOf` | string | `"2026-10-07T18:41:37.9717188+00:00"` | ✅ |
| VehicleState | `Stale` | `bool` | `stale` | boolean | `false` | ✅ |
| VehicleState | `Location` | `GeoLocation?` | `location` | object | `{…}` | ✅ |
| GeoLocation | `Lat` | `double` | `lat` | number (decimal) | `9.948412` | ✅ |
| GeoLocation | `Lon` | `double` | `lon` | number (decimal) | `-84.050266` | ✅ |
| GeoLocation | `SpeedKmh` | `double?` | `speedKmh` | number (entero) | `23` | ✅ |
| GeoLocation | `HeadingDeg` | `double?` | `headingDeg` | number (decimal) | `61.2` | ✅ |
| VehicleState | `Trip` | `TripInfo?` | `trip` | object | `{…}` | ✅ |
| TripInfo | `RouteId` | `string?` | `routeId` | string | `"R142"` | ✅ |
| TripInfo | `Direction` | `string?` | `direction` | string | `"OUTBOUND"` | ✅ |
| VehicleState | `Occupancy` | `OccupancySnapshot?` | `occupancy` | object | `{…}` | ✅ |
| OccupancySnapshot | `PassengerCount` | `int` | `passengerCount` | number (entero) | `5` | ✅ |
| OccupancySnapshot | `Capacity` | `int` | `capacity` | number (entero) | `90` | ✅ |
| OccupancySnapshot | `Percent` | `int` | `percent` | number (entero) | `6` | ✅ |
| OccupancySnapshot | `Status` | `string` | `status` | string | `"MANY_SEATS_AVAILABLE"` | ✅ |
| OccupancySnapshot | `Source` | `string` | `source` | string | `"SIMULATED"` | ✅ |
| OccupancySnapshot | `MeasuredAt` | `DateTimeOffset` | `measuredAt` | string | `"2026-10-07T18:41:37.9717188+00:00"` | ✅ |
| VehicleState | `Device` | `DeviceHealth?` | `device` | object | `{…}` | ✅ |
| DeviceHealth | `Online` | `bool` | `online` | boolean | `true` | ✅ |
| DeviceHealth | `LastSeen` | `DateTimeOffset` | `lastSeen` | string | `"2026-10-07T18:41:37.9717479+00:00"` | ✅ |
| DeviceHealth | `CameraOnline` | `bool?` | `cameraOnline` | boolean | `true` | ✅ |
| DeviceHealth | `Firmware` | `string?` | `firmware` | string | `"sim-2.0"` | ✅ |

## `GET /api/v1/vehicles/{placa}`

| Record | Propiedad C# | Tipo C# | Campo JSON | Tipo JSON | Ejemplo | |
|---|---|---|---|---|---|---|
| VehicleState | `VehicleId` | `string` | `vehicleId` | string | `"SJB-10356"` | ✅ |
| VehicleState | `AsOf` | `DateTimeOffset` | `asOf` | string | `"2026-10-07T18:41:42.9717286+00:00"` | ✅ |
| VehicleState | `Stale` | `bool` | `stale` | boolean | `false` | ✅ |
| VehicleState | `Location` | `GeoLocation?` | `location` | object | `{…}` | ✅ |
| GeoLocation | `Lat` | `double` | `lat` | number (decimal) | `9.948558` | ✅ |
| GeoLocation | `Lon` | `double` | `lon` | number (decimal) | `-84.05` | ✅ |
| GeoLocation | `SpeedKmh` | `double?` | `speedKmh` | number (entero) | `24` | ✅ |
| GeoLocation | `HeadingDeg` | `double?` | `headingDeg` | number (decimal) | `61.2` | ✅ |
| VehicleState | `Trip` | `TripInfo?` | `trip` | object | `{…}` | ✅ |
| TripInfo | `RouteId` | `string?` | `routeId` | string | `"R142"` | ✅ |
| TripInfo | `Direction` | `string?` | `direction` | string | `"OUTBOUND"` | ✅ |
| VehicleState | `Occupancy` | `OccupancySnapshot?` | `occupancy` | object | `{…}` | ✅ |
| OccupancySnapshot | `PassengerCount` | `int` | `passengerCount` | number (entero) | `5` | ✅ |
| OccupancySnapshot | `Capacity` | `int` | `capacity` | number (entero) | `90` | ✅ |
| OccupancySnapshot | `Percent` | `int` | `percent` | number (entero) | `6` | ✅ |
| OccupancySnapshot | `Status` | `string` | `status` | string | `"MANY_SEATS_AVAILABLE"` | ✅ |
| OccupancySnapshot | `Source` | `string` | `source` | string | `"SIMULATED"` | ✅ |
| OccupancySnapshot | `MeasuredAt` | `DateTimeOffset` | `measuredAt` | string | `"2026-10-07T18:41:42.9717286+00:00"` | ✅ |
| VehicleState | `Device` | `DeviceHealth?` | `device` | object | `{…}` | ✅ |
| DeviceHealth | `Online` | `bool` | `online` | boolean | `true` | ✅ |
| DeviceHealth | `LastSeen` | `DateTimeOffset` | `lastSeen` | string | `"2026-10-07T18:41:42.9717538+00:00"` | ✅ |
| DeviceHealth | `CameraOnline` | `bool?` | `cameraOnline` | boolean | `true` | ✅ |
| DeviceHealth | `Firmware` | `string?` | `firmware` | string | `"sim-2.0"` | ✅ |

## `GET /api/v1/vehicles/{placa}/history?interval=5m`

| Record | Propiedad C# | Tipo C# | Campo JSON | Tipo JSON | Ejemplo | |
|---|---|---|---|---|---|---|
| OccupancyHistory | `VehicleId` | `string` | `vehicleId` | string | `"SJB-10356"` | ✅ |
| OccupancyHistory | `From` | `DateTimeOffset` | `from` | string | `"2026-10-07T17:41:43.9547001+00:00"` | ✅ |
| OccupancyHistory | `To` | `DateTimeOffset` | `to` | string | `"2026-10-07T18:41:43.9547001+00:00"` | ✅ |
| OccupancyHistory | `Interval` | `string` | `interval` | string | `"5m"` | ✅ |
| OccupancyHistory | `Points` | `IReadOnlyList<HistoryPoint>` | `points` | array | `[12 elementos]` | ✅ |
| HistoryPoint | `Time` | `DateTimeOffset` | `time` | string | `"2026-10-07T17:41:43.9547001+00:00"` | ✅ |
| HistoryPoint | `PassengerCount` | `int` | `passengerCount` | number (entero) | `14` | ✅ |
| HistoryPoint | `PeakPassengerCount` | `int` | `peakPassengerCount` | number (entero) | `14` | ✅ |
| HistoryPoint | `Capacity` | `int` | `capacity` | number (entero) | `90` | ✅ |
| HistoryPoint | `Percent` | `int` | `percent` | number (entero) | `16` | ✅ |

## `GET /api/v1/vehicles/{placa}/events?since=`

| Record | Propiedad C# | Tipo C# | Campo JSON | Tipo JSON | Ejemplo | |
|---|---|---|---|---|---|---|
| VehicleEventList | `VehicleId` | `string` | `vehicleId` | string | `"SJB-10356"` | ✅ |
| VehicleEventList | `Events` | `IReadOnlyList<DoorEvent>` | `events` | array | `[16 elementos]` | ✅ |
| DoorEvent | `Door` | `int` | `door` | number (entero) | `1` | ✅ |
| DoorEvent | `Boardings` | `int` | `boardings` | number (entero) | `1` | ✅ |
| DoorEvent | `Alightings` | `int` | `alightings` | number (entero) | `0` | ✅ |
| DoorEvent | `Location` | `GeoLocation?` | `location` | object | `{…}` | ✅ |
| GeoLocation | `Lat` | `double` | `lat` | number (decimal) | `9.937322` | ✅ |
| GeoLocation | `Lon` | `double` | `lon` | number (decimal) | `-84.070059` | ✅ |
| GeoLocation | `SpeedKmh` | `double?` | `speedKmh` | number (entero) | `0` | ✅ |
| GeoLocation | `HeadingDeg` | `double?` | `headingDeg` | null | `null` | ✅ |
| DoorEvent | `OpenedAt` | `DateTimeOffset` | `openedAt` | string | `"2026-10-07T18:11:32.9639116+00:00"` | ✅ |
| DoorEvent | `ClosedAt` | `DateTimeOffset` | `closedAt` | string | `"2026-10-07T18:11:52.9639116+00:00"` | ✅ |
| DoorEvent | `OccupancyAfter` | `int?` | `occupancyAfter` | number (entero) | `15` | ✅ |

## `GET /api/v1/trips/plan`

| Record | Propiedad C# | Tipo C# | Campo JSON | Tipo JSON | Ejemplo | |
|---|---|---|---|---|---|---|
| TripPlan | `From` | `GeoPoint` | `from` | object | `{…}` | ✅ |
| GeoPoint | `Lat` | `double` | `lat` | number (decimal) | `9.933` | ✅ |
| GeoPoint | `Lon` | `double` | `lon` | number (decimal) | `-84.079` | ✅ |
| TripPlan | `To` | `GeoPoint` | `to` | object | `{…}` | ✅ |
| TripPlan | `GeneratedAt` | `DateTimeOffset` | `generatedAt` | string | `"2026-10-07T18:41:43.4391331+00:00"` | ✅ |
| TripPlan | `Options` | `IReadOnlyList<TripOption>` | `options` | array | `[1 elementos]` | ✅ |
| TripOption | `DepartAt` | `DateTimeOffset` | `departAt` | string | `"2026-10-07T18:41:43.4391331+00:00"` | ✅ |
| TripOption | `ArriveAt` | `DateTimeOffset` | `arriveAt` | string | `"2026-10-07T19:04:32.237539+00:00"` | ✅ |
| TripOption | `DurationMinutes` | `double` | `durationMinutes` | number (decimal) | `22.8` | ✅ |
| TripOption | `Transfers` | `int` | `transfers` | number (entero) | `0` | ✅ |
| TripOption | `Legs` | `IReadOnlyList<TripLeg>` | `legs` | array | `[3 elementos]` | ✅ |
| TripLeg | `Type` | `string` | `type` | string | `"BUS"` | ✅ |
| TripLeg | `From` | `TripPlace` | `from` | object | `{…}` | ✅ |
| TripPlace | `Name` | `string` | `name` | string | `"San José"` | ✅ |
| TripPlace | `Lat` | `double` | `lat` | number (decimal) | `9.932732` | ✅ |
| TripPlace | `Lon` | `double` | `lon` | number (decimal) | `-84.079187` | ✅ |
| TripPlace | `StopId` | `string?` | `stopId` | string | `"R142-00"` | ✅ |
| TripLeg | `To` | `TripPlace` | `to` | object | `{…}` | ✅ |
| TripLeg | `DepartAt` | `DateTimeOffset` | `departAt` | string | `"2026-10-07T18:44:13.4391331+00:00"` | ✅ |
| TripLeg | `ArriveAt` | `DateTimeOffset` | `arriveAt` | string | `"2026-10-07T18:58:07.0042799+00:00"` | ✅ |
| TripLeg | `Minutes` | `double` | `minutes` | number (decimal) | `13.9` | ✅ |
| TripLeg | `Meters` | `int` | `meters` | number (entero) | `3631` | ✅ |
| TripLeg | `Bus` | `BusRide?` | `bus` | object | `{…}` | ✅ |
| BusRide | `RouteId` | `string` | `routeId` | string | `"R142"` | ✅ |
| BusRide | `RouteName` | `string` | `routeName` | string | `"Ruta 142"` | ✅ |
| BusRide | `Direction` | `string` | `direction` | string | `"OUTBOUND"` | ✅ |
| BusRide | `Headsign` | `string` | `headsign` | string | `"Terminal de Coronado"` | ✅ |
| BusRide | `VehicleId` | `string` | `vehicleId` | string | `"SJB-12315"` | ✅ |
| BusRide | `WaitMinutes` | `double` | `waitMinutes` | number (decimal) | `1.9` | ✅ |
| BusRide | `Stops` | `int` | `stops` | number (entero) | `9` | ✅ |
| BusRide | `Vehicle` | `BusNow` | `vehicle` | object | `{…}` | ✅ |
| BusNow | `Location` | `GeoPoint` | `location` | object | `{…}` | ✅ |
| BusNow | `SpeedKmh` | `double?` | `speedKmh` | number (entero) | `0` | ✅ |
| BusNow | `HeadingDeg` | `double?` | `headingDeg` | null | `null` | ✅ |
| BusNow | `PassengerCount` | `int?` | `passengerCount` | number (entero) | `13` | ✅ |
| BusNow | `Capacity` | `int?` | `capacity` | number (entero) | `90` | ✅ |
| BusNow | `Percent` | `int?` | `percent` | number (entero) | `14` | ✅ |
| BusNow | `Status` | `string?` | `status` | string | `"MANY_SEATS_AVAILABLE"` | ✅ |
| BusNow | `DistanceToStopMeters` | `int` | `distanceToStopMeters` | number (entero) | `0` | ✅ |
| BusRide | `LaterBuses` | `IReadOnlyList<UpcomingBus>` | `laterBuses` | array | `[2 elementos]` | ✅ |
| UpcomingBus | `VehicleId` | `string` | `vehicleId` | string | `"SJB-9581"` | ✅ |
| UpcomingBus | `ArriveAt` | `DateTimeOffset` | `arriveAt` | string | `"2026-10-07T18:46:43.4391331+00:00"` | ✅ |
| UpcomingBus | `PassengerCount` | `int?` | `passengerCount` | number (entero) | `14` | ✅ |
| UpcomingBus | `Capacity` | `int?` | `capacity` | number (entero) | `90` | ✅ |
| UpcomingBus | `Status` | `string?` | `status` | string | `"MANY_SEATS_AVAILABLE"` | ✅ |
| BusRide | `Path` | `IReadOnlyList<GeoPoint>` | `path` | array | `[13 elementos]` | ✅ |
| TripOption | `Warnings` | `IReadOnlyList<string>` | `warnings` | array | `[2 elementos]` | ✅ |
| TripPlan | `Message` | `string?` | `message` | null | `null` | ✅ |

