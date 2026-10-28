import { useEffect, useMemo, useRef } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, Popup, useMap } from 'react-leaflet'
import { divIcon, geoJSON, latLng, point, type PathOptions } from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { VehicleState } from '../types/occupancy'
import { statusDisplay, vehicleColor } from '../display'
import { busIcon } from './busIcon'
import { officialCtpRoutes, type RouteStop } from '../config/ctpRoutesData'

const coronado: [number, number] = [9.955, -84.03]

interface FleetMapProps {
  routes: FeatureCollection | null
  vehicles: VehicleState[]
  /** Highlights one route's line and zooms to it. */
  routeId?: string | null
  /** Highlights one bus. */
  selectedId?: string | null
  /** Keeps the selected bus in view as it drives (the small map in the bus panel). */
  follow?: boolean
  /** Flies to the selected bus each time a different bus is selected (the main map). */
  zoomToSelected?: boolean
  /** Controls visibility of CTP bus stops along routes (defaults to true). */
  showStops?: boolean
  onSelect: (vehicleId: string) => void
}

/** Width of the bus panel that slides over the right side of the screen (see .drawer). */
const drawerWidth = 460
const busZoom = 16

const routeColorMap: Record<string, string> = {
  R142: '#1d4ed8', // Dark Blue - Troncal
  'R142-01': '#0284c7', // Sky Blue - Cascajal
  'R142-02': '#0d9488', // Teal - Las Nubes
  'R142-03': '#16a34a', // Emerald - Dulce Nombre
  'R142-04': '#ca8a04', // Amber - Patio de Agua
  'R142-05': '#ea580c', // Orange - San Rafael
  'R142-06': '#e11d48', // Rose - Patalillo
  'R142-07': '#8b5cf6', // Violet - Los Ángeles
  'R142-08': '#4f46e5', // Indigo - San Antonio
  'R142-09': '#06b6d4', // Cyan - San Jerónimo
  'R142-10': '#d97706', // Gold - La Gallera
}

function routeStyle(routeId: string | null | undefined) {
  return (feature?: Feature): PathOptions => {
    const id = feature?.properties?.routeId ?? ''
    const color = routeColorMap[id] ?? '#1d4ed8'
    const focused = routeId ? id === routeId : id === 'R142'

    if (routeId) {
      return {
        color: focused ? color : '#94a3b8',
        weight: focused ? 6 : 2.5,
        opacity: focused ? 0.95 : 0.35,
      }
    }

    return {
      color: color,
      weight: id === 'R142' ? 4.5 : 3,
      opacity: id === 'R142' ? 0.9 : 0.7,
    }
  }
}

interface MappedStop extends RouteStop {
  isTransferHub: boolean
  isOrigin: boolean
  isTerminus: boolean
  stopNumber?: number
  routeId: string
  routeName: string
  color: string
}

function createStopIcon(
  stop: MappedStop,
  isHub: boolean,
  isOrigin: boolean,
  isTerminus: boolean,
  color: string,
  number?: number,
) {
  if (isHub) {
    return divIcon({
      className: 'ctp-stop-marker-wrap',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
      html: `
        <div class="stop-pin hub-pin" title="${stop.name}">
          <span class="hub-pulse"></span>
          <span class="hub-icon">🏢</span>
        </div>
      `,
    })
  }

  if (isOrigin) {
    return divIcon({
      className: 'ctp-stop-marker-wrap',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -11],
      html: `
        <div class="stop-pin origin-pin" style="border-color: ${color};" title="${stop.name}">
          <span>🟢</span>
        </div>
      `,
    })
  }

  if (isTerminus) {
    return divIcon({
      className: 'ctp-stop-marker-wrap',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -11],
      html: `
        <div class="stop-pin terminus-pin" style="border-color: ${color};" title="${stop.name}">
          <span>🏁</span>
        </div>
      `,
    })
  }

  return divIcon({
    className: 'ctp-stop-marker-wrap',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
    html: `
      <div class="stop-pin regular-pin" style="background: ${color};" title="${stop.name}">
        <span>${number ?? '•'}</span>
      </div>
    `,
  })
}

