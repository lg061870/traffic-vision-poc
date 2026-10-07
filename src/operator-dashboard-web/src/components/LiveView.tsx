import type { FeatureCollection } from 'geojson'
import { cameraDemo } from '../config/operatorSettings'
import { sourceDisplay } from '../display'
import { formatPercent, formatWhole, inService } from '../kpis'
import type { SensorSource, VehicleState } from '../types/occupancy'
import { Alerts } from './Alerts'
import { CameraPanel } from './CameraPanel'
import { FleetMap } from './FleetMap'
import { OccupancyBand } from './OccupancyBand'
import { Tile } from './Tile'

interface LiveViewProps {
  /** Buses already filtered to the selected route, if any. */
  vehicles: VehicleState[]
  /** The whole fleet, for the camera bus. */
  allVehicles: VehicleState[]
  routes: FeatureCollection | null
  routeNames: Map<string, string>
  registry: Map<string, string | null>
  selectedRoute: string | null
  /** The bus whose panel is open; the map flies to it. */
  openBusId: string | null
  onOpenBus: (vehicleId: string) => void
}

export function LiveView({ vehicles, allVehicles, routes, routeNames, registry, selectedRoute, openBusId, onOpenBus }: LiveViewProps) {
  const running = vehicles.filter(inService)
  const passengers = running.reduce((sum, v) => sum + (v.occupancy?.passengerCount ?? 0), 0)
  const capacity = running.reduce((sum, v) => sum + (v.occupancy?.capacity ?? 0), 0)
  const silent = vehicles.filter((v) => v.stale).length
  const sources = new Map<SensorSource, number>()
  for (const v of running) if (v.occupancy) sources.set(v.occupancy.source, (sources.get(v.occupancy.source) ?? 0) + 1)
  // The camera tile shows the bus counted by the model, unless a route is selected that it does
  // not run on: then the fullest bus in service on that route.
  const cameraBus = allVehicles.find((v) => v.vehicleId === cameraDemo.vehicleId)
  const shownBus = !selectedRoute || vehicles.some((v) => v.vehicleId === cameraDemo.vehicleId)
    ? cameraBus
    : [...running].sort((a, b) => (b.occupancy?.percent ?? 0) - (a.occupancy?.percent ?? 0))[0] ?? cameraBus
  const shownId = shownBus?.vehicleId ?? cameraDemo.vehicleId
  const countedByCamera = shownId === cameraDemo.vehicleId && cameraBus?.occupancy?.source === 'CABIN_CAMERA'

  return (
    <div className="live">
      <OccupancyBand vehicles={running} />

      <div className="cards">
        <Tile label="Buses en servicio" value={`${running.length} de ${vehicles.length}`}
          hint={`${vehicles.length - running.length - silent} estacionados · ${silent} sin reporte`} help="inService" />
        <Tile label="Pasajeros a bordo" value={formatWhole(passengers)} help="onBoard" />
        <Tile label="Ocupación" value={capacity > 0 ? formatPercent((passengers * 100) / capacity) : '—'} hint="De la capacidad en servicio" help="occupancy" />
        <Tile label="Fuente del conteo" value={`${sources.get('CABIN_CAMERA') ?? 0} con cámara IA`}
          hint={[...sources.entries()].map(([source, count]) => `${sourceDisplay[source]}: ${count}`).join(' · ')} help="source" />
      </div>

      <section className="panel map-panel">
        <FleetMap routes={routes} vehicles={vehicles} routeId={selectedRoute} selectedId={openBusId} zoomToSelected onSelect={onOpenBus} />
      </section>

      <div className="live-side">
        <CameraPanel compact isCameraBus={countedByCamera} occupancy={shownBus?.occupancy ?? null} vehicleId={shownId}
          onOpen={() => onOpenBus(shownId)} />
        <Alerts vehicles={vehicles} routeNames={routeNames} registry={registry} onOpenBus={onOpenBus} />
      </div>
    </div>
  )
}
