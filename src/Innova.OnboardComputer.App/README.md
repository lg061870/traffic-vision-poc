# OnboardComputerApp

Aplicación de consola (.NET 10, *worker*) que corre en la computadora a bordo de cada bus. Reúne los **datos raw** de tres fuentes y los envía a la [Occupancy API](../Innova.Occupancy.Api/README.md) con `POST /api/v1/vehicles/{vehicleId}/raw`. No calcula nada: la API hace todos los cálculos.

| Fuente | Formato enviado | Interfaz |
|---|---|---|
| GPS | Oraciones NMEA 0183 (`$GPGGA`, `$GPRMC`) con checksum, tal como las escribe el receptor | `IGpsSource` |
| Contador de puerta | `apc-door-events-v1`: `DOOR_OPENED`, `COUNT` (`in`/`out`) y `DOOR_CLOSED` por puerta | `IDoorCounterSource` |
| Visión | Resultados JSON de la API de inferencia por cuadro (`trackId`, `class`, `score`, `box`). **Nunca imágenes** | `IVisionSource` |

El cuerpo es exactamente `RawVehicleMessage` de `src/Innova.Occupancy.Api/Ingestion/RawModels.cs`. La app guarda su propia copia del contrato (`Contracts/RawVehicleMessage.cs`) para no depender de la API; una prueba verifica que ambas sigan iguales.

## Ejecutar

```powershell
dotnet run --project src/Innova.Occupancy.Api          # en otra terminal
dotnet run --project src/Innova.OnboardComputer.App
```

Con la configuración por defecto, el bus `SJB-10662` (Ramal San Rafael) recorre su ruta en simulación. En pocos segundos aparece en `http://localhost:5189/api/v1/vehicles/SJB-10662` y sus abordajes en `/events`.

## Cuándo envía

- Cada `SendIntervalSeconds` (10 s), y **de inmediato cuando se cierra una puerta**, para que los abordajes lleguen antes de que el bus salga de la parada.
- Cada mensaje lleva todo lo que las fuentes produjeron desde el anterior. Si ninguna produjo nada, no se envía.
- **`sequence`** crece en cada mensaje. Empieza en la hora Unix en milisegundos, así sigue creciendo aunque la app se reinicie, sin guardar estado.
- **Sin conexión:** los mensajes quedan en un buffer en memoria (hasta `MaxBufferedMessages`; si se llena se descarta el más viejo) y se reenvían **del más viejo al más nuevo**. El orden importa: la API ignora una `sequence` menor o igual a la última aceptada, así que enviar uno nuevo primero haría que los viejos se tomaran como duplicados. Un reenvío que la API ya había contado se acepta sin contarse dos veces.
- **Respuestas:** 2xx = entregado; sin red, tiempo agotado, 408, 429 o 5xx = se reintenta en el próximo envío; otros 4xx (400, 401, 404) = la API rechazó el mensaje en sí, se registra el error y se descarta para no bloquear a los siguientes.

## Configuración (`OnboardComputer`)

| Clave | Uso |
|---|---|
| `OccupancyApiUrl` | URL base de la Occupancy API (`http://localhost:5189`). |
| `VehicleId` | Placa o número de flota registrado en la API (`SJB-10662`). |
| `DeviceKey` | Llave del bus, enviada en el header `X-Device-Key`. No la guarde en `appsettings.json`: use `OnboardComputer__DeviceKey`. |
| `SendIntervalSeconds` | Segundos entre envíos (10). |
| `MaxBufferedMessages` | Mensajes guardados mientras no hay conexión (8640 = 24 h a 10 s). |
| `RequestTimeoutSeconds` | Tiempo máximo de cada envío (10). |
| `Simulation:Enabled` | Reproduce un escenario en lugar de leer dispositivos reales. |
| `Simulation:ScenarioFile` | Escenario a reproducir, relativo a la carpeta de la app (`Scenarios/ramal-san-rafael.json`). |
| `Simulation:Loop` | Repite el escenario al terminar (`true`). |

