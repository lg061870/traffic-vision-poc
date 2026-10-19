import React from 'react'

export type TabType = 'planner' | 'fleet' | 'alerts' | 'chat'

interface BottomNavProps {
  activeTab: TabType
  onSelectTab: (tab: TabType) => void
  alertCount?: number
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  alertCount = 2,
}) => {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`}
        onClick={() => onSelectTab('planner')}
      >
        <span className="nav-icon">🧭</span>
        <span>Planificar</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'fleet' ? 'active' : ''}`}
        onClick={() => onSelectTab('fleet')}
      >
        <span className="nav-icon">🚌</span>
        <span>Flota</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`}
        onClick={() => onSelectTab('alerts')}
        style={{ position: 'relative' }}
      >
        <span className="nav-icon">🔔</span>
        <span>Avisos</span>
        {alertCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: '25%',
              background: '#da3633',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              borderRadius: '10px',
              padding: '1px 5px',
            }}
          >
            {alertCount}
          </span>
        )}
      </button>

      <button
        className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onSelectTab('chat')}
      >
        <span className="nav-icon">💬</span>
        <span>Asistente</span>
      </button>
    </nav>
  )
}
