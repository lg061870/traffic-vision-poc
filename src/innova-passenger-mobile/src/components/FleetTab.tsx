import React, { useState } from 'react'
import { getFleetData } from '../api/client'

export const FleetTab: React.FC = () => {
  const [fleet] = useState(getFleetData())
  const [search, setSearch] = useState('')
  const [selectedBus, setSelectedBus] = useState<any | null>(null)

  const filteredFleet = fleet.filter(b => {
    const q = search.toLowerCase()
    return (
      b.vehicleId.toLowerCase().includes(q) ||
      b.routeName.toLowerCase().includes(q) ||
      b.headsign.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search Header */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: 4 }}>
          Telemetría de Flota 5G
        </h2>
        <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: 12 }}>
          {fleet.length} unidades activas con sensores y visión de aforo en tiempo real.
        </p>

        <input
          type="text"
          placeholder="Buscar por placa o ruta (ej. SJB-2267)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 10,
            padding: '10px 12px',
            color: '#f0f6fc',
            fontSize: '13px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Fleet list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredFleet.map(bus => {
          const isHigh = bus.percent >= 75
          const isMedium = bus.percent >= 50 && bus.percent < 75
          const badgeClass = isHigh ? 'badge-high' : isMedium ? 'badge-medium' : 'badge-low'
          const statusText = isHigh ? 'Alta ocupación' : isMedium ? 'Media ocupación' : 'Baja ocupación'

          return (
            <div
              key={bus.vehicleId}
              className="card"
              onClick={() => setSelectedBus(bus)}
              style={{ cursor: 'pointer', padding: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f0f6fc' }}>
                    🚌 {bus.vehicleId}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e' }}>
                    {bus.routeName} hacia {bus.headsign}
                  </div>
                </div>

                <span className={`badge ${badgeClass}`}>
                  {statusText}
                </span>
              </div>

              {/* Passenger Bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8b949e', marginBottom: 3 }}>
                  <span>Aforo: {bus.passengerCount} / {bus.capacity} pasajeros</span>
                  <span style={{ fontWeight: 700, color: isHigh ? '#f85149' : isMedium ? '#e3b341' : '#3fb950' }}>
                    {bus.percent}%
                  </span>
                </div>
                <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${bus.percent}%`,
                      background: isHigh ? '#da3633' : isMedium ? '#d29922' : '#238636',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>

              {/* Telemetry chips */}
              <div style={{ display: 'flex', gap: 12, fontSize: '11px', color: '#8b949e' }}>
                <span>⚡ {bus.speedKmh} km/h</span>
                <span>🧭 Rumbo: {bus.headingDeg}°</span>
                <span style={{ marginLeft: 'auto', color: '#2f81f7', fontWeight: 600 }}>
                  Ver historial 📊
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Historical Occupancy Detail Modal */}
      {selectedBus && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 3000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            padding: 0,
          }}
          onClick={() => setSelectedBus(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#161b22',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: '2px solid #30363d',
              padding: '20px 16px 32px',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.9)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Historial: {selectedBus.vehicleId}</h3>
                <p style={{ fontSize: '12px', color: '#8b949e' }}>
                  Evolución de ocupación cada 5 minutos (última media hora)
                </p>
              </div>
              <button
                onClick={() => setSelectedBus(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8b949e',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Visual Bar Chart */}
            <div style={{ background: '#0d1117', borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: 10, fontWeight: 600 }}>
                CURVA DE AFORO (SERIE DE TIEMPO):
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', height: 130, gap: 10, paddingBottom: 8, borderBottom: '1px solid #30363d' }}>
                {selectedBus.history.map((h: any, idx: number) => {
                  const hHigh = h.percent >= 75
                  const hMed = h.percent >= 50 && h.percent < 75
                  const color = hHigh ? '#da3633' : hMed ? '#d29922' : '#238636'

                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '9px', color: '#8b949e', marginBottom: 2 }}>{h.passengers}p</span>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max(10, h.percent)}%`,
                          background: color,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8b949e', marginTop: 6 }}>
                {selectedBus.history.map((h: any, idx: number) => (
                  <span key={idx}>{h.time}</span>
                ))}
              </div>
            </div>

            {/* Real-time stats footer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: '#21262d', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: '10px', color: '#8b949e' }}>PICO MÁXIMO</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#f85149' }}>
                  {Math.max(...selectedBus.history.map((h: any) => h.passengers))} pax
                </div>
              </div>
              <div style={{ background: '#21262d', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: '10px', color: '#8b949e' }}>ESTADO EN VIVO</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#3fb950' }}>
                  {selectedBus.passengerCount} pax ({selectedBus.percent}%)
                </div>
              </div>
            </div>

            <button className="btn-primary" onClick={() => setSelectedBus(null)}>
              Cerrar detalle
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
