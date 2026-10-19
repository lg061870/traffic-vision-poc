import { useState, useRef } from 'react'
import {
  fareSource,
  fares,
  thresholds,
  simulationPresets,
  defaultRamales,
  defaultDaySchedules,
  computeHourlyFleetSupply,
  computeHourlyPassengerDemand,
  computeOperationalCost,
  defaultOperationalCostConfig,
  type DayScheduleType,
  type DayScheduleConfig,
  type OperationalCostConfig,
  type RamalAllocation,
  type SimulationParameters,
} from '../config/operatorSettings'
import { breakEven, formatColones, formatOne } from '../kpis'
import { RouteManager } from './RouteManager'

interface AssumptionsPanelProps {
  parameters: SimulationParameters
  onChange: (parameters: SimulationParameters) => void
  onApply: () => void
  onReset: () => void
  onExport: () => void
  onImport: (json: string) => boolean
  isDefault: boolean
  isApplying: boolean
  applySuccess: boolean
  applyError: string | null
}

type SubTab = 'ramales' | 'fleet' | 'demand' | 'costs'

export function AssumptionsPanel({
  parameters,
  onChange,
  onApply,
  onReset,
  onExport,
  onImport,
  isDefault,
  isApplying,
  applySuccess,
  applyError,
}: AssumptionsPanelProps) {
  const [tab, setTab] = useState<SubTab>('ramales')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ramalesList = parameters.ramales ?? defaultRamales

  // Form state for adding a new ramal
  const [newRouteId, setNewRouteId] = useState<string>(`R142-${String(ramalesList.length).padStart(2, '0')}`)
  const [newName, setNewName] = useState<string>('')
  const [newBusCount, setNewBusCount] = useState<number>(2)
  const [newFare, setNewFare] = useState<number>(400)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content && onImport(content)) {
        setImportStatus('✓ Reglas importadas con éxito')
        setTimeout(() => setImportStatus(null), 3000)
      } else {
        setImportStatus('⚠️ Archivo JSON no válido')
        setTimeout(() => setImportStatus(null), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleBusCountChange = (index: number, newCount: number) => {
    const clamped = Math.max(0, Math.min(100, newCount))
    const updated = ramalesList.map((r, i) => (i === index ? { ...r, busCount: clamped } : r))
    const newTotal = updated.reduce((sum, r) => sum + r.busCount, 0)
    onChange({
      ...parameters,
      ramales: updated,
      totalFleetSize: Math.max(1, newTotal),
    })
  }

  const handleRamalNameChange = (index: number, name: string) => {
    const updated = ramalesList.map((r, i) => (i === index ? { ...r, name } : r))
    onChange({
      ...parameters,
      ramales: updated,
    })
  }

  const handleRamalFareChange = (index: number, fare: number) => {
    const updated = ramalesList.map((r, i) => (i === index ? { ...r, fare: Math.max(0, fare) } : r))
    onChange({
      ...parameters,
      ramales: updated,
    })
  }

  const handleRemoveRamal = (index: number) => {
    const updated = ramalesList.filter((_, i) => i !== index)
    const newTotal = updated.reduce((sum, r) => sum + r.busCount, 0)
    onChange({
      ...parameters,
      ramales: updated,
      totalFleetSize: Math.max(1, newTotal),
    })
  }

  const handleAddRamal = () => {
    if (!newRouteId.trim() || !newName.trim()) return
    const newEntry: RamalAllocation = {
      routeId: newRouteId.trim(),
      name: newName.trim(),
      busCount: Math.max(0, newBusCount),
      fare: Math.max(0, newFare),
    }
    const updated = [...ramalesList, newEntry]
    const newTotal = updated.reduce((sum, r) => sum + r.busCount, 0)
    onChange({
      ...parameters,
      ramales: updated,
      totalFleetSize: Math.max(1, newTotal),
    })
    setNewRouteId(`R142-${String(updated.length).padStart(2, '0')}`)
    setNewName('')
    setNewBusCount(2)
  }

  const handleResetRamales = () => {
    onChange({
      ...parameters,
      ramales: defaultRamales,
      totalFleetSize: 42,
    })
  }

  const totalBuses = parameters.totalFleetSize || ramalesList.reduce((sum, r) => sum + r.busCount, 0) || 42

  const handleSetFleetSize = (val: number) => {
    const clamped = Math.max(1, Math.min(100, val))
    const diff = clamped - totalBuses
    const updated = ramalesList.map((r) =>
      r.routeId === 'R142' ? { ...r, busCount: Math.max(1, r.busCount + diff) } : r
    )
    onChange({ ...parameters, totalFleetSize: clamped, ramales: updated })
  }
  const currentScheduleType: DayScheduleType = parameters.activeScheduleType ?? 'weekday'
  const daySchedules = parameters.daySchedules ?? defaultDaySchedules

  const handleSetActiveSchedule = (type: DayScheduleType) => {
    const targetConfig = daySchedules[type] ?? defaultDaySchedules[type]
    onChange({
      ...parameters,
      activeScheduleType: type,
      peakActiveShare: targetConfig.peakFleetShare,
      valleyActiveShare: targetConfig.valleyFleetShare,
      nightActiveShare: targetConfig.nightFleetShare,
    })
  }

  const handleUpdateSchedule = (type: DayScheduleType, partial: Partial<DayScheduleConfig>) => {
    const currentConfig = daySchedules[type] ?? defaultDaySchedules[type]
    const updatedConfig: DayScheduleConfig = {
      ...currentConfig,
      ...partial,
    }
    const updatedSchedules: Record<DayScheduleType, DayScheduleConfig> = {
      ...daySchedules,
      [type]: updatedConfig,
    }
    const isCurrentlyActive = currentScheduleType === type
    onChange({
      ...parameters,
      daySchedules: updatedSchedules,
      ...(isCurrentlyActive
        ? {
            peakActiveShare: updatedConfig.peakFleetShare,
            valleyActiveShare: updatedConfig.valleyFleetShare,
            nightActiveShare: updatedConfig.nightFleetShare,
          }
        : {}),
    })
  }

  const scheduleTypesList: DayScheduleType[] = ['weekday', 'saturday', 'sunday_holiday']
  const dieselPrice = 785 // ₡/L precio diésel RECOPE
  const avgSpeed = 16.5 // km/h velocidad comercial promedio
  const ramalesCount = (parameters.ramales ?? []).filter((r) => r.routeId !== 'R142').length || 6

  const scheduleColumns = scheduleTypesList.map((st) => {
    const cfg = daySchedules[st] ?? defaultDaySchedules[st]
    const hourly = computeHourlyFleetSupply(totalBuses, cfg)
    const busHours = hourly.reduce((sum, h) => sum + h.buses, 0)
    const dieselL = Math.round(busHours * 4.2)
    const dieselCost = dieselL * dieselPrice
    const cost = busHours * parameters.costPerBusHour
    const kmEst = Math.round(busHours * avgSpeed)
    const costPerKm = kmEst > 0 ? Math.round(cost / kmEst) : 0

    // Service span calculation
    const [h1, m1] = (cfg.firstDeparture || '05:00').split(':').map(Number)
    const [h2, m2] = (cfg.lastDeparture || '23:00').split(':').map(Number)
    const start = (h1 || 0) + (m1 || 0) / 60
    const end = (h2 || 0) + (m2 || 0) / 60
    const spanHours = Math.max(1, end >= start ? end - start : 24 - start + end)

    // Departures estimation
    const trunkHeadway = Math.max(2, cfg.trunkHeadwayMinutes || 10)
    const feederHeadway = Math.max(5, cfg.feederHeadwayMinutes || 25)
    const trunkTrips = Math.round((spanHours * 60) / trunkHeadway)
    const feederTrips = Math.round(((spanHours * 60) / feederHeadway) * ramalesCount)
    const totalDepartures = trunkTrips + feederTrips

    const peakBuses = Math.round(totalBuses * cfg.peakFleetShare)
    const valleyBuses = Math.round(totalBuses * cfg.valleyFleetShare)
    const nightBuses = Math.round(totalBuses * cfg.nightFleetShare)

    const flatHours = Math.round(spanHours) * totalBuses
    const dieselSaved = Math.max(0, Math.round((flatHours - busHours) * 4.2))
    const costSaved = Math.max(0, (flatHours - busHours) * parameters.costPerBusHour)
    const savingsPct = flatHours > 0 ? Math.round(((flatHours - busHours) / flatHours) * 100) : 0

    return {
      type: st,
      config: cfg,
      hourly,
      spanHours,
      peakBuses,
      valleyBuses,
      nightBuses,
      totalDepartures,
      busHours,
      kmEst,
      dieselL,
      dieselCost,
      cost,
      costPerKm,
      dieselSaved,
      costSaved,
      savingsPct,
      isActive: currentScheduleType === st,
    }
  })

  const scheduleDemandColumns = scheduleTypesList.map((st) => {
    const cfg = daySchedules[st] ?? defaultDaySchedules[st]
    const hourlyPax = computeHourlyPassengerDemand(cfg, parameters.demandScale)
    const totalDailyPax = Math.round((cfg.dailyRidership ?? 13012) * parameters.demandScale)
    const seniorShare = cfg.seniorShare ?? 0.12
    const seniorPax = Math.round(totalDailyPax * seniorShare)
    const payingPax = Math.max(0, totalDailyPax - seniorPax)
    const averageFare = 445 // ₡ promedio ponderado R142 + ramales
    const projectedRevenue = payingPax * averageFare

    // Corresponding supply column for costs and departures
    const supplyCol = scheduleColumns.find((c) => c.type === st)!
    const operatingCost = supplyCol.cost
    const netMargin = projectedRevenue - operatingCost
    const marginPct = operatingCost > 0 ? Math.round((netMargin / operatingCost) * 100) : 0
    const avgPaxPerTrip = supplyCol.totalDepartures > 0 ? Math.round(totalDailyPax / supplyCol.totalDepartures) : 0
    const avgPaxPerHourBus = supplyCol.busHours > 0 ? (totalDailyPax / supplyCol.busHours).toFixed(1) : '0'
    const breakEvenPax = Math.round(parameters.costPerBusHour / (averageFare * (1 - seniorShare)))

    // Max hourly pax for scaling chart bars
    const maxHourlyPax = Math.max(...hourlyPax.map((h) => h.passengers), 1)

    const meta = {
      weekday: {
        title: 'Lunes a Viernes',
        badge: 'Laboral',
        icon: '🏢',
        sub: 'Picos pendulares a San José',
        slider1: { key: 'peakMorningFactor', label: 'Pico Mañana (05:00-08:30)', min: 0.4, max: 2.0, step: 0.05 },
        slider2: { key: 'middayValleyFactor', label: 'Valle Mediodía (09:00-15:30)', min: 0.1, max: 1.0, step: 0.05 },
        slider3: { key: 'peakEveningFactor', label: 'Pico Tarde (16:00-19:30)', min: 0.4, max: 2.0, step: 0.05 },
      },
      saturday: {
        title: 'Sábado',
        badge: 'Comercial',
        icon: '🛍️',
        sub: 'Flujo sostenido comercial y ocio',
        slider1: { key: 'peakMorningFactor', label: 'Mañana (06:00-09:30)', min: 0.3, max: 1.5, step: 0.05 },
        slider2: { key: 'middayValleyFactor', label: 'Pico Comercial (10:00-15:00)', min: 0.4, max: 1.8, step: 0.05 },
        slider3: { key: 'peakEveningFactor', label: 'Tarde / Cierre (16:00-20:00)', min: 0.3, max: 1.5, step: 0.05 },
      },
      sunday_holiday: {
        title: 'Domingo & Feriados',
        badge: 'Ocio & Familia',
        icon: '⛪',
        sub: 'Paseos familiares, iglesias y ferias',
        slider1: { key: 'peakMorningFactor', label: 'Mañana Iglesias (06:00-10:00)', min: 0.2, max: 1.2, step: 0.05 },
        slider2: { key: 'middayValleyFactor', label: 'Pico Almuerzo (11:00-15:00)', min: 0.4, max: 1.6, step: 0.05 },
        slider3: { key: 'peakEveningFactor', label: 'Retorno Tarde (16:00-20:00)', min: 0.2, max: 1.2, step: 0.05 },
      },
    }[st]

    return {
      type: st,
      config: cfg,
      meta,
      hourlyPax,
      maxHourlyPax,
      totalDailyPax,
      seniorShare,
      seniorPax,
      payingPax,
      projectedRevenue,
      operatingCost,
      netMargin,
      marginPct,
      avgPaxPerTrip,
      avgPaxPerHourBus,
      breakEvenPax,
      totalDepartures: supplyCol.totalDepartures,
      busHours: supplyCol.busHours,
      isActive: currentScheduleType === st,
    }
  })

  const costConfig: OperationalCostConfig = parameters.operationalCostConfig ?? defaultOperationalCostConfig
  const computedCosts = computeOperationalCost(costConfig)

  const handleUpdateCostConfig = (partial: Partial<OperationalCostConfig>) => {
    const updated: OperationalCostConfig = {
      ...costConfig,
      ...partial,
    }
    const computed = computeOperationalCost(updated)
    onChange({
      ...parameters,
      costPerBusHour: computed.totalCostPerHour,
      operationalCostConfig: updated,
    })
  }

  return (
    <div className="assumptions-dialog">
      <nav className="dialog-subtabs" aria-label="Secciones de supuestos">
        <button
          type="button"
          className={`dialog-tab ${tab === 'ramales' ? 'active' : ''}`}
          onClick={() => setTab('ramales')}
        >
          🗺️ Rutas & Ramales
        </button>
        <button
          type="button"
          className={`dialog-tab ${tab === 'fleet' ? 'active' : ''}`}
          onClick={() => setTab('fleet')}
        >
          ⏱️ Despacho Horario
        </button>
        <button
          type="button"
          className={`dialog-tab ${tab === 'demand' ? 'active' : ''}`}
          onClick={() => setTab('demand')}
        >
          👥 Nivel de Demanda
        </button>
        <button
          type="button"
          className={`dialog-tab ${tab === 'costs' ? 'active' : ''}`}
          onClick={() => setTab('costs')}
        >
          ⚙️ Costos de Operación
        </button>
      </nav>

      <div className="dialog-tab-body">
        {tab === 'ramales' && (
          <div className="tab-pane tab-pane-route-manager">
            <RouteManager
              onUpdateParameters={(updatedRamales) => {
                const newTotal = updatedRamales.reduce((sum, r) => sum + r.busCount, 0)
                const newFares: Record<string, number> = { ...(parameters.fares ?? fares) }
                updatedRamales.forEach((r) => {
                  if (r.fare) newFares[r.routeId] = r.fare
                })
                onChange({
                  ...parameters,
                  ramales: updatedRamales,
                  fares: newFares,
                  totalFleetSize: newTotal,
                })
              }}
            />
          </div>
        )}

        {tab === 'fleet' && (
          <div className="tab-pane">
            {/* Single Compact Master Toolbar */}
            <div className="fleet-size-compact-bar">
              <div className="fleet-compact-left">
                <span className="fleet-badge-icon">🚌</span>
                <span className="fleet-compact-title">Flota:</span>
                <div className="fleet-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleSetFleetSize(totalBuses - 1)}
                    disabled={totalBuses <= 1}
                    title="Reducir una unidad"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={totalBuses}
                    onChange={(e) => handleSetFleetSize(Number(e.target.value))}
                  />
                  <span className="stepper-unit">buses</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => handleSetFleetSize(totalBuses + 1)}
                    disabled={totalBuses >= 100}
                    title="Aumentar una unidad"
                  >
                    +
                  </button>
                </div>
                <div className="fleet-quick-chips">
                  {[
                    { count: 39, label: '39 CTP' },
                    { count: 42, label: '42 Concesión' },
                    { count: 20, label: '20' },
                    { count: 10, label: '10' },
                  ].map((preset) => (
                    <button
                      key={preset.count}
                      type="button"
                      className={`quick-chip ${totalBuses === preset.count ? 'active' : ''}`}
                      onClick={() => {
                        if (preset.count === 42) handleResetRamales()
                        else handleSetFleetSize(preset.count)
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fleet-compact-right">
                <span className="active-sim-badge">
                  Simulación activa: <strong>{daySchedules[currentScheduleType]?.label ?? 'Lunes a Viernes'}</strong>
                </span>
              </div>
            </div>

            {/* 3-Column Schedule Comparison Grid */}
            <div className="schedules-columns-grid">
                {scheduleColumns.map((col) => (
                  <div
                    key={col.type}
                    className={`schedule-column ${col.isActive ? 'active-schedule-card' : ''}`}
                  >
                    {/* Column Header */}
                    <div className="col-header">
                      <div className="col-header-info">
                        <span className="col-icon">{col.config.icon}</span>
                        <div>
                          <h4 className="col-title">{col.config.label}</h4>
                          <span className="col-sub">{col.config.sublabel}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`sim-select-btn ${col.isActive ? 'is-active' : ''}`}
                        onClick={() => handleSetActiveSchedule(col.type)}
                        title="Seleccionar este horario para la simulación en vivo"
                      >
                        {col.isActive ? '● En Simulación' : 'Usar en Simulación'}
                      </button>
                    </div>

                  {/* Operational Parameters: Consolidated into a single 4-field grid */}
                  <div className="col-section compact-section col-dispatch-section">
                    <div className="col-section-header-compact">
                      <span>⏱️ Despacho & Frecuencias</span>
                    </div>
                    <div className="col-grid-4">
                      <label>
                        <span>1er Despacho</span>
                        <input
                          type="time"
                          value={col.config.firstDeparture}
                          onChange={(e) => handleUpdateSchedule(col.type, { firstDeparture: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Último Despacho</span>
                        <input
                          type="time"
                          value={col.config.lastDeparture}
                          onChange={(e) => handleUpdateSchedule(col.type, { lastDeparture: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>Troncal R142</span>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min={2}
                            max={60}
                            value={col.config.trunkHeadwayMinutes}
                            onChange={(e) => handleUpdateSchedule(col.type, { trunkHeadwayMinutes: Math.max(1, Number(e.target.value)) })}
                          />
                          <span>min</span>
                        </div>
                      </label>
                      <label>
                        <span>Ramales</span>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min={5}
                            max={120}
                            value={col.config.feederHeadwayMinutes}
                            onChange={(e) => handleUpdateSchedule(col.type, { feederHeadwayMinutes: Math.max(1, Number(e.target.value)) })}
                          />
                          <span>min</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Fleet Sliders */}
                  <div className="col-section compact-section col-sliders-section">
                    <div className="col-section-header-compact">
                      <span>🚌 Flota Activa por Franja</span>
                    </div>

                    <div className="col-slider-item">
                      <div className="slider-header-compact">
                        <span>Pico ({col.type === 'weekday' ? '05–09 / 16–19' : '10–15'})</span>
                        <strong>{Math.round(col.config.peakFleetShare * 100)}% ({Math.round(totalBuses * col.config.peakFleetShare)}b)</strong>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={col.config.peakFleetShare}
                        onChange={(e) => handleUpdateSchedule(col.type, { peakFleetShare: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-slider-item">
                      <div className="slider-header-compact">
                        <span>Valle Mediodía</span>
                        <strong>{Math.round(col.config.valleyFleetShare * 100)}% ({Math.round(totalBuses * col.config.valleyFleetShare)}b)</strong>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={col.config.valleyFleetShare}
                        onChange={(e) => handleUpdateSchedule(col.type, { valleyFleetShare: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-slider-item">
                      <div className="slider-header-compact">
                        <span>Noche / Cierre</span>
                        <strong>{Math.round(col.config.nightFleetShare * 100)}% ({Math.round(totalBuses * col.config.nightFleetShare)}b)</strong>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={col.config.nightFleetShare}
                        onChange={(e) => handleUpdateSchedule(col.type, { nightFleetShare: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* 24h Supply Mini Curve Preview - Compact Visual Indicator */}
                  <div className="col-section compact-curve-section">
                    <div className="mini-chart-header">
                      <span className="col-section-title">Curva Oferta (24h)</span>
                      <span className="mini-chart-hint">🟦 Pico · 🟨 Valle · 🟪 Noche</span>
                    </div>
                    <div className="col-mini-bars">
                      {col.hourly.map((slot) => {
                        const heightPct = totalBuses > 0 ? Math.min(100, Math.round((slot.buses / totalBuses) * 100)) : 0
                        return (
                          <div key={slot.hour} className="mini-col-slot" title={`${slot.label}: ${slot.buses} buses (${slot.period})`}>
                            <div className="mini-col-track">
                              <div className={`mini-col-fill ${slot.period}`} style={{ height: `${heightPct}%` }} />
                            </div>
                            {slot.hour % 6 === 0 ? <span className="mini-slot-label">{slot.hour}h</span> : <span className="mini-slot-dot">·</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Comprehensive Results & Projections Pane */}
                  <div className="col-stats-box">
                    <div className="col-stats-box-header">
                      <span>📊 Resultados & Proyección Diaria</span>
                      <span className="col-stats-tag">{col.spanHours.toFixed(1)}h servicio</span>
                    </div>

                    {/* Operational KPIs Grid */}
                    <div className="col-results-metrics-grid">
                      <div className="col-stat-card">
                        <span className="col-stat-label">Flota Activa</span>
                        <strong className="col-stat-val highlight-cyan">
                          {col.peakBuses}b <small>pico</small> · {col.valleyBuses}b <small>valle</small>
                        </strong>
                      </div>
                      <div className="col-stat-card">
                        <span className="col-stat-label">Salidas Est.</span>
                        <strong className="col-stat-val highlight-indigo">
                          ~{col.totalDepartures.toLocaleString()} <small>viajes</small>
                        </strong>
                      </div>
                      <div className="col-stat-card">
                        <span className="col-stat-label">Horas-Bus</span>
                        <strong className="col-stat-val highlight-blue">
                          {col.busHours.toLocaleString()} <small>h-bus</small>
                        </strong>
                      </div>
                      <div className="col-stat-card">
                        <span className="col-stat-label">Recorrido Est.</span>
                        <strong className="col-stat-val highlight-slate">
                          ~{col.kmEst.toLocaleString()} <small>km</small>
                        </strong>
                      </div>
                    </div>

                    {/* Financial & Energy Row */}
                    <div className="col-results-financial-row">
                      <div className="col-stat-card financial-card-cost">
                        <span className="col-stat-label">Costo Operativo Diario</span>
                        <div className="financial-val-group">
                          <strong className="col-stat-val highlight-emerald">{formatColones(col.cost)}</strong>
                          <span className="stat-sub-detail">~₡{col.costPerKm.toLocaleString()}/km</span>
                        </div>
                      </div>
                      <div className="col-stat-card financial-card-diesel">
                        <span className="col-stat-label">Consumo Diésel Est.</span>
                        <div className="financial-val-group">
                          <strong className="col-stat-val highlight-amber">~{col.dieselL.toLocaleString()} L</strong>
                          <span className="stat-sub-detail">{formatColones(col.dieselCost)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Savings vs Flat Operation */}
                    {col.costSaved > 0 ? (
                      <div className="col-savings-callout">
                        <span className="savings-icon">✓</span>
                        <div className="savings-content">
                          <span className="savings-title">Ahorro vs. Flota Plana:</span>
                          <span className="savings-metrics">
                            ~{col.dieselSaved.toLocaleString()} L diésel · {formatColones(col.costSaved)}/día <strong>(-{col.savingsPct}%)</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="col-savings-callout flat">
                        <span className="savings-icon">ℹ</span>
                        <div className="savings-content">
                          <span className="savings-title">Operación Continua:</span>
                          <span className="savings-metrics">100% flota activa durante toda la jornada</span>
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                ))}
              </div>
            </div>
        )}

        {tab === 'demand' && (
          <div className="tab-pane">
            {/* Single Compact Master Toolbar */}
            <div className="fleet-size-compact-bar">
              <div className="fleet-compact-left">
                <span className="fleet-badge-icon">👥</span>
                <span className="fleet-compact-title">Escala Global:</span>
                <div className="fleet-stepper">
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => onChange({ ...parameters, demandScale: Math.max(0.2, Number((parameters.demandScale - 0.05).toFixed(2))) })}
                    title="Reducir escala global -5%"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={20}
                    max={200}
                    step={5}
                    value={Math.round(parameters.demandScale * 100)}
                    onChange={(e) => onChange({ ...parameters, demandScale: Math.max(0.2, Math.min(2.0, Number(e.target.value) / 100)) })}
                  />
                  <span className="stepper-unit">%</span>
                  <button
                    type="button"
                    className="stepper-btn"
                    onClick={() => onChange({ ...parameters, demandScale: Math.min(2.0, Number((parameters.demandScale + 0.05).toFixed(2))) })}
                    title="Aumentar escala global +5%"
                  >
                    +
                  </button>
                </div>
                <div className="fleet-quick-chips">
                  {[
                    { scale: 1.75, label: '175% Calibrado (Recomendado)' },
                    { scale: 1.0, label: '100% Alta' },
                    { scale: 0.75, label: '75% Media' },
                    { scale: 0.47, label: '47% ARESEP Teórico' },
                  ].map((preset) => (
                    <button
                      key={preset.scale}
                      type="button"
                      className={`quick-chip ${Math.abs(parameters.demandScale - preset.scale) < 0.02 ? 'active' : ''}`}
                      onClick={() => onChange({ ...parameters, demandScale: preset.scale })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fleet-compact-right">
                <span className="active-sim-badge">
                  Aforo L-V: <strong>~{Math.round((daySchedules.weekday?.dailyRidership ?? 13012) * parameters.demandScale).toLocaleString()} pax/día</strong>
                </span>
              </div>
            </div>

            {/* 3-Column Schedule Comparison Grid */}
            <div className="schedules-columns-grid">
              {scheduleDemandColumns.map((col) => (
                <div
                  key={col.type}
                  className={`schedule-column ${col.isActive ? 'active-schedule-card' : ''}`}
                >
                  {/* Column Header */}
                  <div className="col-header">
                    <div className="col-header-info">
                      <span className="col-icon">{col.meta.icon}</span>
                      <div>
                        <h4 className="col-title">{col.meta.title}</h4>
                        <span className="col-sub">{col.meta.badge} · {col.meta.sub}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`sim-select-btn ${col.isActive ? 'is-active' : ''}`}
                      onClick={() => handleSetActiveSchedule(col.type)}
                      title={col.isActive ? 'Régimen activo en la simulación' : `Cargar ${col.meta.title} en la simulación`}
                    >
                      {col.isActive ? '✓ En Simulación' : 'Simular'}
                    </button>
                  </div>

                  {/* Section 1: Ridership & Seniors */}
                  <div className="col-section compact-section">
                    <span className="col-section-title">Aforo Base & Adulto Mayor</span>
                    <div className="col-grid-2-inputs">
                      <div className="col-input-group">
                        <label>Pasajeros / Día Base</label>
                        <input
                          type="number"
                          step="100"
                          min="500"
                          max="50000"
                          value={col.config.dailyRidership ?? 13012}
                          onChange={(e) => handleUpdateSchedule(col.type, { dailyRidership: Math.max(100, Number(e.target.value)) })}
                        />
                        <span className="input-hint">Escalado: ~{col.totalDailyPax.toLocaleString()} pax</span>
                      </div>
                      <div className="col-input-group">
                        <label>Adulto Mayor (Ley 7600)</label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={Number(((col.config.seniorShare ?? 0.12) * 100).toFixed(1))}
                            onChange={(e) => handleUpdateSchedule(col.type, { seniorShare: Math.max(0, Math.min(0.5, Number(e.target.value) / 100)) })}
                          />
                          <span className="unit-label">%</span>
                        </div>
                        <span className="input-hint">~{col.seniorPax.toLocaleString()} viajes gratis</span>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Relative Peak / Valley multipliers */}
                  <div className="col-section col-sliders-section">
                    <span className="col-section-title">Factores de Demanda por Franja</span>

                    <div className="col-slider-item">
                      <div className="slider-header-compact">
                        <span>{col.meta.slider1.label}</span>
                        <strong>{(col.config[col.meta.slider1.key as keyof DayScheduleConfig] as number ?? 1.0).toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={col.meta.slider1.min}
                        max={col.meta.slider1.max}
                        step={col.meta.slider1.step}
                        value={(col.config[col.meta.slider1.key as keyof DayScheduleConfig] as number) ?? 1.0}
                        onChange={(e) => handleUpdateSchedule(col.type, { [col.meta.slider1.key]: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-slider-item">
                      <div className="slider-header-compact">
                        <span>{col.meta.slider2.label}</span>
                        <strong>{(col.config[col.meta.slider2.key as keyof DayScheduleConfig] as number ?? 0.35).toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={col.meta.slider2.min}
                        max={col.meta.slider2.max}
                        step={col.meta.slider2.step}
                        value={(col.config[col.meta.slider2.key as keyof DayScheduleConfig] as number) ?? 0.35}
                        onChange={(e) => handleUpdateSchedule(col.type, { [col.meta.slider2.key]: Number(e.target.value) })}
                      />
                    </div>

                    <div className="col-slider-item">
                      <div className="slider-header-compact">
                        <span>{col.meta.slider3.label}</span>
                        <strong>{(col.config[col.meta.slider3.key as keyof DayScheduleConfig] as number ?? 1.0).toFixed(2)}x</strong>
                      </div>
                      <input
                        type="range"
                        min={col.meta.slider3.min}
                        max={col.meta.slider3.max}
                        step={col.meta.slider3.step}
                        value={(col.config[col.meta.slider3.key as keyof DayScheduleConfig] as number) ?? 1.0}
                        onChange={(e) => handleUpdateSchedule(col.type, { [col.meta.slider3.key]: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Section 3: 24h Hourly Passenger Mini Curve Preview */}
                  <div className="col-section compact-curve-section">
                    <div className="mini-chart-header">
                      <span className="col-section-title">Curva Pasajeros (24h)</span>
                      <span className="mini-chart-hint">Pico: ~{col.maxHourlyPax.toLocaleString()} pax/h</span>
                    </div>
                    <div className="col-mini-bars">
                      {col.hourlyPax.map((slot) => {
                        const heightPct = col.maxHourlyPax > 0 ? Math.min(100, Math.round((slot.passengers / col.maxHourlyPax) * 100)) : 0
                        return (
                          <div key={slot.hour} className="mini-col-slot" title={`${slot.label}: ~${slot.passengers.toLocaleString()} pax/h (${slot.period})`}>
                            <div className="mini-col-track">
                              <div className="mini-col-fill demand-bar" style={{ height: `${heightPct}%` }} />
                            </div>
                            {slot.hour % 6 === 0 ? <span className="mini-slot-label">{slot.hour}h</span> : <span className="mini-slot-dot">·</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Section 4: Comprehensive Financial Balance & Load Results */}
                  <div className="col-stats-box">
                    <div className="col-stats-box-header">
                      <span>👥 Balance de Pasajeros & Rentabilidad</span>
                      <span className="col-stats-tag">{col.avgPaxPerHourBus} pax/h-bus</span>
                    </div>

                    {/* Operational Demand & Load Grid */}
                    <div className="col-results-metrics-grid">
                      <div className="col-stat-card">
                        <span className="col-stat-label">Pasajeros Pagos</span>
                        <strong className="col-stat-val highlight-emerald">
                          ~{col.payingPax.toLocaleString()} <small>pax</small>
                        </strong>
                      </div>
                      <div className="col-stat-card">
                        <span className="col-stat-label">Adulto Mayor</span>
                        <strong className="col-stat-val highlight-amber">
                          ~{col.seniorPax.toLocaleString()} <small>({Math.round(col.seniorShare * 100)}%)</small>
                        </strong>
                      </div>
                      <div className="col-stat-card">
                        <span className="col-stat-label">Ocupación / Viaje</span>
                        <strong className="col-stat-val highlight-cyan">
                          ~{col.avgPaxPerTrip} <small>pax/viaje</small>
                        </strong>
                      </div>
                      <div className="col-stat-card">
                        <span className="col-stat-label">Punto de Equilibrio</span>
                        <strong className="col-stat-val highlight-slate">
                          {col.breakEvenPax} <small>pax/h-bus</small>
                        </strong>
                      </div>
                    </div>

                    {/* Financial Row: Revenue vs Supply Cost */}
                    <div className="col-results-financial-row">
                      <div className="col-stat-card financial-card-cost">
                        <span className="col-stat-label">Ingreso Tarifario Proyectado</span>
                        <div className="financial-val-group">
                          <strong className="col-stat-val highlight-emerald">{formatColones(col.projectedRevenue)}</strong>
                          <span className="stat-sub-detail">~₡445 tarifa media</span>
                        </div>
                      </div>
                      <div className="col-stat-card financial-card-diesel">
                        <span className="col-stat-label">Costo Flota Despachada</span>
                        <div className="financial-val-group">
                          <strong className="col-stat-val highlight-slate">{formatColones(col.operatingCost)}</strong>
                          <span className="stat-sub-detail">{col.busHours} h-bus asignadas</span>
                        </div>
                      </div>
                    </div>

                    {/* Operating Net Margin Callout */}
                    <div className={`col-savings-callout ${col.netMargin >= 0 ? '' : 'deficit'}`}>
                      <span className="savings-icon">{col.netMargin >= 0 ? '📈' : '⚠️'}</span>
                      <div className="savings-content">
                        <span className="savings-title">
                          {col.netMargin >= 0 ? 'Margen Operativo Diario:' : 'Déficit Operativo Estimado:'}
                        </span>
                        <span className="savings-metrics">
                          <strong className={col.netMargin >= 0 ? 'highlight-emerald' : 'highlight-coral'}>
                            {col.netMargin >= 0 ? '+' : ''}{formatColones(col.netMargin)}/día
                          </strong>{' '}
                          ({col.netMargin >= 0 ? '+' : ''}{col.marginPct}% sobre costo)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'costs' && (
          <div className="tab-pane">
            {/* Top Compact Master Toolbar */}
            <div className="fleet-size-compact-bar">
              <div className="fleet-compact-left">
                <span className="fleet-badge-icon">⚙️</span>
                <span className="fleet-compact-title">Modelo de Costos:</span>
                <div className="cost-mode-toggle">
                  <button
                    type="button"
                    className={`cost-mode-btn ${costConfig.mode === 'aresep' ? 'active' : ''}`}
                    onClick={() => handleUpdateCostConfig({ mode: 'aresep' })}
                  >
                    Paramétrico ARESEP
                  </button>
                  <button
                    type="button"
                    className={`cost-mode-btn ${costConfig.mode === 'manual' ? 'active' : ''}`}
                    onClick={() => handleUpdateCostConfig({ mode: 'manual' })}
                  >
                    Valor Manual Fijo
                  </button>
                </div>

                <div className="fleet-quick-chips">
                  <button
                    type="button"
                    className={`quick-chip ${costConfig.mode === 'aresep' && costConfig.dieselPricePerLiter === 785 ? 'active' : ''}`}
                    onClick={() => {
                      const updated = { ...defaultOperationalCostConfig, mode: 'aresep' as const }
                      const computed = computeOperationalCost(updated)
                      onChange({
                        ...parameters,
                        costPerBusHour: computed.totalCostPerHour,
                        operationalCostConfig: updated,
                      })
                    }}
                    title="Resolución ARESEP RE-0060-IT-2024 (₡12,950/h-bus)"
                  >
                    ⚖️ Oficial ARESEP (₡12,950/h)
                  </button>
                  <button
                    type="button"
                    className={`quick-chip ${costConfig.dieselPricePerLiter === 900 ? 'active' : ''}`}
                    onClick={() => handleUpdateCostConfig({ dieselPricePerLiter: 900, mode: 'aresep' })}
                    title="Alza de combustible RECOPE a ₡900/L"
                  >
                    ⛽ Diésel ₡900/L
                  </button>
                  <button
                    type="button"
                    className={`quick-chip ${costConfig.maintenanceCostPerKm === 85 ? 'active' : ''}`}
                    onClick={() => handleUpdateCostConfig({ maintenanceCostPerKm: 85, tiresCostPerHour: 450, mode: 'aresep' })}
                    title="Desgaste severo en topografía de montaña Coronado"
                  >
                    🔧 Flota Antigua (+₡1.8k/h)
                  </button>
                  <button
                    type="button"
                    className={`quick-chip ${costConfig.dieselPricePerLiter === 320 ? 'active' : ''}`}
                    onClick={() => handleUpdateCostConfig({ dieselPricePerLiter: 320, maintenanceCostPerKm: 30, mode: 'aresep' })}
                    title="Piloto buses 100% eléctricos (costo kwh equivalente)"
                  >
                    ⚡ Piloto Eléctrico (-22%)
                  </button>
                </div>
              </div>

              <div className="fleet-compact-right">
                <span className="active-sim-badge">
                  Costo Activo: <strong>{formatColones(computedCosts.totalCostPerHour)} / h-bus</strong> (~₡{computedCosts.costPerKm.toLocaleString()}/km)
                </span>
              </div>
            </div>

            {/* 4 Cost Pillars Grid */}
            <div className="cost-pillars-grid">
              {/* Pillar 1: Combustible & Lubricantes */}
              <div className="cost-pillar-card">
                <div className="cost-pillar-header">
                  <div className="cost-pillar-title">
                    <span className="pillar-icon">⛽</span>
                    <div>
                      <h4>1. Combustible & Energía</h4>
                      <small>RECOPE diésel regular + lubricantes</small>
                    </div>
                  </div>
                  <span className="pillar-subtotal-badge highlight-amber">
                    {formatColones(computedCosts.fuelPerHour)}/h <small>({computedCosts.fuelPct}%)</small>
                  </span>
                </div>

                <div className="cost-inputs-grid-2x2">
                  <div className="cost-input-row">
                    <label>Precio Diésel (₡/L)</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="5"
                        min="400"
                        max="1500"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.dieselPricePerLiter}
                        onChange={(e) => handleUpdateCostConfig({ dieselPricePerLiter: Number(e.target.value) })}
                      />
                      <span>₡/L</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Rendimiento Flota</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="6.0"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.fuelEfficiencyKmPerLiter}
                        onChange={(e) => handleUpdateCostConfig({ fuelEfficiencyKmPerLiter: Number(e.target.value) })}
                      />
                      <span>km/L</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Velocidad Comercial</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="0.5"
                        min="8"
                        max="40"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.averageSpeedKmH}
                        onChange={(e) => handleUpdateCostConfig({ averageSpeedKmH: Number(e.target.value) })}
                      />
                      <span>km/h</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Lubricantes & Filtros</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="10"
                        min="50"
                        max="800"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.lubricantsCostPerHour}
                        onChange={(e) => handleUpdateCostConfig({ lubricantsCostPerHour: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Personal Operativo */}
              <div className="cost-pillar-card">
                <div className="cost-pillar-header">
                  <div className="cost-pillar-title">
                    <span className="pillar-icon">👨‍✈️</span>
                    <div>
                      <h4>2. Personal Operativo</h4>
                      <small>Choferes, relevos, CCSS e INS</small>
                    </div>
                  </div>
                  <span className="pillar-subtotal-badge highlight-blue">
                    {formatColones(computedCosts.crewPerHour)}/h <small>({computedCosts.crewPct}%)</small>
                  </span>
                </div>

                <div className="cost-inputs-grid-2x2">
                  <div className="cost-input-row">
                    <label>Salario Base Chofer</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="50"
                        min="1500"
                        max="6000"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.driverHourlyWage}
                        onChange={(e) => handleUpdateCostConfig({ driverHourlyWage: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Cargas Sociales</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="1"
                        min="10"
                        max="60"
                        disabled={costConfig.mode === 'manual'}
                        value={Math.round(costConfig.driverSocialChargesRatio * 100)}
                        onChange={(e) => handleUpdateCostConfig({ driverSocialChargesRatio: Number(e.target.value) / 100 })}
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Factor de Relevo</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="2.0"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.driverReliefMultiplier}
                        onChange={(e) => handleUpdateCostConfig({ driverReliefMultiplier: Number(e.target.value) })}
                      />
                      <span>x</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Taller & Despacho</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="20"
                        min="100"
                        max="2000"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.mechanicsAndDispatchPerHour}
                        onChange={(e) => handleUpdateCostConfig({ mechanicsAndDispatchPerHour: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Mantenimiento & Llantas */}
              <div className="cost-pillar-card">
                <div className="cost-pillar-header">
                  <div className="cost-pillar-title">
                    <span className="pillar-icon">🔧</span>
                    <div>
                      <h4>3. Mantenimiento & Flota</h4>
                      <small>Repuestos, correctivo y llantas</small>
                    </div>
                  </div>
                  <span className="pillar-subtotal-badge highlight-indigo">
                    {formatColones(computedCosts.maintenancePerHour)}/h <small>({computedCosts.maintenancePct}%)</small>
                  </span>
                </div>

                <div className="cost-inputs-grid-2x2">
                  <div className="cost-input-row">
                    <label>Mantenimiento / Km</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="5"
                        min="10"
                        max="250"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.maintenanceCostPerKm}
                        onChange={(e) => handleUpdateCostConfig({ maintenanceCostPerKm: Number(e.target.value) })}
                      />
                      <span>₡/km</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Llantas & Rodamiento</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="20"
                        min="50"
                        max="1000"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.tiresCostPerHour}
                        onChange={(e) => handleUpdateCostConfig({ tiresCostPerHour: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Frecuencia Llantas</label>
                    <div className="input-readonly-compact">
                      <span>~45 000 km</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Mant. Horario Est.</label>
                    <div className="input-readonly-compact highlight-indigo">
                      <span>~₡{Math.round(costConfig.maintenanceCostPerKm * costConfig.averageSpeedKmH)}/h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 4: Cánones, Seguros & Depreciación */}
              <div className="cost-pillar-card">
                <div className="cost-pillar-header">
                  <div className="cost-pillar-title">
                    <span className="pillar-icon">🏛️</span>
                    <div>
                      <h4>4. Cánones & Fijos</h4>
                      <small>CTP, ARESEP, Dekra y seguros</small>
                    </div>
                  </div>
                  <span className="pillar-subtotal-badge highlight-slate">
                    {formatColones(computedCosts.fixedPerHour)}/h <small>({computedCosts.fixedPct}%)</small>
                  </span>
                </div>

                <div className="cost-inputs-grid-2x2">
                  <div className="cost-input-row">
                    <label>Canon CTP & ARESEP</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="20"
                        min="50"
                        max="1000"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.canonCtpAndAresepPerHour}
                        onChange={(e) => handleUpdateCostConfig({ canonCtpAndAresepPerHour: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Seguros & Inspección</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="20"
                        min="50"
                        max="1000"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.insuranceAndInspectionPerHour}
                        onChange={(e) => handleUpdateCostConfig({ insuranceAndInspectionPerHour: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Depreciación Flota (15a)</label>
                    <div className="input-with-unit-compact">
                      <input
                        type="number"
                        step="20"
                        min="100"
                        max="2000"
                        disabled={costConfig.mode === 'manual'}
                        value={costConfig.fleetDepreciationPerHour}
                        onChange={(e) => handleUpdateCostConfig({ fleetDepreciationPerHour: Number(e.target.value) })}
                      />
                      <span>₡/h</span>
                    </div>
                  </div>

                  <div className="cost-input-row">
                    <label>Terminal Coronado Hub</label>
                    <div className="input-readonly-compact">
                      <span>Concesión CTP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Cost Composition Bar & Impact Box */}
            <div className="cost-summary-box">
              <div className="cost-composition-header">
                <span className="summary-title">Composición del Costo por Hora-Bus (₡{computedCosts.totalCostPerHour.toLocaleString()} / h-bus)</span>
                <span className="summary-meta">Metodología Técnica ARESEP · Concesión Ruta 142 Coronado</span>
              </div>

              {/* Stacked Percentage Progress Bar */}
              <div className="cost-stacked-bar">
                <div className="cost-bar-segment seg-fuel" style={{ width: `${computedCosts.fuelPct}%` }} title={`Combustible: ${computedCosts.fuelPct}% (${formatColones(computedCosts.fuelPerHour)}/h)`}>
                  <span>Combustible {computedCosts.fuelPct}%</span>
                </div>
                <div className="cost-bar-segment seg-crew" style={{ width: `${computedCosts.crewPct}%` }} title={`Personal: ${computedCosts.crewPct}% (${formatColones(computedCosts.crewPerHour)}/h)`}>
                  <span>Personal {computedCosts.crewPct}%</span>
                </div>
                <div className="cost-bar-segment seg-maint" style={{ width: `${computedCosts.maintenancePct}%` }} title={`Mantenimiento: ${computedCosts.maintenancePct}% (${formatColones(computedCosts.maintenancePerHour)}/h)`}>
                  <span>Mant. {computedCosts.maintenancePct}%</span>
                </div>
                <div className="cost-bar-segment seg-fixed" style={{ width: `${computedCosts.fixedPct}%` }} title={`Cánones y Fijos: ${computedCosts.fixedPct}% (${formatColones(computedCosts.fixedPerHour)}/h)`}>
                  <span>Fijos {computedCosts.fixedPct}%</span>
                </div>
              </div>

              {/* Live Impact KPI Cards */}
              <div className="cost-impact-kpis">
                <div className="impact-kpi-card">
                  <span className="impact-kpi-label">Costo Hora-Bus</span>
                  <strong className="impact-kpi-val highlight-emerald">{formatColones(computedCosts.totalCostPerHour)}</strong>
                  <span className="impact-kpi-sub">Por unidad en servicio</span>
                </div>
                <div className="impact-kpi-card">
                  <span className="impact-kpi-label">Costo por Km</span>
                  <strong className="impact-kpi-val highlight-cyan">~₡{computedCosts.costPerKm.toLocaleString()}</strong>
                  <span className="impact-kpi-sub">A 16.5 km/h comercial</span>
                </div>
                <div className="impact-kpi-card">
                  <span className="impact-kpi-label">Gasto Diario Flota (L-V)</span>
                  <strong className="impact-kpi-val highlight-amber">{formatColones(computedCosts.totalCostPerHour * (scheduleColumns[0]?.busHours ?? 295))}</strong>
                  <span className="impact-kpi-sub">{scheduleColumns[0]?.busHours ?? 295} h-bus programadas</span>
                </div>
                <div className="impact-kpi-card">
                  <span className="impact-kpi-label">Equilibrio (Troncal ₡460)</span>
                  <strong className="impact-kpi-val highlight-slate">{formatOne(breakEven(460, { ...parameters, costPerBusHour: computedCosts.totalCostPerHour }))} pax/h</strong>
                  <span className="impact-kpi-sub">Exención 12% adulto mayor</span>
                </div>
                <div className="impact-kpi-card">
                  <span className="impact-kpi-label">Equilibrio (Ramal ₡400)</span>
                  <strong className="impact-kpi-val highlight-slate">{formatOne(breakEven(400, { ...parameters, costPerBusHour: computedCosts.totalCostPerHour }))} pax/h</strong>
                  <span className="impact-kpi-sub">Exención 12% adulto mayor</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="dialog-actions-bar">
        <div className="action-buttons-left">
          <button
            type="button"
            className="button button-primary apply-button"
            onClick={onApply}
            disabled={isApplying}
          >
            {isApplying ? '⚡ Aplicando…' : '⚡ Aplicar a Simulación'}
          </button>
          <button type="button" className="button button-secondary" onClick={onExport} title="Descarga este conjunto de reglas en formato JSON">
            💾 Exportar
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => fileInputRef.current?.click()}
            title="Carga un archivo de reglas JSON guardado"
          >
            📂 Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        <div className="action-status">
          {applySuccess && <span className="status-badge success">✓ Simulación actualizada y recalculada</span>}
          {applyError && <span className="status-badge error">⚠️ {applyError}</span>}
          {importStatus && <span className="status-badge info">{importStatus}</span>}
          {!isDefault && (
            <button type="button" className="link-button reset-button" onClick={onReset}>
              Restablecer valores
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
