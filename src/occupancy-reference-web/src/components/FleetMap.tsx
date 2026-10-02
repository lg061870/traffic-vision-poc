import { useEffect, useRef, useState } from 'react'
import { GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { geoJSON, type PathOptions } from 'leaflet'
import type { Feature, FeatureCollection } from 'geojson'
import type { VehicleState } from '../types/occupancy'
import { compassPoint, statusDisplay, vehicleColor } from '../occupancyDisplay'
import { busIcon } from './busIcon'
// Static background only: the Occupancy API does not serve routes.
import routesUrl from '../../../../data/routes/coronado-routes-osm.geojson?url'

const coronado: [number, number] = [9.955, -84.03]

function routeStyle(feature?: Feature): PathOptions {
  const trunk = feature?.properties?.routeId === 'R142'
  return { color: trunk ? '#1d3fa8' : '#4a63b8', weight: trunk ? 5 : 3.5, opacity: trunk ? 0.85 : 0.75 }
}

function FitToRoutes({ routes }: { routes: FeatureCollection | null }) {
  const map = useMap()
  useEffect(() => {
    if (routes) map.fitBounds(geoJSON(routes).getBounds(), { padding: [20, 20] })
  }, [map, routes])
  return null
}

// Leaflet only tracks window resizes; the map pane also changes width when the detail panel opens.
function TrackPaneSize() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

// Street level: close enough to see the bus on its street.
const focusZoom = 17

// Zooms to a bus each time it is picked from the list (even the same bus again), not on every
// position update. Clicking a marker on the map selects it without moving the map.
function FlyToFocused({ vehicle, request }: { vehicle: VehicleState | undefined; request: number }) {
  const map = useMap()
  useEffect(() => {
    if (request === 0 || !vehicle?.location) return
    map.flyTo([vehicle.location.lat, vehicle.location.lon], Math.max(map.getZoom(), focusZoom), { duration: 1 })
  }, [map, request])
  return null
}

// Keeps the selected bus on screen as it drives: when it nears the edge of the view, the map pans
// to it. Dragging the map stops following, so the user can look around; picking the bus again
// (in the list or on the map) resumes it.
function FollowSelected({ vehicle, request }: { vehicle: VehicleState | undefined; request: number }) {
  const map = useMap()
  const following = useRef(true)
  const id = vehicle?.vehicleId
  const lat = vehicle?.location?.lat
  const lon = vehicle?.location?.lon

  useEffect(() => {
    following.current = true
  }, [id, request])

  useEffect(() => {
    const stop = () => (following.current = false)
    map.on('dragstart', stop)
    return () => {
      map.off('dragstart', stop)
    }
  }, [map])

  useEffect(() => {
    if (!following.current || lat == null || lon == null) return
    if (!map.getBounds().pad(-0.2).contains([lat, lon])) map.panTo([lat, lon])
  }, [map, lat, lon])
  return null
}

// Plate labels on every bus would pile up when zoomed out, so below this zoom only the selected
// bus keeps its label.
const allLabelsZoom = 14

function LabelsByZoom() {
  const map = useMap()
  useEffect(() => {
    const update = () => map.getContainer().classList.toggle('hide-labels', map.getZoom() < allLabelsZoom)
    update()
    map.on('zoomend', update)
    return () => {
      map.off('zoomend', update)
    }
  }, [map])
  return null
}

interface FleetMapProps {
  vehicles: VehicleState[]
  selectedId: string | null
  onSelect: (vehicleId: string) => void
  /** Increments each time the selected bus should be zoomed to. */
  focusRequest: number
}

export function FleetMap({ vehicles, selectedId, onSelect, focusRequest }: FleetMapProps) {
  const [routes, setRoutes] = useState<FeatureCollection | null>(null)
  const [followRequest, setFollowRequest] = useState(0)

  useEffect(() => {
    fetch(routesUrl)
      .then((response) => response.json())
      .then(setRoutes)
      .catch(() => setRoutes(null))
  }, [])

  const selectedVehicle = vehicles.find((v) => v.vehicleId === selectedId)

  return (
    <MapContainer center={coronado} zoom={13} className="fleet-map">
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {routes && <GeoJSON data={routes} style={routeStyle} interactive={false} />}
      <FitToRoutes routes={routes} />
      <TrackPaneSize />
      <LabelsByZoom />
      <FlyToFocused vehicle={selectedVehicle} request={focusRequest} />
      <FollowSelected vehicle={selectedVehicle} request={focusRequest + followRequest} />
      {vehicles.map((vehicle) => {
        if (!vehicle.location) return null
        const selected = vehicle.vehicleId === selectedId
        const occupancy = vehicle.occupancy
        return (
          <Marker
            key={vehicle.vehicleId}
            position={[vehicle.location.lat, vehicle.location.lon]}
            // A stale position is old, so its direction is not shown either.
            icon={busIcon(vehicle.vehicleId, vehicleColor(vehicle), vehicle.stale ? null : vehicle.location.headingDeg, selected)}
            opacity={vehicle.stale ? 0.75 : 1}
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{
              click: () => {
                onSelect(vehicle.vehicleId)
                setFollowRequest((n) => n + 1)
              },
            }}
          >
            <Tooltip direction="top">
              <strong>{vehicle.vehicleId}</strong>
              {occupancy && ` · ${occupancy.passengerCount}/${occupancy.capacity}`}
              <br />
              {vehicle.stale ? 'Sin reporte' : occupancy ? statusDisplay[occupancy.status].label : 'Sin ocupación'}
              {!vehicle.stale && vehicle.location.headingDeg != null && ` · rumbo ${compassPoint(vehicle.location.headingDeg)}`}
            </Tooltip>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
