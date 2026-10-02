import { getEvents, getHistory } from '../services/occupancyApi'
import { usePolling } from '../hooks/usePolling'
import type { VehicleState } from '../types/occupancy'
import { compassPoint, formatAgo, formatTime } from '../occupancyDisplay'
import { OccupancyChart } from './OccupancyChart'
import { SourceBadge, StatusBadge } from './StatusBadges'

const hourMs = 60 * 60 * 1000
const detailRefreshMs = 15_000
const maxEventsShown = 20

interface BusDetailProps {
  vehicle: VehicleState
  now: number
  onClose: () => void
}

export function BusDetail({ vehicle, now, onClose }: BusDetailProps) {
  const id = vehicle.vehicleId
  const history = usePolling(
    (signal) => {
      const to = new Date()
      return getHistory(id, new Date(to.getTime() - hourMs), to, '1m', signal)
    },
    detailRefreshMs,
    id,
  )
  const events = usePolling((signal) => getEvents(id, new Date(Date.now() - hourMs), signal), detailRefreshMs, id)

  const occupancy = vehicle.occupancy
  const recentEvents = [...(events.data?.events ?? [])]
    .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))
    .slice(0, maxEventsShown)

  return (
    <aside className="detail">
      <header className="detail-header">
        <div>
          <h2>{id}</h2>
          <div className="bus-meta">
            <StatusBadge vehicle={vehicle} />
            {occupancy && <SourceBadge source={occupancy.source} />}
          </div>
        </div>
        <button type="button" className="close" onClick={onClose} aria-label="Cerrar detalle del bus">
          ×
        </button>
      </header>

      <dl className="facts">
        <div>
          <dt>Pasajeros</dt>
          <dd>{occupancy ? `${occupancy.passengerCount} / ${occupancy.capacity} (${occupancy.percent}%)` : '—'}</dd>
        </div>
        <div>
          <dt>Velocidad</dt>
          <dd>
            {vehicle.location?.speedKmh != null ? `${vehicle.location.speedKmh} km/h` : '—'}
            {vehicle.location?.headingDeg != null && ` · ${compassPoint(vehicle.location.headingDeg)}`}
          </dd>
        </div>
        <div>
          <dt>Último reporte</dt>
          <dd>{formatAgo(vehicle.device.lastSeen, now)}</dd>
        </div>
        <div>
          <dt>Equipo</dt>
          <dd>
            {vehicle.device.online ? 'En línea' : 'Sin conexión'}
            {vehicle.device.cameraOnline === false && ' · cámara apagada'}
            {vehicle.device.firmware && ` · ${vehicle.device.firmware}`}
          </dd>
        </div>
      </dl>

      <section>
        <h3>Última hora</h3>
        {history.error && <p className="error">Historial: {history.error}</p>}
        {history.data ? <OccupancyChart points={history.data.points} /> : !history.error && <p className="empty">Cargando…</p>}
        <p className="legend">
          <span className="legend-line" /> pasajeros <span className="legend-peak" /> máximo por minuto
        </p>
      </section>

      <section>
        <h3>Eventos de puerta recientes</h3>
        {events.error && <p className="error">Eventos: {events.error}</p>}
        {events.data && recentEvents.length === 0 && <p className="empty">Sin eventos de puerta en la última hora.</p>}
        {recentEvents.length > 0 && (
          <table className="events">
            <thead>
              <tr>
                <th>Cierre</th>
                <th>Puerta</th>
                <th>Suben</th>
                <th>Bajan</th>
                <th>A bordo</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={`${event.door}-${event.openedAt}`}>
                  <td>{formatTime(event.closedAt)}</td>
                  <td>{event.door}</td>
                  <td className="in">+{event.boardings}</td>
                  <td className="out">−{event.alightings}</td>
                  <td>{event.occupancyAfter ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </aside>
  )
}
