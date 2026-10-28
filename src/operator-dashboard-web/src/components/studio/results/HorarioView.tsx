import { useState } from 'react'
import { ViewHeader } from '../ViewHeader'
import { fmtTime, routeById, type RunOutput, type TripDirection } from '../mockRun'
import { routes } from '../studioModel'
import { RouteChips, runSubtitle } from './shared'

export function HorarioView({ output }: { output: RunOutput }) {
  const [routeId, setRouteId] = useState('R142')
  const route = routeById(routeId)
  const trips = output.trips.filter((t) => t.routeId === routeId)
  const from = (d: TripDirection) => (d === 'IDA' ? route.stops[0].name : route.stops[route.stops.length - 1].name)

  return (
    <main className="sv-stage">
      <ViewHeader title="Horario de salidas" subtitle={runSubtitle(output)} />
      <RouteChips value={routeId} onChange={setRouteId} options={routes.filter((r) => r.busCount > 0)} />

      <div className="sv-grid-2" style={{ flex: 1 }}>
        {(['IDA', 'REGRESO'] as TripDirection[]).map((direction) => {
          const list = trips.filter((t) => t.direction === direction).sort((a, b) => a.depart - b.depart)
          const byHour = new Map<number, number[]>()
          list.forEach((t) => {
            const h = Math.floor(t.depart / 60)
            byHour.set(h, [...(byHour.get(h) ?? []), t.depart % 60])
          })
          const gaps = list.slice(1).map((t, i) => t.depart - list[i].depart)
          return (
            <div key={direction} className="sv-card">
              <div className="sv-card-title">
                Salidas desde {from(direction)}
              </div>
              <div className="sv-card-sub">
                {list.length} salidas · primera {fmtTime(list[0]?.depart ?? 0)} · última {fmtTime(list[list.length - 1]?.depart ?? 0)} ·
                intervalo mínimo {Math.min(...gaps)} min
              </div>
              <div className="sv-table-wrap">
                <table className="sv-table sv-timetable">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Minutos de salida</th>
                      <th className="num">Salidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...byHour.entries()].map(([h, minutes]) => (
                      <tr key={h}>
                        <td>
                          <strong>{String(h).padStart(2, '0')}</strong>
                        </td>
                        <td className="sv-minutes">
                          {minutes.map((m, i) => (
                            <span key={i}>{String(m).padStart(2, '0')}</span>
                          ))}
                        </td>
                        <td className="num">{minutes.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
