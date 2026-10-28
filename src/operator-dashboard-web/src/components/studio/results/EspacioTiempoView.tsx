import { useState } from 'react'
import { ViewHeader } from '../ViewHeader'
import { fmtTime, routeById, stopFractions, type RunOutput } from '../mockRun'
import { routes } from '../studioModel'
import { RouteChips, runSubtitle } from './shared'

const WINDOWS = [
  { label: '05–09 h', from: 300, to: 540 },
  { label: '09–13 h', from: 540, to: 780 },
  { label: '13–17 h', from: 780, to: 1020 },
  { label: '16–20 h', from: 960, to: 1200 },
]

const W = 1000
const H = 420
const LEFT = 190

export function EspacioTiempoView({ output }: { output: RunOutput }) {
  const [routeId, setRouteId] = useState('R142')
  const [win, setWin] = useState(WINDOWS[0])
  const route = routeById(routeId)
  const fractions = stopFractions(route)
  const trips = output.trips.filter((t) => t.routeId === routeId && t.arrive >= win.from && t.depart <= win.to)
  const x = (m: number) => LEFT + ((m - win.from) / (win.to - win.from)) * (W - LEFT - 10)
  const y = (f: number) => 20 + (1 - f) * (H - 50)

  // Departures of the same direction less than 3 minutes apart count as a bunch.
  const sameDir = (d: string) => trips.filter((t) => t.direction === d).sort((a, b) => a.depart - b.depart)
  const bunched = new Set<string>()
  for (const d of ['IDA', 'REGRESO']) {
    const list = sameDir(d)
    list.slice(1).forEach((t, i) => {
      if (t.depart - list[i].depart < 3 || Math.abs(t.arrive - list[i].arrive) < 2) {
        bunched.add(t.id)
        bunched.add(list[i].id)
      }
    })
  }

  return (
    <main className="sv-stage">
      <ViewHeader title="Diagrama espacio-tiempo" subtitle={runSubtitle(output)}>
        <div className="sv-seg">
          {WINDOWS.map((w) => (
            <button key={w.label} type="button" className={win.label === w.label ? 'active' : ''} onClick={() => setWin(w)}>
              {w.label}
            </button>
          ))}
        </div>
      </ViewHeader>
      <RouteChips value={routeId} onChange={setRouteId} options={routes.filter((r) => r.busCount > 0)} />

      <div className="sv-card" style={{ flex: 1 }}>
        <div className="sv-card-title">Cada línea es un viaje</div>
        <div className="sv-card-sub">
          Sube = ida, baja = regreso. Líneas que se juntan = buses pegados ({bunched.size} viajes); huecos grandes = espera larga.
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="sv-svg">
          <defs>
            <clipPath id="sv-st-plot">
              <rect x={LEFT} y={0} width={W - LEFT - 10} height={H - 28} />
            </clipPath>
          </defs>
          {route.stops.map((s, i) => (
            <g key={s.id}>
              <line x1={LEFT} x2={W - 10} y1={y(fractions[i])} y2={y(fractions[i])} stroke="#eef1f4" />
              <text x={LEFT - 6} y={y(fractions[i]) + 3} textAnchor="end" fontSize="9.5" fill="#334155">
                {s.name.length > 30 ? `${s.name.slice(0, 29)}…` : s.name}
              </text>
            </g>
          ))}
          {Array.from({ length: (win.to - win.from) / 30 + 1 }, (_, i) => win.from + i * 30).map((m) => (
            <g key={m}>
              <line x1={x(m)} x2={x(m)} y1={14} y2={H - 28} stroke="#f1f4f7" />
              <text x={x(m)} y={H - 14} textAnchor="middle" fontSize="9.5" fill="#64748b">
                {fmtTime(m)}
              </text>
            </g>
          ))}
          <g clipPath="url(#sv-st-plot)">
          {trips.map((t) => {
            const points = fractions.map((f, i) => {
              const along = t.direction === 'IDA' ? f : 1 - f
              const m = t.depart + along * (t.arrive - t.depart) + i * 0.4
              return `${x(m)},${y(f)}`
            })
            const color = bunched.has(t.id) ? '#c93b3b' : t.peakLoad >= 100 ? '#d97706' : route.color
            return (
              <polyline key={t.id} points={points.join(' ')} fill="none" stroke={color} strokeWidth={bunched.has(t.id) ? 2.2 : 1.4}>
                <title>
                  {t.busId} · {t.direction} {fmtTime(t.depart)}–{fmtTime(t.arrive)} · {t.peakLoad} %
                </title>
              </polyline>
            )
          })}
          </g>
        </svg>
        <div className="sv-legend">
          <span>
            <span className="sv-swatch" style={{ background: route.color }} />
            Viaje normal
          </span>
          <span>
            <span className="sv-swatch" style={{ background: '#d97706' }} />
            Lleno (≥ 100 %)
          </span>
          <span>
            <span className="sv-swatch" style={{ background: '#c93b3b' }} />
            Pelotonamiento
          </span>
        </div>
      </div>
    </main>
  )
}
