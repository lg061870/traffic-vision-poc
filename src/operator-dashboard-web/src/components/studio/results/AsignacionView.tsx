import { useState } from 'react'
import { ViewHeader } from '../ViewHeader'
import { fmtTime, type RunOutput } from '../mockRun'
import { routes } from '../studioModel'
import { pct, RouteChips, routeColor, runSubtitle, TimeAxis, widthPct, number } from './shared'

export function AsignacionView({ output }: { output: RunOutput }) {
  const [routeId, setRouteId] = useState('ALL')
  const blocks = output.blocks
    .filter((b) => routeId === 'ALL' || b.routeId === routeId)
    .sort((a, b) => a.routeId.localeCompare(b.routeId) || a.pullOut - b.pullOut)

  // Buses driving a trip, every 15 minutes.
  const samples = Array.from({ length: 80 }, (_, i) => 240 + i * 15)
  const inService = samples.map((m) => output.blocks.filter((b) => b.trips.some((t) => t.depart <= m && t.arrive >= m)).length)
  const peak = Math.max(1, ...inService)
  const idleMidday = output.blocks.filter((b) => !b.trips.some((t) => t.depart < 780 && t.arrive > 600)).length

  return (
    <main className="sv-stage">
      <ViewHeader title="Asignación de buses" subtitle={runSubtitle(output)} />

      <div className="sv-kpis">
        <div className="sv-kpi">
          <div className="sv-kpi-label">Buses usados</div>
          <div className="sv-kpi-value">{output.blocks.length}</div>
          <div className="sv-kpi-note">de {output.run.fleet} disponibles</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Máximo simultáneo</div>
          <div className="sv-kpi-value">{output.totals.maxBuses}</div>
          <div className="sv-kpi-note">en la hora más cargada</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Sin viajes 10:00–13:00</div>
          <div className="sv-kpi-value bad">{idleMidday}</div>
          <div className="sv-kpi-note">buses que podrían quedarse en el plantel</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Horas-bus</div>
          <div className="sv-kpi-value">{number(output.totals.busHours)}</div>
          <div className="sv-kpi-note">de salida a regreso al plantel</div>
        </div>
      </div>

      <div className="sv-card">
        <div className="sv-card-title">Buses en viaje</div>
        <div className="sv-gantt-area">
          <div className="sv-area-chart">
            {inService.map((n, i) => (
              <span key={i} style={{ height: `${(n / peak) * 100}%` }} title={`${fmtTime(samples[i])}: ${n} buses`} />
            ))}
          </div>
          <TimeAxis />
        </div>
      </div>

      <div className="sv-card" style={{ flex: 1 }}>
        <div className="sv-title-row">
          <div>
            <div className="sv-card-title">Un renglón por bus</div>
            <div className="sv-card-sub">Cada barra es un viaje; tono claro = regreso; gris = salida y regreso al plantel</div>
          </div>
          <RouteChips value={routeId} onChange={setRouteId} options={routes.filter((r) => r.busCount > 0)} allowAll />
        </div>
        <div className="sv-gantt">
          {blocks.map((b) => (
            <div key={b.busId} className="sv-gantt-row">
              <span className="sv-gantt-label">
                <i style={{ background: routeColor(b.routeId) }} />
                {b.busId}
              </span>
              <div className="sv-gantt-track">
                <span className="sv-gantt-deadhead" style={{ left: pct(b.pullOut), width: widthPct(b.pullOut, b.pullIn) }} />
                {b.trips.map((t) => (
                  <span
                    key={t.id}
                    className="sv-gantt-bar"
                    style={{
                      left: pct(t.depart),
                      width: widthPct(t.depart, t.arrive),
                      background: routeColor(t.routeId),
                      opacity: t.direction === 'IDA' ? 1 : 0.55,
                    }}
                    title={`${b.busId} · ${t.direction} ${fmtTime(t.depart)}–${fmtTime(t.arrive)} · ${t.peakLoad} % carga`}
                  />
                ))}
              </div>
            </div>
          ))}
          <TimeAxis />
        </div>
      </div>
    </main>
  )
}
