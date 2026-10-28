// Building blocks shared by the three-day parameter screens (Despacho and Demanda).
import type { ReactNode } from 'react'
import type { DayScheduleConfig, DayScheduleType } from '../../config/operatorSettings'
import type { StudioDay } from './studioModel'

export const DAY_OF_SCHEDULE: Record<DayScheduleType, StudioDay> = {
  weekday: 'semana',
  saturday: 'sabado',
  sunday_holiday: 'domingo',
}

export const SCHEDULE_ORDER: DayScheduleType[] = ['weekday', 'saturday', 'sunday_holiday']

export function DayColumn({
  schedule,
  active,
  onUse,
  children,
}: {
  schedule: DayScheduleConfig
  active: boolean
  onUse: () => void
  children: ReactNode
}) {
  return (
    <section className={`sv-day-col ${active ? 'active' : ''}`}>
      <header className="sv-day-head">
        <span className="sv-day-icon">{schedule.icon}</span>
        <div>
          <div className="sv-day-title">{schedule.label}</div>
          <div className="sv-day-sub">{schedule.sublabel}</div>
        </div>
        <button type="button" className={`sv-btn ${active ? 'primary' : ''}`} onClick={onUse}>
          {active ? '● En simulación' : 'Usar en simulación'}
        </button>
      </header>
      {children}
    </section>
  )
}

export function DaySection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="sv-day-section">
      <div className="sv-day-section-title">
        <span>{title}</span>
        {aside}
      </div>
      {children}
    </div>
  )
}

export function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="sv-slider-row">
      <span className="sv-slider-label">
        <span>{label}</span>
        <strong>{display}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.valueAsNumber)} />
    </label>
  )
}

export function MiniBars({
  values,
  periods,
  colors,
}: {
  values: number[]
  periods: string[]
  colors: Record<string, string>
}) {
  const max = Math.max(1, ...values)
  return (
    <div className="sv-mini-bars">
      {values.map((v, h) => (
        <span key={h} className="sv-mini-slot" title={`${String(h).padStart(2, '0')}h: ${Math.round(v)}`}>
          <span style={{ height: `${(v / max) * 100}%`, background: colors[periods[h]] ?? '#cbd5e1' }} />
        </span>
      ))}
      <span className="sv-mini-axis">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
        <span>18h</span>
        <span>23h</span>
      </span>
    </div>
  )
}

export function Stat({ label, value, note, tone }: { label: string; value: ReactNode; note?: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="sv-stat">
      <div className="sv-stat-label">{label}</div>
      <div className={`sv-stat-value ${tone ?? ''}`}>{value}</div>
      {note && <div className="sv-stat-note">{note}</div>}
    </div>
  )
}
