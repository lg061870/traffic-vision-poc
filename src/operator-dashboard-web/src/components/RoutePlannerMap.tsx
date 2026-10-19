import React, { useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { divIcon, geoJSON, type PathOptions, latLngBounds } from 'leaflet'
import type { Feature, FeatureCollection, LineString } from 'geojson'

const coronadoCenter: [number, number] = [9.976073, -84.007282]
const sanJoseTerminus: [number, number] = [9.932732, -84.079187]

interface RoutePlannerMapProps {
  routes: FeatureCollection | null
  selectedRouteId: string | null
  directRouteMode: boolean
  drawingMode: boolean
  customWaypoints: [number, number][]
  onAddWaypoint: (point: [number, number]) => void
}

function getRouteStyle(selectedRouteId: string | null) {
  return (feature?: Feature): PathOptions => {
    const id = feature?.properties?.routeId
    const isSelected = selectedRouteId ? id === selectedRouteId : id === 'R142'
    if (selectedRouteId) {
      return {
        color: isSelected ? '#1d4ed8' : '#cbd5e1',
        weight: isSelected ? 5 : 2,
        opacity: isSelected ? 0.95 : 0.35,
      }
    }
    // All routes view: trunk in dark blue, feeders in teal
    const isTrunk = id === 'R142'
    return {
      color: isTrunk ? '#1e3a8a' : '#0d9488',
      weight: isTrunk ? 4 : 2.5,
      opacity: 0.85,
    }
  }
}

// Fit map to selected route bounds or full network bounds
function AutoFitBounds({
  routes,
  selectedRouteId,
  directRouteMode,
}: {
  routes: FeatureCollection | null
  selectedRouteId: string | null
  directRouteMode: boolean
}) {
  const map = useMap()
  const lastKey = useRef<string>('')

  useEffect(() => {
    if (!routes || routes.features.length === 0) return
    const key = `${selectedRouteId ?? 'all'}-${directRouteMode}`
    if (lastKey.current === key) return
    lastKey.current = key

    if (directRouteMode) {
      // Zoom out to show both San José Central Park and Coronado mountains
      const bounds = latLngBounds([sanJoseTerminus, coronadoCenter])
      map.fitBounds(bounds, { padding: [40, 40] })
      return
    }

    if (selectedRouteId) {
      const feat = routes.features.filter((f) => f.properties?.routeId === selectedRouteId)
      if (feat.length > 0) {
        const focused: FeatureCollection = { ...routes, features: feat }
        map.fitBounds(geoJSON(focused as any).getBounds(), {
          padding: [35, 35],
        })
        return
      }
    }

    // Default: full network
    map.fitBounds(geoJSON(routes as any).getBounds(), { padding: [25, 25] })
  }, [map, routes, selectedRouteId, directRouteMode])

  return null
}

// Map clicks to add waypoints in drawing mode
function MapClickHandler({
  drawingMode,
  onAddWaypoint,
}: {
  drawingMode: boolean
  onAddWaypoint: (point: [number, number]) => void
}) {
  useMapEvents({
    click(e) {
      if (drawingMode) {
        onAddWaypoint([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

// Custom icons
const transferHubIcon = divIcon({
  className: 'terminal-hub-marker',
  html: `
    <div style="
      background: #0f172a;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid #38bdf8;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      transform: translate(-50%, -50%);
    ">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#38bdf8;"></span>
      Terminal Coronado (Transbordo)
    </div>
  `,
  iconSize: [0, 0],
})

const sanJoseIcon = divIcon({
  className: 'sanjose-terminus-marker',
  html: `
    <div style="
      background: #1e293b;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 2px solid #10b981;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      transform: translate(-50%, -50%);
    ">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
      Terminal San José (Parque Central)
    </div>
  `,
  iconSize: [0, 0],
})

function createWaypointIcon(index: number) {
  return divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div style="
        background: #f59e0b;
        color: #000000;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        border: 2px solid #ffffff;
        transform: translate(-50%, -50%);
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [0, 0],
  })
}

export function RoutePlannerMap({
  routes,
  selectedRouteId,
  directRouteMode,
  drawingMode,
  customWaypoints,
  onAddWaypoint,
}: RoutePlannerMapProps) {
  // Extract direct route coordinates if direct mode is active and a feeder is selected
  const directLineCoords: [number, number][] = React.useMemo(() => {
    if (!directRouteMode || !routes || !selectedRouteId || selectedRouteId === 'R142') {
      return []
    }
    const trunk = routes.features.find((f) => f.properties?.routeId === 'R142')
    const feeder = routes.features.find((f) => f.properties?.routeId === selectedRouteId)
    if (!trunk || !feeder) return []

    const trunkCoords = (trunk.geometry as LineString).coordinates.map(
      (c) => [c[1], c[0]] as [number, number],
    )
    const feederCoords = (feeder.geometry as LineString).coordinates.map(
      (c) => [c[1], c[0]] as [number, number],
    )

    // Combine trunk + feeder without break
    return [...trunkCoords, ...feederCoords]
  }, [directRouteMode, routes, selectedRouteId])

  return (
    <div className={`route-planner-map-container ${drawingMode ? 'cursor-crosshair' : ''}`}>
      <MapContainer
        center={coronadoCenter}
        zoom={13}
        className="route-planner-map"
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Official Routes GeoJSON */}
        {routes && (
          <GeoJSON
            key={`${selectedRouteId ?? 'all'}-${directRouteMode}`}
            data={routes}
            style={getRouteStyle(selectedRouteId)}
            interactive={false}
          />
        )}

        {/* Central Coronado Hub Marker */}
        <Marker position={coronadoCenter} icon={transferHubIcon}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                Terminal Central de Coronado
              </strong>
              <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                Nodo obligatorio de transbordo. Confluyen el Troncal R142 y los 11 ramales montañosos.
              </span>
            </div>
          </Popup>
        </Marker>

        {/* San José Terminus Marker */}
        <Marker position={sanJoseTerminus} icon={sanJoseIcon}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                Terminal San José
              </strong>
              <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                Parque Central / Calle 3. Origen del troncal R142 hacia Coronado.
              </span>
            </div>
          </Popup>
        </Marker>

        {/* Simulated Direct Route Line */}
        {directRouteMode && directLineCoords.length > 0 && (
          <Polyline
            positions={directLineCoords}
            pathOptions={{
              color: '#0284c7',
              weight: 5,
              dashArray: '8, 8',
              opacity: 0.95,
            }}
          />
        )}

        {/* User Drawn Custom Route / Variant */}
        {customWaypoints.length > 0 && (
          <>
            <Polyline
              positions={customWaypoints}
              pathOptions={{
                color: '#f59e0b',
                weight: 4,
                dashArray: '6, 6',
                opacity: 0.95,
              }}
            />
            {customWaypoints.map((pt, idx) => (
              <Marker key={`wp-${idx}`} position={pt} icon={createWaypointIcon(idx)} />
            ))}
          </>
        )}

        <AutoFitBounds
          routes={routes}
          selectedRouteId={selectedRouteId}
          directRouteMode={directRouteMode}
        />
        <MapClickHandler drawingMode={drawingMode} onAddWaypoint={onAddWaypoint} />
      </MapContainer>
    </div>
  )
}
