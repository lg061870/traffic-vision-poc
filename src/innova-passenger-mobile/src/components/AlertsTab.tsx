import React, { useState } from 'react'
import { getServiceAlerts } from '../api/client'

export const AlertsTab: React.FC = () => {
  const [alerts] = useState(getServiceAlerts())
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  const filteredAlerts = alerts.filter(a => {
    if (filterCategory === 'ALL') return true
    return a.category === filterCategory
  })

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: 4 }}>
          Alertas de Red & Incidencias
        </h2>
        <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: 12 }}>
          Monitoreo de desvíos, presas y estado operativo del GAM.
        </p>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'TRAFFIC', label: '🚗 Tráfico' },
            { id: 'DETOUR', label: '🚧 Desvíos' },
            { id: 'SYSTEM', label: '⚙️ Sistema' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id)}
              style={{
                background: filterCategory === f.id ? 'rgba(47, 129, 247, 0.2)' : '#161b22',
                borderColor: filterCategory === f.id ? '#2f81f7' : '#30363d',
                borderWidth: 1,
                borderStyle: 'solid',
                borderRadius: 16,
                color: filterCategory === f.id ? '#58a6ff' : '#8b949e',
                fontSize: '11px',
                fontWeight: 600,
                padding: '6px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredAlerts.map(alert => {
          const isDanger = alert.severity === 'DANGER'
          const isWarning = alert.severity === 'WARNING'
          const isSuccess = alert.severity === 'SUCCESS'

          const badgeBorder = isDanger ? '#da3633' : isWarning ? '#d29922' : isSuccess ? '#238636' : '#1f6feb'
          const badgeBg = isDanger ? 'rgba(218,54,51,0.15)' : isWarning ? 'rgba(210,153,34,0.15)' : isSuccess ? 'rgba(35,134,54,0.15)' : 'rgba(31,111,235,0.15)'
          const badgeText = isDanger ? '#f85149' : isWarning ? '#e3b341' : isSuccess ? '#3fb950' : '#58a6ff'

          return (
            <div key={alert.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span
                  style={{
                    background: badgeBg,
                    border: `1px solid ${badgeBorder}`,
                    color: badgeText,
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 6,
                    textTransform: 'uppercase',
                  }}
                >
                  {alert.category === 'TRAFFIC' ? 'Tráfico en vía' : alert.category === 'DETOUR' ? 'Desvío de ruta' : 'Estado de red'}
                </span>

                <span style={{ fontSize: '11px', color: '#8b949e' }}>
                  {alert.updatedAt}
                </span>
              </div>

              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 4, color: '#f0f6fc' }}>
                {alert.title}
              </h3>

              <p style={{ fontSize: '12px', color: '#c9d1d9', lineHeight: 1.4, marginBottom: 8 }}>
                {alert.description}
              </p>

              {/* Affected routes */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#8b949e' }}>Afecta:</span>
                {alert.affectedRoutes.map((r, rIdx) => (
                  <span
                    key={rIdx}
                    style={{
                      background: '#21262d',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: '10px',
                      color: '#c9d1d9',
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