// Shows the whole network, or the selected route, when the routes load or the route filter
// changes; never on other re-renders, so a zoom the user chose is not undone.
function FitTo({ routes, routeId }: { routes: FeatureCollection | null; routeId?: string | null }) {
  const map = useMap()
  const fitted = useRef<string | null>(null)
  useEffect(() => {
    const key = routeId ?? 'all'
    if (!routes || fitted.current === key) return
    const features = routeId ? routes.features.filter((f) => f.properties?.routeId === routeId) : routes.features
    const focused: FeatureCollection = { ...routes, features }
    if (features.length > 0) map.fitBounds(geoJSON(focused).getBounds(), { padding: [20, 20] })
    fitted.current = key
  }, [map, routes, routeId])
  return null
}

// Flies to a bus when it is selected, centering it in the part of the map the bus panel leaves
// visible. Only on a new selection: the user can pan away while the panel is open.
function ZoomToSelected({ vehicle }: { vehicle: VehicleState | undefined }) {
  const map = useMap()
  const shown = useRef<string | null>(null)
  useEffect(() => {
    const id = vehicle?.vehicleId ?? null
    if (id === shown.current) return
    shown.current = id
    if (!vehicle?.location) return
    const zoom = Math.max(map.getZoom(), busZoom)
    const rect = map.getContainer().getBoundingClientRect()
    const covered = Math.max(0, Math.min(drawerWidth, rect.right - (window.innerWidth - drawerWidth)))
    const target = map.project(latLng(vehicle.location.lat, vehicle.location.lon), zoom).add(point(covered / 2, 0))
    map.flyTo(map.unproject(target, zoom), zoom, { duration: 0.8 })
  }, [map, vehicle])
  return null
}

function Follow({ vehicle }: { vehicle: VehicleState | undefined }) {
  const map = useMap()
  const lat = vehicle?.location?.lat
  const lon = vehicle?.location?.lon
  useEffect(() => {
    if (lat == null || lon == null) return
    if (!map.getBounds().pad(-0.2).contains([lat, lon])) map.setView([lat, lon], Math.max(map.getZoom(), 15))
  }, [map, lat, lon])
  return null
}

// Plate labels on every bus pile up when zoomed out; below this zoom only the selected bus keeps one.
/** Leaflet only notices window resizes; this redraws the tiles when the map's own box changes (maximize). */
function FitContainer() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

function LabelsByZoom() {
  const map = useMap()
  useEffect(() => {
    const update = () => map.getContainer().classList.toggle('hide-labels', map.getZoom() < 14)
    update()
    map.on('zoomend', update)
    return () => {
      map.off('zoomend', update)
    }
  }, [map])
  return null
}

