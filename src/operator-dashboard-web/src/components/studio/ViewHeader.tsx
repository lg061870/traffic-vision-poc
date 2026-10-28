import type { ReactNode } from 'react'

interface ViewHeaderProps {
  title: string
  subtitle: string
  children?: ReactNode
}

export function ViewHeader({ title, subtitle, children }: ViewHeaderProps) {
  return (
    <div className="sv-title-row">
      <div>
        <div className="sv-title">{title}</div>
        <div className="sv-subtitle">{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {children}
        <span className="sv-sim-badge">Datos simulados</span>
      </div>
    </div>
  )
}
