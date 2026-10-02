import type { VehicleState } from '../types/occupancy'
import { formatAgo, vehicleColor } from '../occupancyDisplay'
import { SourceBadge, StatusBadge } from './StatusBadges'

interface BusListProps {
  vehicles: VehicleState[]
  selectedId: string | null
  onSelect: (vehicleId: string) => void
  now: number
}

export function BusList({ vehicles, selectedId, onSelect, now }: BusListProps) {
  if (vehicles.length === 0) return <p className="empty">Todavía no hay buses reportando.</p>

  return (
    <ul className="bus-list">
      {vehicles.map((vehicle) => {
        const occupancy = vehicle.occupancy
        return (
          <li key={vehicle.vehicleId}>
            <button
              type="button"
              className={`bus-row${vehicle.vehicleId === selectedId ? ' selected' : ''}${vehicle.stale ? ' stale' : ''}`}
              onClick={() => onSelect(vehicle.vehicleId)}
            >
              <span className="bus-dot" style={{ background: vehicleColor(vehicle) }} />
              <span className="bus-main">
                <span className="bus-plate">{vehicle.vehicleId}</span>
                <span className="bus-meta">
                  <StatusBadge vehicle={vehicle} />
                  {occupancy && <SourceBadge source={occupancy.source} />}
                </span>
              </span>
              <span className="bus-side">
                <span className="bus-count">
                  {occupancy ? (
                    <>
                      {occupancy.passengerCount}
                      <small>/{occupancy.capacity}</small>
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="bus-ago">{formatAgo(vehicle.device.lastSeen, now)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
