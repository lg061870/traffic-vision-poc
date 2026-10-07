import type { Assumptions } from '../config/operatorSettings'
import type { Tab } from '../hooks/useHashRoute'
import { shortName } from '../hooks/useRoutes'
import { formatOne, groupBy, inService, periodLabels, routeOf, totals, type Period, type UsageRow } from '../kpis'
import type { VehicleState } from '../types/occupancy'

interface RouteRailProps {
  tab: Tab
  routeIds: string[]
  routeNames: Map<string, string>
  rows: UsageRow[]
  vehicles: VehicleState[]
  registry: Map<string, string | null>
  assumptions: Assumptions
  selectedRoute: string | null
  period: Period
  onSelectRoute: (routeId: string | null) => void
  onSelectPeriod: (period: Period) => void
}

// The filter column shared by both tabs. On the profitability tab each route also shows its
// boardings per bus-hour, green when it covers its cost, so the list doubles as the ranking.
export function RouteRail(props: RouteRailProps) {
  const { tab, routeIds, routeNames, rows, vehicles, registry, assumptions, selectedRoute, period, onSelectRoute, onSelectPeriod } = props
  const byRoute = groupBy(rows, (row) => row.routeId ?? '—')
  const running = vehicles.filter(inService)

  return (
    <aside className="rail">
      <section className="panel rail-routes">
        <h3>
          Rutas <span className="hint">{tab === 'profit' ? 'abord. por hora-bus' : 'buses en servicio'}</span>
        </h3>
        <button type="button" className={`rail-item ${selectedRoute === null ? 'on' : ''}`} onClick={() => onSelectRoute(null)}>
          <span>Toda la flota</span>
          <span className="rail-value">{tab === 'live' ? running.length : formatOne(totals(rows, assumptions).ridersPerBusHour)}</span>
        </button>
        {routeIds.map((routeId) => {
          const t = totals(byRoute.get(routeId) ?? [], assumptions)
          const measured = t.measuredHours > 0
          const busCount = running.filter((v) => routeOf(v, registry) === routeId).length
          return (
            <button key={routeId} type="button" className={`rail-item ${selectedRoute === routeId ? 'on' : ''}`}
              onClick={() => onSelectRoute(selectedRoute === routeId ? null : routeId)}>
              <span className="rail-name">{shortName(routeNames.get(routeId) ?? routeId)}</span>
              {tab === 'profit' ? (
                <span className={`rail-value ${measured ? (t.ridersPerBusHour >= t.breakEven ? 'good' : 'bad') : ''}`}>
                  {measured ? formatOne(t.ridersPerBusHour) : '—'}
                </span>
              ) : (
                <span className="rail-value">{busCount}</span>
              )}
            </button>
          )
        })}
      </section>
      {tab === 'profit' && (
        <section className="panel">
          <h3>Franja</h3>
          <div className="segmented">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <button key={p} type="button" className={period === p ? 'on' : ''} onClick={() => onSelectPeriod(p)}>{periodLabels[p]}</button>
            ))}
          </div>
        </section>
      )}
    </aside>
  )
}
