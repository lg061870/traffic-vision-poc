import { useState } from 'react'
import type { Assumptions } from '../config/operatorSettings'
import { formatColonesShort, formatOne, formatWhole, periodLabels, rowsInPeriod, totals, type Period, type UsageRow } from '../kpis'
import { Gauge } from './Gauge'
import { GaugeBreakdownModal } from './GaugeBreakdownModal'
import { HelpButton } from './HelpButton'
import { Heatmap } from './Heatmap'
import { HourlyChart } from './HourlyChart'
import { HourDetailModal } from './HourDetailModal'
import { LoadStack } from './LoadStack'
import { Tile } from './Tile'

interface ProfitViewProps {
  /** Today's rows for the whole fleet; the heatmap and load bars always show every route. */
  rows: UsageRow[]
  /** "hoy", or "ayer" overnight before service starts. */
  dayLabel: string
  routeIds: string[]
  routeNames: Map<string, string>
  assumptions: Assumptions
  selectedRoute: string | null
  period: Period
  onSelectRoute: (routeId: string) => void
}

export function ProfitView({ rows, dayLabel, routeIds, routeNames, assumptions, selectedRoute, period, onSelectRoute }: ProfitViewProps) {
  const [diagnostic, setDiagnostic] = useState<{ hour: number; routeId: string | null } | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  // The cards, gauge and hourly bars follow both filters; the heatmap keeps every route for context.
  const routeRows = selectedRoute ? rows.filter((row) => row.routeId === selectedRoute) : rows
  const scoped = rowsInPeriod(routeRows, period)
  const t = totals(scoped, assumptions)
  const measured = t.measuredHours > 0
  const scope = `${selectedRoute ? routeNames.get(selectedRoute) ?? selectedRoute : 'Toda la flota'} · ${periodLabels[period].toLowerCase()}`

  return (
    <div className="profit">
      <div className="cards">
        <Tile label={`Abordajes ${dayLabel}`} value={measured ? formatWhole(t.boardings) : '—'} hint={`${formatOne(t.measuredHours)} horas-bus · ${scope}`} help="boardings" />
        <Tile label="Ingreso estimado" value={measured ? formatColonesShort(t.revenue) : '—'} hint="Abordajes × tarifa ARESEP" estimate help="revenue" />
        <Tile label="Costo de operación" value={measured ? formatColonesShort(t.cost) : '—'} hint={`${formatColonesShort(assumptions.costPerBusHour)} por hora-bus`} estimate help="cost" />
        <Tile label="Pérdida en horas bajo equilibrio" value={measured ? formatColonesShort(t.loss) : '—'} tone={t.loss > 0 ? 'bad' : 'neutral'}
          hint={measured ? `${formatOne(t.lossHours)} horas-bus no cubrieron su costo` : undefined} estimate help="loss" />
      </div>

      <section
        className="panel gauge-panel gauge-panel-interactive"
        onClick={() => setShowBreakdown(true)}
        title="Haga clic en cualquier parte del reloj o en el número para ver el desglose horario y por ruta"
      >
        <HelpButton topic="gauge" />
        <div className="gauge-title-row">
          <h3>Abordajes por hora-bus</h3>
        </div>
        <Gauge
          value={t.ridersPerBusHour}
          breakEven={t.breakEven}
          measured={measured}
          onClick={() => setShowBreakdown(true)}
        />
      </section>

      <section className="panel hourly-panel">
        <HelpButton topic="hourly" />
        <h3>¿Qué horas pagan su costo? <span className="hint">verde: cubre su costo · rojo: no lo cubre</span></h3>
        <HourlyChart
          rows={routeRows}
          assumptions={assumptions}
          mode="riders"
          period={period}
          selectedRoute={selectedRoute}
          routeNames={routeNames}
          onSelectRoute={onSelectRoute}
          onOpenDiagnostic={(hour) => setDiagnostic({ hour, routeId: selectedRoute })}
        />
      </section>

      <section className="panel heatmap-panel">
        <HelpButton topic="heatmap" />
        <h3>Ruta × hora <span className="hint">toque un cuadro para diagnosticar esa ruta y hora · toque la hora arriba para toda la flota</span></h3>
        <Heatmap
          rows={rows}
          routeIds={routeIds}
          routeNames={routeNames}
          assumptions={assumptions}
          selectedRoute={selectedRoute}
          period={period}
          onSelectRoute={onSelectRoute}
          onOpenDiagnostic={(hour, routeId) => setDiagnostic({ hour, routeId })}
        />
        <ul className="legend">
          <li><i style={{ background: 'var(--heat-bad)' }} />Muy por debajo</li>
          <li><i style={{ background: 'var(--heat-weak)' }} />Debajo del equilibrio</li>
          <li><i style={{ background: 'var(--heat-ok)' }} />Cubre su costo</li>
          <li><i style={{ background: 'var(--heat-good)' }} />Holgado</li>
        </ul>
      </section>

      <section className="panel load-panel">
        <HelpButton topic="load" />
        <h3>Tiempo por nivel de ocupación</h3>
        <LoadStack rows={rowsInPeriod(rows, period)} routeIds={routeIds}
          routeNames={routeNames} selectedRoute={selectedRoute} onSelectRoute={onSelectRoute} />
      </section>

      {/* Shared Diagnostic Modal: accessible from both HourlyChart and Heatmap */}
      {diagnostic !== null && (
        <HourDetailModal
          hour={diagnostic.hour}
          routeId={diagnostic.routeId}
          allRows={rows}
          assumptions={assumptions}
          routeNames={routeNames}
          routeIds={routeIds}
          onChangeRoute={(newRouteId) => setDiagnostic({ hour: diagnostic.hour, routeId: newRouteId })}
          onSelectRoute={(newRouteId) => {
            onSelectRoute(newRouteId)
            setDiagnostic({ hour: diagnostic.hour, routeId: newRouteId })
          }}
          onClose={() => setDiagnostic(null)}
        />
      )}

      {/* Productivity Breakdown Modal: opened by clicking on the Gauge or its numbers */}
      {showBreakdown && (
        <GaugeBreakdownModal
          rows={scoped}
          assumptions={assumptions}
          routeNames={routeNames}
          period={period}
          selectedRoute={selectedRoute}
          dayLabel={dayLabel}
          onClose={() => setShowBreakdown(false)}
          onSelectRoute={(newRouteId) => {
            onSelectRoute(newRouteId)
            setShowBreakdown(false)
          }}
          onOpenDiagnosticHour={(hour) => {
            setShowBreakdown(false)
            setDiagnostic({ hour, routeId: selectedRoute })
          }}
        />
      )}
    </div>
  )
}