export function FleetMap({
  routes,
  vehicles,
  routeId,
  selectedId,
  follow = false,
  zoomToSelected = false,
  showStops = true,
  onSelect,
}: FleetMapProps) {
  const selected = vehicles.find((v) => v.vehicleId === selectedId)

  // Compute stops to display
  const displayStops = useMemo(() => {
    if (!showStops) return []

    if (routeId) {
      // Focus mode: show only stops for the selected route
      const target = officialCtpRoutes.find((r) => r.routeId === routeId)
      if (!target) return []
      return target.stops.map((s, idx) => ({
        ...s,
        isTransferHub:
          s.isTransferHub ||
          s.name.toLowerCase().includes('terminal central') ||
          s.name.toLowerCase().includes('terminal coronado'),
        isOrigin: idx === 0,
        isTerminus: idx === target.stops.length - 1,
        stopNumber: idx + 1,
        routeId: target.routeId,
        routeName: target.name,
        color: target.color,
      }))
    }

    // All routes mode: collect all stops, deduplicating Terminal Central Coronado
    const stopMap = new Map<string, MappedStop>()
    officialCtpRoutes.forEach((route) => {
      route.stops.forEach((s, idx) => {
        const isHub =
          s.isTransferHub ||
          s.name.toLowerCase().includes('terminal central') ||
          s.name.toLowerCase().includes('terminal coronado')
        const key = isHub ? 'hub-coronado' : `${s.lat.toFixed(5)},${s.lon.toFixed(5)}`
        if (!stopMap.has(key)) {
          stopMap.set(key, {
            ...s,
            isTransferHub: isHub,
            isOrigin: idx === 0 && !isHub,
            isTerminus: idx === route.stops.length - 1 && !isHub,
            stopNumber: isHub ? undefined : idx + 1,
            routeId: route.routeId,
            routeName: route.name,
            color: isHub ? '#dc2626' : route.color,
          })
        }
      })
    })

    return Array.from(stopMap.values())
  }, [routeId, showStops])

  return (
    <MapContainer center={coronado} zoom={13} className="fleet-map">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {routes && <GeoJSON key={routeId ?? 'all'} data={routes} style={routeStyle(routeId)} interactive={false} />}
      {!follow && <FitTo routes={routes} routeId={routeId} />}
      {follow && <Follow vehicle={selected} />}
      {zoomToSelected && <ZoomToSelected vehicle={selected} />}
      <LabelsByZoom />
      <FitContainer />

      {/* Official CTP Bus Stops along corridors */}
      {showStops &&
        displayStops.map((stop) => {
          const isHub = stop.isTransferHub
          const isOrigin = stop.isOrigin
          const isTerminus = stop.isTerminus
          const icon = createStopIcon(stop, isHub, isOrigin, isTerminus, stop.color, stop.stopNumber)

          return (
            <Marker
              key={`${stop.routeId}-${stop.id}`}
              position={[stop.lat, stop.lon]}
              icon={icon}
              zIndexOffset={isHub ? 600 : isOrigin || isTerminus ? 300 : 150}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <strong>{stop.name}</strong>
                {isHub && ' · 🏢 NODO TRANSBORDO'}
                {isOrigin && ' · 🟢 ORIGEN'}
                {isTerminus && ' · 🏁 RETORNO'}
                {stop.dwellSec ? ` (~${stop.dwellSec}s)` : ''}
              </Tooltip>
              <Popup>
                <div className="stop-popup-card">
                  <div className="stop-popup-header">
                    <span className="stop-popup-tag" style={{ background: stop.color }}>
                      {stop.routeId}
                    </span>
                    <strong style={{ fontSize: '11px', color: '#64748b' }}>
                      {stop.isTransferHub
                        ? 'Nodo de Transbordo CTP'
                        : stop.isOrigin
                        ? 'Parada de Origen'
                        : stop.isTerminus
                        ? 'Parada Retorno / Destino'
                        : `Parada #${stop.stopNumber}`}
                    </strong>
                  </div>
                  <h4 className="stop-popup-title">{stop.name}</h4>
                  <div className="stop-popup-details">
                    <span>
                      📍 <strong>GPS:</strong> {stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}
                    </span>
                    <span>
                      ⏱ <strong>Espera programada:</strong> ~{stop.dwellSec ?? 30} segundos
                    </span>
                    <span>
                      🛣 <strong>Corredor:</strong> {stop.routeName}
                    </span>
                    {isHub && (
                      <span className="stop-popup-hub-badge">
                        🏢 Terminal Central Coronado (Intercambio Concesión CTP)
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

      {/* Real-Time Vehicles */}
      {vehicles.map((vehicle) => {
        if (!vehicle.location) return null
        const isSelected = vehicle.vehicleId === selectedId
        const occupancy = vehicle.occupancy
        return (
          <Marker
            key={vehicle.vehicleId}
            position={[vehicle.location.lat, vehicle.location.lon]}
            icon={busIcon(
              vehicle.vehicleId,
              vehicleColor(vehicle),
              vehicle.stale ? null : vehicle.location.headingDeg,
              isSelected,
              vehicle.stale ? null : vehicle.occupancy?.percent,
            )}
            opacity={vehicle.stale ? 0.75 : 1}
            zIndexOffset={isSelected ? 1000 : 400}
            eventHandlers={{ click: () => onSelect(vehicle.vehicleId) }}
          >
            <Tooltip direction="top">
              <strong>{vehicle.vehicleId}</strong>
              {occupancy && ` · ${occupancy.passengerCount}/${occupancy.capacity}`}
              <br />
              {vehicle.stale ? 'Sin reporte' : occupancy ? statusDisplay[occupancy.status].label : 'Sin ocupación'}
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
