import type { Assumptions } from '../config/operatorSettings'
import { shortName } from '../hooks/useRoutes'
import { costaRicaHour, formatOne, groupBy, inPeriod, totals, type Period, type UsageRow } from '../kpis'

interface HeatmapProps {
  rows: UsageRow[]
  routeIds: string[]
  routeNames: Map<string, string>
  assumptions: Assumptions
  selectedRoute: string | null
  period: Period
  onSelectRoute: (routeId: string) => void
}

/** Riders per bus-hour against break-even: deep red well below, light red just below, greens above. */
function cellColor(ratio: number) {
  if (ratio < 0.7) return 'var(--heat-bad)'
  if (ratio < 1) return 'var(--heat-weak)'
  if (ratio < 1.4) return 'var(--heat-ok)'
  return 'var(--heat-good)'
}

// Route × hour: where and when the buses carried enough paying riders to cover their cost.
export function Heatmap({ rows, routeIds, routeNames, assumptions, selectedRoute, period, onSelectRoute }: HeatmapProps) {
  const byRoute = groupBy(rows, (row) => row.routeId ?? '—')
  const hours = [...new Set(rows.filter((row) => row.usage.serviceSeconds > 0).map((row) => costaRicaHour(row.usage.hour)))].sort((a, b) => a - b)
  if (hours.length === 0) return <p className="empty">Todavía no hay horas en servicio hoy.</p>

  return (
    <div className="heatmap" style={{ gridTemplateColumns: `minmax(84px, auto) repeat(${hours.length}, minmax(0, 1fr))`, gridTemplateRows: `auto repeat(${routeIds.length}, minmax(0, 1fr))` }}>
      <span />
      {hours.map((hour) => (
        <span key={hour} className={`heatmap-hour ${inPeriod(hour, period) ? '' : 'dim'}`}>{hour % 2 === 0 ? hour : ''}</span>
      ))}
      {routeIds.map((routeId) => {
        const byHour = groupBy(byRoute.get(routeId) ?? [], (row) => costaRicaHour(row.usage.hour))
        const faded = selectedRoute !== null && selectedRoute !== routeId
        const name = shortName(routeNames.get(routeId) ?? routeId)
        return [
          <button key={`${routeId}-name`} type="button" className={`heatmap-route ${faded ? 'faded' : ''}`} onClick={() => onSelectRoute(routeId)}>
            {name}
          </button>,
          ...hours.map((hour) => {
            const t = totals(byHour.get(hour) ?? [], assumptions)
            const empty = t.measuredHours < 0.05
            const ratio = t.ridersPerBusHour / t.breakEven
            return (
              <button
                key={`${routeId}-${hour}`}
                type="button"
                className={`heatmap-cell ${faded || !inPeriod(hour, period) ? 'faded' : ''}`}
                style={{ background: empty ? 'var(--heat-none)' : cellColor(ratio) }}
                title={empty ? `${name}, ${hour}:00: sin servicio` : `${name}, ${hour}:00: ${formatOne(t.ridersPerBusHour)} abordajes por hora-bus (equilibrio ${formatOne(t.breakEven)})`}
                onClick={() => onSelectRoute(routeId)}
              />
            )
          }),
        ]
      })}
    </div>
  )
}
