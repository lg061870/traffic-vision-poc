import { defaultAssumptions, fareSource, fares, thresholds, type Assumptions } from '../config/operatorSettings'
import { breakEven, formatColones, formatOne } from '../kpis'

interface AssumptionsPanelProps {
  assumptions: Assumptions
  onChange: (assumptions: Assumptions) => void
  onReset: () => void
  isDefault: boolean
}

// What the money figures rest on. The cost and senior share can be changed on the spot, so the
// operator can see the dashboard with their own numbers.
export function AssumptionsPanel({ assumptions, onChange, onReset, isDefault }: AssumptionsPanelProps) {
  return (
    <div className="assumptions">
      <div className="assumption-inputs">
        <label>
          Costo de operación por hora-bus (₡)
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            step={100}
            value={assumptions.costPerBusHour}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (value > 0) onChange({ ...assumptions, costPerBusHour: value })
            }}
          />
          <small>
            {assumptions.costPerBusHour === defaultAssumptions.costPerBusHour
              ? 'Estimación del equipo (rango ₡10 500–16 550), por confirmar con el operador.'
              : 'Valor ingresado en este navegador.'}
          </small>
        </label>
        <label>
          Adultos mayores (% de abordajes, viajan gratis)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            step={1}
            value={Math.round(assumptions.seniorShare * 100)}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (value >= 0 && value < 100) onChange({ ...assumptions, seniorShare: value / 100 })
            }}
          />
          <small>
            {assumptions.seniorShare === defaultAssumptions.seniorShare ? 'Supuesto sin fuente, por confirmar.' : 'Valor ingresado en este navegador.'}
          </small>
        </label>
      </div>
      {!isDefault && (
        <button type="button" className="link-button" onClick={onReset}>
          Volver a los valores estimados
        </button>
      )}
      <table className="data-table compact">
        <thead>
          <tr>
            <th>Tarifa</th>
            <th>Rutas</th>
            <th>Equilibrio (abordajes por hora-bus)</th>
          </tr>
        </thead>
        <tbody>
          {[...new Set(Object.values(fares))].sort((a, b) => b - a).map((fare) => (
            <tr key={fare}>
              <td>{formatColones(fare)}</td>
              <td>{Object.entries(fares).filter(([, f]) => f === fare).map(([id]) => id).join(', ')}</td>
              <td>{formatOne(breakEven(fare, assumptions))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="sources">
        <li>{fareSource}. ARESEP las ajusta unas dos veces al año.</li>
        <li>Equilibrio = costo por hora-bus ÷ (tarifa × (1 − adultos mayores)).</li>
        <li>
          Alertas: saturado ≥ {thresholds.crowdedPercent} %, casi vacío &lt; {thresholds.nearlyEmptyPercent} %, agrupados a menos de{' '}
          {thresholds.bunchingMeters} m en la misma ruta y sentido.
        </li>
        <li>Detalle de cada valor y su fuente: docs/supuestos-dashboard-operador.md.</li>
      </ul>
    </div>
  )
}
