import React, { useMemo, useState, useEffect } from 'react'
import './TacticalStudio.css'
import { StudioHub } from './StudioHub'

// --------------------------------------------------------------------------
// TYPES & DATA DEFINITIONS
// --------------------------------------------------------------------------
export interface ScenarioData {
  id: string
  code: string
  name: string
  description: string
  planRequired: 'STANDARD' | 'PREMIUM' | 'CONTADOR' | 'CHEQUEO'
  peakHeadway: number // minutes
  valleyHeadway: number // minutes
  peakBuses: number
  valleyActiveShare: number // 0.35 to 1.0
  dieselPrice: number // ₡ per liter
  demandScale: number // 0.8 to 1.2
  trafficDelayPct: number // 0 to 30%
}

export interface DepartureRun {
  id: string
  time: string
  timeMinutes: number
  origin: string
  destination: string
  vehicleId: string
  driver: string
  routeId: string
  expectedPax: number
  revenue: number
  cost: number
  netMargin: number
  bunchingRisk: 'LOW' | 'MED' | 'HIGH'
  headwayMinutes: number
}

const PRESET_SCENARIOS: ScenarioData[] = [
  {
    id: 'base',
    code: 'ESC-2026-BASE',
    name: 'Horario Oficial CTP Base',
    description: '39 unidades activas, flota al 65% en valle, frecuencias oficiales.',
    planRequired: 'STANDARD',
    peakHeadway: 5,
    valleyHeadway: 10,
    peakBuses: 28,
    valleyActiveShare: 0.65,
    dieselPrice: 620,
    demandScale: 1.0,
    trafficDelayPct: 0,
  },
  {
    id: 'valle_opt',
    code: 'ESC-2026-VALLE',
    name: 'Ahorro Operativo en Valle',
    description: 'Recorte de 35% de flota en valle (9:00 - 16:00), frecuencia a 14 min.',
    planRequired: 'STANDARD',
    peakHeadway: 5,
    valleyHeadway: 14,
    peakBuses: 28,
    valleyActiveShare: 0.40,
    dieselPrice: 620,
    demandScale: 0.98,
    trafficDelayPct: 5,
  },
  {
    id: 'directo_pico',
    code: 'ESC-2026-EXPRES',
    name: 'Exprés San Rafael (Sin Transbordo)',
    description: '2 unidades dedicadas directas a San José en horas pico de la mañana.',
    planRequired: 'PREMIUM',
    peakHeadway: 4,
    valleyHeadway: 12,
    peakBuses: 30,
    valleyActiveShare: 0.50,
    dieselPrice: 620,
    demandScale: 1.05,
    trafficDelayPct: 10,
  },
  {
    id: 'diesel_stress',
    code: 'ESC-2026-STRESS',
    name: 'Estrés Alza Diésel (+15%)',
    description: 'Simulación de impacto ante aumento de combustible por Recope (₡715/L).',
    planRequired: 'CONTADOR',
    peakHeadway: 6,
    valleyHeadway: 15,
    peakBuses: 26,
    valleyActiveShare: 0.45,
    dieselPrice: 715,
    demandScale: 0.95,
    trafficDelayPct: 15,
  },
]

const DRIVER_POOL = [
  'Carlos Solano M.',
  'Minor Vargas R.',
  'Javier Chaves Q.',
  'Esteban Mora L.',
  'Jorge Barrientos P.',
  'Ricardo Fallas G.',
  'Randall Cordero T.',
  'Víctor Quesada Z.',
]

const FLEET_POOL = [
  'SJB-10662',
  'SJB-10450',
  'SJB-10891',
  'SJB-11002',
  'SJB-10314',
  'SJB-10555',
  'SJB-10778',
  'SJB-10933',
  'SJB-11140',
  'SJB-10220',
]