## Simulación

Un escenario es un archivo JSON con un viaje guionizado. **Todas las horas son desplazamientos desde el minuto 0** (`"00:02:45"`); al reproducirlo, el minuto 0 se vuelve "ahora" y cada vuelta siguiente empieza donde terminó la anterior. Así la API siempre recibe horas actuales.

- **GPS:** `routeId` elige una ruta de `data/routes/coronado-routes-osm.geojson` (se copia junto a la app). `gps.track` dice en qué kilómetro de la ruta está el bus en cada momento; entre puntos se interpola, y la velocidad y el rumbo salen del trayecto. Cada `intervalSeconds` se escribe un par `$GPGGA` + `$GPRMC` con checksum válido.
- **Puertas:** `doorEvents` en formato `apc-door-events-v1`, con su hora relativa.
- **Visión:** detecciones sintéticas, una por pasajero que la cámara alcanza a ver (`maxVisible`), sentados hasta `seatsInView` y el resto de pie, con IDs de seguimiento estables y algunas pérdidas deterministas (`missRate`, `seed`). Quienes bajan salen de la vista de la cámara al abrirse la puerta.

El escenario incluido, `Scenarios/ramal-san-rafael.json`, es una vuelta de 20 minutos del Ramal San Rafael (R142-05): terminal de Coronado → San Rafael → terminal, con tres paradas por sentido. Los abordajes y las salidas suman lo mismo, así que puede repetirse sin que el conteo se desvíe.

### Cámara grabada: el conteo sale del modelo real

`Scenarios/ramal-san-rafael-camara.json` hace el mismo recorrido, pero **sin contador de puertas**, y la cámara de cabina envía lo que el modelo de visión **detectó de verdad** en un clip ya analizado (`vision.recording`, un `.result.json` de TrafficVision). Así el conteo de `SJB-10662` en la API viene del modelo (`source: CABIN_CAMERA`). Solo se envían las detecciones confirmadas, como en la app de visión.

- Los resultados salen de `data/demo/results` (fuera de Git, ver `data/demo/README.md`) y se copian a `Scenarios/recordings` al compilar.
- El clip se repite sobre el **reloj Unix**: en cada momento va por el segundo *(hora Unix mod duración del clip)*. El panel del operador reproduce el video con ese mismo reloj, así que las cajas en pantalla y el conteo que recibe la API corresponden al mismo momento.

```powershell
dotnet run --project src/Innova.OnboardComputer.App --launch-profile camara-grabada
```

Para que este bus siga reportando a la API publicada sin una PC encendida, [Innova.OnboardComputer.Host](../Innova.OnboardComputer.Host/README.md) corre esta misma app en SmarterASP.

## Dispositivos reales

Solo cambian las fuentes. Hoy `Program.cs` registra `BufferedGpsSource`, `BufferedDoorCounterSource` y `BufferedVisionSource`, que el reproductor del escenario alimenta. Para un dispositivo real se registra otra implementación de `IGpsSource` (por ejemplo, un lector de puerto serie que entrega cada línea NMEA), `IDoorCounterSource` (con su `Format`; otro fabricante necesita también su adaptador en la API) o `IVisionSource` (cliente de la API de inferencia). El resto de la app no cambia. Con `Simulation:Enabled=false` y sin adaptadores reales, la app arranca pero no envía nada.

## Pruebas

```powershell
dotnet test tests/Innova.OnboardComputer.App.Tests
```

Cubren la construcción de mensajes y su JSON (comparado con el contrato de la API), los checksums NMEA (verificados con el `NmeaParser` de la API), el buffer y el reenvío en orden, el envío por intervalo y al cerrar puertas, el escenario y su re-estampado, y pruebas de extremo a extremo que publican en la Occupancy API dentro del mismo proceso (`WebApplicationFactory<Program>`), incluida una caída de la red.
