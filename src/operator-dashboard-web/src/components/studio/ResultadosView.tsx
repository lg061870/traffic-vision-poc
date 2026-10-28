import type { OperationalCostConfig } from '../../config/operatorSettings'
import { ViewHeader } from './ViewHeader'
import { colones, dailyResults, dayHasOwnProfile, number, type StudioDay } from './studioModel'

interface ResultadosViewProps {
  day: StudioDay
  costConfig: OperationalCostConfig
  scenarioFile: string
}

export function ResultadosView({ day, costConfig, scenarioFile }: ResultadosViewProps) {
  const result = dailyResults(day, costConfig)
  const { totals } = result
  const maxAbsMargin = Math.max(1, ...result.hours.map((h) => Math.abs(h.margin)))

  return (
    <main className="sv-stage">
      <ViewHeader
        title="Resultados"
        subtitle={`${scenarioFile} · ${result.schedule.label}${dayHasOwnProfile(day) ? '' : ' (perfil de Lunes a Viernes)'}`}
      />

      <div className="sv-kpis">
        <div className="sv-kpi">
          <div className="sv-kpi-label">Ingresos del día</div>
          <div className="sv-kpi-value">{colones(totals.revenue)}</div>
          <div className="sv-kpi-note">{number(totals.passengers)} pasajeros; el adulto mayor no paga</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Costos del día</div>
          <div className="sv-kpi-value">{colones(totals.cost)}</div>
          <div className="sv-kpi-note">
            {number(totals.busHours)} horas-bus × {colones(result.hourCost)}
          </div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Margen del día</div>
          <div className={`sv-kpi-value ${totals.margin >= 0 ? 'good' : 'bad'}`}>{colones(totals.margin)}</div>
          <div className="sv-kpi-note">{number((totals.margin / Math.max(1, totals.revenue)) * 100, 1)} % de los ingresos</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Horas rentables</div>
          <div className={`sv-kpi-value ${result.profitableHours * 2 >= result.hours.length ? 'good' : 'bad'}`}>
            {result.profitableHours} de {result.hours.length}
          </div>
          <div className="sv-kpi-note">equilibrio {number(result.breakEven, 1)} abordajes por hora-bus</div>
        </div>
      </div>

      <div className="sv-card" style={{ flex: 1 }}>
        <div className="sv-card-title">Resultado hora por hora</div>
        <div className="sv-card-sub">Ingresos con la tarifa promedio ponderada; costos con el costo por hora-bus de la pestaña Costos.</div>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th className="num">Buses</th>
                <th className="num">Pasajeros</th>
                <th className="num">Abordajes por hora-bus</th>
                <th className="num">Ingresos</th>
                <th className="num">Costos</th>
                <th className="num">Margen</th>
                <th style={{ width: '22%' }} />
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {result.hours.map((h) => {
                const width = (Math.abs(h.margin) / maxAbsMargin) * 50
                return (
                  <tr key={h.hour}>
                    <td>{h.label}</td>
                    <td className="num">{h.buses}</td>
                    <td className="num">{number(h.passengers)}</td>
                    <td className="num">{number(h.perBusHour, 1)}</td>
                    <td className="num">{colones(h.revenue)}</td>
                    <td className="num">{colones(h.cost)}</td>
                    <td className={`num ${h.margin >= 0 ? 'sv-pos' : 'sv-neg'}`}>{colones(h.margin)}</td>
                    <td>
                      <div style={{ position: 'relative', height: '9px', background: '#f1f4f7' }}>
                        <span
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: h.margin >= 0 ? '50%' : `${50 - width}%`,
                            width: `${width}%`,
                            background: h.margin >= 0 ? '#3f9142' : '#c93b3b',
                          }}
                        />
                        <span style={{ position: 'absolute', left: '50%', top: '-2px', bottom: '-2px', width: '1px', background: '#94a3b8' }} />
                      </div>
                    </td>
                    <td>
                      <span className={`sv-pill ${h.margin >= 0 ? 'good' : 'bad'}`}>{h.margin >= 0 ? 'Paga su costo' : 'Déficit'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{number(totals.busHours)}</td>
                <td className="num">{number(totals.passengers)}</td>
                <td className="num">{number(totals.passengers / Math.max(1, totals.busHours), 1)}</td>
                <td className="num">{colones(totals.revenue)}</td>
                <td className="num">{colones(totals.cost)}</td>
                <td className={`num ${totals.margin >= 0 ? 'sv-pos' : 'sv-neg'}`}>{colones(totals.margin)}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </main>
  )
}
