import React, { useMemo, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import {
  type SimulationParameters,
  defaultSimulationParameters,
  simulationPresets,
} from '../config/operatorSettings'
import { RoutePlannerMap } from './RoutePlannerMap'
import { RouteManager } from './RouteManager'

interface SimulatorStudioProps {
  parameters: SimulationParameters
  onParametersChange: (newParams: SimulationParameters) => void
  onApply: () => Promise<void>
  onReset: () => Promise<void>
  isApplying: boolean
  applySuccess: boolean
  applyError: string | null
  routes?: FeatureCollection | null
  routeNames?: Map<string, string>
}

function haversineDistanceKm(p1: [number, number], p2: [number, number]): number {
  const R = 6371
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function SimulatorStudio({
  parameters,
  onParametersChange,
  onApply,
  onReset,
  isApplying,
  applySuccess,
  applyError,
  routes = null,
  routeNames,
}: SimulatorStudioProps) {
  // Top-level studio view switcher
  const [studioTab, setStudioTab] = useState<'routes_manager' | 'metrics' | 'planner'>('routes_manager')

  // Pillar tabs for metrics view
  const [activePillar, setActivePillar] = useState<'dispatch' | 'routes' | 'demand' | 'costs'>('dispatch')

  // Planner states
  const [selectedRouteId, setSelectedRouteId] = useState<string>('R142-05') // Default to San Rafael branch for direct comparison
  const [directRouteMode, setDirectRouteMode] = useState<boolean>(true)
  const [drawingMode, setDrawingMode] = useState<boolean>(false)
  const [customWaypoints, setCustomWaypoints] = useState<[number, number][]>([])
  const [showCtpModal, setShowCtpModal] = useState<boolean>(false)

  // Live real-time calculations based on current slider/form state
  const metrics = useMemo(() => {
    const totalFleet = parameters.ramales?.reduce((sum, r) => sum + r.busCount, 0) ?? parameters.totalFleetSize
    const paxPerDay = Math.round(28000 * parameters.demandScale)
    const peakBuses = Math.round(totalFleet * parameters.peakActiveShare)
    const valleyBuses = Math.round(totalFleet * parameters.valleyActiveShare)
    const nightBuses = Math.round(totalFleet * parameters.nightActiveShare)

    // ~7h peak (5-9, 16-19), ~7h valley (9-16), ~4h night (19-23)
    const dailyHours = peakBuses * 7 + valleyBuses * 7 + nightBuses * 4
    const dailyCost = dailyHours * parameters.costPerBusHour

    const effectiveFare = 440 * (1 - parameters.seniorShare) // weighted avg fare minus free seniors
    const breakevenPaxPerHour = effectiveFare > 0 ? parameters.costPerBusHour / effectiveFare : 32.0
    const avgPaxPerHour = dailyHours > 0 ? paxPerDay / dailyHours : 0

    const dailyRevenue = paxPerDay * effectiveFare
    const dailyNet = dailyRevenue - dailyCost

    // Valley calculation: valley demand is ~20% of peak, but buses are valleyBuses
    const valleyHoursRun = valleyBuses * 7
    const valleyCost = valleyHoursRun * parameters.costPerBusHour
    const valleyPax = paxPerDay * 0.22 // ~22% of total day rides happen during the 7 valley hours
    const valleyRevenue = valleyPax * effectiveFare
    const valleyDeficit = Math.max(0, valleyCost - valleyRevenue)

    return {
      totalFleet,
      paxPerDay,
      peakBuses,
      valleyBuses,
      nightBuses,
      dailyHours,
      dailyCost,
      effectiveFare,
      breakevenPaxPerHour,
      avgPaxPerHour,
      dailyRevenue,
      dailyNet,
      valleyDeficit,
    }
  }, [parameters])

  const updateRamalBusCount = (routeId: string, delta: number) => {
    if (!parameters.ramales) return
    const updated = parameters.ramales.map((r) => {
      if (r.routeId === routeId) {
        return { ...r, busCount: Math.max(0, r.busCount + delta) }
      }
      return r
    })
    const newTotal = updated.reduce((s, r) => s + r.busCount, 0)
    onParametersChange({
      ...parameters,
      ramales: updated,
      totalFleetSize: newTotal,
    })
  }

  // 24-hour curve generation for SVG chart
  const hourlyData = useMemo(() => {
    const hours = []
    for (let h = 5; h <= 23; h++) {
      let demandFactor = 0.15
      let activeBuses = metrics.nightBuses
      if ((h >= 5 && h < 9) || (h >= 16 && h < 19)) {
        demandFactor = h === 6 || h === 7 || h === 17 || h === 18 ? 0.95 : 0.75
        activeBuses = metrics.peakBuses
      } else if (h >= 9 && h < 16) {
        demandFactor = 0.22
        activeBuses = metrics.valleyBuses
      }
      const hourPax = Math.round(metrics.paxPerDay * (demandFactor / 8.5))
      const hourCost = activeBuses * parameters.costPerBusHour
      const hourRev = hourPax * metrics.effectiveFare
      const isProfitable = hourRev >= hourCost
      hours.push({ h, demandFactor, activeBuses, hourPax, hourCost, hourRev, isProfitable })
    }
    return hours
  }, [metrics, parameters.costPerBusHour])

  // Calculated distance for user drawn waypoints
  const drawnDistanceKm = useMemo(() => {
    if (customWaypoints.length < 2) return 0
    let total = 0
    for (let i = 0; i < customWaypoints.length - 1; i++) {
      total += haversineDistanceKm(customWaypoints[i], customWaypoints[i + 1])
    }
    return parseFloat(total.toFixed(2))
  }, [customWaypoints])

  const selectedRamal = useMemo(() => {
    return (parameters.ramales ?? defaultSimulationParameters.ramales).find(
      (r) => r.routeId === selectedRouteId,
    )
  }, [parameters.ramales, selectedRouteId])

  const routeDistanceKm = useMemo(() => {
    const feat = routes?.features.find((f) => f.properties?.routeId === selectedRouteId)
    return (feat?.properties?.km as number) ?? (selectedRouteId === 'R142' ? 11.33 : 3.5)
  }, [routes, selectedRouteId])

  return (
    <div className="simulator-studio">
      {/* Top Controls Header */}
      <div className="sim-header">
        <div className="sim-title-group">
          <div className="sim-badge-row">
            <span className="sim-badge">GEMELO DIGITAL & SIMULADOR DE FLOTA</span>
            <span className="sim-concession-badge">CTP Concesión Ruta 142 (39 Buses)</span>
          </div>
          <h2>Autobuses Unidos de Coronado S.A.</h2>
          <p className="sim-subtitle">
            Simulador técnico para evaluar despacho horario, optimización en valle y viabilidad de rutas directas sin transbordo.
          </p>
        </div>

        <div className="sim-actions-group">
          <div className="sim-presets-bar">
            <span className="preset-pill-label">Escenarios Rápidos:</span>
            <button
              type="button"
              className={`sim-preset-btn ${parameters.demandScale === 0.47 && parameters.valleyActiveShare === 0.55 ? 'active' : ''}`}
              onClick={() => onParametersChange(simulationPresets.official.parameters)}
            >
              Oficial CTP / ARESEP
            </button>
            <button
              type="button"
              className={`sim-preset-btn ${parameters.valleyActiveShare === 0.35 ? 'active' : ''}`}
              onClick={() => onParametersChange(simulationPresets.optimized.parameters)}
            >
              Ahorro Valle (-35% Flota)
            </button>
            <button
              type="button"
              className={`sim-preset-btn ${parameters.demandScale === 1.0 ? 'active' : ''}`}
              onClick={() => onParametersChange(simulationPresets.highDemand.parameters)}
            >
              Alta Demanda (28k pax)
            </button>
          </div>

          <div className="sim-cta-bar">
            <button
              type="button"
              className="button button-primary sim-apply-btn"
              disabled={isApplying}
              onClick={onApply}
            >
              {isApplying ? 'Reconfigurando flota…' : '⚡ Aplicar a la Simulación en Vivo'}
            </button>
            <button type="button" className="button button-subtle" onClick={onReset}>
              Restablecer Valores
            </button>
            {applySuccess && <span className="sim-success-pill">✓ Flota reconfigurada con éxito</span>}
            {applyError && <span className="sim-error-pill">⚠ {applyError}</span>}
          </div>
        </div>
      </div>

      {/* Main Mode Navigation Bar: Routes Manager vs Metrics vs Direct Corridor */}
      <div className="sim-subnav-bar">
        <div className="sim-subnav-tabs">
          <button
            type="button"
            className={`sim-subnav-tab ${studioTab === 'routes_manager' ? 'active' : ''}`}
            onClick={() => setStudioTab('routes_manager')}
          >
            🗺 Gestor Oficial de Rutas & Paradas CTP
          </button>
          <button
            type="button"
            className={`sim-subnav-tab ${studioTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setStudioTab('metrics')}
          >
            📊 Modelo de Flota & Finanzas (Despacho 24h)
          </button>
          <button
            type="button"
            className={`sim-subnav-tab ${studioTab === 'planner' ? 'active' : ''}`}
            onClick={() => setStudioTab('planner')}
          >
            ⚡ Simulación Directo vs. Transbordo Coronado
          </button>
        </div>
        <div className="sim-subnav-quickstat">
          <span>Punto de Equilibrio:</span>
          <strong>{metrics.breakevenPaxPerHour.toFixed(1)} pax / hora-bus</strong>
          <span className="stat-separator">•</span>
          <span>Flota Total:</span>
          <strong>{metrics.totalFleet} buses autorizados</strong>
        </div>
      </div>

      {/* VIEW 0: CTP ROUTE MANAGER (50/50 SPLIT SCREEN WITH STOPS & GPS CAPTURE) */}
      {studioTab === 'routes_manager' && (
        <div className="sim-routes-manager-container" style={{ minHeight: '620px', height: 'calc(100vh - 210px)' }}>
          <RouteManager
            routesGeoJson={routes}
            onUpdateParameters={(updatedRamales) => {
              const newTotal = updatedRamales.reduce((sum, r) => sum + r.busCount, 0)
              onParametersChange({
                ...parameters,
                ramales: updatedRamales,
                totalFleetSize: newTotal,
              })
            }}
          />
        </div>
      )}

      {/* VIEW 1: METRICS & DISPATCH 24H */}
      {studioTab === 'metrics' && (
        <div className="sim-workspace">
          {/* Left Column: Live Analytics & Dynamic Visuals */}
          <div className="sim-analytics-col">
            {/* Card 1: Pulso Financiero y Punto de Equilibrio */}
            <div className="sim-card sim-pulse-card">
              <div className="sim-card-header">
                <div>
                  <span className="sim-card-tag">INDICADOR OPERATIVO CLAVE</span>
                  <h3>Pulso Financiero & Punto de Equilibrio</h3>
                </div>
                <span
                  className={`sim-status-pill ${
                    metrics.avgPaxPerHour >= metrics.breakevenPaxPerHour ? 'pill-good' : 'pill-bad'
                  }`}
                >
                  {metrics.avgPaxPerHour >= metrics.breakevenPaxPerHour
                    ? '● Operación en Superávit'
                    : '▲ Déficit en Horas Valle'}
                </span>
              </div>

              <div className="sim-pulse-metrics">
                <div className="sim-gauge-metric">
                  <div className="sim-metric-val">
                    {metrics.avgPaxPerHour.toFixed(1)}
                    <span className="sim-unit">pax / hora-bus</span>
                  </div>
                  <div className="sim-gauge-bar-wrapper">
                    <div
                      className="sim-gauge-bar-fill"
                      style={{
                        width: `${Math.min(100, (metrics.avgPaxPerHour / 45) * 100)}%`,
                        backgroundColor:
                          metrics.avgPaxPerHour >= metrics.breakevenPaxPerHour ? 'var(--good)' : 'var(--bad)',
                      }}
                    />
                    <div
                      className="sim-gauge-target-line"
                      style={{ left: `${(metrics.breakevenPaxPerHour / 45) * 100}%` }}
                      title={`Punto de equilibrio: ${metrics.breakevenPaxPerHour.toFixed(1)} pax/h`}
                    />
                  </div>
                  <div className="sim-gauge-legend">
                    <span>0</span>
                    <span className="sim-legend-target">
                      Equilibrio: {metrics.breakevenPaxPerHour.toFixed(1)} pax/h
                    </span>
                    <span>45</span>
                  </div>
                </div>

                <div className="sim-kpi-grid">
                  <div className="sim-mini-kpi">
                    <span className="kpi-label">Ingreso Diario Estimado</span>
                    <strong className="kpi-num">₡{(metrics.dailyRevenue / 1e6).toFixed(2)} M</strong>
                    <span className="kpi-sub">{metrics.paxPerDay.toLocaleString()} pax/día</span>
                  </div>
                  <div className="sim-mini-kpi">
                    <span className="kpi-label">Costo Operativo Diario</span>
                    <strong className="kpi-num">₡{(metrics.dailyCost / 1e6).toFixed(2)} M</strong>
                    <span className="kpi-sub">{metrics.dailyHours.toFixed(0)} horas-bus</span>
                  </div>
                  <div
                    className={`sim-mini-kpi ${
                      metrics.dailyNet >= 0 ? 'sim-kpi-positive' : 'sim-kpi-negative'
                    }`}
                  >
                    <span className="kpi-label">Resultado Neto Diario</span>
                    <strong className="kpi-num">
                      {metrics.dailyNet >= 0 ? '+' : ''}₡{Math.round(metrics.dailyNet).toLocaleString()}
                    </strong>
                    <span className="kpi-sub">
                      {metrics.dailyNet >= 0 ? 'Margen operativo positivo' : 'Déficit por sobre-oferta'}
                    </span>
                  </div>
                  <div className="sim-mini-kpi sim-kpi-warning">
                    <span className="kpi-label">Déficit en Valle (09h-16h)</span>
                    <strong className="kpi-num">₡{Math.round(metrics.valleyDeficit).toLocaleString()}</strong>
                    <span className="kpi-sub">
                      {metrics.valleyBuses} buses en valle ({Math.round(parameters.valleyActiveShare * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Curva de Despacho vs Demanda (24 Horas) */}
            <div className="sim-card">
              <div className="sim-card-header">
                <div>
                  <span className="sim-card-tag">DESPACHO HORARIO</span>
                  <h3>Curva de Oferta de Flota vs Demanda Real (05h – 23h)</h3>
                </div>
                <div className="sim-legend-row">
                  <span className="legend-item">
                    <span className="legend-box box-blue" /> Demanda estimada
                  </span>
                  <span className="legend-item">
                    <span className="legend-box box-amber" /> Flota activa en calle
                  </span>
                  <span className="legend-item">
                    <span className="legend-box box-red-zone" /> Zona de pérdida valle
                  </span>
                </div>
              </div>

              <div className="sim-chart-container">
                <svg className="sim-hourly-svg" viewBox="0 0 760 160" preserveAspectRatio="none">
                  {/* Valley highlight background (hours 9 to 16) */}
                  <rect x="160" y="10" width="280" height="130" fill="rgba(239, 68, 68, 0.08)" rx="4" />
                  <text x="300" y="24" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="600">
                    Valle bajo punto de equilibrio (09:00 – 16:00)
                  </text>

                  {/* Hourly bars: cost vs revenue */}
                  {hourlyData.map((d, i) => {
                    const x = 30 + i * 38
                    const barHeight = Math.min(100, (d.activeBuses / 39) * 90)
                    const y = 140 - barHeight
                    const isValley = d.h >= 9 && d.h < 16
                    return (
                      <g key={d.h}>
                        <rect
                          x={x}
                          y={y}
                          width="24"
                          height={barHeight}
                          fill={isValley ? 'rgba(239, 68, 68, 0.35)' : 'rgba(15, 118, 110, 0.35)'}
                          stroke={isValley ? '#ef4444' : '#0f766e'}
                          strokeWidth="1"
                          rx="3"
                        />
                        <circle
                          cx={x + 12}
                          cy={140 - d.demandFactor * 115}
                          r="4"
                          fill="#1f6feb"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                        <text x={x + 12} y="154" textAnchor="middle" fill="var(--muted)" fontSize="10">
                          {d.h}h
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
              <div className="sim-chart-caption">
                Reducir la flota en valle (por ejemplo al 35 %) ahorra diésel y salarios exactamente en la franja roja sin sacrificar los picos.
              </div>
            </div>

            {/* Quick Link Card to Route Planner */}
            <div className="sim-card sim-route-promo-card">
              <div className="route-promo-content">
                <div>
                  <span className="sim-card-tag">MODELO DE CONCESIÓN CORONADO</span>
                  <h4>¿Es óptimo el transbordo forzoso en la Terminal de Coronado?</h4>
                  <p>
                    El CTP dictamina que los pasajeros bajen en Coronado centro y aborden un ramal. Explore en el mapa la alternativa de <strong>Servicio Directo en Hora Pico</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setStudioTab('planner')}
                >
                  Abrir Planificador de Rutas →
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: The 4 Modeling Controls (Tabs & Forms) */}
          <div className="sim-controls-col">
            <div className="sim-controls-card">
              {/* Pillar Navigation Tabs */}
              <div className="sim-pillar-tabs">
                <button
                  type="button"
                  className={`pillar-tab ${activePillar === 'dispatch' ? 'active' : ''}`}
                  onClick={() => setActivePillar('dispatch')}
                >
                  ⏱ Despacho & Horas
                </button>
                <button
                  type="button"
                  className={`pillar-tab ${activePillar === 'routes' ? 'active' : ''}`}
                  onClick={() => setActivePillar('routes')}
                >
                  🚌 Flota & 12 Ramales
                </button>
                <button
                  type="button"
                  className={`pillar-tab ${activePillar === 'demand' ? 'active' : ''}`}
                  onClick={() => setActivePillar('demand')}
                >
                  👥 Demanda & Tarifas
                </button>
                <button
                  type="button"
                  className={`pillar-tab ${activePillar === 'costs' ? 'active' : ''}`}
                  onClick={() => setActivePillar('costs')}
                >
                  ⛽ Costos & Diésel
                </button>
              </div>

              {/* Pillar 1: Despacho Horario */}
              {activePillar === 'dispatch' && (
                <div className="pillar-body">
                  <h4>Control de Flota Activa por Franja Horaria</h4>
                  <p className="pillar-desc">
                    Ajuste la cantidad de buses que salen a rodar en cada franja del día. Reducir la flota en valle es la palanca principal de ahorro.
                  </p>

                  <div className="sim-control-group">
                    <div className="control-label-row">
                      <span>Flota en Hora Pico (05:00–09:00 y 16:00–19:00)</span>
                      <strong>
                        {Math.round(parameters.peakActiveShare * 100)}% ({metrics.peakBuses} buses)
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="1.0"
                      step="0.05"
                      value={parameters.peakActiveShare}
                      onChange={(e) =>
                        onParametersChange({ ...parameters, peakActiveShare: parseFloat(e.target.value) })
                      }
                    />
                  </div>

                  <div className="sim-control-group sim-group-highlight">
                    <div className="control-label-row">
                      <span>Flota en Valle Mediodía (09:00–16:00)</span>
                      <strong className={parameters.valleyActiveShare <= 0.4 ? 'text-good' : 'text-bad'}>
                        {Math.round(parameters.valleyActiveShare * 100)}% ({metrics.valleyBuses} buses)
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={parameters.valleyActiveShare}
                      onChange={(e) =>
                        onParametersChange({ ...parameters, valleyActiveShare: parseFloat(e.target.value) })
                      }
                    />
                    <div className="control-hint">
                      {parameters.valleyActiveShare <= 0.4 ? (
                        <span className="text-good">
                          ✓ Flota reducida en valle: Ahorro proyectado de ₡
                          {Math.round((0.55 - parameters.valleyActiveShare) * metrics.totalFleet * 7 * parameters.costPerBusHour).toLocaleString()} / día.
                        </span>
                      ) : (
                        <span className="text-muted">
                          Consejo: Reduzca al 35%–40% para evitar viajes vacíos en horas que no cubren costos.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sim-control-group">
                    <div className="control-label-row">
                      <span>Flota en Noche (19:00–23:00)</span>
                      <strong>
                        {Math.round(parameters.nightActiveShare * 100)}% ({metrics.nightBuses} buses)
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.05"
                      value={parameters.nightActiveShare}
                      onChange={(e) =>
                        onParametersChange({ ...parameters, nightActiveShare: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </div>
              )}

              {/* Pillar 2: Flota por Ramal */}
              {activePillar === 'routes' && (
                <div className="pillar-body">
                  <div className="routes-header-row">
                    <div>
                      <h4>Distribución de 39 Buses por Ramal</h4>
                      <p className="pillar-desc">
                        Asignación autorizada por CTP. Sume o reste unidades por rama.
                      </p>
                    </div>
                    <span className="sim-total-fleet-badge">
                      Total Asignado: <strong>{metrics.totalFleet} buses</strong>
                    </span>
                  </div>

                  <div className="sim-ramales-list">
                    {(parameters.ramales ?? defaultSimulationParameters.ramales).map((r) => (
                      <div key={r.routeId} className="sim-ramal-row">
                        <div className="ramal-info">
                          <span className="ramal-id">{r.routeId}</span>
                          <strong className="ramal-name">{r.name}</strong>
                          <span className="ramal-fare">Tarifa ₡{r.fare ?? 400}</span>
                        </div>
                        <div className="ramal-stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => updateRamalBusCount(r.routeId, -1)}
                            disabled={r.busCount <= 0}
                          >
                            −
                          </button>
                          <span className="stepper-count">{r.busCount}</span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => updateRamalBusCount(r.routeId, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pillar 3: Demanda & Pasajeros */}
              {activePillar === 'demand' && (
                <div className="pillar-body">
                  <h4>Nivel de Demanda y Pasajeros</h4>
                  <p className="pillar-desc">
                    Calibrado a la resolución oficial de ARESEP (RE-0025-IT-2024): 395 787 pasajeros/mes (~13 012 pax/día).
                  </p>

                  <div className="sim-control-group">
                    <div className="control-label-row">
                      <span>Factor de Demanda Global</span>
                      <strong>
                        {Math.round(parameters.demandScale * 100)}% (~{metrics.paxPerDay.toLocaleString()} pax/día)
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.5"
                      step="0.01"
                      value={parameters.demandScale}
                      onChange={(e) =>
                        onParametersChange({ ...parameters, demandScale: parseFloat(e.target.value) })
                      }
                    />
                    <div className="control-hint">
                      Oficial ARESEP = 47% (~13 012 pax). 100% = 28 000 pax (supuesto inicial).
                    </div>
                  </div>

                  <div className="sim-control-group">
                    <div className="control-label-row">
                      <span>Proporción Adulto Mayor (Exonerados ₡0)</span>
                      <strong>{Math.round(parameters.seniorShare * 100)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.25"
                      step="0.01"
                      value={parameters.seniorShare}
                      onChange={(e) =>
                        onParametersChange({ ...parameters, seniorShare: parseFloat(e.target.value) })
                      }
                    />
                    <div className="control-hint">
                      Censo INEC 2022: 12.0% de la población del cantón de Coronado tiene 65+ años.
                    </div>
                  </div>
                </div>
              )}

              {/* Pillar 4: Costos & Diésel */}
              {activePillar === 'costs' && (
                <div className="pillar-body">
                  <h4>Estructura de Costos de Operación</h4>
                  <p className="pillar-desc">
                    Cálculo técnico basado en combustible, chofer (decreto salarial 2026), mantenimiento y depreciación.
                  </p>

                  <div className="sim-control-group">
                    <div className="control-label-row">
                      <span>Costo por Hora-Bus en Servicio</span>
                      <strong>₡{parameters.costPerBusHour.toLocaleString()} / hora</strong>
                    </div>
                    <input
                      type="range"
                      min="9000"
                      max="18000"
                      step="250"
                      value={parameters.costPerBusHour}
                      onChange={(e) =>
                        onParametersChange({ ...parameters, costPerBusHour: parseFloat(e.target.value) })
                      }
                    />
                    <div className="control-hint">
                      Rango técnico estimado: ₡10 500 – ₡16 550 por hora-bus (base ₡12 950).
                    </div>
                  </div>

                  <div className="sim-cost-summary-box">
                    <div className="cost-row">
                      <span>Diésel de referencia (ARESEP Oct 2026):</span>
                      <strong>₡785 / litro</strong>
                    </div>
                    <div className="cost-row">
                      <span>Rendimiento estimado de flota:</span>
                      <strong>2.8 km / litro</strong>
                    </div>
                    <div className="cost-row">
                      <span>Salario chofer pesado (decreto 2026):</span>
                      <strong>₡419 756 / mes (+cargas)</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ROUTE & NETWORK PLANNER (SINGLE ROUTE, MAP & DIRECT VS HUB COMPARISON) */}
      {studioTab === 'planner' && (
        <div className="sim-planner-workspace">
          {/* Left / Center: Interactive Corridor Map */}
          <div className="sim-map-card">
            <div className="sim-map-toolbar">
              <div className="toolbar-left">
                <label className="route-select-label">
                  <span>Seleccionar Ruta / Ramal:</span>
                  <select
                    className="sim-route-dropdown"
                    value={selectedRouteId}
                    onChange={(e) => {
                      setSelectedRouteId(e.target.value)
                      if (e.target.value === 'R142') setDirectRouteMode(false)
                    }}
                  >
                    <option value="R142">Ruta 142 · Troncal San José – Coronado Centro (11.3 km)</option>
                    <option value="R142-01">Ramal Cascajal (19.1 km · Tarifa ₡460)</option>
                    <option value="R142-02">Ramal Las Nubes (6.5 km · Tarifa ₡460)</option>
                    <option value="R142-03">Ramal Dulce Nombre (1.8 km · Tarifa ₡400)</option>
                    <option value="R142-04">Ramal Patio de Agua (6.1 km · Tarifa ₡400)</option>
                    <option value="R142-05">Ramal San Rafael (2.3 km · Tarifa ₡400)</option>
                    <option value="R142-06">Ramal Patalillo (2.5 km · Tarifa ₡400)</option>
                    <option value="R142-07">Ramal San Pedro (1.4 km · Tarifa ₡400)</option>
                    <option value="R142-08">Ramal El Rodeo (3.8 km · Tarifa ₡400)</option>
                    <option value="R142-09">Ramal San Francisco (2.6 km · Tarifa ₡400)</option>
                    <option value="R142-10">Ramal La Colmena (3.0 km · Tarifa ₡400)</option>
                  </select>
                </label>

                {selectedRouteId !== 'R142' && (
                  <button
                    type="button"
                    className={`button button-small ${directRouteMode ? 'button-primary' : 'button-subtle'}`}
                    onClick={() => setDirectRouteMode(!directRouteMode)}
                  >
                    {directRouteMode ? '⚡ Viendo Corredor Directo' : '⚡ Simular Corredor Directo'}
                  </button>
                )}
              </div>

              <div className="toolbar-right">
                <button
                  type="button"
                  className={`button button-small ${drawingMode ? 'button-warn' : 'button-subtle'}`}
                  onClick={() => setDrawingMode(!drawingMode)}
                >
                  {drawingMode ? '✕ Cerrar Trazador' : '✏ Trazar Variante en Mapa'}
                </button>
                {customWaypoints.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="button button-small button-subtle"
                      onClick={() => setCustomWaypoints((w) => w.slice(0, -1))}
                    >
                      Deshacer punto
                    </button>
                    <button
                      type="button"
                      className="button button-small button-subtle"
                      onClick={() => setCustomWaypoints([])}
                    >
                      Limpiar trazo
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Drawing mode instructions bar */}
            {drawingMode && (
              <div className="drawing-mode-banner">
                <span>
                  👆 <strong>Modo Trazador Activo:</strong> Haga clic en el mapa sobre las calles para agregar paradas o una variante de recorrido.
                </span>
                <span className="drawing-stat">
                  Puntos: <strong>{customWaypoints.length}</strong> · Distancia: <strong>{drawnDistanceKm} km</strong> · Tiempo est.: <strong>{Math.round((drawnDistanceKm / 20) * 60)} min</strong>
                </span>
              </div>
            )}

            {/* Map Container */}
            <div className="map-wrapper-element">
              <RoutePlannerMap
                routes={routes}
                selectedRouteId={selectedRouteId}
                directRouteMode={directRouteMode}
                drawingMode={drawingMode}
                customWaypoints={customWaypoints}
                onAddWaypoint={(pt) => setCustomWaypoints((prev) => [...prev, pt])}
              />
            </div>
          </div>

          {/* Right Panel: Corridor Technical Details & Direct vs Transfer Analysis */}
          <div className="sim-route-analysis-col">
            {/* Route Technical Specifications Card */}
            <div className="sim-card route-spec-card">
              <div className="sim-card-header">
                <div>
                  <span className="sim-card-tag">FICHA DE RUTA AUTORIZADA</span>
                  <h3>{selectedRamal?.name ?? selectedRouteId}</h3>
                </div>
                <span className="route-tariff-pill">Tarifa ₡{selectedRamal?.fare ?? 400}</span>
              </div>

              <div className="route-quick-grid">
                <div className="route-grid-item">
                  <span className="item-label">Longitud Recorrido</span>
                  <strong className="item-val">{routeDistanceKm} km</strong>
                  <span className="item-sub">Por sentido</span>
                </div>
                <div className="route-grid-item">
                  <span className="item-label">Tiempo Ciclo (Ida/Vuelta)</span>
                  <strong className="item-val">
                    {selectedRouteId === 'R142' ? '65 min' : `${Math.round(routeDistanceKm * 4.5 + 10)} min`}
                  </strong>
                  <span className="item-sub">Tránsito normal</span>
                </div>
                <div className="route-grid-item">
                  <span className="item-label">Flota Asignada CTP</span>
                  <strong className="item-val">{selectedRamal?.busCount ?? 0} buses</strong>
                  <span className="item-sub">En franja pico</span>
                </div>
                <div className="route-grid-item">
                  <span className="item-label">Frecuencia / Intervalo</span>
                  <strong className="item-val">
                    {selectedRamal && selectedRamal.busCount > 0
                      ? `${Math.round(
                          (selectedRouteId === 'R142' ? 65 : routeDistanceKm * 4.5 + 10) /
                            selectedRamal.busCount,
                        )} min`
                      : 'Bajo demanda'}
                  </strong>
                  <span className="item-sub">Paso entre unidades</span>
                </div>
              </div>

              <div className="ramal-stepper-row">
                <span>Modificar unidades asignadas a esta ruta:</span>
                <div className="ramal-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => updateRamalBusCount(selectedRouteId, -1)}
                    disabled={(selectedRamal?.busCount ?? 0) <= 0}
                  >
                    −
                  </button>
                  <span className="stepper-count">{selectedRamal?.busCount ?? 0}</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => updateRamalBusCount(selectedRouteId, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Route vs Hub-and-Spoke Comparison */}
            {selectedRouteId !== 'R142' ? (
              <div className="sim-card corridor-comparison-card">
                <div className="sim-card-header">
                  <div>
                    <span className="sim-card-tag">EVALUACIÓN DE EFICIENCIA OPERATIVA</span>
                    <h3>Transbordo en Terminal vs. Servicio Directo</h3>
                  </div>
                </div>

                <div className="comparison-scenarios-grid">
                  {/* Scenario A: Current with Transfer */}
                  <div className="scenario-card scenario-current">
                    <span className="scenario-badge">Operación Actual (CTP)</span>
                    <h4>Troncal R142 + Transbordo en Coronado Centro</h4>
                    <p className="scenario-text">
                      El pasajero viaja en bus troncal de San José a la terminal en Coronado, desciende, espera en andén y transborda al ramal hacia {selectedRamal?.name.replace('Ramal ', '')}.
                    </p>
                    <ul className="scenario-metrics-list">
                      <li>
                        <span>Tiempo de viaje San José ➔ Destino:</span>
                        <strong>~58 min</strong>
                      </li>
                      <li>
                        <span>Tiempo de espera en terminal Coronado:</span>
                        <strong className="text-bad">14 min promedio</strong>
                      </li>
                      <li>
                        <span>Buses requeridos para el viaje:</span>
                        <strong>2 unidades distintas</strong>
                      </li>
                      <li>
                        <span>Impacto en la demanda:</span>
                        <strong className="text-bad">Fuga hacia transporte pirata / informal</strong>
                      </li>
                    </ul>
                  </div>

                  {/* Scenario B: Direct Peak Route */}
                  <div className="scenario-card scenario-direct">
                    <span className="scenario-badge badge-direct">Propuesta Simulada</span>
                    <h4>Servicio Directo San José ➔ {selectedRamal?.name.replace('Ramal ', '')}</h4>
                    <p className="scenario-text">
                      Unidad directa en horas pico (06:00–08:30 y 16:30–19:00). La unidad continúa sin obligar a los pasajeros a descender en la terminal de Coronado centro.
                    </p>
                    <ul className="scenario-metrics-list">
                      <li>
                        <span>Tiempo de viaje San José ➔ Destino:</span>
                        <strong className="text-good">~39 min (-19 min de ahorro)</strong>
                      </li>
                      <li>
                        <span>Transbordos obligatorios:</span>
                        <strong className="text-good">0 transbordos</strong>
                      </li>
                      <li>
                        <span>Ocupación proyectada en pico:</span>
                        <strong className="text-good">78% (rentable sobre el punto de equilibrio)</strong>
                      </li>
                      <li>
                        <span>Incremento estimado de pasajeros:</span>
                        <strong className="text-good">+14% al recapturar usuarios perdidos</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="comparison-cta-box">
                  <div className="ctp-explanation">
                    <strong>Requisito Legal CTP (Ley 3503 y ARESEP RE-0025-IT-2024):</strong> Las empresas concesionarias pueden operar extensiones directas si demuestran capacidad de flota disponible y beneficio comprobado para el usuario sin perjudicar frecuencias troncales.
                  </div>
                  <button
                    type="button"
                    className="button button-primary ctp-modal-btn"
                    onClick={() => setShowCtpModal(true)}
                  >
                    📄 Ver Ficha Técnica para Trámite ante CTP
                  </button>
                </div>
              </div>
            ) : (
              <div className="sim-card trunk-info-card">
                <span className="sim-card-tag">COLUMNA VERTEBRAL DE LA CONCESIÓN</span>
                <h3>Troncal 142 · San José – Coronado Centro</h3>
                <p>
                  Con 24 de los 39 buses autorizados, el troncal canaliza el 76% de la demanda diaria (10,000+ pax). Conecta el Parque Central de San José con la Iglesia y Terminal de Coronado cruzando Guadalupe y Moravia.
                </p>
                <div className="trunk-kpis-list">
                  <div className="trunk-kpi">
                    <span>Flota troncal pico:</span>
                    <strong>24 buses</strong>
                  </div>
                  <div className="trunk-kpi">
                    <span>Frecuencia en pico:</span>
                    <strong>Cada 3.5 min</strong>
                  </div>
                  <div className="trunk-kpi">
                    <span>Frecuencia en valle:</span>
                    <strong>Cada 7 a 9 min</strong>
                  </div>
                  <div className="trunk-kpi">
                    <span>Rendimiento diésel:</span>
                    <strong>2.7 km / L (presas en Guadalupe)</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTP MODAL / REPORT */}
      {showCtpModal && (
        <div className="ctp-modal-backdrop" onClick={() => setShowCtpModal(false)}>
          <div className="ctp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="ctp-modal-header">
              <div>
                <span className="ctp-doc-badge">DOCUMENTO TÉCNICO JUSTIFICATIVO</span>
                <h3>Solicitud de Optimización Operativa de Concesión</h3>
                <p>Consejo de Transporte Público (CTP) · Regulación Tarifaria ARESEP</p>
              </div>
              <button
                type="button"
                className="ctp-close-btn"
                onClick={() => setShowCtpModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="ctp-modal-body">
              <div className="ctp-doc-meta">
                <div><strong>Operador Concesionario:</strong> Autobuses Unidos de Coronado S.A.</div>
                <div><strong>Código de Concesión:</strong> CTP-R142 / ARESEP RE-0115-IT-2026</div>
                <div><strong>Flota Autorizada Total:</strong> 39 unidades</div>
                <div><strong>Ramal Objeto de Estudio:</strong> {selectedRamal?.name} ({selectedRouteId})</div>
              </div>

              <div className="ctp-section">
                <h4>1. Justificación Operativa</h4>
                <p>
                  La actual configuración obliga al 100% de los usuarios que viajan hacia {selectedRamal?.name.replace('Ramal ', '')} a descender en la Terminal Central de Coronado, generando un tiempo de transbordo ineficiente de 14 minutos. Esto ha provocado la pérdida de demanda hacia modalidades de transporte no autorizado (piratería y porteo informal).
                </p>
              </div>

              <div className="ctp-section">
                <h4>2. Propuesta de Servicio Directo en Franja Pico</h4>
                <p>
                  Se propone asignar 1 unidad de la flota autorizada para operar en servicio directo desde la Terminal San José (Parque Central) directamente hasta {selectedRamal?.name.replace('Ramal ', '')} en las siguientes franjas de máxima afluencia:
                </p>
                <ul>
                  <li>Pico Mañana: 06:15 y 07:00 (Sentido Coronado ➔ San José)</li>
                  <li>Pico Tarde: 16:45, 17:30 y 18:15 (Sentido San José ➔ Coronado)</li>
                </ul>
              </div>

              <div className="ctp-section">
                <h4>3. Indicadores de Impacto Económico y al Usuario</h4>
                <div className="ctp-stats-table">
                  <div className="table-row">
                    <span>Ahorro neto de tiempo por pasajero:</span>
                    <strong>19 minutos por viaje (-33%)</strong>
                  </div>
                  <div className="table-row">
                    <span>Punto de equilibrio de la unidad directa:</span>
                    <strong>32.0 pax / hora-bus</strong>
                  </div>
                  <div className="table-row">
                    <span>Ocupación estimada en franja pico:</span>
                    <strong>45–52 pax / carrera (Superávit operativo)</strong>
                  </div>
                  <div className="table-row">
                    <span>Impacto en la flota del Troncal R142:</span>
                    <strong>Neutral (Utiliza unidades de refuerzo sin reducir frecuencias troncales)</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="ctp-modal-footer">
              <button
                type="button"
                className="button button-subtle"
                onClick={() => setShowCtpModal(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => {
                  alert('Ficha técnica generada. Puede imprimirla o exportarla en PDF desde el navegador (Ctrl+P).')
                  window.print()
                }}
              >
                🖨 Imprimir / Exportar a PDF para CTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
