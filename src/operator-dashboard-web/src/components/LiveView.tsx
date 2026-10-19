import { useMemo, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { cameraDemo } from '../config/operatorSettings'
import { shortName } from '../hooks/useRoutes'
import { inService, routeOf } from '../kpis'
import type { VehicleState } from '../types/occupancy'
import { FleetMap } from './FleetMap'
import { OccupancyDotMatrix } from './OccupancyDotMatrix'

interface LiveViewProps {
  /** Buses already filtered to the selected route, if any. */
  vehicles: VehicleState[]
  /** The whole fleet, for the camera bus. */
  allVehicles: VehicleState[]
  routes: FeatureCollection | null
  routeNames: Map<string, string>
  registry: Map<string, string | null>
  selectedRoute: string | null
  /** The bus whose panel is open; the map flies to it. */
  openBusId: string | null
  onOpenBus: (vehicleId: string) => void
}

export function LiveView({
  vehicles,
  allVehicles,
  routes,
  routeNames,
  registry,
  selectedRoute,
  openBusId,
  onOpenBus,
}: LiveViewProps) {
  const [showStops, setShowStops] = useState(true)
  const running = useMemo(() => vehicles.filter(inService), [vehicles])

  // If no bus explicitly selected, default to the camera demo bus SJB-2267 or the first running bus
  const activeVehicleId = useMemo(() => {
    if (openBusId) return openBusId
    const cameraBus = allVehicles.find((v) => v.vehicleId === cameraDemo.vehicleId)
    if (cameraBus && (!selectedRoute || routeOf(cameraBus, registry) === selectedRoute)) {
      return cameraDemo.vehicleId
    }
    return running[0]?.vehicleId ?? cameraDemo.vehicleId
  }, [openBusId, allVehicles, selectedRoute, registry, running])

  const activeVehicle = useMemo(
    () => allVehicles.find((v) => v.vehicleId === activeVehicleId),
    [allVehicles, activeVehicleId],
  )

  const activeRouteId = activeVehicle
    ? routeOf(activeVehicle, registry) ?? selectedRoute
    : selectedRoute

  const activeRouteName = activeRouteId
    ? routeNames.get(activeRouteId) ?? activeRouteId
    : 'Troncal 142'

  const selectedRouteLabel = selectedRoute
    ? shortName(routeNames.get(selectedRoute) ?? selectedRoute)
    : 'Troncal 142'

  return (
    <div className="live-command-center">
      {/* ================= CENTER MAP STAGE ================= */}
      <div className="map-stage-container">
        {/* Floating Tool Buttons */}
        <div className="map-floating-tools">
          <button
            type="button"
            className={`tool-btn ${showStops ? 'tool-btn-active' : ''}`}
            title={showStops ? 'Ocultar paradas CTP en el mapa' : 'Mostrar paradas CTP en el mapa'}
            onClick={() => setShowStops((v) => !v)}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>🚏</span>
          </button>
          <button type="button" className="tool-btn" title="Centrar mapa en la ruta">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button type="button" className="tool-btn" title="Capas de tráfico">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </button>
        </div>

        {/* The Leaflet Fleet Map */}
        <div className="map-embed-wrapper">
          <FleetMap
            routes={routes}
            vehicles={vehicles}
            routeId={selectedRoute}
            selectedId={activeVehicleId}
            zoomToSelected
            showStops={showStops}
            onSelect={onOpenBus}
          />
        </div>

        {/* Bottom Unidades en Ruta Strip (Matching Image 2) */}
        <div className="map-bottom-strip">
          <div className="bottom-strip-left">
            <span className="bottom-strip-label">UNIDADES EN RUTA:</span>
            <div className="bottom-strip-chips">
              {running.slice(0, 5).map((bus) => {
                const isSelected = bus.vehicleId === activeVehicleId
                const pax = bus.occupancy?.passengerCount ?? 0
                const pct = bus.occupancy?.percent ?? 0
                return (
                  <button
                    key={bus.vehicleId}
                    type="button"
                    className={`bottom-bus-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => onOpenBus(bus.vehicleId)}
                  >
                    <span className="chip-plate font-mono">{bus.vehicleId}</span>
                    <OccupancyDotMatrix percent={pct} size="sm" />
                    <span className="chip-pax">
                      {pax} pax · {pct > 75 ? '(Lleno)' : pct < 35 ? '(Cómodo)' : '3 min'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bottom-strip-headway">
            <span>Intervalo promedio entre buses:</span>
            <strong>4.8 min</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
