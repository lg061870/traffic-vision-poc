import type { ReactNode } from 'react'

interface TileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'good' | 'bad' | 'neutral'
  /** Marks a value that rests on an estimate rather than a measurement. */
  estimate?: boolean
}

export function Tile({ label, value, hint, tone = 'neutral', estimate }: TileProps) {
  return (
    <div className={`tile tile-${tone}`}>
      <div className="tile-label">
        {label}
        {estimate && <span className="estimate-mark" title="Usa una estimación">est.</span>}
      </div>
      <div className="tile-value">{value}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  )
}
