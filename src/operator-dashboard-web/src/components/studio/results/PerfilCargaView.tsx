import { useState } from 'react'
import { ViewHeader } from '../ViewHeader'
import { routeById, type RunOutput, type TripDirection } from '../mockRun'
import { routes } from '../studioModel'
import { RouteChips, runSubtitle, number } from './shared'

const CAPACITY = 80

/** Made-up passengers on board after each stop: builds toward San José on the way in. */
function profile(stops: number, direction: TripDirection, level: number) {
  return Array.from({ length: stops }, (_, i) => {
    const t = direction === 'IDA' ? i / Math.max(1, stops - 1) : 1 - i / Math.max(1, stops - 1)
    const shape = Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.92)
    return i === stops - 1 ? 0 : Math.round(CAPACITY * level * (0.25 + 0.85 * shape))
  })
}

export function PerfilCargaView({ output }: { output: RunOutput }) {
  const [routeId, setRouteId] = useState('R142')
  const route = routeById(routeId)
  const routeTrips = output.trips.filter((t) => t.routeId === routeId)
  const avgLoad = (from: number, to: number) => {
    const list = routeTrips.filter((t) => t.depart >= from && t.depart < to)
    return list.reduce((s, t) => s + t.peakLoad, 0) / Math.max(1, list.length) / 100
  }
  const peakLevel = avgLoad(300, 540)
  const valleyLevel = avgLoad(540, 900)

  return (
    <main className="sv-stage">
      <ViewHeader title="Perfil de carga por parada" subtitle={runSubtitle(output)} />
      <RouteChips value={routeId} onChange={setRouteId} options={routes.filter((r) => r.busCount > 0)} />

      <div className="sv-grid-2" style={{ flex: 1 }}>
        {(['IDA', 'REGRESO'] as TripDirection[]).map((direction) => {
          const peak = profile(route.stops.length, direction, peakLevel)
          const valley = profile(route.stops.length, direction, valleyLevel)
          const max = Math.max(CAPACITY * 1.3, ...peak)
          const stops = direction === 'IDA' ? route.stops : [...route.stops].reverse()
          const peakSeries = direction === 'IDA' ? peak : [...peak].reverse()
          const valleySeries = direction === 'IDA' ? valley : [...valley].reverse()
          const worst = peakSeries.indexOf(Math.max(...peakSeries))
          return (
            <div key={direction} className="sv-card">
              <div className="sv-card-title">
                {direction === 'IDA' ? 'Ida' : 'Regreso'}: {stops[0].name} → {stops[stops.length - 1].name}
              </div>
              <div className="sv-card-sub">
                Punto de carga máxima: <strong>{stops[worst].name}</strong> con {peakSeries[worst]} pasajeros en hora pico (
                {number((peakSeries[worst] / CAPACITY) * 100)} % de capacidad)
              </div>
              <div className="sv-load-chart">
                <span className="sv-load-capacity" style={{ bottom: `${(CAPACITY / max) * 100}%` }}>
                  capacidad {CAPACITY}
                </span>
                {stops.map((s, i) => (
                  <div key={s.id} className="sv-load-col" title={`${s.name}: pico ${peakSeries[i]} · valle ${valleySeries[i]}`}>
                    <span className="sv-load-bar peak" style={{ height: `${(peakSeries[i] / max) * 100}%` }} />
                    <span className="sv-load-bar valley" style={{ height: `${(valleySeries[i] / max) * 100}%` }} />
                    <span className="sv-load-label">{s.name.replace(/^(Parada|Terminal) /, '')}</span>
                  </div>
                ))}
              </div>
              <div className="sv-legend">
                <span>
                  <span className="sv-swatch" style={{ background: '#1d4f86' }} />
                  Hora pico (05–09 h)
                </span>
                <span>
                  <span className="sv-swatch" style={{ background: '#9fb6d0' }} />
                  Valle (09–15 h)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
