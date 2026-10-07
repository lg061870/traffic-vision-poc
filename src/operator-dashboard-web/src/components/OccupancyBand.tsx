import { statusDisplay, statusOrder } from '../display'
import type { OccupancyStatus, VehicleState } from '../types/occupancy'
import { HelpButton } from './HelpButton'

// The API's GTFS-Realtime levels with the thresholds configured in its appsettings.json.
const ranges: Record<OccupancyStatus, string> = {
  EMPTY: '0 pasajeros',
  MANY_SEATS_AVAILABLE: '< 50 %',
  FEW_SEATS_AVAILABLE: '50–79 %',
  STANDING_ROOM_ONLY: '80–94 %',
  CRUSHED_STANDING_ROOM_ONLY: '95–99 %',
  FULL: '≥ 100 %',
}

const darkText = new Set<OccupancyStatus>(['EMPTY', 'MANY_SEATS_AVAILABLE', 'FEW_SEATS_AVAILABLE'])

// How many buses in service are at each occupancy level right now, colored like the map icons.
export function OccupancyBand({ vehicles }: { vehicles: VehicleState[] }) {
  return (
    <div className="band" role="list" aria-label="Buses en servicio por nivel de ocupación">
      <HelpButton topic="band" />
      {statusOrder.map((status) => (
        <div key={status} role="listitem" className={`band-segment ${darkText.has(status) ? 'dark-text' : ''}`}
          style={{ background: statusDisplay[status].color }}>
          <strong>{vehicles.filter((v) => v.occupancy?.status === status).length}</strong>
          <span>{statusDisplay[status].label}</span>
          <small>{ranges[status]}</small>
        </div>
      ))}
    </div>
  )
}
