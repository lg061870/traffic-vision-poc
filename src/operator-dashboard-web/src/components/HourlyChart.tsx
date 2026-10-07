import type { Assumptions } from '../config/operatorSettings'
import { costaRicaHour, formatOne, groupBy, inPeriod, totals, type Period, type UsageRow } from '../kpis'

const width = 480
const height = 170
const pad = { top: 14, right: 8, bottom: 20, left: 28 }

interface HourlyChartProps {
  rows: UsageRow[]
  assumptions: Assumptions
  /** Riders per bus-hour against break-even, or average load when boardings are unknown. */
  mode: 'riders' | 'occupancy'
  /** Hours outside it are drawn faded. */
  period?: Period
}

// One bar per hour of the day. In riders mode a bar is green when that hour's buses carried
// enough paying riders to cover their cost, red when not; the dashed line is the break-even.
export function HourlyChart({ rows, assumptions, mode, period = 'all' }: HourlyChartProps) {
  const hours = [...groupBy(rows, (row) => costaRicaHour(row.usage.hour)).entries()]
    .map(([hour, hourRows]) => ({ hour, ...totals(hourRows, assumptions) }))
    .filter((hour) => hour.serviceHours > 0.01)
    .sort((a, b) => a.hour - b.hour)
  if (hours.length === 0) return <p className="empty">Todavía no hay horas en servicio hoy.</p>

  // One break-even for the whole chart, at the day's average fare, so bars and line agree.
  const dayBreakEven = totals(rows, assumptions).breakEven
  const value = (h: (typeof hours)[number]) => (mode === 'riders' ? h.ridersPerBusHour : h.averagePercent)
  const line = mode === 'riders' ? dayBreakEven : null
  const yMax = Math.max(mode === 'riders' ? 10 : 100, line ?? 0, ...hours.map(value)) * 1.1
  const first = Math.min(...hours.map((h) => h.hour))
  const last = Math.max(...hours.map((h) => h.hour))
  const slot = (width - pad.left - pad.right) / (last - first + 1)
  const x = (hour: number) => pad.left + (hour - first) * slot
  const y = (v: number) => pad.top + (1 - v / yMax) * (height - pad.top - pad.bottom)
  const ticks = [0, Math.round(yMax / 2), Math.round(yMax / 1.1)]

  return (
    <svg className="chart chart-fill" viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={mode === 'riders' ? 'Abordajes por hora-bus en cada hora del día' : 'Ocupación promedio en cada hora del día'}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="chart-grid" />
          <text x={pad.left - 4} y={y(tick) + 3} textAnchor="end" className="chart-label">{tick}</text>
        </g>
      ))}
      {hours.map((h) => {
        const v = value(h)
        const tone = mode === 'occupancy' ? 'neutral' : v >= dayBreakEven ? 'good' : 'bad'
        return (
          <rect key={h.hour} x={x(h.hour) + slot * 0.15} width={slot * 0.7} y={y(v)} height={y(0) - y(v)} rx={1.5}
            className={`chart-bar chart-bar-${tone} ${inPeriod(h.hour, period) ? '' : 'faded'}`}>
            <title>{`${h.hour}:00 · ${formatOne(v)}${mode === 'riders' ? ' abordajes por hora-bus' : ' % de ocupación'}`}</title>
          </rect>
        )
      })}
      {line !== null && (
        <>
          <line x1={pad.left} x2={width - pad.right} y1={y(line)} y2={y(line)} className="chart-breakeven" />
          <text x={width - pad.right} y={y(line) - 4} textAnchor="end" className="chart-label chart-label-strong">
            equilibrio {formatOne(line)}
          </text>
        </>
      )}
      {hours.filter((h) => h.hour % 2 === 0).map((h) => (
        <text key={h.hour} x={x(h.hour) + slot / 2} y={height - 5} textAnchor="middle" className="chart-label">{h.hour}h</text>
      ))}
    </svg>
  )
}
