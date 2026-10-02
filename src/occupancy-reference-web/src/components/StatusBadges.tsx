import type { SensorSource, VehicleState } from '../types/occupancy'
import { sourceDisplay, staleColor, statusDisplay } from '../occupancyDisplay'

export function StatusBadge({ vehicle }: { vehicle: VehicleState }) {
  if (vehicle.stale) return <span className="badge" style={{ background: staleColor }}>Sin reporte</span>
  if (!vehicle.occupancy) return <span className="badge" style={{ background: staleColor }}>Sin datos</span>
  const { label, color } = statusDisplay[vehicle.occupancy.status]
  return <span className="badge" style={{ background: color }}>{label}</span>
}

export function SourceBadge({ source }: { source: SensorSource }) {
  return <span className={`source-badge source-${source.toLowerCase()}`}>{sourceDisplay[source]}</span>
}
