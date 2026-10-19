import React, { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import { divIcon, latLngBounds } from 'leaflet'
import type { FeatureCollection, LineString } from 'geojson'
import routesUrl from '../../../../data/routes/coronado-routes-osm.geojson?url'
import type { ManagedRoute, RouteStop } from '../config/ctpRoutesData'

interface RouteEditorModalProps {
  route: ManagedRoute
  isOpen: boolean
  onClose: () => void
  onSave: (updatedRoute: ManagedRoute) => void
}

function createStopIcon(index: number, color: string, isSelected: boolean) {
  return divIcon({
    className: 'custom-stop-marker',
    html: `
      <div style="
        background: ${isSelected ? '#000000' : color};
        color: #ffffff;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 800;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        border: 2px solid #ffffff;
        transform: translate(-50%, -50%);
        transition: transform 0.15s ease;
      ">
        ${index + 1}
      </div>
    `,
    iconSize: [0, 0],
  })
}

// Map Click Handler for GPS capture
function EditorMapEvents({
  gpsCaptureMode,
  onAddStopAtLocation,
}: {
  gpsCaptureMode: boolean
  onAddStopAtLocation: (lat: number, lon: number) => void
}) {
  useMapEvents({
    click(e) {
      if (gpsCaptureMode) {
        onAddStopAtLocation(
          parseFloat(e.latlng.lat.toFixed(6)),
          parseFloat(e.latlng.lng.toFixed(6)),
        )
      }
    },
  })
  return null
}

function AutoFitStops({ stops, roadCoords }: { stops: RouteStop[]; roadCoords?: [number, number][] }) {
  const map = useMap()
  React.useEffect(() => {
    if (roadCoords && roadCoords.length > 0) {
      const bounds = latLngBounds(roadCoords)
      map.fitBounds(bounds, { padding: [35, 35] })
    } else if (stops.length > 0) {
      const bounds = latLngBounds(stops.map((s) => [s.lat, s.lon] as [number, number]))
      map.fitBounds(bounds, { padding: [35, 35] })
    }
  }, [map, stops, roadCoords])
  return null
}

export function RouteEditorModal({
  route,
  isOpen,
  onClose,
  onSave,
}: RouteEditorModalProps) {
  const [name, setName] = useState(route.name)
  const [fare, setFare] = useState(route.fare)
  const [busCount, setBusCount] = useState(route.busCount)
  const [km, setKm] = useState(route.km)
  const [stops, setStops] = useState<RouteStop[]>([...route.stops])
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null)
  const [gpsCaptureMode, setGpsCaptureMode] = useState<boolean>(true)
  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([])
  const [followRoads, setFollowRoads] = useState<boolean>(true)
  const [isRouting, setIsRouting] = useState<boolean>(false)

  // 1. Load official street trajectory from GeoJSON on mount
  useEffect(() => {
    let active = true
    fetch(routesUrl)
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (!active) return
        const feat = data.features.find((f) => f.properties?.routeId === route.routeId)
        if (feat && feat.geometry && feat.geometry.type === 'LineString') {
          const coords = (feat.geometry as LineString).coordinates.map(
            (c) => [c[1], c[0]] as [number, number],
          )
          setRoadCoordinates(coords)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [route.routeId])

  // 2. Dynamic OSRM road routing when stops are modified or added
  useEffect(() => {
    if (stops.length < 2) return

    const timer = setTimeout(() => {
      const coordsParam = stops.map((s) => `${s.lon},${s.lat}`).join(';')
      setIsRouting(true)
      fetch(`https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.routes?.[0]?.geometry?.coordinates) {
            const osrmRoadCoords = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number],
            )
            setRoadCoordinates(osrmRoadCoords)
            if (data.routes[0].distance) {
              setKm(parseFloat((data.routes[0].distance / 1000).toFixed(2)))
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsRouting(false)
        })
    }, 450)

    return () => clearTimeout(timer)
  }, [stops])

  if (!isOpen) return null

  const handleAddStop = (lat?: number, lon?: number) => {
    const defaultLat = lat ?? (stops.length > 0 ? stops[stops.length - 1].lat + 0.002 : 9.976073)
    const defaultLon = lon ?? (stops.length > 0 ? stops[stops.length - 1].lon + 0.002 : -84.007282)
    const newStop: RouteStop = {
      id: `s-${Date.now()}-${stops.length + 1}`,
      name: `Parada #${stops.length + 1}`,
      lat: defaultLat,
      lon: defaultLon,
      dwellSec: 30,
    }
    setStops([...stops, newStop])
    setSelectedStopIndex(stops.length)
  }

  const handleUpdateStop = (index: number, field: keyof RouteStop, value: any) => {
    const updated = [...stops]
    updated[index] = { ...updated[index], [field]: value }
    setStops(updated)
  }

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= stops.length) return
    const updated = [...stops]
    const temp = updated[index]
    updated[index] = updated[target]
    updated[target] = temp
    setStops(updated)
    setSelectedStopIndex(target)
  }

  const handleDeleteStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index))
    if (selectedStopIndex === index) setSelectedStopIndex(null)
  }

  const handleSave = () => {
    onSave({
      ...route,
      name,
      fare,
      busCount,
      km,
      stops,
    })
    onClose()
  }

  const straightCoords: [number, number][] = stops.map((s) => [s.lat, s.lon])
  const displayCoords: [number, number][] =
    followRoads && roadCoordinates.length > 0 ? roadCoordinates : straightCoords

  return (
    <div className="route-editor-backdrop" onClick={onClose}>
      <div className="route-editor-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="editor-window-header">
          <div className="editor-title-row">
            <span
              className="editor-route-code"
              style={{ backgroundColor: route.color, color: '#ffffff' }}
            >
              {route.routeId}
            </span>
            <div>
              <h3>Editor de Recorrido & Paradas</h3>
              <p className="editor-subtitle">
                Modifique el trazado, la secuencia de paradas o haga clic en el mapa para capturar coordenadas GPS oficiales.
              </p>
            </div>
          </div>
          <button type="button" className="editor-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Route Top Metadata Inputs */}
        <div className="editor-meta-bar">
          <label className="meta-field">
            <span>Nombre de la Ruta / Ramal:</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="meta-input meta-input-name"
            />
          </label>
          <label className="meta-field">
            <span>Tarifa ARESEP (₡):</span>
            <input
              type="number"
              value={fare}
              min={100}
              step={5}
              onChange={(e) => setFare(Number(e.target.value))}
              className="meta-input meta-input-num"
            />
          </label>
          <label className="meta-field">
            <span>Flota Asignada:</span>
            <input
              type="number"
              value={busCount}
              min={0}
              max={50}
              onChange={(e) => setBusCount(Number(e.target.value))}
              className="meta-input meta-input-num"
            />
          </label>
          <label className="meta-field">
            <span>Distancia (km):</span>
            <input
              type="number"
              value={km}
              step={0.1}
              min={0.1}
              onChange={(e) => setKm(Number(e.target.value))}
              className="meta-input meta-input-num"
            />
          </label>
        </div>

        {/* Main 50/50 Body */}
        <div className="editor-split-workspace">
          {/* Left Column: Stop Sequence Table */}
          <div className="editor-stops-column">
            <div className="stops-toolbar">
              <div className="stops-summary">
                <strong>Secuencia de Paradas ({stops.length})</strong>
                <span>Arrastre o use flechas para ordenar</span>
              </div>
              <div className="stops-actions">
                <button
                  type="button"
                  className={`button button-small ${gpsCaptureMode ? 'button-primary' : 'button-subtle'}`}
                  onClick={() => setGpsCaptureMode(!gpsCaptureMode)}
                >
                  {gpsCaptureMode ? '📍 Captura GPS Activa' : '📍 Activar Clic en Mapa'}
                </button>
                <button
                  type="button"
                  className="button button-small button-subtle"
                  onClick={() => handleAddStop()}
                >
                  + Parada
                </button>
              </div>
            </div>

            {gpsCaptureMode && (
              <div className="gps-mode-tip">
                👆 <strong>Modo GPS activo:</strong> Al hacer clic en cualquier calle o punto del mapa se agregará automáticamente una nueva parada con sus coordenadas exactas.
              </div>
            )}

            <div className="stops-table-scroll">
              <table className="stops-table">
                <thead>
                  <tr>
                    <th style={{ width: '32px' }}>#</th>
                    <th>Nombre de Parada</th>
                    <th style={{ width: '100px' }}>Latitud</th>
                    <th style={{ width: '100px' }}>Longitud</th>
                    <th style={{ width: '60px' }}>Espera</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {stops.map((stop, idx) => {
                    const isSelected = selectedStopIndex === idx
                    return (
                      <tr
                        key={stop.id}
                        className={isSelected ? 'row-selected' : ''}
                        onClick={() => setSelectedStopIndex(idx)}
                      >
                        <td className="stop-num-cell">
                          <span
                            className="stop-badge"
                            style={{ backgroundColor: route.color }}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={stop.name}
                            onChange={(e) => handleUpdateStop(idx, 'name', e.target.value)}
                            className="stop-cell-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.000001"
                            value={stop.lat}
                            onChange={(e) =>
                              handleUpdateStop(idx, 'lat', parseFloat(e.target.value))
                            }
                            className="stop-cell-input coord-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.000001"
                            value={stop.lon}
                            onChange={(e) =>
                              handleUpdateStop(idx, 'lon', parseFloat(e.target.value))
                            }
                            className="stop-cell-input coord-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="5"
                            value={stop.dwellSec ?? 30}
                            onChange={(e) =>
                              handleUpdateStop(idx, 'dwellSec', parseInt(e.target.value, 10))
                            }
                            className="stop-cell-input dwell-input"
                            title="Segundos de parada"
                          />
                        </td>
                        <td className="stop-actions-cell">
                          <button
                            type="button"
                            className="stop-reorder-btn"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveStop(idx, 'up')
                            }}
                            title="Subir parada"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="stop-reorder-btn"
                            disabled={idx === stops.length - 1}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMoveStop(idx, 'down')
                            }}
                            title="Bajar parada"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="stop-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteStop(idx)
                            }}
                            title="Eliminar parada"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Interactive Editor Leaflet Map */}
          <div className="editor-map-column">
            {/* Real Street Routing Status & Toggle Toolbar */}
            <div className="editor-map-toolbar">
              <div className="map-toolbar-left">
                <span className="route-mode-pill">
                  {followRoads && roadCoordinates.length > 0 ? (
                    <>🛣️ Red Vial Real (OpenStreetMap · {roadCoordinates.length} nodos)</>
                  ) : (
                    <>📏 Línea Directa (Sin curvas de calle)</>
                  )}
                </span>
                {isRouting && <span className="routing-spinner">⏳ Ajustando a la red vial…</span>}
              </div>
              <button
                type="button"
                className="button button-small button-subtle"
                onClick={() => setFollowRoads(!followRoads)}
                title="Alternar entre trazado sobre carreteras reales o líneas directas"
              >
                {followRoads ? 'Ver Líneas Directas' : 'Ajustar a Red Vial'}
              </button>
            </div>

            <div className="editor-map-wrapper">
              <MapContainer
                center={[9.976073, -84.007282]}
                zoom={14}
                className="editor-leaflet-container"
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  maxZoom={19}
                />

                {/* Drawn Connecting Route Line following real roads */}
                {displayCoords.length > 1 && (
                  <Polyline
                    positions={displayCoords}
                    pathOptions={{
                      color: route.color,
                      weight: 6,
                      opacity: 0.9,
                      lineJoin: 'round',
                      lineCap: 'round',
                    }}
                  />
                )}

                {/* Faint dashed sequence chord between stop markers if road routing is active */}
                {followRoads && roadCoordinates.length > 0 && straightCoords.length > 1 && (
                  <Polyline
                    positions={straightCoords}
                    pathOptions={{
                      color: '#0f172a',
                      weight: 1.5,
                      dashArray: '4, 8',
                      opacity: 0.3,
                    }}
                  />
                )}

                {/* Stop Markers */}
                {stops.map((stop, idx) => (
                  <Marker
                    key={stop.id}
                    position={[stop.lat, stop.lon]}
                    icon={createStopIcon(idx, route.color, selectedStopIndex === idx)}
                    eventHandlers={{
                      click: () => setSelectedStopIndex(idx),
                    }}
                  >
                    <Popup>
                      <div style={{ padding: '2px' }}>
                        <strong style={{ fontSize: '12px' }}>
                          #{idx + 1} {stop.name}
                        </strong>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          GPS: {stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}
                          <br />
                          Tiempo en parada: {stop.dwellSec ?? 30}s
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                <AutoFitStops stops={stops} roadCoords={displayCoords} />
                <EditorMapEvents
                  gpsCaptureMode={gpsCaptureMode}
                  onAddStopAtLocation={(lat, lon) => handleAddStop(lat, lon)}
                />
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="editor-window-footer">
          <div className="footer-stats">
            <span>Ruta: <strong>{route.routeId}</strong></span>
            <span>Paradas configuradas: <strong>{stops.length}</strong></span>
            <span>Distancia: <strong>{km} km</strong></span>
          </div>
          <div className="footer-btns">
            <button type="button" className="button button-subtle" onClick={onClose}>
              Descartar
            </button>
            <button type="button" className="button button-primary" onClick={handleSave}>
              ✓ Guardar Cambios de Ruta & Paradas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
