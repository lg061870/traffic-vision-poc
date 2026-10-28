import {
  computeHourlyFleetSupply,
  computeHourlyPassengerDemand,
  type DayScheduleConfig,
  type DayScheduleType,
} from '../../config/operatorSettings'
import { DAY_OF_SCHEDULE, DayColumn, DaySection, MiniBars, SCHEDULE_ORDER, SliderRow, Stat } from './dayCards'
import { ViewHeader } from './ViewHeader'
import { averageFare, breakEvenBoardings, colones, number, type StudioDay } from './studioModel'

interface DemandaParamsViewProps {
  schedules: Record<DayScheduleType, DayScheduleConfig>
  onScheduleChange: (schedule: DayScheduleConfig) => void
  demandScale: number
  fleet: number
  day: StudioDay
  onDayChange: (day: StudioDay) => void
  costPerHour: number
}

const FACTOR_LABELS: Record<DayScheduleType, [string, string, string]> = {
  weekday: ['Pico mañana (05:00–08:30)', 'Valle mediodía (09:00–15:30)', 'Pico tarde (16:00–19:30)'],
  saturday: ['Mañana (06:00–09:30)', 'Pico comercial (10:00–15:00)', 'Tarde / cierre (16:00–20:00)'],
  sunday_holiday: ['Mañana iglesias (06:00–10:00)', 'Pico almuerzo (11:00–15:00)', 'Retorno tarde (16:00–20:00)'],
}

const DEMAND_COLORS = { peak: '#16a06a', valley: '#2fb67f', night: '#6fcf9f', off: '#d6dde5' }

export function DemandaParamsView({ schedules, onScheduleChange, demandScale, fleet, day, onDayChange, costPerHour }: DemandaParamsViewProps) {
  return (
    <main className="sv-stage">
      <ViewHeader
        title="Nivel de Demanda"
        subtitle={`Aforo base, adulto mayor y factores por franja · escala global ${Math.round(demandScale * 100)} %`}
      />

      <div className="sv-day-grid">
        {SCHEDULE_ORDER.map((id) => {
          const s = schedules[id]
          const set = (patch: Partial<DayScheduleConfig>) => onScheduleChange({ ...s, ...patch })
          const demand = computeHourlyPassengerDemand(s, demandScale)
          const supply = computeHourlyFleetSupply(fleet, s)
          const total = demand.reduce((sum, h) => sum + h.passengers, 0)
          const senior = s.seniorShare ?? 0.12
          const paying = total * (1 - senior)
          const busHours = supply.reduce((sum, h) => sum + h.buses, 0)
          const revenue = paying * averageFare
          const cost = busHours * costPerHour
          const balance = revenue - cost
          const peak = Math.max(...demand.map((h) => h.passengers))
          const [l1, l2, l3] = FACTOR_LABELS[id]

          return (
            <DayColumn key={id} schedule={s} active={DAY_OF_SCHEDULE[id] === day} onUse={() => onDayChange(DAY_OF_SCHEDULE[id])}>
              <DaySection title="Aforo base y adulto mayor">
                <div className="sv-field-grid">
                  <label>
                    <span>Pasajeros / día base</span>
                    <input
                      type="number"
                      value={s.dailyRidership ?? 0}
                      onChange={(e) => set({ dailyRidership: e.target.valueAsNumber || 0 })}
                    />
                    <small>Escalado: ~{number(total)} pax</small>
                  </label>
                  <label>
                    <span>Adulto mayor (Ley 7935) %</span>
                    <input
                      type="number"
                      step={0.5}
                      value={Math.round(senior * 1000) / 10}
                      onChange={(e) => set({ seniorShare: (e.target.valueAsNumber || 0) / 100 })}
                    />
                    <small>~{number(total * senior)} viajes gratis</small>
                  </label>
                </div>
              </DaySection>

              <DaySection title="Factores de demanda por franja">
                <SliderRow label={l1} value={s.peakMorningFactor ?? 1} display={`${(s.peakMorningFactor ?? 1).toFixed(2)}×`} min={0} max={1.5} step={0.05} onChange={(v) => set({ peakMorningFactor: v })} />
                <SliderRow label={l2} value={s.middayValleyFactor ?? 1} display={`${(s.middayValleyFactor ?? 1).toFixed(2)}×`} min={0} max={1.5} step={0.05} onChange={(v) => set({ middayValleyFactor: v })} />
                <SliderRow label={l3} value={s.peakEveningFactor ?? 1} display={`${(s.peakEveningFactor ?? 1).toFixed(2)}×`} min={0} max={1.5} step={0.05} onChange={(v) => set({ peakEveningFactor: v })} />
              </DaySection>

              <DaySection title="Curva de pasajeros (24 h)" aside={<span className="sv-mini-legend">Pico ~{number(peak)} pax/h</span>}>
                <MiniBars values={demand.map((h) => h.passengers)} periods={demand.map((h) => h.period)} colors={DEMAND_COLORS} />
              </DaySection>

              <DaySection
                title="Balance de pasajeros y rentabilidad"
                aside={<span className="sv-tag">{number(total / Math.max(1, busHours), 1)} pax/h-bus</span>}
              >
                <div className="sv-stat-grid four">
                  <Stat label="Pasajeros pagos" value={`~${number(paying)}`} tone="good" />
                  <Stat label="Adulto mayor" value={`~${number(total * senior)}`} tone="warn" note={`${number(senior * 100)} %`} />
                  <Stat label="Ocupación / viaje" value={`~${number(total / Math.max(1, busHours * 1.67))}`} note="pax/viaje" />
                  <Stat label="Equilibrio" value={number(breakEvenBoardings(costPerHour, averageFare, senior))} note="pax/h-bus" />
                </div>
                <div className="sv-stat-grid two">
                  <Stat label="Ingreso tarifario" value={colones(revenue)} tone="good" note={`~${colones(averageFare)} tarifa media`} />
                  <Stat label="Costo flota despachada" value={colones(cost)} note={`${number(busHours)} h-bus`} />
                </div>
                <div className={`sv-callout ${balance >= 0 ? 'good' : 'bad'}`}>
                  {balance >= 0 ? '✓ Superávit' : '⚠ Déficit'} operativo estimado: {colones(balance)}/día (
                  {number((balance / Math.max(1, cost)) * 100)} % sobre costo)
                </div>
              </DaySection>
            </DayColumn>
          )
        })}
      </div>
    </main>
  )
}
