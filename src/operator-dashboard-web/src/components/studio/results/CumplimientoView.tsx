import { ViewHeader } from '../ViewHeader'
import { fmtTime, type RunOutput } from '../mockRun'
import { runSubtitle } from './shared'

type Status = 'ok' | 'warn' | 'fail'

export function CumplimientoView({ output }: { output: RunOutput }) {
  const firstTrip = Math.min(...output.trips.map((t) => t.depart))
  const lastTrip = Math.max(...output.trips.map((t) => t.depart))
  const trunkPeak = output.trips.filter((t) => t.routeId === 'R142' && t.direction === 'IDA' && t.depart >= 300 && t.depart < 540)
  const trunkHeadway = 240 / Math.max(1, trunkPeak.length)
  const servedRoutes = new Set(output.trips.map((t) => t.routeId)).size

  const rows: { item: string; authorized: string; simulated: string; status: Status; note: string }[] = [
    { item: 'Flota en servicio', authorized: '39 buses', simulated: `${output.blocks.length} buses`, status: output.blocks.length <= 39 ? 'ok' : 'fail', note: 'Acuerdo CTP de la concesión' },
    { item: 'Primer despacho', authorized: '04:30', simulated: fmtTime(firstTrip), status: firstTrip <= 280 ? 'ok' : 'warn', note: 'Horario autorizado L–V' },
    { item: 'Último despacho', authorized: '23:00', simulated: fmtTime(lastTrip), status: lastTrip >= 1370 ? 'ok' : 'warn', note: 'Horario autorizado L–V' },
    { item: 'Intervalo troncal en pico', authorized: '≤ 6 min', simulated: `${trunkHeadway.toFixed(1)} min`, status: trunkHeadway <= 6 ? 'ok' : trunkHeadway <= 8 ? 'warn' : 'fail', note: 'Frecuencia mínima CTP' },
    { item: 'Intervalo ramales en pico', authorized: '≤ 15 min', simulated: '14–22 min', status: 'warn', note: 'Cascajal y Patio de Agua por encima' },
    { item: 'Ramales con servicio', authorized: '12 de 12', simulated: `${servedRoutes} de 12`, status: servedRoutes === 12 ? 'ok' : 'fail', note: 'La Colmena sin buses asignados' },
    { item: 'Tarifas aplicadas', authorized: 'RE-0115-IT-2026', simulated: '₡400 / ₡460', status: 'ok', note: 'Vigentes desde el 4 sep 2026' },
    { item: 'Adulto mayor sin cobro', authorized: 'Ley 7935', simulated: 'Aplicado', status: 'ok', note: 'Exención en todos los ramales' },
    { item: 'Ocupación máxima', authorized: '≤ 100 %', simulated: `${output.totals.crowdedTrips} viajes llenos`, status: output.totals.crowdedTrips === 0 ? 'ok' : 'warn', note: 'Viajes al 100 % o más' },
  ]
  const label: Record<Status, string> = { ok: 'Cumple', warn: 'Revisar', fail: 'No cumple' }
  const tone: Record<Status, string> = { ok: 'good', warn: 'warn', fail: 'bad' }

  return (
    <main className="sv-stage">
      <ViewHeader title="Cumplimiento CTP / ARESEP" subtitle={runSubtitle(output)} />
      <div className="sv-kpis three">
        {(['ok', 'warn', 'fail'] as Status[]).map((s) => (
          <div key={s} className="sv-kpi">
            <div className="sv-kpi-label">{label[s]}</div>
            <div className={`sv-kpi-value ${s === 'ok' ? 'good' : s === 'fail' ? 'bad' : ''}`}>{rows.filter((r) => r.status === s).length}</div>
          </div>
        ))}
      </div>
      <div className="sv-card" style={{ flex: 1 }}>
        <div className="sv-card-title">Lista de verificación</div>
        <div className="sv-card-sub">Para adjuntar a una solicitud ante el CTP</div>
        <table className="sv-table">
          <thead>
            <tr>
              <th>Requisito</th>
              <th>Autorizado</th>
              <th>Simulado</th>
              <th>Estado</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.item}>
                <td>
                  <strong>{r.item}</strong>
                </td>
                <td>{r.authorized}</td>
                <td>{r.simulated}</td>
                <td>
                  <span className={`sv-pill ${tone[r.status]}`}>{label[r.status]}</span>
                </td>
                <td className="sv-muted">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
