import type { OperationalCostConfig } from '../../config/operatorSettings'
import { ViewHeader } from './ViewHeader'
import { dailyResults, dayHasOwnProfile, number, totalFleet, type StudioDay } from './studioModel'

interface DemandaViewProps {
  day: StudioDay
  costConfig: OperationalCostConfig
  onDayChange: (day: StudioDay) => void
}

const DAYS: { id: StudioDay; label: string }[] = [
  { id: 'semana', label: 'Lunes a Viernes' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

const PERIOD_LABEL = { peak: 'Pico', valley: 'Valle', night: 'Noche', off: 'Sin servicio' }

export function DemandaView({ day, costConfig, onDayChange }: DemandaViewProps) {
  const result = dailyResults(day, costConfig)
  const maxPassengers = Math.max(1, ...result.hours.map((h) => h.passengers))
  const maxBuses = Math.max(1, ...result.hours.map((h) => h.buses))
  const peak = result.hours.reduce((best, h) => (h.passengers > best.passengers ? h : best), result.hours[0])

  return (
    <main className="sv-stage">
      <ViewHeader title="Nivel de Demanda" subtitle={result.schedule.description}>
        <div className="sv-seg">
          {DAYS.map((d) => (
            <button key={d.id} type="button" className={day === d.id ? 'active' : ''} onClick={() => onDayChange(d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      </ViewHeader>

      {!dayHasOwnProfile(day) && (
        <div className="sv-card-sub">Este escenario todavía no tiene un perfil propio; se muestra el de Lunes a Viernes.</div>
      )}

      <div className="sv-kpis">
        <div className="sv-kpi">
          <div className="sv-kpi-label">Pasajeros del día</div>
          <div className="sv-kpi-value">{number(result.totals.passengers)}</div>
          <div className="sv-kpi-note">{result.schedule.label}</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Hora de mayor demanda</div>
          <div className="sv-kpi-value">{peak.label}</div>
          <div className="sv-kpi-note">{number(peak.passengers)} pasajeros</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Adulto mayor (viaja gratis)</div>
          <div className="sv-kpi-value">{number(result.seniorShare * 100, 1)} %</div>
          <div className="sv-kpi-note">de los abordajes</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Servicio</div>
          <div className="sv-kpi-value">
            {result.schedule.firstDeparture}–{result.schedule.lastDeparture}
          </div>
          <div className="sv-kpi-note">
            troncal cada {result.schedule.trunkHeadwayMinutes} min · ramales cada {result.schedule.feederHeadwayMinutes} min
          </div>
        </div>
      </div>

      <div className="sv-grid-2">
        <div className="sv-card">
          <div className="sv-card-title">Pasajeros por hora</div>
          <div className="sv-card-sub">Toda la concesión</div>
          <div className="sv-bars">
            {result.hours.map((h) => (
              <div key={h.hour} className="sv-bar-col" title={`${h.label}: ${number(h.passengers)} pasajeros (${PERIOD_LABEL[h.period]})`}>
                <div className={`sv-bar ${h.period}`} style={{ height: `${(h.passengers / maxPassengers) * 100}%` }} />
                <span className="sv-bar-label">{h.hour}</span>
              </div>
            ))}
          </div>
          <div className="sv-legend">
            <span><span className="sv-swatch" style={{ background: '#1d4f86' }} />Pico</span>
            <span><span className="sv-swatch" style={{ background: '#5b7fa6' }} />Valle</span>
            <span><span className="sv-swatch" style={{ background: '#94a9c2' }} />Noche</span>
          </div>
        </div>

        <div className="sv-card">
          <div className="sv-card-title">Buses en servicio por hora</div>
          <div className="sv-card-sub">Hasta {maxBuses} buses a la vez, de {totalFleet} autorizados</div>
          <div className="sv-bars">
            {result.hours.map((h) => (
              <div key={h.hour} className="sv-bar-col" title={`${h.label}: ${h.buses} buses`}>
                <div className={`sv-bar ${h.period}`} style={{ height: `${(h.buses / maxBuses) * 100}%` }} />
                <span className="sv-bar-label">{h.hour}</span>
              </div>
            ))}
          </div>
          <div className="sv-legend">
            <span>Pasajeros por bus en la hora pico: {number(peak.perBusHour, 1)}</span>
          </div>
        </div>
      </div>

      <div className="sv-card">
        <div className="sv-card-title">Detalle por hora</div>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Periodo</th>
                <th className="num">Pasajeros</th>
                <th className="num">Buses</th>
                <th className="num">Abordajes por hora-bus</th>
                <th className="num">Equilibrio</th>
              </tr>
            </thead>
            <tbody>
              {result.hours.map((h) => (
                <tr key={h.hour}>
                  <td>{h.label}</td>
                  <td>{PERIOD_LABEL[h.period]}</td>
                  <td className="num">{number(h.passengers)}</td>
                  <td className="num">{h.buses}</td>
                  <td className={`num ${h.perBusHour >= result.breakEven ? 'sv-pos' : 'sv-neg'}`}>{number(h.perBusHour, 1)}</td>
                  <td className="num">{number(result.breakEven, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
