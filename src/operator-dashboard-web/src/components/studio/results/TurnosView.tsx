import { defaultOperationalCostConfig } from '../../../config/operatorSettings'
import { ViewHeader } from '../ViewHeader'
import { fmtTime, type RunOutput } from '../mockRun'
import { colones, number, pct, routeColor, runSubtitle, TimeAxis, widthPct } from './shared'

const REGULAR_HOURS = 8
const OVERTIME_PREMIUM = 1.5
const WAGE = defaultOperationalCostConfig.driverHourlyWage

export function TurnosView({ output }: { output: RunOutput }) {
  const routeOfBus = new Map(output.blocks.map((b) => [b.busId, b.routeId]))
  const shifts = output.shifts.map((s) => {
    const hours = (s.end - s.start) / 60
    return { ...s, hours, overtime: Math.max(0, hours - REGULAR_HOURS) }
  })
  const totalHours = shifts.reduce((sum, s) => sum + s.hours, 0)
  const overtime = shifts.reduce((sum, s) => sum + s.overtime, 0)
  const early = shifts.filter((s) => s.start < 300).length

  return (
    <main className="sv-stage">
      <ViewHeader title="Turnos de choferes" subtitle={`${runSubtitle(output)} · estimación: jornada ordinaria de ${REGULAR_HOURS} h`} />

      <div className="sv-kpis">
        <div className="sv-kpi">
          <div className="sv-kpi-label">Choferes necesarios</div>
          <div className="sv-kpi-value">{shifts.length}</div>
          <div className="sv-kpi-note">{number(shifts.length / Math.max(1, output.blocks.length), 2)} por bus</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Horas de manejo</div>
          <div className="sv-kpi-value">{number(totalHours)}</div>
          <div className="sv-kpi-note">promedio {number(totalHours / Math.max(1, shifts.length), 1)} h por turno</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Horas extra</div>
          <div className={`sv-kpi-value ${overtime > 0 ? 'bad' : 'good'}`}>{number(overtime, 1)}</div>
          <div className="sv-kpi-note">~{colones(overtime * WAGE * OVERTIME_PREMIUM)} por día</div>
        </div>
        <div className="sv-kpi">
          <div className="sv-kpi-label">Entran antes de las 05:00</div>
          <div className="sv-kpi-value">{early}</div>
          <div className="sv-kpi-note">turnos de madrugada</div>
        </div>
      </div>

      <div className="sv-card" style={{ flex: 1 }}>
        <div className="sv-card-title">Turnos del día</div>
        <div className="sv-card-sub">Cada turno corta el día de un bus en el primer cambio posible después de 7,5 h</div>
        <div className="sv-table-wrap">
          <table className="sv-table">
            <thead>
              <tr>
                <th>Chofer</th>
                <th>Bus</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th className="num">Horas</th>
                <th className="num">Extra</th>
                <th style={{ width: '45%' }}>
                  <TimeAxis />
                </th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.driverId}>
                  <td>{s.driverId}</td>
                  <td>
                    <span className="sv-swatch" style={{ background: routeColor(routeOfBus.get(s.busId) ?? 'R142') }} />
                    {s.busId}
                  </td>
                  <td>{fmtTime(s.start)}</td>
                  <td>{fmtTime(s.end)}</td>
                  <td className="num">{number(s.hours, 1)}</td>
                  <td className={`num ${s.overtime > 0 ? 'sv-neg' : ''}`}>{s.overtime > 0 ? number(s.overtime, 1) : '—'}</td>
                  <td>
                    <div className="sv-gantt-track thin">
                      <span
                        className="sv-gantt-bar"
                        style={{
                          left: pct(s.start),
                          width: widthPct(s.start, s.end),
                          background: s.overtime > 0 ? '#c93b3b' : routeColor(routeOfBus.get(s.busId) ?? 'R142'),
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
