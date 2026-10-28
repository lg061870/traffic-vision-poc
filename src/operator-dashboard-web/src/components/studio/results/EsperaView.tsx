import { useState } from 'react'
import { ViewHeader } from '../ViewHeader'
import { routeById, type RunOutput } from '../mockRun'
import { routes } from '../studioModel'
import { RouteChips, runSubtitle, number } from './shared'

export function EsperaView({ output }: { output: RunOutput }) {
  const [routeId, setRouteId] = useState('R142')
  const route = routeById(routeId)
  const departures = output.trips
    .filter((t) => t.routeId === routeId && t.direction === 'IDA' && t.depart >= 300 && t.depart < 540)
    .map((t) => t.depart)
    .sort((a, b) => a - b)
  const gaps = departures.slice(1).map((d, i) => d - departures[i])
  const planned = gaps.reduce((s, g) => s + g, 0) / Math.max(1, gaps.length)

  // Headways spread further apart the farther the stop is from the terminal (made up).
  const rows = route.stops.slice(0, -1).map((stop, i) => {
    const cv = 0.12 + i * 0.07 + (output.run.fleet < 39 ? 0.08 : 0)
    const actual = planned * (1 + i * 0.02)
    const wait = (actual / 2) * (1 + cv * cv)
    const leftBehind = Math.max(0, Math.round((cv - 0.35) * 120 * (routeId === 'R142' ? 3 : 1)))
    return { stop, planned, actual, cv, wait, leftBehind }
  })
  const histogram = [0, 2, 4, 6, 8, 10, 12, 15, 20, 30].map((edge, i, all) => ({
    label: i === all.length - 1 ? `${edge}+` : `${edge}–${all[i + 1]}`,
    count: gaps.filter((g) => g >= edge && (i === all.length - 1 || g < all[i + 1])).length,
  }))
  const maxCount = Math.max(1, ...histogram.map((h) => h.count))

  return (
    <main className="sv-stage">
      <ViewHeader title="Espera y regularidad" subtitle={`${runSubtitle(output)} · hora pico 05–09 h, sentido ida`} />
      <RouteChips value={routeId} onChange={setRouteId} options={routes.filter((r) => r.busCount > 0)} />

      <div className="sv-grid-main-side" style={{ flex: 1 }}>
        <div className="sv-card">
          <div className="sv-card-title">Por parada</div>
          <div className="sv-card-sub">CV = qué tan disparejos llegan los buses (0 = perfectamente parejos)</div>
          <div className="sv-table-wrap">
            <table className="sv-table">
              <thead>
                <tr>
                  <th>Parada</th>
                  <th className="num">Intervalo programado</th>
                  <th className="num">Intervalo real</th>
                  <th className="num">CV</th>
                  <th className="num">Espera promedio</th>
                  <th className="num">Se quedaron abajo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.stop.id}>
                    <td>{r.stop.name}</td>
                    <td className="num">{number(r.planned, 1)} min</td>
                    <td className="num">{number(r.actual, 1)} min</td>
                    <td className={`num ${r.cv > 0.4 ? 'sv-neg' : ''}`}>{number(r.cv, 2)}</td>
                    <td className={`num ${r.wait > r.planned * 0.6 ? 'sv-neg' : 'sv-pos'}`}>{number(r.wait, 1)} min</td>
                    <td className="num">{r.leftBehind > 0 ? <span className="sv-neg">{r.leftBehind}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sv-card">
          <div className="sv-card-title">Intervalos entre salidas</div>
          <div className="sv-card-sub">Minutos entre un bus y el siguiente en la terminal</div>
          <div className="sv-hist">
            {histogram.map((h) => (
              <div key={h.label} className="sv-hist-row">
                <span>{h.label} min</span>
                <span className="sv-hist-bar">
                  <span style={{ width: `${(h.count / maxCount) * 100}%` }} />
                </span>
                <b>{h.count}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
