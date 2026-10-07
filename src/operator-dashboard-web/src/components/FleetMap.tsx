import { useEffect, useRef } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { geoJSON, latLng, point, type PathOptions } from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { VehicleState } from '../types/occupancy'
import { statusDisplay, vehicleColor } from '../display'
import { busIcon } from './busIcon'

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
  onSelect: (vehicleId: string) => void
}

/** Width of the bus panel that slides over the right side of the screen (see .drawer). */
const drawerWidth = 460
const busZoom = 16

function routeStyle(routeId: string | null | undefined) {
  return (feature?: Feature): PathOptions => {
    const id = feature?.properties?.routeId
    const focused = routeId ? id === routeId : id === 'R142'
    return {
      color: focused ? '#1d3fa8' : '#4a63b8',
      weight: focused ? 5 : 3,
      opacity: routeId && !focused ? 0.3 : 0.8,
    }
  }
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

export function FleetMap({ routes, vehicles, routeId, selectedId, follow = false, zoomToSelected = false, onSelect }: FleetMapProps) {
  const selected = vehicles.find((v) => v.vehicleId === selectedId)
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
      {vehicles.map((vehicle) => {
        if (!vehicle.location) return null
        const isSelected = vehicle.vehicleId === selectedId
        const occupancy = vehicle.occupancy
        return (
          <Marker
            key={vehicle.vehicleId}
            position={[vehicle.location.lat, vehicle.location.lon]}
            icon={busIcon(vehicle.vehicleId, vehicleColor(vehicle), vehicle.stale ? null : vehicle.location.headingDeg, isSelected)}
            opacity={vehicle.stale ? 0.75 : 1}
            zIndexOffset={isSelected ? 1000 : 0}
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
