import { defaultFare, fares, type Assumptions } from '../config/operatorSettings'
import type { Tab } from '../hooks/useHashRoute'
import { shortName } from '../hooks/useRoutes'
import { formatOne, groupBy, inService, periodLabels, routeOf, totals, type Period, type UsageRow } from '../kpis'
import type { VehicleState } from '../types/occupancy'
import { OccupancyDotMatrix } from './OccupancyDotMatrix'

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
  onOpenAssumptions?: () => void
}

function getBadgeColor(routeId: string): string {
  if (routeId === 'R142') return 'trunk'
  if (routeId.includes('EXP')) return 'express'
  if (routeId.includes('DN')) return 'purple'
  if (routeId.includes('CS')) return 'indigo'
  return 'branch'
}

function getRouteFare(routeId: string): number {
  return fares[routeId] ?? defaultFare
}

export function RouteRail(props: RouteRailProps) {
  const {
    tab,
    routeIds,
    routeNames,
    rows,
    vehicles,
    registry,
    assumptions,
    selectedRoute,
    period,
    onSelectRoute,
    onSelectPeriod,
    onOpenAssumptions,
  } = props

  const byRoute = groupBy(rows, (row) => row.routeId ?? '—')
  const running = vehicles.filter(inService)

  return (
    <aside className="rail-container">
      {/* 1. Header */}
      <div className="rail-header">
        <div>
          <h2 className="rail-title">Ramales & Asignación</h2>
          <p className="rail-sub">{routeIds.length} recorridos activos</p>
        </div>
        {onOpenAssumptions && (
          <button type="button" className="rail-add-btn" onClick={onOpenAssumptions}>
            + Agregar
          </button>
        )}
      </div>

      {/* 2. Scrollable Cards List */}
      <div className="rail-cards-scroll">
        {/* All Fleet Card */}
        <div
          className={`rail-card ${selectedRoute === null ? 'active' : ''}`}
          onClick={() => onSelectRoute(null)}
        >
          <div className="rail-card-top">
            <div className="rail-card-badge-row">
              <span className="route-badge-pill all-fleet">ALL</span>
              <span className="rail-card-name">Toda la flota</span>
            </div>
            {tab === 'profit' ? (
              <span className="rail-card-val-profit">
                {formatOne(totals(rows, assumptions).ridersPerBusHour)}
              </span>
            ) : (
              <span className="rail-card-buses-text">{running.length} buses</span>
            )}
          </div>
          {tab === 'live' && (
            <div className="rail-card-bottom">
              <span className="rail-card-buses-label">Activos en línea</span>
              <div className="rail-card-matrix-val">
                <OccupancyDotMatrix
                  size="sm"
                  percent={
                    running.length > 0
                      ? Math.round(
                          running.reduce((s, b) => s + (b.occupancy?.percent ?? 0), 0) /
                            running.length,
                        )
                      : 0
                  }
                />
                <span className="pct-number">
                  {running.length > 0
                    ? Math.round(
                        running.reduce((s, b) => s + (b.occupancy?.percent ?? 0), 0) /
                          running.length,
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Each Ramal Card */}
        {routeIds.map((routeId) => {
          const t = totals(byRoute.get(routeId) ?? [], assumptions)
          const measured = t.measuredHours > 0
          const routeVehicles = running.filter((v) => routeOf(v, registry) === routeId)
          const busCount = routeVehicles.length
          const avgPercent =
            busCount > 0
              ? Math.round(
                  routeVehicles.reduce((s, b) => s + (b.occupancy?.percent ?? 0), 0) / busCount,
                )
              : 0
          const badgeCode = routeId.replace(/^R/, '')
          const fare = getRouteFare(routeId)

          return (
            <div
              key={routeId}
              className={`rail-card ${selectedRoute === routeId ? 'active' : ''}`}
              onClick={() => onSelectRoute(selectedRoute === routeId ? null : routeId)}
            >
              <div className="rail-card-top">
                <div className="rail-card-badge-row">
                  <span className={`route-badge-pill ${getBadgeColor(routeId)}`}>
                    {badgeCode}
                  </span>
                  <span className="rail-card-name">
                    {shortName(routeNames.get(routeId) ?? routeId)}
                  </span>
                </div>
                <span className="rail-card-fare">₡{fare}</span>
              </div>

              <div className="rail-card-bottom">
                <span className="rail-card-buses">
                  <svg className="mini-bus-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7h8m-8 4h8m-4 4v3m-5-3h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <strong>{busCount}</strong> buses
                </span>

                {tab === 'profit' ? (
                  <span
                    className={`rail-card-val-profit ${
                      measured ? (t.ridersPerBusHour >= t.breakEven ? 'good' : 'bad') : ''
                    }`}
                  >
                    {measured ? `${formatOne(t.ridersPerBusHour)} pax/h` : '—'}
                  </span>
                ) : (
                  <div className="rail-card-matrix-val">
                    <OccupancyDotMatrix size="sm" percent={avgPercent} />
                    <span
                      className={`pct-number ${
                        avgPercent < 40 ? 'tone-green' : avgPercent < 75 ? 'tone-amber' : 'tone-red'
                      }`}
                    >
                      {avgPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Period selector if profit tab */}
      {tab === 'profit' && (
        <div className="rail-period-section">
          <span className="rail-period-title">Franja Horaria</span>
          <div className="segmented-horizontal">
            {(Object.keys(periodLabels) as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                className={period === p ? 'on' : ''}
                onClick={() => onSelectPeriod(p)}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Footer summary */}
      <div className="rail-footer">
        <span>Flota asignada:</span>
        <strong className="font-mono">{running.length} / {vehicles.length} buses</strong>
      </div>
    </aside>
  )
}
