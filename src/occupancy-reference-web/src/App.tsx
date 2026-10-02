import { useMemo, useState } from 'react'
import { getVehicles } from './services/occupancyApi'
import { useNow, usePolling } from './hooks/usePolling'
import type { OccupancyStatus } from './types/occupancy'
import { staleColor, statusDisplay } from './occupancyDisplay'
import { FleetMap } from './components/FleetMap'
import { BusList } from './components/BusList'
import { BusDetail } from './components/BusDetail'

const vehiclesRefreshMs = 5_000

export function App() {
  const fleet = usePolling(getVehicles, vehiclesRefreshMs)
  const now = useNow()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [filter, setFilter] = useState('')

  // Fullest buses first; stale ones at the bottom.
  const vehicles = useMemo(
    () =>
      [...(fleet.data?.vehicles ?? [])].sort(
        (a, b) =>
          Number(a.stale) - Number(b.stale) ||
          (b.occupancy?.percent ?? -1) - (a.occupancy?.percent ?? -1) ||
          a.vehicleId.localeCompare(b.vehicleId),
      ),
    [fleet.data],
  )
  const listed = vehicles.filter((v) => v.vehicleId.includes(filter.trim().toUpperCase()))
  const selected = vehicles.find((v) => v.vehicleId === selectedId) ?? null
  const staleCount = vehicles.filter((v) => v.stale).length

  return (
    <div className="app">
      <header className="topbar">
        <h1>Ocupación de buses</h1>
        <div className="legend-bar">
          {(Object.keys(statusDisplay) as OccupancyStatus[]).map((status) => (
            <span key={status}>
              <i style={{ background: statusDisplay[status].color }} />
              {statusDisplay[status].label}
            </span>
          ))}
          <span>
            <i style={{ background: staleColor }} />
            Sin reporte
          </span>
        </div>
        <div className={`feed${fleet.error ? ' feed-error' : ''}`}>
          {fleet.error
            ? `No hay conexión con la API: ${fleet.error}`
            : fleet.updatedAt
              ? `${vehicles.length} buses · ${staleCount} sin reporte · actualizado hace ${Math.round((now - fleet.updatedAt.getTime()) / 1000)} s`
              : 'Conectando…'}
        </div>
      </header>

      <main className={`layout${selected ? ' with-detail' : ''}`}>
        <section className="sidebar">
          <input
            className="search"
            type="search"
            placeholder="Filtrar por placa"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          {fleet.data ? (
            <BusList
              vehicles={listed}
              selectedId={selectedId}
              onSelect={(vehicleId) => {
                setSelectedId(vehicleId)
                setFocusRequest((n) => n + 1)
              }}
              now={now}
            />
          ) : (
            <p className="empty">{fleet.error ? 'Esperando la Occupancy API…' : 'Cargando buses…'}</p>
          )}
        </section>

        <section className="map-pane">
          <FleetMap vehicles={vehicles} selectedId={selectedId} onSelect={setSelectedId} focusRequest={focusRequest} />
        </section>

        {selected && <BusDetail vehicle={selected} now={now} onClose={() => setSelectedId(null)} />}
      </main>
    </div>
  )
}
