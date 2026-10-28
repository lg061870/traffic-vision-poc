import { computeOperationalCost, type OperationalCostConfig } from '../../config/operatorSettings'
import { ViewHeader } from './ViewHeader'
import { breakEvenBoardings, colones, costPerBusHour, dailyResults, number, seniorShareDefault } from './studioModel'

interface CostosViewProps {
  costConfig: OperationalCostConfig
  onChange: (config: OperationalCostConfig) => void
}

type NumericKey = Exclude<keyof OperationalCostConfig, 'mode'>

interface Field {
  key: NumericKey
  label: string
  unit: string
  step: number
  /** Shown and edited as a percentage while stored as a ratio. */
  percent?: boolean
}

const CARDS: {
  title: string
  sub: string
  icon: string
  part: 'fuelPerHour' | 'crewPerHour' | 'maintenancePerHour' | 'fixedPerHour'
  pct: 'fuelPct' | 'crewPct' | 'maintenancePct' | 'fixedPct'
  color: string
  fields: Field[]
}[] = [
  {
    title: '1. Combustible y energía',
    sub: 'RECOPE diésel regular + lubricantes',
    icon: '⛽',
    part: 'fuelPerHour',
    pct: 'fuelPct',
    color: '#d97706',
    fields: [
      { key: 'dieselPricePerLiter', label: 'Precio diésel', unit: '₡/L', step: 5 },
      { key: 'fuelEfficiencyKmPerLiter', label: 'Rendimiento flota', unit: 'km/L', step: 0.1 },
      { key: 'averageSpeedKmH', label: 'Velocidad comercial', unit: 'km/h', step: 0.5 },
      { key: 'lubricantsCostPerHour', label: 'Lubricantes y filtros', unit: '₡/h', step: 10 },
    ],
  },
  {
    title: '2. Personal operativo',
    sub: 'Choferes, relevos, CCSS e INS',
    icon: '👨‍✈️',
    part: 'crewPerHour',
    pct: 'crewPct',
    color: '#2563eb',
    fields: [
      { key: 'driverHourlyWage', label: 'Salario base chofer', unit: '₡/h', step: 50 },
      { key: 'driverSocialChargesRatio', label: 'Cargas sociales', unit: '%', step: 1, percent: true },
      { key: 'driverReliefMultiplier', label: 'Factor de relevo', unit: '×', step: 0.01 },
      { key: 'mechanicsAndDispatchPerHour', label: 'Taller y despacho', unit: '₡/h', step: 10 },
    ],
  },
  {
    title: '3. Mantenimiento y flota',
    sub: 'Repuestos, correctivo y llantas',
    icon: '🔧',
    part: 'maintenancePerHour',
    pct: 'maintenancePct',
    color: '#6d5bd0',
    fields: [
      { key: 'maintenanceCostPerKm', label: 'Mantenimiento', unit: '₡/km', step: 1 },
      { key: 'tiresCostPerHour', label: 'Llantas y rodamiento', unit: '₡/h', step: 10 },
    ],
  },
  {
    title: '4. Cánones y fijos',
    sub: 'CTP, ARESEP, RTV y seguros',
    icon: '🏛️',
    part: 'fixedPerHour',
    pct: 'fixedPct',
    color: '#64748b',
    fields: [
      { key: 'canonCtpAndAresepPerHour', label: 'Canon CTP y ARESEP', unit: '₡/h', step: 10 },
      { key: 'insuranceAndInspectionPerHour', label: 'Seguros e inspección', unit: '₡/h', step: 10 },
      { key: 'fleetDepreciationPerHour', label: 'Depreciación flota (15 a)', unit: '₡/h', step: 10 },
    ],
  },
]

