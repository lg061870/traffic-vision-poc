import { useEffect } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { geoJSON, type PathOptions } from 'leaflet'
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
  /** Highlights one bus and follows it. */
  selectedId?: string | null
  onSelect: (vehicleId: string) => void
}

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

function FitTo({ routes, routeId }: { routes: FeatureCollection | null; routeId?: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!routes) return
    const features = routeId ? routes.features.filter((f) => f.properties?.routeId === routeId) : routes.features
    const focused: FeatureCollection = { ...routes, features }
    if (features.length > 0) map.fitBounds(geoJSON(focused).getBounds(), { padding: [20, 20] })
  }, [map, routes, routeId])
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

export function FleetMap({ routes, vehicles, routeId, selectedId, onSelect }: FleetMapProps) {
  const selected = vehicles.find((v) => v.vehicleId === selectedId)
  return (
    <MapContainer center={coronado} zoom={13} className="fleet-map" scrollWheelZoom={false}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {routes && <GeoJSON key={routeId ?? 'all'} data={routes} style={routeStyle(routeId)} interactive={false} />}
      {!selectedId && <FitTo routes={routes} routeId={routeId} />}
      <Follow vehicle={selected} />
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
