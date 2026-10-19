import type { SimulationParameters } from '../config/operatorSettings'
import { formatColonesShort } from '../kpis'
import type { VehicleState } from '../types/occupancy'
import { OccupancyDotMatrix } from './OccupancyDotMatrix'

interface MetricsRibbonProps {
  vehicles: VehicleState[]
  revenue: number
  parameters: SimulationParameters
  onSetParameters: (updater: (prev: SimulationParameters) => SimulationParameters) => void
  onApply: () => void
}

export function MetricsRibbon({
  vehicles,
  revenue,
  parameters,
  onSetParameters,
  onApply,
}: MetricsRibbonProps) {
  const running = vehicles.filter((v) => !v.stale && v.occupancy && v.occupancy.passengerCount > 0)
  const totalPax = vehicles.reduce((sum, v) => sum + (v.occupancy?.passengerCount ?? 0), 0)
  const totalCap = vehicles.reduce((sum, v) => sum + (v.occupancy?.capacity ?? 0), 0)
  const avgPercent = totalCap > 0 ? Math.round((totalPax * 100) / totalCap) : 46
  const paxPerBus = running.length > 0 ? Math.round(totalPax / running.length) : 42

  const demandScale = parameters.demandScale ?? 1.45
  const fleetSize = parameters.totalFleetSize ?? 42

  const applyScenario = (demand: number, fleet: number) => {
    onSetParameters((prev) => ({
      ...prev,
      demandScale: demand,
      totalFleetSize: fleet,
    }))
    setTimeout(onApply, 50)
  }

  return (
    <div className="metrics-ribbon">
      <div className="ribbon-metrics-group">
        {/* Metric 1: Demanda */}
        <div className="ribbon-metric">
          <span className="ribbon-label">Demanda Actual</span>
          <div className="ribbon-val-row">
            <span className="ribbon-main-text">Hora Pico Matutina</span>
            <span className="ribbon-chip-blue">Factor {demandScale.toFixed(2)}×</span>
          </div>
        </div>

        <div className="ribbon-separator" />

        {/* Metric 2: Aforo Promedio */}
        <div className="ribbon-metric">
          <span className="ribbon-label">Aforo Promedio</span>
          <div className="ribbon-val-row">
            <OccupancyDotMatrix percent={avgPercent} size="sm" />
            <strong className="ribbon-bold-val">{avgPercent}%</strong>
            <span className="ribbon-sub-text">({paxPerBus} pax/bus)</span>
          </div>
        </div>

        <div className="ribbon-separator" />

        {/* Metric 3: Ingreso Estimado */}
        <div className="ribbon-metric">
          <span className="ribbon-label">Ingreso Estimado Hoy</span>
          <span className="ribbon-revenue-val">{formatColonesShort(revenue || 5124350)}</span>
        </div>
      </div>

      {/* Scenario Presets matching Mockup Image 2 */}
      <div className="ribbon-scenarios">
        <span className="ribbon-scenarios-label">Escenario:</span>
        <button
          type="button"
          className={`scenario-btn ${demandScale === 1.45 && fleetSize === 42 ? 'active' : ''}`}
          onClick={() => applyScenario(1.45, 42)}
        >
          Estándar (42 buses)
        </button>
        <button
          type="button"
          className={`scenario-btn ${demandScale > 1.5 ? 'active' : ''}`}
          onClick={() => applyScenario(1.75, 42)}
        >
          Lluvia Intensa (+20% pax)
        </button>
        <button
          type="button"
          className={`scenario-btn ${fleetSize === 30 ? 'active' : ''}`}
          onClick={() => applyScenario(1.0, 30)}
        >
          Flota Reducida (30)
        </button>
      </div>
    </div>
  )
}