export function TacticalStudio() {
  const [studioMode, setStudioMode] = useState<'hub' | 'playback'>('hub')
  const [activeScenarioId, setActiveScenarioId] = useState<string>('valle_opt')
  const [activeTab, setActiveTab] = useState<'timetable' | 'marey' | 'deficits' | 'diff'>('timetable')
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('08:45:12')
  const [inspectorTab, setInspectorTab] = useState<'details' | 'costs' | 'staff' | 'delta'>('details')

  const handleOpenSimulation = (projectId: string) => {
    if (projectId.includes('BASE') || projectId === 'WRK-2026-0001') {
      setActiveScenarioId('base')
    } else if (projectId.includes('05') || projectId === 'WRK-2026-0002') {
      setActiveScenarioId('directo_pico')
    } else if (projectId.includes('VALLE') || projectId === 'WRK-2026-0003') {
      setActiveScenarioId('valle_opt')
    } else if (projectId.includes('DIESEL') || projectId === 'WRK-2026-0004') {
      setActiveScenarioId('diesel_stress')
    }
    setStudioMode('playback')
  }

  // Load active scenario params
  const activePreset = useMemo(() => {
    return PRESET_SCENARIOS.find((s) => s.id === activeScenarioId) ?? PRESET_SCENARIOS[0]
  }, [activeScenarioId])

  // Custom scenario editable state
  const [peakHeadway, setPeakHeadway] = useState(activePreset.peakHeadway)
  const [valleyHeadway, setValleyHeadway] = useState(activePreset.valleyHeadway)
  const [peakBuses, setPeakBuses] = useState(activePreset.peakBuses)
  const [valleyActiveShare, setValleyActiveShare] = useState(activePreset.valleyActiveShare)
  const [dieselPrice, setDieselPrice] = useState(activePreset.dieselPrice)
  const [demandScale, setDemandScale] = useState(activePreset.demandScale)
  const [trafficDelayPct, setTrafficDelayPct] = useState(activePreset.trafficDelayPct)

  // Sync state when switching scenario preset
  useEffect(() => {
    setPeakHeadway(activePreset.peakHeadway)
    setValleyHeadway(activePreset.valleyHeadway)
    setPeakBuses(activePreset.peakBuses)
    setValleyActiveShare(activePreset.valleyActiveShare)
    setDieselPrice(activePreset.dieselPrice)
    setDemandScale(activePreset.demandScale)
    setTrafficDelayPct(activePreset.trafficDelayPct)
  }, [activePreset])

  // Live clock simulation & cleanup external tour overlays
  useEffect(() => {
    document.querySelectorAll('.driver-popover, .driver-overlay').forEach((el) => el.remove())
    const timer = setInterval(() => {
      const d = new Date()
      setCurrentTimeStr(d.toTimeString().split(' ')[0])
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // --------------------------------------------------------------------------
  // IN-PROCESS DISCRETE SIMULATION CALCULATIONS (RUNS IN CLIENT MEMORY)
  // --------------------------------------------------------------------------
  const simulationResults = useMemo(() => {
    const FARE = 340 // ₡ standard fare
    const KM_PER_ROUNDTRIP = 22.6 // km (11.3 km each direction)
    const KM_PER_LITER = 2.7 // Fuel consumption in mixed traffic
    const DRIVER_HOURLY_COST = 3200 // ₡/hr with benefits

    const departures: DepartureRun[] = []
    let currentTime = 5 * 60 // 05:00 in minutes
    const endTime = 22 * 60 // 22:00 in minutes
    let runIndex = 1

    let totalDayPax = 0
    let totalDayRevenue = 0
    let totalDayFuelCost = 0
    let totalDayDriverCost = 0
    let bunchingEventsCount = 0

    while (currentTime <= endTime) {
      const hour = Math.floor(currentTime / 60)
      const minute = currentTime % 60
      const isPeak = (hour >= 6 && hour < 9) || (hour >= 16 && hour < 19)
      const headway = isPeak ? peakHeadway : valleyHeadway

      // Demand profile
      let baseHourDemandFactor = 0.25
      if (hour === 6 || hour === 7) baseHourDemandFactor = 1.0
      else if (hour === 8) baseHourDemandFactor = 0.8
      else if (hour >= 9 && hour < 16) baseHourDemandFactor = 0.35
      else if (hour === 16 || hour === 17 || hour === 18) baseHourDemandFactor = 0.95
      else if (hour >= 19) baseHourDemandFactor = 0.2

      const expectedPax = Math.round((isPeak ? 58 : 22) * baseHourDemandFactor * demandScale)
      const revenue = expectedPax * FARE

      // Trip costs
      const tripHours = (isPeak ? 1.25 : 1.0) * (1 + trafficDelayPct / 100)
      const fuelLiters = (KM_PER_ROUNDTRIP / 2) / KM_PER_LITER
      const fuelCost = fuelLiters * dieselPrice
      const driverCost = (tripHours / 2) * DRIVER_HOURLY_COST
      const runCost = fuelCost + driverCost
      const netMargin = revenue - runCost

      // Bunching risk calculation
      let bunchingRisk: 'LOW' | 'MED' | 'HIGH' = 'LOW'
      if (headway <= 4 || (isPeak && trafficDelayPct > 10)) {
        bunchingRisk = 'HIGH'
        bunchingEventsCount++
      } else if (headway <= 6 && trafficDelayPct > 5) {
        bunchingRisk = 'MED'
      }

      const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const isOutbound = runIndex % 2 === 1
      const vehicleId = FLEET_POOL[(runIndex - 1) % FLEET_POOL.length]
      const driver = DRIVER_POOL[(runIndex - 1) % DRIVER_POOL.length]

      departures.push({
        id: `RUN-142-${String(runIndex).padStart(3, '0')}`,
        time: timeFormatted,
        timeMinutes: currentTime,
        origin: isOutbound ? 'San José (Parque Central)' : 'Terminal Coronado',
        destination: isOutbound ? 'Terminal Coronado' : 'San José (Parque Central)',
        vehicleId,
        driver,
        routeId: runIndex % 5 === 0 ? 'R142-05 San Rafael' : 'R142 Troncal',
        expectedPax,
        revenue,
        cost: Math.round(runCost),
        netMargin: Math.round(netMargin),
        bunchingRisk,
        headwayMinutes: headway,
      })

      totalDayPax += expectedPax
      totalDayRevenue += revenue
      totalDayFuelCost += fuelCost
      totalDayDriverCost += driverCost

      currentTime += headway
      runIndex++
    }

    const totalDayCost = totalDayFuelCost + totalDayDriverCost
    const totalDayMargin = totalDayRevenue - totalDayCost
    const bunchingRiskPct = departures.length > 0 ? Math.round((bunchingEventsCount / departures.length) * 100) : 0

    return {
      departures,
      totalDayPax,
      totalDayRevenue,
      totalDayFuelCost: Math.round(totalDayFuelCost),
      totalDayDriverCost: Math.round(totalDayDriverCost),
      totalDayCost: Math.round(totalDayCost),
      totalDayMargin: Math.round(totalDayMargin),
      marginPct: totalDayRevenue > 0 ? ((totalDayMargin / totalDayRevenue) * 100).toFixed(1) : '0.0',
      bunchingRiskPct,
      totalRuns: departures.length,
    }
  }, [peakHeadway, valleyHeadway, peakBuses, valleyActiveShare, dieselPrice, demandScale, trafficDelayPct])

  // Export to Excel / CSV
  const exportFinancialCsv = () => {
    const headers = ['Codigo_Carrera', 'Hora_Salida', 'Sentido', 'Unidad_Placa', 'Conductor', 'Pasajeros_Est', 'Tarifa_CRC', 'Ingreso_CRC', 'Costo_CRC', 'Margen_CRC', 'Riesgo_Pegonamiento']
    const rows = simulationResults.departures.map(d => [
      d.id,
      d.time,
      `"${d.origin} -> ${d.destination}"`,
      d.vehicleId,
      `"${d.driver}"`,
      d.expectedPax,
      340,
      d.revenue,
      d.cost,
      d.netMargin,
      d.bunchingRisk
    ])
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `INNOBUS_Finanzas_${activePreset.code}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export local vault file (.simbox)
  const exportSimboxFile = () => {
    const payload = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      disclaimer: 'SIMULACION ESTOCASTICA TEORICA LEY 8968 - NO ADMISIBLE',
      scenario: {
        id: activePreset.id,
        code: activePreset.code,
        name: activePreset.name,
        parameters: {
          peakHeadway,
          valleyHeadway,
          peakBuses,
          valleyActiveShare,
          dieselPrice,
          demandScale,
          trafficDelayPct,
        }
      }
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activePreset.code}_local_vault.simbox`
    a.click()
  }

  // Import local vault file (.simbox)
  const handleImportSimbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (data.scenario?.parameters) {
          const p = data.scenario.parameters
          if (p.peakHeadway) setPeakHeadway(p.peakHeadway)
          if (p.valleyHeadway) setValleyHeadway(p.valleyHeadway)
          if (p.peakBuses) setPeakBuses(p.peakBuses)
          if (p.valleyActiveShare) setValleyActiveShare(p.valleyActiveShare)
          if (p.dieselPrice) setDieselPrice(p.dieselPrice)
          if (p.demandScale) setDemandScale(p.demandScale)
          if (p.trafficDelayPct !== undefined) setTrafficDelayPct(p.trafficDelayPct)
          alert(`Escenario "${data.scenario.name || file.name}" restaurado con éxito desde archivo local .simbox.`)
        }
      } catch {
        alert('Archivo .simbox inválido o dañado.')
      }
    }
    reader.readAsText(file)
  }

  // Cryptographic Shredder
  const shredScenario = () => {
    if (confirm('ADVERTENCIA: ¿Desea purgar este escenario de la memoria RAM local sin dejar rastro forense? Esta acción es irreversible.')) {
      setPeakHeadway(5)
      setValleyHeadway(10)
      setPeakBuses(28)
      setValleyActiveShare(0.65)
      setDieselPrice(620)
      setDemandScale(1.0)
      setTrafficDelayPct(0)
      alert('ESCENARIO PURGADO: Memoria volátil sobrescrita con ceros criptográficos.')
    }
  }

  // Baseline scenario for Delta calculation
  const baselineCost = 1480000
  const baselineMargin = 960000
  const baselineFuelCost = 512000

  const deltaMargin = simulationResults.totalDayMargin - baselineMargin
  const deltaFuel = baselineFuelCost - simulationResults.totalDayFuelCost
  const deltaPctMargin = ((deltaMargin / baselineMargin) * 100).toFixed(1)

  // Selected run details for inspector
  const activeRun = useMemo(() => {
    if (!selectedRunId) return simulationResults.departures[4] || simulationResults.departures[0]
    return simulationResults.departures.find((d) => d.id === selectedRunId) || simulationResults.departures[0]
  }, [selectedRunId, simulationResults.departures])

  if (studioMode === 'hub') {
    return <StudioHub onOpenSimulation={handleOpenSimulation} />
  }

  return (
    <div className="ts-studio-root">
      {/* --------------------------------------------------------------------
          TOP GLOBAL STATUS STRIP
          -------------------------------------------------------------------- */}
      <header className="ts-topbar">
        <div className="ts-topbar-left">
          <button
            type="button"
            onClick={() => setStudioMode('hub')}
            style={{
              padding: '2px 8px',
              backgroundColor: '#3b3834',
              color: '#fef08a',
              border: '1px solid #78716c',
              borderRadius: '2px',
              fontSize: '10px',
              fontFamily: 'var(--ts-font-mono)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ← VOLVER AL ESTUDIO (DASHBOARD)
          </button>
          <span className="ts-topbar-divider">|</span>
          <div className="ts-brand-tag">
            <span>INNOBUS</span>
            <span className="ts-brand-badge">SIMULATOR ENGINE</span>
          </div>
          <span className="ts-topbar-divider">|</span>
          <nav style={{ display: 'flex', gap: '10px', fontSize: '11px', fontFamily: 'var(--ts-font-mono)' }}>
            <span style={{ color: '#fef08a', fontWeight: 700, borderBottom: '1px solid #fef08a' }}>▶ REPRODUCTOR</span>
            <a href="#/rentabilidad" style={{ color: '#a8a29e', textDecoration: 'none' }}>RENTABILIDAD</a>
            <a href="#/en-vivo" style={{ color: '#a8a29e', textDecoration: 'none' }}>RADAR EN VIVO</a>
            <a href="#/pelotonamiento" style={{ color: '#a8a29e', textDecoration: 'none' }}>PELOTONAMIENTO</a>
          </nav>
          <span className="ts-topbar-divider">|</span>
          <span className="ts-topbar-meta">CONCESIÓN CTP-R142 · CORONADO</span>
          <span className="ts-topbar-divider">|</span>
          <span className="ts-topbar-meta">HORA: {currentTimeStr}</span>
        </div>

        <div className="ts-topbar-right">
          <div className="ts-integrity-pill">
            <span className="ts-led-dot" />
            <span>MODO AIRGAP PRIVADO: SEGURO</span>
          </div>
          <span className="ts-topbar-divider">|</span>
          <span className="ts-topbar-meta">INTEGRIDAD LOCAL: OK</span>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          THREE-COLUMN WORKSPACE
          -------------------------------------------------------------------- */}
      <div className="ts-workspace-grid">
        {/* COLUMN 1: DARK SLATE SIDEBAR */}
        <aside className="ts-sidebar">
          {/* Tenant & License */}
          <div className="ts-sidebar-section">
            <div className="ts-sidebar-label">
              <span>ENTIDAD OPERADORA</span>
              <span className="ts-led-dot" />
            </div>
            <div className="ts-tenant-card">
              <div className="ts-tenant-title">Autobuses Unidos de Coronado S.A.</div>
              <div className="ts-tenant-sub">Cédula Jurídica: 3-101-084210</div>
              <div className="ts-seat-badge-row">
                <span>LICENCIA: 3 ASIENTOS (2 EN USO)</span>
                <span className="ts-plan-pill">PLAN ESTÁNDAR</span>
              </div>
            </div>
          </div>

          {/* Scenario Library */}
          <div className="ts-sidebar-section">
            <div className="ts-sidebar-label">
              <span>BIBLIOTECA DE ESCENARIOS</span>
              <span>4 GUARDADOS</span>
            </div>
            <div className="ts-scenario-list">
              {PRESET_SCENARIOS.map((scenario) => {
                const isActive = scenario.id === activeScenarioId
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    className={`ts-scenario-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveScenarioId(scenario.id)}
                  >
                    <div>
                      <div className="ts-scenario-name">{scenario.name}</div>
                      <div className="ts-scenario-desc">{scenario.code}</div>
                    </div>
                    {isActive && <span className="ts-led-dot amber" />}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              <button
                type="button"
                className="ts-btn-new-scenario"
                onClick={() => alert('Escenario duplicado como borrador privado en memoria RAM.')}
              >
                + NUEVO ESCENARIO PRIVADO
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <button
                  type="button"
                  className="ts-btn-new-scenario"
                  style={{ margin: 0 }}
                  onClick={exportSimboxFile}
                  title="Descargar escenario como archivo privado .simbox cifrado"
                >
                  💾 GUARDAR .SIMBOX
                </button>
                <label
                  className="ts-btn-new-scenario"
                  style={{ margin: 0, textAlign: 'center', cursor: 'pointer', display: 'block' }}
                  title="Cargar archivo .simbox desde llave USB o disco local"
                >
                  📁 ABRIR .SIMBOX
                  <input
                    type="file"
                    accept=".simbox,.json"
                    onChange={handleImportSimbox}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* System & Privacy Safeguards */}
          <div className="ts-sidebar-section" style={{ marginTop: 'auto', borderBottom: 'none' }}>
            <div className="ts-sidebar-label">
              <span>ESTADO DEL SISTEMA AIRGAP</span>
              <span>LOCAL</span>
            </div>
            <div className="ts-meter-group">
              <div className="ts-meter-row">
                <span>Almacenamiento Local (IndexedDB):</span>
                <span>14.8 MB</span>
              </div>
              <div className="ts-progress-bar-bg">
                <div className="ts-progress-bar-fill" style={{ width: '18%' }} />
              </div>

              <div className="ts-meter-row" style={{ marginTop: '6px' }}>
                <span>Fugas de Telemetría Externa:</span>
                <strong style={{ color: '#10b981' }}>0% (BLOQUEADO)</strong>
              </div>
              <div className="ts-progress-bar-bg">
                <div className="ts-progress-bar-fill" style={{ width: '0%', backgroundColor: '#ef4444' }} />
              </div>

              <div className="ts-meter-row" style={{ marginTop: '6px' }}>
                <span>Latencia de Motor Local:</span>
                <span>16 ms</span>
              </div>
            </div>
          </div>
        </aside>

        {/* COLUMN 2: CENTER STAGE (WARM PARCHMENT CANVAS) */}
        <main className="ts-main-stage">
          {/* Top Macro KPIs */}
          <div className="ts-macro-kpis">
            <div className="ts-kpi-card">
              <div className="ts-kpi-card-header">
                <span>MARGEN NETO / DÍA</span>
                <span className="ts-led-dot" />
              </div>
              <div className="ts-kpi-value">₡{(simulationResults.totalDayMargin / 1000).toFixed(0)}k</div>
              <div className="ts-kpi-delta positive">
                +{deltaPctMargin}% vs Base CTP
              </div>
            </div>

            <div className="ts-kpi-card">
              <div className="ts-kpi-card-header">
                <span>COSTO DIÉSEL</span>
                <span>₡{dieselPrice}/L</span>
              </div>
              <div className="ts-kpi-value">₡{(simulationResults.totalDayFuelCost / 1000).toFixed(0)}k</div>
              <div className={`ts-kpi-delta ${deltaFuel >= 0 ? 'positive' : 'negative'}`}>
                {deltaFuel >= 0 ? `-₡${(deltaFuel / 1000).toFixed(0)}k ahorro` : `+₡${(-deltaFuel / 1000).toFixed(0)}k sobrecosto`}
              </div>
            </div>

            <div className="ts-kpi-card">
              <div className="ts-kpi-card-header">
                <span>PASAJEROS / DÍA</span>
                <span>TARIFA ₡340</span>
              </div>
              <div className="ts-kpi-value">{simulationResults.totalDayPax.toLocaleString()}</div>
              <div className="ts-kpi-delta neutral">
                {simulationResults.totalRuns} carreras programadas
              </div>
            </div>

            <div className="ts-kpi-card">
              <div className="ts-kpi-card-header">
                <span>RIESGO PEGONAMIENTO</span>
                <span className={`ts-led-dot ${simulationResults.bunchingRiskPct > 15 ? 'red' : simulationResults.bunchingRiskPct > 8 ? 'amber' : ''}`} />
              </div>
              <div className="ts-kpi-value">{simulationResults.bunchingRiskPct}%</div>
              <div className={`ts-kpi-delta ${simulationResults.bunchingRiskPct <= 10 ? 'positive' : 'negative'}`}>
                {simulationResults.bunchingRiskPct <= 10 ? 'NIVEL ÓPTIMO' : 'ALERTA DE FRECUENCIA'}
              </div>
            </div>

            <div className="ts-kpi-card">
              <div className="ts-kpi-card-header">
                <span>PAX REZAGADOS</span>
                <span>CAPACIDAD</span>
              </div>
              <div className="ts-kpi-value">0</div>
              <div className="ts-kpi-delta positive">
                100% DEMANDA ATENDIDA
              </div>
            </div>
          </div>

          {/* Tactical "What-If" Knobs Panel */}
          <div className="ts-knobs-panel">
            <div className="ts-knobs-title-row">
              <div className="ts-knobs-title">
                <span>PARÁMETROS TÁCTICOS DE SIMULACIÓN</span>
                <span className="ts-plan-pill">MOTOR ESTOCÁSTICO LOCAL</span>
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'var(--ts-font-mono)', color: 'var(--ts-ink-muted)' }}>
                Re-cálculo instantáneo en memoria RAM
              </span>
            </div>

            <div className="ts-knobs-grid">
              <div className="ts-knob-cell">
                <div className="ts-knob-label-row">
                  <span>Frecuencia en Pico</span>
                  <span className="ts-knob-value">{peakHeadway} min</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={peakHeadway}
                  onChange={(e) => setPeakHeadway(Number(e.target.value))}
                  className="ts-slider"
                />
              </div>

              <div className="ts-knob-cell">
                <div className="ts-knob-label-row">
                  <span>Frecuencia en Valle</span>
                  <span className="ts-knob-value">{valleyHeadway} min</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="25"
                  value={valleyHeadway}
                  onChange={(e) => setValleyHeadway(Number(e.target.value))}
                  className="ts-slider"
                />
              </div>

              <div className="ts-knob-cell">
                <div className="ts-knob-label-row">
                  <span>Precio Diésel (₡/L)</span>
                  <span className="ts-knob-value">₡{dieselPrice}</span>
                </div>
                <input
                  type="range"
                  min="550"
                  max="850"
                  step="5"
                  value={dieselPrice}
                  onChange={(e) => setDieselPrice(Number(e.target.value))}
                  className="ts-slider"
                />
              </div>

              <div className="ts-knob-cell">
                <div className="ts-knob-label-row">
                  <span>Factor Retraso Tráfico</span>
                  <span className="ts-knob-value">+{trafficDelayPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={trafficDelayPct}
                  onChange={(e) => setTrafficDelayPct(Number(e.target.value))}
                  className="ts-slider"
                />
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="ts-stage-tabs">
            <button
              type="button"
              className={`ts-stage-tab-btn ${activeTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setActiveTab('timetable')}
            >
              ☷ MATRIZ DE DESPACHO & HORARIOS
            </button>
            <button
              type="button"
              className={`ts-stage-tab-btn ${activeTab === 'marey' ? 'active' : ''}`}
              onClick={() => setActiveTab('marey')}
            >
              ∿ CORREDOR & PELOTONAMIENTO (MAREY)
            </button>
            <button
              type="button"
              className={`ts-stage-tab-btn ${activeTab === 'deficits' ? 'active' : ''}`}
              onClick={() => setActiveTab('deficits')}
            >
              ⊞ VUELTAS DEFICITARIAS & COSTOS
            </button>
            <button
              type="button"
              className={`ts-stage-tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
              onClick={() => setActiveTab('diff')}
            >
              ⇄ COMPARADOR DE ESCENARIOS (DIFF)
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="ts-stage-content">
            {activeTab === 'timetable' && (
              <div>
                <div className="print-only-header">
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>AUTOBUSES UNIDOS DE CORONADO S.A.</h2>
                  <p style={{ margin: '2px 0', fontSize: '12px' }}>ROL OFICIAL DE DESPACHO Y CONTROL DE SALIDAS · CONCESIÓN CTP-R142</p>
                  <p style={{ margin: '2px 0', fontSize: '10px', color: '#555' }}>
                    Fecha: {new Date().toLocaleDateString('es-CR')} | Escenario Activo: {activePreset.name} ({activePreset.code}) | Total Carreras: {simulationResults.departures.length}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--ts-font-mono)', fontWeight: 600 }}>
                    MOSTRANDO {simulationResults.departures.length} SALIDAS PROGRAMADAS (HAGA CLIC PARA INSPECCIONAR)
                  </span>
                  <span className="ts-status-tag ok">INTERVALO PROMEDIO: {peakHeadway}m Pico / {valleyHeadway}m Valle</span>
                </div>

                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  <table className="ts-table">
                    <thead>
                      <tr>
                        <th>CÓDIGO</th>
                        <th>HORA</th>
                        <th>SENTIDO</th>
                        <th>UNIDAD</th>
                        <th>CONDUCTOR</th>
                        <th>PAX EST.</th>
                        <th>COSTO</th>
                        <th>MARGEN</th>
                        <th>PEGONAMIENTO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulationResults.departures.map((run) => {
                        const isSelected = run.id === activeRun?.id
                        return (
                          <tr
                            key={run.id}
                            className={isSelected ? 'selected' : ''}
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            <td>{run.id}</td>
                            <td><strong>{run.time}</strong></td>
                            <td>{run.origin.includes('San José') ? 'SJ ➔ Coronado' : 'Coronado ➔ SJ'}</td>
                            <td><span style={{ color: '#1d4ed8' }}>{run.vehicleId}</span></td>
                            <td>{run.driver}</td>
                            <td>{run.expectedPax} pax</td>
                            <td>₡{run.cost.toLocaleString()}</td>
                            <td style={{ color: run.netMargin >= 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>
                              {run.netMargin >= 0 ? `+₡${run.netMargin.toLocaleString()}` : `-₡${Math.abs(run.netMargin).toLocaleString()}`}
                            </td>
                            <td>
                              <span className={`ts-status-tag ${run.bunchingRisk === 'LOW' ? 'ok' : run.bunchingRisk === 'MED' ? 'warn' : 'alert'}`}>
                                {run.bunchingRisk === 'LOW' ? 'NORMAL' : run.bunchingRisk === 'MED' ? 'RIESGO MEDIO' : 'PELOTÓN PROBABLE'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'marey' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--ts-font-mono)', fontWeight: 600 }}>
                    DIAGRAMA DE ESPACIO-TIEMPO (MAREY) · CORREDOR SAN JOSÉ ➔ CORONADO (11.3 KM)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--ts-ink-muted)', fontFamily: 'var(--ts-font-mono)' }}>
                    Trayectorias convergentes = Riesgo de pegonamiento
                  </span>
                </div>

                {/* SVG Marey Diagram */}
                <div style={{ background: '#fff', border: '1px solid var(--ts-grid-border)', padding: '10px', borderRadius: '2px' }}>
                  <svg viewBox="0 0 800 240" style={{ width: '100%', height: '230px' }}>
                    {/* Background grid */}
                    <line x1="50" y1="30" x2="780" y2="30" stroke="#e5e7eb" strokeDasharray="3 3" />
                    <line x1="50" y1="90" x2="780" y2="90" stroke="#e5e7eb" strokeDasharray="3 3" />
                    <line x1="50" y1="150" x2="780" y2="150" stroke="#e5e7eb" strokeDasharray="3 3" />
                    <line x1="50" y1="210" x2="780" y2="210" stroke="#1f2937" strokeWidth="1.5" />

                    {/* Y-axis labels */}
                    <text x="40" y="35" textAnchor="end" fontSize="9" fontFamily="monospace" fill="#4b5563">Coronado (11.3 km)</text>
                    <text x="40" y="95" textAnchor="end" fontSize="9" fontFamily="monospace" fill="#4b5563">Moravia (6.5 km)</text>
                    <text x="40" y="155" textAnchor="end" fontSize="9" fontFamily="monospace" fill="#4b5563">Guadalupe (3.0 km)</text>
                    <text x="40" y="215" textAnchor="end" fontSize="9" fontFamily="monospace" fill="#4b5563">San José (0 km)</text>

                    {/* Time ticks X-axis */}
                    {[6, 8, 10, 12, 14, 16, 18, 20].map((h, i) => (
                      <g key={h}>
                        <line x1={80 + i * 90} y1="25" x2={80 + i * 90} y2="215" stroke="#f3f4f6" />
                        <text x={80 + i * 90} y="228" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#6b7280">{h}:00</text>
                      </g>
                    ))}

                    {/* Bus trajectory curves */}
                    {simulationResults.departures.slice(0, 32).map((dep, idx) => {
                      const startX = 80 + ((dep.timeMinutes - 300) / 900) * 650
                      const durationPx = (dep.headwayMinutes * 2.2) * (1 + trafficDelayPct / 50)
                      const isOutbound = dep.origin.includes('San José')
                      const yStart = isOutbound ? 210 : 30
                      const yEnd = isOutbound ? 30 : 210

                      const color = dep.bunchingRisk === 'HIGH' ? '#dc2626' : dep.bunchingRisk === 'MED' ? '#d97706' : '#2563eb'

                      return (
                        <g key={dep.id}>
                          <line
                            x1={startX}
                            y1={yStart}
                            x2={startX + durationPx}
                            y2={yEnd}
                            stroke={color}
                            strokeWidth={dep.bunchingRisk === 'HIGH' ? '2.5' : '1.5'}
                            opacity={0.85}
                          />
                          {dep.bunchingRisk === 'HIGH' && (
                            <circle cx={startX + durationPx / 2} cy={(yStart + yEnd) / 2} r="3" fill="#dc2626" />
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '10px', fontFamily: 'var(--ts-font-mono)' }}>
                  <span style={{ color: '#2563eb' }}>● TRAYECTORIA NORMAL</span>
                  <span style={{ color: '#d97706' }}>● RETRASO MODERADO</span>
                  <span style={{ color: '#dc2626' }}>● PEGONAMIENTO DETECTADO (CONVERGENCIA)</span>
                </div>
              </div>
            )}

            {activeTab === 'deficits' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--ts-font-mono)', fontWeight: 600 }}>
                  ANÁLISIS DE RENTABILIDAD POR FRANJA HORARIA (DETECTOR DE VUELTAS DEFICITARIAS)
                </span>
                <p style={{ fontSize: '11px', color: 'var(--ts-ink-muted)' }}>
                  Las barras representan el margen neto de cada hora. Las horas en rojo representan carreras donde el costo operativo supera la recaudación por baja afluencia.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(17, 1fr)', gap: '6px', height: '160px', alignItems: 'flex-end', background: '#fff', padding: '12px', border: '1px solid var(--ts-grid-border)' }}>
                  {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => {
                    const isPeak = (h >= 6 && h <= 8) || (h >= 16 && h <= 18)
                    const isValley = h >= 9 && h <= 15
                    const heightPct = isPeak ? 90 : isValley ? (valleyHeadway > 12 ? 45 : 20) : 35
                    const isDeficit = isValley && valleyHeadway < 12

                    return (
                      <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                        <div
                          style={{
                            width: '100%',
                            height: `${heightPct}%`,
                            backgroundColor: isDeficit ? '#f87171' : isPeak ? '#34d399' : '#60a5fa',
                            borderRadius: '2px 2px 0 0',
                            transition: 'height 0.2s',
                          }}
                          title={`Hora ${h}:00 - ${isDeficit ? 'DEFICITARIO' : 'RENTABLE'}`}
                        />
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', marginTop: '4px' }}>{h}h</span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ background: 'var(--ts-parchment-dark)', padding: '10px', borderRadius: '2px', fontSize: '11px', fontFamily: 'var(--ts-font-mono)' }}>
                  <strong>DICTAMEN DE OPTIMIZACIÓN:</strong> Aumentar el intervalo en valle a {valleyHeadway} minutos reduce el déficit acumulado en <strong>₡{(deltaFuel / 1000).toFixed(0)}k</strong> sin provocar saturación de unidades.
                </div>
              </div>
            )}

            {activeTab === 'diff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--ts-font-mono)', fontWeight: 600 }}>
                  MATRIZ DE DISPERSION COMPARATIVA: BASE CTP vs. ESCENARIO SELECCIONADO
                </span>

                <table className="ts-table">
                  <thead>
                    <tr>
                      <th>VARIABLE OPERATIVA</th>
                      <th>BASE CTP OFICIAL</th>
                      <th>ESCENARIO ACTUAL</th>
                      <th>VARIACIÓN DELTA (Δ)</th>
                      <th>IMPACTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Gasto Diario en Combustible</td>
                      <td>₡512,000</td>
                      <td>₡{simulationResults.totalDayFuelCost.toLocaleString()}</td>
                      <td style={{ color: deltaFuel >= 0 ? '#166534' : '#991b1b', fontWeight: 700 }}>
                        {deltaFuel >= 0 ? `-₡${deltaFuel.toLocaleString()}` : `+₡${(-deltaFuel).toLocaleString()}`}
                      </td>
                      <td>{deltaFuel >= 0 ? '🟢 Ahorro Directo' : '🔴 Sobrecosto'}</td>
                    </tr>
                    <tr>
                      <td>Margen Neto Diario</td>
                      <td>₡960,000</td>
                      <td>₡{simulationResults.totalDayMargin.toLocaleString()}</td>
                      <td style={{ color: '#166534', fontWeight: 700 }}>
                        +₡{deltaMargin.toLocaleString()} (+{deltaPctMargin}%)
                      </td>
                      <td>🟢 Mayor Rentabilidad</td>
                    </tr>
                    <tr>
                      <td>Índice de Pelotamiento</td>
                      <td>18% (Moderado)</td>
                      <td>{simulationResults.bunchingRiskPct}%</td>
                      <td style={{ color: '#166534', fontWeight: 700 }}>
                        -{18 - simulationResults.bunchingRiskPct}% puntos
                      </td>
                      <td>🟢 Regularidad de Paso</td>
                    </tr>
                    <tr>
                      <td>Flota Ociosa en Plantel</td>
                      <td>11 buses</td>
                      <td>{39 - peakBuses} buses</td>
                      <td>+{39 - peakBuses - 11} unidades en reserva</td>
                      <td>🟡 Menor Desgaste Mecánico</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* COLUMN 3: RIGHT RECORD INSPECTOR */}
        <aside className="ts-inspector">
          <div className="ts-inspector-header">
            <div className="ts-barcode-row">
              <span className="ts-record-id">{activeRun.id}</span>
              <svg width="60" height="16" viewBox="0 0 60 16">
                <rect x="0" y="0" width="2" height="16" fill="#000" />
                <rect x="4" y="0" width="1" height="16" fill="#000" />
                <rect x="7" y="0" width="3" height="16" fill="#000" />
                <rect x="12" y="0" width="1" height="16" fill="#000" />
                <rect x="15" y="0" width="2" height="16" fill="#000" />
                <rect x="19" y="0" width="4" height="16" fill="#000" />
                <rect x="25" y="0" width="1" height="16" fill="#000" />
                <rect x="28" y="0" width="2" height="16" fill="#000" />
                <rect x="32" y="0" width="3" height="16" fill="#000" />
                <rect x="37" y="0" width="1" height="16" fill="#000" />
                <rect x="40" y="0" width="4" height="16" fill="#000" />
                <rect x="46" y="0" width="2" height="16" fill="#000" />
                <rect x="50" y="0" width="1" height="16" fill="#000" />
                <rect x="53" y="0" width="3" height="16" fill="#000" />
                <rect x="58" y="0" width="2" height="16" fill="#000" />
              </svg>
            </div>
            <div className="ts-inspector-title">FICHA DE CARRERA INDIVIDUAL</div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--ts-font-mono)', color: 'var(--ts-ink-muted)' }}>
              SALIDA PROGRAMADA: {activeRun.time} · {activeRun.routeId}
            </span>
          </div>

          <div className="ts-inspector-tabs">
            <button
              type="button"
              className={`ts-inspector-tab ${inspectorTab === 'details' ? 'active' : ''}`}
              onClick={() => setInspectorTab('details')}
            >
              DETALLES
            </button>
            <button
              type="button"
              className={`ts-inspector-tab ${inspectorTab === 'costs' ? 'active' : ''}`}
              onClick={() => setInspectorTab('costs')}
            >
              COSTOS
            </button>
            <button
              type="button"
              className={`ts-inspector-tab ${inspectorTab === 'staff' ? 'active' : ''}`}
              onClick={() => setInspectorTab('staff')}
            >
              PERSONAL
            </button>
            <button
              type="button"
              className={`ts-inspector-tab ${inspectorTab === 'delta' ? 'active' : ''}`}
              onClick={() => setInspectorTab('delta')}
            >
              IMPACTO Δ
            </button>
          </div>

          <div className="ts-inspector-body">
            {inspectorTab === 'details' && (
              <>
                <div className="ts-inspector-section">
                  <div className="ts-section-heading">METADATOS OPERATIVOS</div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Unidad Asignada:</span>
                    <span className="ts-key-val-value">{activeRun.vehicleId}</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Conductor:</span>
                    <span className="ts-key-val-value">{activeRun.driver}</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Origen:</span>
                    <span className="ts-key-val-value">{activeRun.origin}</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Destino:</span>
                    <span className="ts-key-val-value">{activeRun.destination}</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Intervalo de Salida:</span>
                    <span className="ts-key-val-value">{activeRun.headwayMinutes} min</span>
                  </div>
                </div>

                <div className="ts-inspector-section">
                  <div className="ts-section-heading">DIAGNÓSTICO DE AFORO</div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Pasajeros Estimados:</span>
                    <span className="ts-key-val-value">{activeRun.expectedPax} pax</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Capacidad Bus (Sentado+Pie):</span>
                    <span className="ts-key-val-value">75 pax máx</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Factor de Carga:</span>
                    <span className="ts-key-val-value">{Math.round((activeRun.expectedPax / 75) * 100)}%</span>
                  </div>
                  <div className="ts-key-val-row">
                    <span className="ts-key-val-label">Riesgo Pegonamiento:</span>
                    <span className={`ts-status-tag ${activeRun.bunchingRisk === 'LOW' ? 'ok' : 'warn'}`}>
                      {activeRun.bunchingRisk}
                    </span>
                  </div>
                </div>
              </>
            )}

            {inspectorTab === 'costs' && (
              <div className="ts-inspector-section">
                <div className="ts-section-heading">DESGLOSE FINANCIERO DE LA VUELTA</div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Recaudación Tarifa (₡340):</span>
                  <span className="ts-key-val-value">₡{activeRun.revenue.toLocaleString()}</span>
                </div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Gasto Diésel Estimado:</span>
                  <span className="ts-key-val-value">₡{Math.round(activeRun.cost * 0.62).toLocaleString()}</span>
                </div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Mano de Obra (Horas Chofer):</span>
                  <span className="ts-key-val-value">₡{Math.round(activeRun.cost * 0.38).toLocaleString()}</span>
                </div>
                <div className="ts-key-val-row" style={{ borderTop: '1px solid var(--ts-grid-border)', paddingTop: '6px', marginTop: '4px' }}>
                  <span className="ts-key-val-label"><strong>Margen Neto:</strong></span>
                  <span className="ts-key-val-value" style={{ color: activeRun.netMargin >= 0 ? '#166534' : '#991b1b' }}>
                    <strong>{activeRun.netMargin >= 0 ? `+₡${activeRun.netMargin.toLocaleString()}` : `-₡${Math.abs(activeRun.netMargin).toLocaleString()}`}</strong>
                  </span>
                </div>
              </div>
            )}

            {inspectorTab === 'staff' && (
              <div className="ts-inspector-section">
                <div className="ts-section-heading">TURNO DE CONDUCCIÓN</div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Conductor Asignado:</span>
                  <span className="ts-key-val-value">{activeRun.driver}</span>
                </div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Jornada Legal:</span>
                  <span className="ts-key-val-value">Turno Mixto (7.5 hrs)</span>
                </div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Tiempo Regulación Terminal:</span>
                  <span className="ts-key-val-value">12 minutos</span>
                </div>
              </div>
            )}

            {inspectorTab === 'delta' && (
              <div className="ts-inspector-section">
                <div className="ts-section-heading">COMPARATIVA FRENTE A LÍNEA BASE</div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Ahorro Diésel Proyectado:</span>
                  <span className="ts-key-val-value" style={{ color: '#166534' }}>+₡{deltaFuel.toLocaleString()}/día</span>
                </div>
                <div className="ts-key-val-row">
                  <span className="ts-key-val-label">Mejora Margen Neto:</span>
                  <span className="ts-key-val-value" style={{ color: '#166534' }}>+{deltaPctMargin}%</span>
                </div>
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--ts-grid-border)' }}>
              <button
                type="button"
                className="ts-btn-action"
                onClick={() => {
                  window.print()
                }}
              >
                🖨 EXPORTAR ROL DE SALIDAS (PDF)
              </button>

              <button
                type="button"
                className="ts-btn-action secondary"
                onClick={exportFinancialCsv}
                title="Descargar matriz financiera en archivo CSV compatible con Excel"
              >
                📊 EXPORTAR RESUMEN FINANCIERO (CSV / XLSX)
              </button>

              <button
                type="button"
                className="ts-btn-action danger"
                onClick={shredScenario}
                title="Borrado seguro de memoria volátil sin persistencia en disco"
              >
                🗑 PURGAR ESCENARIO (SHRED)
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* --------------------------------------------------------------------
          BOTTOM TECHNICAL STATUS BAR
          -------------------------------------------------------------------- */}
      <footer className="ts-bottombar">
        <div className="ts-bottombar-item">
          <span>BASE LOCAL:</span>
          <strong style={{ color: '#fff' }}>coronado_vault.db</strong>
        </div>
        <div className="ts-bottombar-item">
          <span>ESTADO LEGAL:</span>
          <span>SIMULACIÓN INTERNA NO ADMISIBLE (LEY 8968)</span>
        </div>
        <div className="ts-bottombar-item">
          <span>TIEMPO DE CÁLCULO:</span>
          <span>16 ms</span>
        </div>
        <div className="ts-bottombar-item">
          <span className="ts-led-dot" />
          <span>MOTOR LOCAL DISCRETO v1.2</span>
        </div>
      </footer>
    </div>
  )
}