export function CostosView({ costConfig, onChange }: CostosViewProps) {
  const breakdown = computeOperationalCost(costConfig)
  const hourCost = costPerBusHour(costConfig)
  const weekday = dailyResults('semana', costConfig)
  const set = (key: NumericKey, value: number) => onChange({ ...costConfig, [key]: Number.isFinite(value) ? value : 0 })
  const manual = costConfig.mode === 'manual'

  return (
    <main className="sv-stage">
      <ViewHeader title="Costos de operación" subtitle={`Costo activo: ${colones(hourCost)} / h-bus (~${colones(breakdown.costPerKm)}/km)`} />

      {manual && (
        <div className="sv-card sv-manual-row">
          <label htmlFor="sv-manual">Costo manual por hora-bus</label>
          <input
            id="sv-manual"
            type="number"
            step={50}
            value={costConfig.manualCostPerBusHour}
            onChange={(e) => set('manualCostPerBusHour', e.target.valueAsNumber)}
          />
          <span className="sv-card-sub">El desglose de abajo queda como referencia; el modelo usa este valor.</span>
        </div>
      )}

      <div className={`sv-cost-grid ${manual ? 'muted' : ''}`}>
        {CARDS.map((card) => (
          <div key={card.title} className="sv-card">
            <div className="sv-cost-head">
              <span className="sv-cost-icon">{card.icon}</span>
              <div>
                <div className="sv-card-title">{card.title}</div>
                <div className="sv-card-sub">{card.sub}</div>
              </div>
              <span className="sv-cost-pill" style={{ color: card.color }}>
                {colones(breakdown[card.part])}/h <small>({breakdown[card.pct]} %)</small>
              </span>
            </div>
            <div className="sv-cost-fields">
              {card.fields.map((f) => (
                <label key={f.key}>
                  <span>{f.label}</span>
                  <span className="sv-unit-input">
                    <input
                      type="number"
                      step={f.step}
                      disabled={manual}
                      value={f.percent ? Math.round(costConfig[f.key] * 100) : costConfig[f.key]}
                      onChange={(e) => set(f.key, f.percent ? e.target.valueAsNumber / 100 : e.target.valueAsNumber)}
                    />
                    <em>{f.unit}</em>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sv-card">
        <div className="sv-cost-head">
          <div className="sv-card-title">Composición del costo por hora-bus ({colones(breakdown.totalCostPerHour)} / h-bus)</div>
          <span className="sv-card-sub">Metodología técnica ARESEP · concesión ruta 142</span>
        </div>
        <div className="sv-stack labeled">
          {CARDS.map((c) => (
            <span key={c.part} style={{ width: `${breakdown[c.pct]}%`, background: c.color }}>
              {c.title.replace(/^\d\. /, '').split(' ')[0]} {breakdown[c.pct]} %
            </span>
          ))}
        </div>
        <div className="sv-stat-grid five">
          <div className="sv-stat centered">
            <div className="sv-stat-label">Costo hora-bus</div>
            <div className="sv-stat-value good">{colones(hourCost)}</div>
            <div className="sv-stat-note">por unidad en servicio</div>
          </div>
          <div className="sv-stat centered">
            <div className="sv-stat-label">Costo por km</div>
            <div className="sv-stat-value blue">~{colones(breakdown.costPerKm)}</div>
            <div className="sv-stat-note">a {number(costConfig.averageSpeedKmH, 1)} km/h comercial</div>
          </div>
          <div className="sv-stat centered">
            <div className="sv-stat-label">Gasto diario flota (L–V)</div>
            <div className="sv-stat-value warn">{colones(weekday.totals.cost)}</div>
            <div className="sv-stat-note">{number(weekday.totals.busHours)} h-bus programadas</div>
          </div>
          <div className="sv-stat centered">
            <div className="sv-stat-label">Equilibrio (troncal ₡460)</div>
            <div className="sv-stat-value">{number(breakEvenBoardings(hourCost, 460, seniorShareDefault), 1)} pax/h</div>
            <div className="sv-stat-note">exención {number(seniorShareDefault * 100)} % adulto mayor</div>
          </div>
          <div className="sv-stat centered">
            <div className="sv-stat-label">Equilibrio (ramal ₡400)</div>
            <div className="sv-stat-value">{number(breakEvenBoardings(hourCost, 400, seniorShareDefault), 1)} pax/h</div>
            <div className="sv-stat-note">exención {number(seniorShareDefault * 100)} % adulto mayor</div>
          </div>
        </div>
      </div>
    </main>
  )
}
