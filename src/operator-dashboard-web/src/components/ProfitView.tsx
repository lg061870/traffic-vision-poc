import type { Assumptions } from '../config/operatorSettings'
import { formatColonesShort, formatOne, formatWhole, periodLabels, rowsInPeriod, totals, type Period, type UsageRow } from '../kpis'
import { Gauge } from './Gauge'
import { HelpButton } from './HelpButton'
import { Heatmap } from './Heatmap'
import { HourlyChart } from './HourlyChart'
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

      <section className="panel gauge-panel">
        <HelpButton topic="gauge" />
        <h3>Abordajes por hora-bus</h3>
        <Gauge value={t.ridersPerBusHour} breakEven={t.breakEven} measured={measured} />
      </section>

      <section className="panel hourly-panel">
        <HelpButton topic="hourly" />
        <h3>¿Qué horas pagan su costo? <span className="hint">verde: cubre su costo · rojo: no lo cubre</span></h3>
        <HourlyChart rows={routeRows} assumptions={assumptions} mode="riders" period={period} />
      </section>

      <section className="panel heatmap-panel">
        <HelpButton topic="heatmap" />
        <h3>Ruta × hora <span className="hint">abordajes por hora-bus contra el equilibrio de cada ruta · toque una ruta para filtrar</span></h3>
        <Heatmap rows={rows} routeIds={routeIds} routeNames={routeNames} assumptions={assumptions}
          selectedRoute={selectedRoute} period={period} onSelectRoute={onSelectRoute} />
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
    </div>
  )
}

