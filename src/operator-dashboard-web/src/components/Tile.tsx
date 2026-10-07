import type { ReactNode } from 'react'
import type { HelpKey } from '../help'
import { HelpButton } from './HelpButton'

interface TileProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'good' | 'bad' | 'neutral'
  /** Marks a value that rests on an estimate rather than a measurement. */
  estimate?: boolean
  /** Adds a "?" that explains the number and how it is calculated. */
  help?: HelpKey
}

export function Tile({ label, value, hint, tone = 'neutral', estimate, help }: TileProps) {
  return (
    <div className={`tile tile-${tone}`}>
      {help && <HelpButton topic={help} />}
      <div className="tile-label">
        {label}
        {estimate && <span className="estimate-mark" title="Usa una estimación">est.</span>}
      </div>
      <div className="tile-value">{value}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  )
}
