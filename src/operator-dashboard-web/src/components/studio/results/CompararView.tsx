import { useState } from 'react'
import { ViewHeader } from '../ViewHeader'
import { dayLabel, runOutput, type SimRun } from '../mockRun'
import { colones, number } from './shared'

interface Metric {
  label: string
  value: (o: ReturnType<typeof runOutput>) => number
  format: (v: number) => string
  /** Whether a higher value is better. */
  higherIsBetter: boolean
}

const METRICS: Metric[] = [
  { label: 'Margen del día', value: (o) => o.totals.margin, format: colones, higherIsBetter: true },
  { label: 'Ingresos', value: (o) => o.totals.revenue, format: colones, higherIsBetter: true },
  { label: 'Costos', value: (o) => o.totals.cost, format: colones, higherIsBetter: false },
  { label: 'Pasajeros', value: (o) => o.totals.passengers, format: (v) => number(v), higherIsBetter: true },
  { label: 'Viajes', value: (o) => o.totals.trips, format: (v) => number(v), higherIsBetter: true },
  { label: 'Buses usados', value: (o) => o.blocks.length, format: (v) => number(v), higherIsBetter: false },
  { label: 'Horas-bus', value: (o) => o.totals.busHours, format: (v) => number(v), higherIsBetter: false },
  { label: 'Kilómetros', value: (o) => o.totals.busKm, format: (v) => `${number(v)} km`, higherIsBetter: false },
  { label: 'Diésel', value: (o) => o.totals.dieselLiters, format: (v) => `${number(v)} L`, higherIsBetter: false },
  { label: 'Choferes', value: (o) => o.totals.drivers, format: (v) => number(v), higherIsBetter: false },
  { label: 'Espera promedio', value: (o) => o.totals.avgWaitMin, format: (v) => `${number(v, 1)} min`, higherIsBetter: false },
  { label: 'Viajes llenos', value: (o) => o.totals.crowdedTrips, format: (v) => number(v), higherIsBetter: false },
]

export function CompararView({ runs, current }: { runs: SimRun[]; current: SimRun }) {
  const [aId, setAId] = useState((runs[runs.length - 2] ?? runs[0]).id)
  const [bId, setBId] = useState(current.id)
  const a = runOutput(runs.find((r) => r.id === aId) ?? runs[0])
  const b = runOutput(runs.find((r) => r.id === bId) ?? current)

  const select = (value: number, onChange: (id: number) => void) => (
    <select className="sv-select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {runs.map((r) => (
        <option key={r.id} value={r.id}>
          {r.label} · {r.time} · {dayLabel(r.day)} · {r.fleet} buses
        </option>
      ))}
    </select>
  )

  return (
    <main className="sv-stage">
      <ViewHeader title="Comparar Simsheets" subtitle="La Simsheet B contra la Simsheet A">
        <span className="sv-muted">A</span>
        {select(aId, setAId)}
        <span className="sv-muted">B</span>
        {select(bId, setBId)}
      </ViewHeader>

      <div className="sv-card" style={{ flex: 1 }}>
        <table className="sv-table sv-compare">
          <thead>
            <tr>
              <th>Indicador</th>
              <th className="num">A · {a.run.label}</th>
              <th className="num">B · {b.run.label}</th>
              <th className="num">Diferencia</th>
              <th style={{ width: '30%' }} />
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const va = m.value(a)
              const vb = m.value(b)
              const diff = vb - va
              const rel = va !== 0 ? diff / Math.abs(va) : 0
              const better = diff === 0 ? null : (diff > 0) === m.higherIsBetter
              return (
                <tr key={m.label}>
                  <td>
                    <strong>{m.label}</strong>
                  </td>
                  <td className="num">{m.format(va)}</td>
                  <td className="num">{m.format(vb)}</td>
                  <td className={`num ${better === null ? '' : better ? 'sv-pos' : 'sv-neg'}`}>
                    {diff === 0 ? '=' : `${diff > 0 ? '▲' : '▼'} ${m.format(Math.abs(diff))} (${number(rel * 100, 1)} %)`}
                  </td>
                  <td>
                    <div className="sv-diverge">
                      <span
                        style={{
                          left: rel >= 0 ? '50%' : `${50 - Math.min(50, Math.abs(rel) * 100)}%`,
                          width: `${Math.min(50, Math.abs(rel) * 100)}%`,
                          background: better === null ? '#cbd5e1' : better ? '#3f9142' : '#c93b3b',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
