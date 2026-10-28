import React, { useState } from 'react'
import './UserMembershipView.css'

interface UserMembershipViewProps {
  onBackToDashboard: () => void
}

interface SeatUser {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Planner' | 'Finance' | 'Dispatcher'
  device: string
  ip: string
  lastHeartbeat: string
  isOnline: boolean
}

export function UserMembershipView({ onBackToDashboard }: UserMembershipViewProps) {
  const [users, setUsers] = useState<SeatUser[]>([
    {
      id: 'usr-1',
      name: 'Guillermo Jiménez (Gerencia)',
      email: 'gerencia@autobusescoronado.cr',
      role: 'Owner',
      device: 'LAPTOP-GERENCIA (Windows 11)',
      ip: '186.15.112.44 (San José)',
      lastHeartbeat: 'Hace 2 min',
      isOnline: true,
    },
    {
      id: 'usr-2',
      name: 'Carlos Solano Mora (Tráfico)',
      email: 'trafico@autobusescoronado.cr',
      role: 'Planner',
      device: 'DESKTOP-TERMINAL-CORONADO',
      ip: '186.15.112.45 (Terminal)',
      lastHeartbeat: 'Hace 8 min',
      isOnline: true,
    },
  ])

  const [localVaultPath, setLocalVaultPath] = useState<string>('G:\\Mi unidad\\Concesion_Coronado_BusLAB\\Casos_2026\\')
  const totalSeats = 3
  const occupiedSeats = users.length

  const handleRevokeSeat = (userId: string) => {
    if (confirm('¿Desea desvincular la sesión activa de este equipo para liberar el asiento?')) {
      setUsers(users.filter((u) => u.id !== userId))
      alert('Asiento liberado con éxito. El usuario deberá autenticarse nuevamente.')
    }
  }

  const handleInviteUser = () => {
    const email = prompt('Ingrese el correo electrónico del colaborador (Contador o Despachador):', 'contador@autobusescoronado.cr')
    if (email) {
      alert(`Invitación enviada a ${email}. Se le asignará el asiento #3 disponible.`)
    }
  }

  return (
    <div className="um-container">
      {/* Top Header Card */}
      <div className="um-header-card">
        <div className="um-title-row">
          <div className="um-barcode-tag">
            <span>LIC-CTP-R142-2026</span>
            <span>|</span>
            <span>CONTROL PLANE DE MEMBRESÍA & SEGURIDAD</span>
          </div>
          <div className="um-title">ADMINISTRACIÓN DE MEMBRESÍA, ASIENTOS Y REPOSITORIO</div>
          <div className="um-subtitle">
            Autobuses Unidos de Coronado S.A. · Cédula Jurídica: 3-101-084210 · Concesión CTP-R142
          </div>
        </div>

        <button
          type="button"
          className="um-btn secondary"
          onClick={onBackToDashboard}
        >
          ← VOLVER AL DASHBOARD
        </button>
      </div>

      {/* Grid: Plan Card, Seat Meter, Vault Card */}
      <div className="um-plan-grid">
        {/* Card 1: Subscription & Tier */}
        <div className="um-card">
          <div className="um-card-header">
            <span>PLAN ACTIVO & FACTURACIÓN</span>
            <span className="um-plan-badge">PLAN ESTÁNDAR</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="um-card-price">₡65,000</span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#666' }}>/ mes (Facturación Anual)</span>
          </div>

          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#555', borderBottom: '1px solid #d4cdc1', paddingBottom: '6px' }}>
            PRÓXIMA RENOVACIÓN: <strong>24 Noviembre 2027</strong> · ESTADO: <strong style={{ color: '#166534' }}>AL DÍA ●</strong>
          </div>

          <div className="um-feature-list">
            <div className="um-feature-item enabled">
              <span>✓</span>
              <span>Motor Estocástico Local en RAM (16ms)</span>
            </div>
            <div className="um-feature-item enabled">
              <span>✓</span>
              <span>Diagrama de Espacio-Tiempo (Marey)</span>
            </div>
            <div className="um-feature-item enabled">
              <span>✓</span>
              <span>Detector de Vueltas Deficitarias</span>
            </div>
            <div className="um-feature-item enabled">
              <span>✓</span>
              <span>Rol de Salidas Imprimible para Terminal</span>
            </div>
            <div className="um-feature-item enabled">
              <span>✓</span>
              <span>Archivos Autónomos Cifrados (.buslab)</span>
            </div>
            <div className="um-feature-item locked">
              <span>🔒</span>
              <span>Simulación Multi-Ruta (Requiere Plan Premium)</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="um-btn"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => alert('Planes disponibles:\n\n• Plan Contador: ₡35,000/mes (Solo finanzas)\n• Plan Chequeo: ₡35,000/mes (Solo despacho)\n• Plan Premium: ₡95,000/mes (Multi-ruta ilimitada)')}
            >
              MEJORAR A PLAN PREMIUM
            </button>
          </div>
        </div>

        {/* Card 2: Seat Allocation Meter */}
        <div className="um-card">
          <div className="um-card-header">
            <span>DISPONIBILIDAD DE ASIENTOS</span>
            <span style={{ color: '#166534', fontWeight: 700 }}>{occupiedSeats} / {totalSeats} EN USO</span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace', marginBottom: '4px' }}>
              <span>Ocupación de Asientos:</span>
              <strong>{Math.round((occupiedSeats / totalSeats) * 100)}%</strong>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2dbce', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${(occupiedSeats / totalSeats) * 100}%`, height: '100%', backgroundColor: '#10b981' }} />
            </div>
          </div>

          <div style={{ fontSize: '11px', lineHeight: 1.4, color: '#444' }}>
            Los asientos son flotantes: los colaboradores vinculan su equipo terminal al abrir la herramienta y liberan el asiento al cerrar la jornada.
          </div>

          <div style={{ background: '#ebe5d8', padding: '8px', border: '1px solid #d4cdc1', borderRadius: '2px', fontSize: '10px', fontFamily: 'monospace' }}>
            <strong>GRACIA OFFLINE:</strong> 13 días restantes sin necesidad de conexión para validar licencias en plantel.
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              className="um-btn secondary"
              style={{ justifyContent: 'center' }}
              onClick={handleInviteUser}
            >
              + ASIGNAR ASIENTO DISPONIBLE (#3)
            </button>
            <button
              type="button"
              className="um-btn secondary"
              style={{ justifyContent: 'center' }}
              onClick={() => alert('Añadir asiento adicional: ₡18,000/mes facturado a la cuenta de la concesión.')}
            >
              + COMPRAR ASIENTO EXTRA (₡18k/mes)
            </button>
          </div>
        </div>

        {/* Card 3: Storage Vault (The HYSYS / GDrive Connection) */}
        <div className="um-card">
          <div className="um-card-header">
            <span>REPOSITORIO LOCAL & GOOGLE DRIVE</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>SINCRONIZADO ●</span>
          </div>

          <div style={{ fontSize: '11px', color: '#444', lineHeight: 1.4 }}>
            Las simulaciones se guardan como archivos <strong>.buslab</strong> en su carpeta sincronizada de Google Drive o red local. Cero almacenamiento en nuestra nube.
          </div>

          <div className="um-vault-box">
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#666' }}>DIRECTORIO DE TRABAJO LOCAL / GDRIVE:</span>
            <strong style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', color: '#191817' }}>
              {localVaultPath}
            </strong>
          </div>

          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#666' }}>
            ÚLTIMA COMPROBACIÓN DE FIRMA:
            <br />
            <strong>25 Oct 2026 00:20 UTC (Cifrado SHA-256)</strong>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              type="button"
              className="um-btn secondary"
              style={{ justifyContent: 'center' }}
              onClick={() => {
                const path = prompt('Ingrese la nueva ruta local o de Google Drive para sus archivos .buslab:', localVaultPath)
                if (path) setLocalVaultPath(path)
              }}
            >
              📁 CAMBIAR DIRECTORIO GDRIVE...
            </button>
            <button
              type="button"
              className="um-btn"
              style={{ justifyContent: 'center' }}
              onClick={() => alert('Licencia y token de asientos sincronizados con éxito con el servidor central.')}
            >
              🔄 VALIDAR TOKEN DE LICENCIA
            </button>
          </div>
        </div>
      </div>

      {/* Seats Management Table */}
      <div className="um-card" style={{ flex: 1 }}>
        <div className="um-card-header">
          <span>USUARIOS CON ASIENTO ACTIVO & SESIONES VINCULADAS</span>
          <span>{occupiedSeats} de {totalSeats} Asientos en uso</span>
        </div>

        <table className="um-seats-table">
          <thead>
            <tr>
              <th>ESTADO</th>
              <th>COLABORADOR</th>
              <th>CORREO ELECTRÓNICO</th>
              <th>ROL / PERMISOS</th>
              <th>EQUIPO VINCULADO</th>
              <th>ÚLTIMO HEARTBEAT</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <span style={{ color: user.isOnline ? '#166534' : '#999', fontWeight: 700 }}>
                    {user.isOnline ? '● En Línea' : '○ Inactivo'}
                  </span>
                </td>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>
                  <span style={{ padding: '2px 6px', background: '#e2dbce', borderRadius: '2px', fontWeight: 600 }}>
                    {user.role === 'Owner' ? 'Propietario (Acceso Total)' : 'Planificador (Operaciones)'}
                  </span>
                </td>
                <td>
                  <div>{user.device}</div>
                  <div style={{ fontSize: '9px', color: '#777' }}>IP: {user.ip}</div>
                </td>
                <td>{user.lastHeartbeat}</td>
                <td>
                  {user.role !== 'Owner' && (
                    <button
                      type="button"
                      style={{
                        padding: '3px 6px',
                        background: 'transparent',
                        border: '1px solid #ef4444',
                        color: '#b91c1c',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                      }}
                      onClick={() => handleRevokeSeat(user.id)}
                    >
                      Liberar Asiento
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Vacant Seat Row */}
            <tr className="vacant">
              <td style={{ color: '#888' }}>○ Disponible</td>
              <td style={{ color: '#888' }}><em>Asiento Vacante (#3)</em></td>
              <td style={{ color: '#888' }}>Sin asignar</td>
              <td style={{ color: '#888' }}>Contador / Despachador</td>
              <td style={{ color: '#888' }}>Esperando vinculación de equipo</td>
              <td style={{ color: '#888' }}>-</td>
              <td>
                <button
                  type="button"
                  style={{
                    padding: '3px 8px',
                    background: '#191817',
                    border: '1px solid #000',
                    color: '#fef08a',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                  onClick={handleInviteUser}
                >
                  + Asignar Asiento
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legal & Privacy Guarantee Footer Banner */}
      <div style={{
        background: '#191817',
        color: '#e5e5e5',
        padding: '10px 14px',
        borderRadius: '2px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#10b981', fontSize: '14px' }}>🛡</span>
          <span>
            <strong>GARANTÍA DE INMUNIDAD REGULATORIA (LEY 8968):</strong> El servidor central de membresías solo registra credenciales y licencias. Los datos de aforo, horarios, dinero y rutas residen exclusivamente en sus archivos locales <strong>.buslab</strong>.
          </span>
        </div>
        <div style={{ color: '#aaa' }}>
          ID CONTRATO: <strong>CTP-2026-AUTOCORONADO</strong>
        </div>
      </div>
    </div>
  )
}
