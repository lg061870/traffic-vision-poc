import React, { useState, useMemo } from 'react'
import type { FeatureCollection } from 'geojson'
import {
  officialCtpRoutes,
  type ManagedRoute,
  type RouteStop,
} from '../config/ctpRoutesData'
import { RouteEditorModal } from './RouteEditorModal'

interface RouteManagerProps {
  routesGeoJson?: FeatureCollection | null
  onUpdateParameters?: (updatedRamales: { routeId: string; name: string; busCount: number; fare?: number }[]) => void
}

/**
 * Stop Chain Timeline Graphic Component
 * Faithfully matches the user's reference dispatch timeline:
 * A solid continuous route line connecting numbered square stop nodes [1]─[2]─[3]...
 * with a red indicator dot on transfer hubs (Terminal Central de Coronado) and origin/dest indicators.
 */
function StopChainTimeline({
  route,
  onOpenEditor,
}: {
  route: ManagedRoute
  onOpenEditor: () => void
}) {
  return (
    <div className="stop-chain-wrapper">
      <div
        className="stop-chain-track-line"
        style={{ backgroundColor: route.color }}
      />
      <div className="stop-chain-nodes-row">
        {route.stops.map((stop, idx) => {
          const isOrigin = idx === 0
          const isTerminus = idx === route.stops.length - 1
          const isCoronadoHub =
            stop.isTransferHub ||
            stop.name.toLowerCase().includes('terminal central') ||
            stop.name.toLowerCase().includes('terminal coronado')

          const tooltipText = `Parada #${idx + 1}: ${stop.name}\n📍 Coordenadas: ${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}\n⏱ Tiempo espera: ${stop.dwellSec ?? 30}s${isCoronadoHub ? '\n🏢 NODO DE TRANSBORDO CTP (Terminal Coronado)' : ''}${isOrigin ? '\n🟢 Parada de Origen' : ''}${isTerminus ? '\n🏁 Parada Final / Retorno' : ''}`

          return (
            <div
              key={stop.id || `${route.routeId}-stop-${idx}`}
              className="stop-chain-node-item"
              title={tooltipText}
              onClick={onOpenEditor}
            >
              <div
                className={`stop-node-box ${isCoronadoHub ? 'node-is-hub' : ''}`}
                style={{
                  backgroundColor: route.color,
                }}
              >
                <span className="stop-node-number">{idx + 1}</span>

                {/* Red indicator dot on transfer hub (matching node 2 in reference image) */}
                {isCoronadoHub && (
                  <span
                    className="stop-indicator-dot dot-hub-red"
                    title="Terminal Central Coronado (Intercambio Concesión CTP)"
                  />
                )}

                {/* Origin indicator dot */}
                {isOrigin && !isCoronadoHub && (
                  <span
                    className="stop-indicator-dot dot-origin-green"
                    title="Origen del recorrido"
                  />
                )}

                {/* Terminus indicator dot */}
                {isTerminus && !isCoronadoHub && (
                  <span
                    className="stop-indicator-dot dot-terminus-amber"
                    title="Destino / Retorno del recorrido"
                  />
                )}
              </div>

              {/* Compact stop label */}
              <div className="stop-node-label" title={stop.name}>
                {stop.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RouteManager({
  onUpdateParameters,
}: RouteManagerProps) {
  const [routesList, setRoutesList] = useState<ManagedRoute[]>([...officialCtpRoutes])
  const [editingRoute, setEditingRoute] = useState<ManagedRoute | null>(null)
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [importNotification, setImportNotification] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false)

  const filteredRoutes = useMemo(() => {
    if (!searchFilter.trim()) return routesList
    const q = searchFilter.toLowerCase().trim()
    return routesList.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.routeId.toLowerCase().includes(q) ||
        r.stops.some((s) => s.name.toLowerCase().includes(q)),
    )
  }, [routesList, searchFilter])

  const totalBuses = useMemo(() => {
    return routesList.reduce((sum, r) => sum + r.busCount, 0)
  }, [routesList])

  const totalKm = useMemo(() => {
    return routesList.reduce((sum, r) => sum + r.km, 0).toFixed(1)
  }, [routesList])

  const handleUpdateBusCount = (routeId: string, delta: number) => {
    const updated = routesList.map((r) => {
      if (r.routeId === routeId) {
        return { ...r, busCount: Math.max(0, r.busCount + delta) }
      }
      return r
    })
    setRoutesList(updated)
    if (onUpdateParameters) {
      onUpdateParameters(
        updated.map((r) => ({
          routeId: r.routeId,
          name: r.name,
          busCount: r.busCount,
          fare: r.fare,
        })),
      )
    }
  }

  const handleUpdateFare = (routeId: string, newFare: number) => {
    const safeFare = Math.max(0, newFare)
    const updated = routesList.map((r) => {
      if (r.routeId === routeId) {
        return { ...r, fare: safeFare }
      }
      return r
    })
    setRoutesList(updated)
    if (onUpdateParameters) {
      onUpdateParameters(
        updated.map((r) => ({
          routeId: r.routeId,
          name: r.name,
          busCount: r.busCount,
          fare: r.fare,
        })),
      )
    }
  }

  const handleSaveEditedRoute = (updatedRoute: ManagedRoute) => {
    const exists = routesList.some((r) => r.routeId === updatedRoute.routeId)
    const updated = exists
      ? routesList.map((r) => (r.routeId === updatedRoute.routeId ? updatedRoute : r))
      : [...routesList, updatedRoute]

    setRoutesList(updated)
    if (onUpdateParameters) {
      onUpdateParameters(
        updated.map((r) => ({
          routeId: r.routeId,
          name: r.name,
          busCount: r.busCount,
          fare: r.fare,
        })),
      )
    }
    setImportNotification(`✓ Ramal ${updatedRoute.routeId} y sus ${updatedRoute.stops.length} paradas guardadas correctamente`)
    setTimeout(() => setImportNotification(null), 4000)
    setEditingRoute(null)
  }

  // Automates CTP official import
  const handleImportOfficialCtp = () => {
    setRoutesList([...officialCtpRoutes])
    if (onUpdateParameters) {
      onUpdateParameters(
        officialCtpRoutes.map((r) => ({
          routeId: r.routeId,
          name: r.name,
          busCount: r.busCount,
          fare: r.fare,
        })),
      )
    }
    setShowImportDialog(false)
    setImportNotification('✓ Documento oficial CTP importado: 12 ramales autorizados, 39 unidades asignadas según ARESEP RE-0025-IT-2024')
    setTimeout(() => setImportNotification(null), 5000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (Array.isArray(parsed)) {
          setRoutesList(parsed)
          setImportNotification(`✓ Archivo CTP importado con éxito (${parsed.length} rutas configuradas)`)
        } else if (parsed.routes && Array.isArray(parsed.routes)) {
          setRoutesList(parsed.routes)
          setImportNotification(`✓ Documento CTP importado con éxito (${parsed.routes.length} rutas)`)
        } else {
          handleImportOfficialCtp()
        }
      } catch (err) {
        alert('Formato de archivo inválido. Se cargará la resolución oficial CTP por defecto.')
        handleImportOfficialCtp()
      }
      setShowImportDialog(false)
      setTimeout(() => setImportNotification(null), 5000)
    }
    reader.readAsText(file)
  }

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(routesList, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', 'CTP_Ruta142_Concesion_Coronado.json')
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleAddNewRoute = () => {
    const newId = `R142-R${routesList.length + 1}`
    const newRoute: ManagedRoute = {
      routeId: newId,
      name: `Ramal Nuevo ${routesList.length + 1}`,
      color: '#0284c7',
      fare: 400,
      busCount: 1,
      km: 6.5,
      isTrunk: false,
      transferHubRequired: true,
      stops: [
        {
          id: `stop-${newId}-1`,
          name: 'Terminal Central Coronado',
          lat: 9.976073,
          lon: -84.007282,
          isTransferHub: true,
          dwellSec: 45,
        },
        {
          id: `stop-${newId}-2`,
          name: 'Parada Final Nuevo Ramal',
          lat: 9.982000,
          lon: -84.015000,
          isTransferHub: false,
          dwellSec: 30,
        },
      ],
    }
    setEditingRoute(newRoute)
  }

  return (
    <div className="ctp-route-manager single-screen-layout">
      {/* Top Banner & KPI Ribbon */}
      <div className="manager-top-ribbon">
        <div className="ribbon-brand-col">
          <div className="ribbon-workflow-steps">
            <span className="step-pill step-done">✓ 1. Documento CTP</span>
            <span className="step-pill step-done">✓ 2. Paradas GPS</span>
            <span className="step-pill step-done">✓ 3. 39 Buses Concesión</span>
          </div>
          <h3>Plan Oficial de Rutas & Concesión · Ruta 142 Coronado</h3>
          <span className="ribbon-sub">
            Acuerdo CTP-DT-DAC-INF-0557-2023 · Regulación Tarifaria ARESEP RE-0115-IT-2026
          </span>
        </div>

        <div className="ribbon-kpi-col">
          <div className="ribbon-kpi-badge">
            <span className="kpi-tag">Rutas Oficiales</span>
            <strong>{routesList.length} / 12</strong>
          </div>
          <div className="ribbon-kpi-badge">
            <span className="kpi-tag">Flota Asignada</span>
            <strong className={totalBuses === 39 ? 'text-good' : 'text-warn'}>
              {totalBuses} / 39
            </strong>
          </div>
          <div className="ribbon-kpi-badge">
            <span className="kpi-tag">Red Total</span>
            <strong>{totalKm} km</strong>
          </div>
          <div className="ribbon-kpi-badge">
            <span className="kpi-tag">Tarifas ARESEP</span>
            <strong>₡400 / ₡460</strong>
          </div>
        </div>

        <div className="ribbon-actions-col">
          <div className="filter-input-wrap">
            <input
              type="text"
              className="route-search-input"
              placeholder="🔍 Filtrar ramal o parada..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            {searchFilter && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchFilter('')}
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="button button-subtle"
            onClick={handleAddNewRoute}
          >
            ➕ Nueva Ruta
          </button>
          <button
            type="button"
            className="button button-accent-glow"
            onClick={() => setShowImportDialog(true)}
          >
            📥 Importar CTP
          </button>
          <button
            type="button"
            className="button button-subtle"
            onClick={handleExportJson}
          >
            📤 Exportar JSON
          </button>
        </div>
      </div>

      {importNotification && (
        <div className="manager-notification-banner">
          {importNotification}
        </div>
      )}

      {/* Full-Width Route Table with Stop Chain Graphic Embedded in Every Row */}
      <div className="manager-fullwidth-workspace">
        <div className="manager-routes-list-container">
          <div className="routes-list-header">
            <div className="col-header col-route">Ramal & Flota Asignada</div>
            <div className="col-header col-timeline">
              Secuencia de Paradas & Conectividad (Gráfico CTP)
              <span className="header-legend">
                <span className="legend-item"><span className="legend-dot dot-hub-red"></span> Terminal Coronado</span>
                <span className="legend-item"><span className="legend-dot dot-origin-green"></span> Origen</span>
                <span className="legend-item"><span className="legend-dot dot-terminus-amber"></span> Destino</span>
              </span>
            </div>
            <div className="col-header col-actions">Acción</div>
          </div>

          <div className="routes-list-body">
            {filteredRoutes.map((r) => {
              return (
                <div key={r.routeId} className="route-chain-card">
                  {/* Left Column: Route Meta, Code, Fleet Stepper */}
                  <div className="route-meta-col">
                    <div className="route-badge-row">
                      <span
                        className="route-code-pill"
                        style={{
                          backgroundColor: `${r.color}15`,
                          color: r.color,
                          borderColor: `${r.color}55`,
                        }}
                      >
                        {r.routeId}
                      </span>
                      <strong className="route-title" title={r.name}>
                        {r.name}
                      </strong>
                    </div>

                    <div className="route-stats-row">
                      <div className="stepper-mini" title="Ajustar flota de buses asignada a esta ruta">
                        <button
                          type="button"
                          className="step-btn"
                          disabled={r.busCount <= 0}
                          onClick={() => handleUpdateBusCount(r.routeId, -1)}
                        >
                          −
                        </button>
                        <span className="step-val">{r.busCount}</span>
                        <button
                          type="button"
                          className="step-btn"
                          onClick={() => handleUpdateBusCount(r.routeId, 1)}
                        >
                          +
                        </button>
                        <span className="step-unit">buses</span>
                      </div>

                      <div className="route-fare-badge-editable" title="Tarifa autorizada ARESEP para este ramal (editable)">
                        <span className="fare-symbol">₡</span>
                        <input
                          type="number"
                          min={50}
                          max={3000}
                          step={5}
                          value={r.fare}
                          onChange={(e) => handleUpdateFare(r.routeId, Number(e.target.value))}
                          className="fare-input-inline"
                        />
                      </div>
                      <span className="route-stat-tag">{r.km} km</span>
                      <span className="route-stat-tag">{r.stops.length} paradas</span>
                    </div>
                  </div>

                  {/* Center Column: Stop Chain Timeline Graphic [1]──[2]──[3]... */}
                  <div className="route-timeline-col">
                    <StopChainTimeline
                      route={r}
                      onOpenEditor={() => setEditingRoute(r)}
                    />
                  </div>

                  {/* Right Column: Edit Button */}
                  <div className="route-actions-col">
                    <button
                      type="button"
                      className="button button-small button-primary edit-chain-btn"
                      onClick={() => setEditingRoute(r)}
                      title="Editar paradas, nombres, tiempos y coordenadas GPS en mapa"
                    >
                      ✏ Editar Paradas
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredRoutes.length === 0 && (
              <div className="empty-routes-placeholder">
                <p>No se encontraron ramales con el criterio de búsqueda "{searchFilter}".</p>
                <button
                  type="button"
                  className="button button-subtle"
                  onClick={() => setSearchFilter('')}
                >
                  Restablecer filtro
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Route Editor Modal (Window for editing stops, names, and clicking on map for GPS) */}
      {editingRoute && (
        <RouteEditorModal
          route={editingRoute}
          isOpen={true}
          onClose={() => setEditingRoute(null)}
          onSave={handleSaveEditedRoute}
        />
      )}

      {/* CTP Import Dialog */}
      {showImportDialog && (
        <div
          className="ctp-modal-backdrop"
          onClick={() => setShowImportDialog(false)}
        >
          <div
            className="ctp-import-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ctp-modal-header">
              <h3>📥 Importar Resolución Oficial CTP</h3>
              <button
                type="button"
                className="button button-subtle"
                onClick={() => setShowImportDialog(false)}
              >
                ✕
              </button>
            </div>

            <div className="ctp-modal-body">
              <p>
                Seleccione el origen del documento oficial para configurar automáticamente los 12 ramales, las paradas geocodificadas y la flota asignada:
              </p>

              <div className="import-options-grid">
                <div
                  className="import-option-card option-featured"
                  onClick={handleImportOfficialCtp}
                >
                  <span className="option-badge">Recomendado</span>
                  <h4>Cargar Resolución Oficial CTP-0557-2023 / ARESEP</h4>
                  <p>
                    Aplica automáticamente la estructura oficial de 39 buses (24 troncales, 15 ramales), las tarifas de ₡460/₡400 y las paradas geolocalizadas del cantón de Coronado.
                  </p>
                  <button type="button" className="button button-primary">
                    ⚡ Cargar Resolución Oficial CTP
                  </button>
                </div>

                <div className="import-option-card">
                  <h4>Subir Archivo de Concesión (JSON / GeoJSON)</h4>
                  <p>
                    Cargue un documento técnico emitido por el CTP o modificado por el operador con coordenadas GPS.
                  </p>
                  <label className="button button-subtle file-upload-label">
                    📁 Seleccionar archivo en disco…
                    <input
                      type="file"
                      accept=".json,.geojson"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="ctp-modal-footer">
              <button
                type="button"
                className="button button-subtle"
                onClick={() => setShowImportDialog(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
