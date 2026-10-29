import { useState } from 'react'
import { ViewHeader } from './ViewHeader'
import { colones, number, routes } from './studioModel'

const isTrunk = (r: (typeof routes)[number]) => r.isTrunk ?? r.routeId === 'R142'

interface RutasViewProps {
  view: 'diagrama' | 'tabla'
  onEdit: (message: string) => void
  /** Route bus counts are not part of the Simbook yet, so nothing marks the results out of date. */
  onParamsChange?: () => void
}

export function RutasView({ view, onEdit, onParamsChange }: RutasViewProps) {
  const [busCounts, setBusCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(routes.map((r) => [r.routeId, r.busCount])),
  )
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(routes[0].routeId)

  const totalKm = routes.reduce((sum, r) => sum + r.km, 0)
  const totalBuses = Object.values(busCounts).reduce((sum, n) => sum + n, 0)
  const visible = routes.filter(
    (r) =>
      r.name.toLowerCase().includes(filter.toLowerCase()) ||
      r.stops.some((s) => s.name.toLowerCase().includes(filter.toLowerCase())),
  )
  const setBuses = (routeId: string, n: number) => {
    setBusCounts((prev) => ({ ...prev, [routeId]: Math.max(0, n) }))
    onParamsChange?.()
  }

  return (
    <main className="sv-stage">
      <ViewHeader title="Rutas y Ramales" subtitle="Acuerdo CTP-DT-DAC-INF-0557-2023 · Regulación tarifaria ARESEP RE-0115-IT-2026">
        <input className="sv-search" placeholder="Filtrar ramal o parada…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </ViewHeader>

      <div className="sv-kpis">
        <div className="sv-kpi">
          <div className="sv-kpi-label">Rutas oficiales</div>
          <div className="sv-kpi-value">
            {routes.length} / {routes.length}
          </div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Flota asignada</div>
          <div className={`sv-kpi-value ${totalBuses === 39 ? '' : 'bad'}`}>{totalBuses} / 39</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Red total</div>
          <div className="sv-kpi-value">{number(totalKm, 1)} km</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Tarifas ARESEP</div>
          <div className="sv-kpi-value">₡400 / ₡460</div>
        </div>
      </div>

      {view === 'diagrama' ? (
        <div className="sv-card sv-route-list">
          <div className="sv-route-legend">
            <span>Ramal y flota asignada</span>
            <span>Secuencia de paradas</span>
            <span className="sv-mini-legend">
              <i style={{ background: '#ef4444' }} />Terminal Coronado <i style={{ background: '#10b981' }} />Origen{' '}
              <i style={{ background: '#f59e0b' }} />Destino
            </span>
          </div>
          {visible.map((r) => (
            <div key={r.routeId} className="sv-route-row">
              <div className="sv-route-info">
                <div className="sv-route-name">
                  <span className="sv-route-code" style={{ color: r.color, borderColor: r.color }}>
                    {r.routeId}
                  </span>
                  <strong title={r.name}>{r.name}</strong>
                </div>
                <div className="sv-route-meta">
                  <span className="sv-stepper">
                    <button type="button" onClick={() => setBuses(r.routeId, busCounts[r.routeId] - 1)}>
                      −
                    </button>
                    <b>{busCounts[r.routeId]}</b>
                    <button type="button" onClick={() => setBuses(r.routeId, busCounts[r.routeId] + 1)}>
                      +
                    </button>
                  </span>
                  <span>buses</span>
                  <span className="sv-pill good">{colones(r.fare)}</span>
                  <span className="sv-pill neutral">{number(r.km, 2)} km</span>
                  <span className="sv-pill neutral">{r.stops.length} paradas</span>
                </div>
              </div>
              <div className="sv-route-strip" style={{ ['--route' as string]: r.color }}>
                <span className="sv-route-line" />
                {r.stops.map((stop, i) => {
                  const terminalCoronado = stop.name.includes('Terminal Central')
                  const origin = i === 0 && !terminalCoronado
                  const destination = i === r.stops.length - 1 && !terminalCoronado
                  return (
                    <div key={stop.id} className="sv-route-stop" title={stop.name}>
                      <span className={`sv-route-num ${terminalCoronado ? 'hub' : ''}`}>
                        {i + 1}
                        {(terminalCoronado || origin || destination) && (
                          <i style={{ background: terminalCoronado ? '#ef4444' : origin ? '#10b981' : '#f59e0b' }} />
                        )}
                      </span>
                      <span className="sv-route-stop-name">{stop.name}</span>
                    </div>
                  )
                })}
              </div>
              <button type="button" className="sv-btn teal" onClick={() => onEdit(`Editar paradas de ${r.name} (maqueta)`)}>
                ✎ Editar paradas
              </button>
            </div>
          ))}
        </div>
      ) : (
        <RouteTable selectedId={selectedId} onSelect={setSelectedId} busCounts={busCounts} />
      )}
    </main>
  )
}

function RouteTable({
  selectedId,
  onSelect,
  busCounts,
}: {
  selectedId: string
  onSelect: (id: string) => void
  busCounts: Record<string, number>
}) {
  const selected = routes.find((r) => r.routeId === selectedId) ?? routes[0]
  return (
    <div className="sv-grid-main-side">
      <div className="sv-card">
        <div className="sv-card-title">Red de la concesión</div>
        <div className="sv-card-sub">Seleccione una ruta para ver sus paradas.</div>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th className="num">Km</th>
                <th className="num">Paradas</th>
                <th className="num">Buses</th>
                <th className="num">Tarifa</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.routeId} className={`clickable ${r.routeId === selectedId ? 'selected' : ''}`} onClick={() => onSelect(r.routeId)}>
                  <td>
                    <span className="sv-swatch" style={{ background: r.color }} />
                    {r.routeId}
                  </td>
                  <td>{r.name}</td>
                  <td>
                    <span className={`sv-pill ${isTrunk(r) ? 'good' : 'neutral'}`}>{isTrunk(r) ? 'Troncal' : 'Ramal'}</span>
                  </td>
                  <td className="num">{number(r.km, 2)}</td>
                  <td className="num">{r.stops.length}</td>
                  <td className="num">{busCounts[r.routeId]}</td>
                  <td className="num">{colones(r.fare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sv-card">
        <div className="sv-card-title">
          <span className="sv-swatch" style={{ background: selected.color }} />
          {selected.name}
        </div>
        <div className="sv-card-sub">
          {selected.routeId} · {number(selected.km, 2)} km · {busCounts[selected.routeId]} buses · {colones(selected.fare)}
        </div>
        <div className="sv-stops" style={{ color: selected.color }}>
          {selected.stops.map((stop, i) => (
            <div key={stop.id} className="sv-stop">
              <span className="sv-stop-line" style={{ top: i === 0 ? '50%' : 0, bottom: i === selected.stops.length - 1 ? '50%' : 0 }} />
              <span className="sv-stop-dot" />
              <span>{stop.name}</span>
              <span className="sv-stop-dwell">{stop.dwellSec ? `${stop.dwellSec} s` : ''}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
