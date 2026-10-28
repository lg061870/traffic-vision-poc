import { computeHourlyFleetSupply, type DayScheduleConfig, type DayScheduleType } from '../../config/operatorSettings'
import { DAY_OF_SCHEDULE, DayColumn, DaySection, MiniBars, SCHEDULE_ORDER, SliderRow, Stat } from './dayCards'
import { ViewHeader } from './ViewHeader'
import { colones, number, type StudioDay } from './studioModel'

interface DespachoParamsViewProps {
  schedules: Record<DayScheduleType, DayScheduleConfig>
  onScheduleChange: (schedule: DayScheduleConfig) => void
  fleet: number
  day: StudioDay
  onDayChange: (day: StudioDay) => void
  costPerHour: number
}

const PEAK_LABEL: Record<DayScheduleType, string> = {
  weekday: 'Pico (05–09 / 16–19)',
  saturday: 'Pico (10–14)',
  sunday_holiday: 'Pico (10–15)',
}

const SUPPLY_COLORS = { peak: '#2b7bc0', valley: '#e0a030', night: '#8b6fd6', off: '#e5e8ec' }

export function DespachoParamsView({ schedules, onScheduleChange, fleet, day, onDayChange, costPerHour }: DespachoParamsViewProps) {
  return (
    <main className="sv-stage">
      <ViewHeader title="Despacho Horario" subtitle={`Frecuencias y flota activa por franja para cada tipo de día · flota de ${fleet} buses`} />

      <div className="sv-day-grid">
        {SCHEDULE_ORDER.map((id) => {
          const s = schedules[id]
          const set = (patch: Partial<DayScheduleConfig>) => onScheduleChange({ ...s, ...patch })
          const supply = computeHourlyFleetSupply(fleet, s)
          const busHours = supply.reduce((sum, h) => sum + h.buses, 0)
          const serviceHours = supply.filter((h) => h.buses > 0).length
          const km = busHours * 16.5
          const diesel = km / 2.8
          const flatDiesel = (fleet * serviceHours * 16.5) / 2.8
          const share = (v: number) => `${Math.round(v * 100)} % (${Math.round(fleet * v)}b)`

          return (
            <DayColumn key={id} schedule={s} active={DAY_OF_SCHEDULE[id] === day} onUse={() => onDayChange(DAY_OF_SCHEDULE[id])}>
              <DaySection title="Despacho y frecuencias">
                <div className="sv-field-grid">
                  <label>
                    <span>1er despacho</span>
                    <input type="time" value={s.firstDeparture} onChange={(e) => set({ firstDeparture: e.target.value })} />
                  </label>
                  <label>
                    <span>Último despacho</span>
                    <input type="time" value={s.lastDeparture} onChange={(e) => set({ lastDeparture: e.target.value })} />
                  </label>
                  <label>
                    <span>Troncal R142 (min)</span>
                    <input
                      type="number"
                      value={s.trunkHeadwayMinutes}
                      onChange={(e) => set({ trunkHeadwayMinutes: e.target.valueAsNumber || 1 })}
                    />
                  </label>
                  <label>
                    <span>Ramales (min)</span>
                    <input
                      type="number"
                      value={s.feederHeadwayMinutes}
                      onChange={(e) => set({ feederHeadwayMinutes: e.target.valueAsNumber || 1 })}
                    />
                  </label>
                </div>
              </DaySection>

              <DaySection title="Flota activa por franja">
                <SliderRow label={PEAK_LABEL[id]} value={s.peakFleetShare} display={share(s.peakFleetShare)} min={0} max={1} step={0.01} onChange={(v) => set({ peakFleetShare: v })} />
                <SliderRow label="Valle mediodía" value={s.valleyFleetShare} display={share(s.valleyFleetShare)} min={0} max={1} step={0.01} onChange={(v) => set({ valleyFleetShare: v })} />
                <SliderRow label="Noche / cierre" value={s.nightFleetShare} display={share(s.nightFleetShare)} min={0} max={1} step={0.01} onChange={(v) => set({ nightFleetShare: v })} />
              </DaySection>

              <DaySection
                title="Curva de oferta (24 h)"
                aside={
                  <span className="sv-mini-legend">
                    <i style={{ background: SUPPLY_COLORS.peak }} />Pico <i style={{ background: SUPPLY_COLORS.valley }} />Valle{' '}
                    <i style={{ background: SUPPLY_COLORS.night }} />Noche
                  </span>
                }
              >
                <MiniBars values={supply.map((h) => h.buses)} periods={supply.map((h) => h.period)} colors={SUPPLY_COLORS} />
              </DaySection>

              <DaySection title="Proyección diaria" aside={<span className="sv-tag">{serviceHours} h de servicio</span>}>
                <div className="sv-stat-grid four">
                  <Stat label="Flota activa" value={`${Math.round(fleet * s.peakFleetShare)}b pico`} note={`${Math.round(fleet * s.valleyFleetShare)}b valle`} />
                  <Stat label="Salidas est." value={`~${number(busHours * 1.67)}`} note="viajes" />
                  <Stat label="Horas-bus" value={number(busHours)} note="h-bus" />
                  <Stat label="Recorrido est." value={`~${number(km)}`} note="km" />
                </div>
                <div className="sv-stat-grid two">
                  <Stat label="Costo operativo diario" value={colones(busHours * costPerHour)} tone="good" />
                  <Stat label="Diésel estimado" value={`~${number(diesel)} L`} tone="warn" note={colones(diesel * 785)} />
                </div>
                <div className="sv-callout good">
                  ✓ Ahorro contra flota plana: −{number(flatDiesel - diesel)} L diésel · {colones((flatDiesel - diesel) * 785)}/día
                </div>
              </DaySection>
            </DayColumn>
          )
        })}
      </div>
    </main>
  )
}
