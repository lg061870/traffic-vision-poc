# Operator Dashboard Web

Panel para el **operador** de buses (el empresario), no para el pasajero. Responde: ¿qué rutas y qué horas pagan su costo, y cuánto se pierde en las que no? Pensado para la **web en pantalla de laptop**: cada pestaña cabe en una pantalla (1366×768 o más) sin desplazarse. En ventanas más pequeñas se apila en una columna con desplazamiento. Usa **solo los endpoints de lectura** de la [Occupancy API](../Innova.Occupancy.Api/README.md).

| Parte | Qué muestra |
|---|---|
| **Rentabilidad de hoy** (`#/rentabilidad`, primera pestaña) | Abordajes, ingreso estimado, costo y pérdida en horas bajo equilibrio; un medidor de abordajes por hora-bus contra el equilibrio; las horas que pagan su costo; un mapa de calor ruta × hora; y el tiempo de cada ruta por nivel de ocupación |
| **En vivo** (`#/en-vivo`) | Una franja con los buses en servicio por nivel de ocupación, buses en servicio, pasajeros a bordo, ocupación, fuente del conteo, mapa, la cámara a bordo y alertas: saturados, casi vacíos, agrupados (*bunching*) y sin reporte |
| **Columna de rutas** (las dos pestañas) | Filtra todo a una ruta. En Rentabilidad cada ruta muestra sus abordajes por hora-bus, en verde si cubre su costo, así que sirve también de ranking. Abajo, la franja: todo el día, hora pico (6–9 y 16–19) o valle |
| **Detalle del bus** (`?bus=SJB-10662`) | Un panel lateral sobre la pestaña: ocupación ahora, fuente, indicadores del día, cámara a bordo, horas que pagaron su costo y mapa |
| **Supuestos** (botón del encabezado) | Costo por hora-bus y adultos mayores editables, tarifas y fórmulas |

Todo lo que está en pantalla queda en la URL (`#/rentabilidad?ruta=R142-01&franja=valle`), así que un enlace abre exactamente esa vista.

Entre la medianoche y las 5:00 todavía no hay servicio, así que la pestaña muestra el día anterior y dice **"Rentabilidad de ayer"**. La API, si arranca de madrugada, simula ese día anterior para tenerlo (`MockFleet:BackfillFrom`).

## Cámara a bordo

El panel reproduce en bucle un clip ya analizado por el modelo de visión, con las cajas reales del modelo encima. **No es video en vivo**, y el panel lo dice. En el bus `SJB-10662` el conteo sale de esa misma cámara: la OnboardComputerApp, con el perfil `camara-grabada`, envía a la API las detecciones del mismo clip. Los dos usan el mismo reloj (hora Unix mod duración del clip), así que las cajas en pantalla y el número que recibe la API corresponden al mismo momento. Todos los demás buses muestran la misma grabación, cada uno empezando en un punto distinto (calculado de su placa) para que no se vean iguales; su ocupación sigue siendo la del simulador. En **En vivo**, la cámara muestra `SJB-10662`, o el bus más lleno de la ruta elegida si `SJB-10662` no la recorre.

El video y sus resultados (`data/demo`) no están en Git. `npm run dev` y `npm run build` los copian a `public/demo` (también fuera de Git). Si no están, el panel lo indica y el resto del panel funciona.

## Cifras en colones

Las tarifas (ARESEP), el costo por hora-bus estimado, la proporción de adultos mayores y los umbrales de alerta están en `src/config/operatorSettings.ts`. Su origen y cómo se calcularon están en [docs/supuestos-dashboard-operador.md](../../docs/supuestos-dashboard-operador.md); hay que actualizar los dos juntos. Las fórmulas están en `src/kpis.ts`.

En **Supuestos** se pueden escribir el costo por hora-bus y el porcentaje de adultos mayores del operador. Los valores se guardan solo en ese navegador; el pie de página indica si se usan los estimados o los ingresados.

Las horas de un bus que cuenta solo con la cámara (sin contador de puertas) no entran en el ingreso ni en la pérdida: se sabe cuántos van a bordo, pero no cuántos abordaron.

## Endpoints

| Endpoint | Frecuencia |
|---|---|
| `GET /api/v1/vehicles` | cada 5 s |
| `GET /api/v1/fleet/hourly` | cada 60 s |

Las líneas de ruta y sus nombres salen de `data/routes/coronado-routes-osm.geojson`, como en el mapa: la API no sirve rutas.

## Ejecutar

```powershell
dotnet run --project src/Innova.Occupancy.Api
dotnet run --project src/Innova.OnboardComputer.App --launch-profile camara-grabada
cd src/operator-dashboard-web
npm install
npm run dev
```

Abra `http://localhost:5175`. Vite redirige `/api` a `http://localhost:5189`; `API_URL` cambia el destino. Sin la OnboardComputerApp todo funciona, pero `SJB-10662` vuelve a ser simulado.

Al arrancar, la API simula el día desde las 5:00 (`MockFleet:BackfillFrom`), así que los indicadores ya tienen datos. Esa simulación solo alimenta `/fleet/hourly`; `/history` y `/events` no cambian.
