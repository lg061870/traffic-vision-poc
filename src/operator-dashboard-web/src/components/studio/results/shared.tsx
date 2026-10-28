import type { ManagedRoute } from '../../../config/ctpRoutesData'
import { dayLabel, fmtTime, routeById, type RunOutput } from '../mockRun'
import { colones, number } from '../studioModel'

export const runSubtitle = (output: RunOutput) =>
  `${output.run.label} · ${output.run.time} · ${dayLabel(output.run.day)} · ${output.run.fleet} buses · ${number(output.totals.trips)} viajes`

/** Timeline from 04:00 to 24:00, as percentages for absolutely positioned bars. */
export const DAY_START = 240
export const DAY_END = 1440
export const pct = (minute: number) => `${((Math.max(DAY_START, Math.min(DAY_END, minute)) - DAY_START) / (DAY_END - DAY_START)) * 100}%`
export const widthPct = (a: number, b: number) =>
  `${((Math.min(DAY_END, b) - Math.max(DAY_START, a)) / (DAY_END - DAY_START)) * 100}%`

export function TimeAxis() {
  const hours = Array.from({ length: 11 }, (_, i) => 4 + i * 2)
  return (
    <div className="sv-time-axis">
      {hours.map((h) => (
        <span key={h} style={{ left: pct(h * 60) }}>
          {fmtTime(h * 60)}
        </span>
      ))}
    </div>
  )
}

export function RouteChips({
  value,
  onChange,
  options,
  allowAll,
}: {
  value: string
  onChange: (routeId: string) => void
  options: ManagedRoute[]
  allowAll?: boolean
}) {
  return (
    <div className="sv-route-chips">
      {allowAll && (
        <button type="button" className={value === 'ALL' ? 'active' : ''} onClick={() => onChange('ALL')}>
          Toda la flota
        </button>
      )}
      {options.map((r) => (
        <button
          key={r.routeId}
          type="button"
          className={value === r.routeId ? 'active' : ''}
          onClick={() => onChange(r.routeId)}
          style={{ ['--route' as string]: r.color }}
        >
          <i />
          {r.routeId === 'R142' ? 'Ruta 142' : r.name.replace('Ramal ', '')}
        </button>
      ))}
    </div>
  )
}

export const routeColor = (routeId: string) => routeById(routeId).color

export { colones, number }
