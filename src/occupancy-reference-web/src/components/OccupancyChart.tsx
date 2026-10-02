import type { OccupancyHistoryPoint } from '../types/occupancy'
import { formatTime } from '../occupancyDisplay'

const width = 340
const height = 160
const pad = { top: 12, right: 10, bottom: 22, left: 30 }

// Passengers per interval (line) and the interval's peak (shaded band) against capacity.
export function OccupancyChart({ points }: { points: OccupancyHistoryPoint[] }) {
  if (points.length < 2) return <p className="empty">Todavía no hay suficiente historial.</p>

  const capacity = Math.max(...points.map((p) => p.capacity))
  const yMax = Math.max(capacity, ...points.map((p) => p.peakPassengerCount))
  const t0 = Date.parse(points[0].time)
  const t1 = Date.parse(points[points.length - 1].time)
  const x = (time: string) => pad.left + ((Date.parse(time) - t0) / (t1 - t0 || 1)) * (width - pad.left - pad.right)
  const y = (value: number) => pad.top + (1 - value / yMax) * (height - pad.top - pad.bottom)

  const line = points.map((p) => `${x(p.time)},${y(p.passengerCount)}`).join(' ')
  const peakArea = [
    ...points.map((p) => `${x(p.time)},${y(p.peakPassengerCount)}`),
    ...[...points].reverse().map((p) => `${x(p.time)},${y(0)}`),
  ].join(' ')
  const ticks = [0, Math.round(yMax / 2), yMax]
  const timeTicks = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
  const tickAnchors = ['start', 'middle', 'end'] as const

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pasajeros en la última hora">
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="chart-grid" />
          <text x={pad.left - 5} y={y(tick) + 3} textAnchor="end" className="chart-label">
            {tick}
          </text>
        </g>
      ))}
      <line x1={pad.left} x2={width - pad.right} y1={y(capacity)} y2={y(capacity)} className="chart-capacity" />
      <text x={width - pad.right} y={y(capacity) - 3} textAnchor="end" className="chart-label">
        capacidad
      </text>
      <polygon points={peakArea} className="chart-peak" />
      <polyline points={line} className="chart-line" />
      {timeTicks.map((p, i) => (
        <text key={p.time} x={x(p.time)} y={height - 6} textAnchor={tickAnchors[i]} className="chart-label">
          {formatTime(p.time)}
        </text>
      ))}
    </svg>
  )
}
