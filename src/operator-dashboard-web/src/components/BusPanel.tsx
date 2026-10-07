import { useEffect } from 'react'
import type { FeatureCollection } from 'geojson'
import { cameraDemo, sourcesWithBoardings, type Assumptions } from '../config/operatorSettings'
import { formatAgo, sourceDisplay, statusDisplay } from '../display'
import { shortName } from '../hooks/useRoutes'
import { formatColonesShort, formatOne, formatWhole, totals, type UsageRow } from '../kpis'
import type { VehicleState } from '../types/occupancy'
import { CameraPanel } from './CameraPanel'
import { FleetMap } from './FleetMap'
import { HelpButton } from './HelpButton'
import { HourlyChart } from './HourlyChart'
import { Tile } from './Tile'

interface BusPanelProps {
  vehicleId: string
  vehicle: VehicleState | undefined
  routeId: string | null
  routeName: string | null
  rows: UsageRow[]
  routes: FeatureCollection | null
  assumptions: Assumptions
  now: number
  onClose: () => void
}

// One bus, in a panel over the current tab so the owner never loses the overview.
export function BusPanel({ vehicleId, vehicle, routeId, routeName, rows, routes, assumptions, now, onClose }: BusPanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const busRows = rows.filter((row) => row.vehicleId === vehicleId)
  const t = totals(busRows, assumptions)
  const measured = t.measuredHours > 0
  const occupancy = vehicle?.occupancy ?? null
  const live = vehicle && !vehicle.stale
  const countsBoardings = occupancy ? sourcesWithBoardings.has(occupancy.source) : true

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label={`Bus ${vehicleId}`} onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <h2>Bus {vehicleId}</h2>
            <p className="subtitle">{routeId ? shortName(routeName ?? routeId) : 'Sin ruta asignada'}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        {!vehicle && <p className="empty">Este bus no ha reportado.</p>}

        {vehicle && (
          <div className="cards cards-2">
            <Tile label="Ocupación ahora" value={occupancy && live ? `${occupancy.passengerCount} / ${occupancy.capacity}` : '—'}
              hint={occupancy && live ? `${occupancy.percent} % · ${statusDisplay[occupancy.status].label}` : 'Sin dato actual'} help="busNow" />
            <Tile label="Fuente del conteo" value={occupancy ? sourceDisplay[occupancy.source] : '—'}
              hint={`Último reporte ${formatAgo(vehicle.device.lastSeen, now)}`} help="source" />
            <Tile label="Abordajes por hora-bus" value={measured ? formatOne(t.ridersPerBusHour) : '—'}
              tone={measured ? (t.ridersPerBusHour >= t.breakEven ? 'good' : 'bad') : 'neutral'} hint={`Equilibrio ${formatOne(t.breakEven)}`} estimate help="gauge" />
            <Tile label="Abordajes hoy" value={measured ? formatWhole(t.boardings) : '—'}
              hint={measured ? `Ingreso ${formatColonesShort(t.revenue)} · pérdida ${formatColonesShort(t.loss)}` : undefined} estimate help="boardings" />
          </div>
        )}

        {!countsBoardings && (
          <p className="note">
            Este bus cuenta pasajeros con la cámara de cabina y no tiene contador de puertas: sabemos cuántos van a bordo, pero no
            cuántos abordaron. Las horas medidas solo con la cámara no entran en el ingreso ni en la pérdida.
          </p>
        )}

        {vehicle && (
          <CameraPanel isCameraBus={vehicleId === cameraDemo.vehicleId && occupancy?.source === 'CABIN_CAMERA'} occupancy={occupancy}
            vehicleId={vehicleId} />
        )}

        <section className="panel drawer-chart">
          <HelpButton topic="hourly" />
          <h3>{measured ? '¿Qué horas pagaron su costo?' : 'Ocupación por hora'}</h3>
          <HourlyChart rows={busRows} assumptions={assumptions} mode={measured ? 'riders' : 'occupancy'} />
        </section>

        {vehicle?.location && (
          <section className="panel map-panel drawer-map">
            <FleetMap routes={routes} vehicles={[vehicle]} routeId={routeId} selectedId={vehicleId} follow onSelect={() => undefined} />
          </section>
        )}
      </aside>
    </div>
  )
}
