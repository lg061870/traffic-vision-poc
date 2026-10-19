import React, { useState, useEffect } from 'react'

interface HeaderProps {
  isOffline: boolean
  onToggleOffline: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export const Header: React.FC<HeaderProps> = ({
  isOffline,
  onToggleOffline,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString('es-CR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <div className="device-notch">
        <span>{time || '09:41'}</span>
        <div className="notch-pill" />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>📶 5G</span>
          <span>🔋 96%</span>
        </div>
      </div>

      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-logo">5G</div>
          <div>
            <div className="brand-title">INNOVA Móvil</div>
            <div className="brand-subtitle">Pasajeros GAM</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className={`network-pill ${isOffline ? 'offline' : 'live'}`}
            onClick={onToggleOffline}
            title="Click para alternar entre API en vivo y respaldo offline local"
          >
            <span>{isOffline ? '⚡' : '●'}</span>
            <span>{isOffline ? 'Modo local' : 'En vivo'}</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            style={{
              background: 'transparent',
              border: '1px solid #30363d',
              borderRadius: '8px',
              color: '#8b949e',
              padding: '4px 7px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title={isFullscreen ? 'Ver marco de celular' : 'Ver en pantalla completa'}
          >
            {isFullscreen ? '📱' : '🖥️'}
          </button>
        </div>
      </header>
    </>
  )
}
