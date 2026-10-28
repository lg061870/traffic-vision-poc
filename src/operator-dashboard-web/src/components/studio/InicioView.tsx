import type { OperationalCostConfig } from '../../config/operatorSettings'
import { ViewHeader } from './ViewHeader'
import { colones, dailyResults, number, routes, totalFleet, type StudioDay, type StudioTab } from './studioModel'

interface InicioViewProps {
  day: StudioDay
  costConfig: OperationalCostConfig
  scenarioFile: string
  onNavigate: (tab: StudioTab) => void
}

const SHORTCUTS: { tab: StudioTab; title: string; text: string }[] = [
  { tab: 'rutas', title: 'Rutas y Ramales', text: 'Troncal, ramales, paradas, kilómetros y buses asignados.' },
  { tab: 'despacho', title: 'Despacho Horario', text: 'Qué horas y qué ramales pagan su costo.' },
  { tab: 'demanda', title: 'Nivel de Demanda', text: 'Pasajeros por hora contra buses en servicio.' },
  { tab: 'costos', title: 'Costos', text: 'Costo por hora-bus y punto de equilibrio.' },
  { tab: 'resultados', title: 'Resultados', text: 'Ingresos, costos y margen del día, hora por hora.' },
  { tab: 'ayuda', title: 'Ayuda', text: 'Cómo leer cada pantalla y de dónde salen los datos.' },
]

export function InicioView({ day, costConfig, scenarioFile, onNavigate }: InicioViewProps) {
  const result = dailyResults(day, costConfig)

  return (
    <main className="sv-stage">
      <ViewHeader title="Inicio" subtitle={`Escenario activo: ${scenarioFile} · ${result.schedule.label}`} />

      <div className="sv-kpis">
        <div className="sv-kpi">
          <div className="sv-kpi-label">Flota autorizada</div>
          <div className="sv-kpi-value">{totalFleet} buses</div>
          <div className="sv-kpi-note">{routes.length} rutas: 1 troncal y {routes.length - 1} ramales</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Pasajeros del día</div>
          <div className="sv-kpi-value">{number(result.totals.passengers)}</div>
          <div className="sv-kpi-note">{number(result.totals.busHours)} horas-bus en servicio</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Horas que pagan su costo</div>
          <div className={`sv-kpi-value ${result.profitableHours * 2 >= result.hours.length ? 'good' : 'bad'}`}>
            {result.profitableHours} de {result.hours.length}
          </div>
          <div className="sv-kpi-note">equilibrio {number(result.breakEven, 1)} abordajes por hora-bus</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Margen del día</div>
          <div className={`sv-kpi-value ${result.totals.margin >= 0 ? 'good' : 'bad'}`}>{colones(result.totals.margin)}</div>
          <div className="sv-kpi-note">ingresos {colones(result.totals.revenue)} · costos {colones(result.totals.cost)}</div>
        </div>
      </div>

      <div className="sv-card">
        <div className="sv-card-title">Ir a</div>
        <div className="sv-card-sub">Cada pestaña de la cinta abre su pantalla aquí.</div>
        <div className="sv-actions">
          {SHORTCUTS.map((s) => (
            <button key={s.tab} type="button" className="sv-action" onClick={() => onNavigate(s.tab)}>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
