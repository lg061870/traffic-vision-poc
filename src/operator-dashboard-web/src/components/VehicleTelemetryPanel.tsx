import { useState } from 'react'
import { cameraDemo } from '../config/operatorSettings'
import { statusDisplay } from '../display'
import { shortName } from '../hooks/useRoutes'
import type { VehicleState } from '../types/occupancy'
import { CameraPanel } from './CameraPanel'
import { OccupancyDotMatrix } from './OccupancyDotMatrix'

interface VehicleTelemetryPanelProps {
  vehicle: VehicleState | undefined
  vehicleId: string
  routeId: string | null
  routeName: string | null
  onClose?: () => void
  onSelectVehicle?: (vehicleId: string) => void
}

function busChassisOf(vehicleId: string): string {
  if (vehicleId === 'SJB-2267') return 'CAIO Apache · IVECO 170S28'
  if (vehicleId.endsWith('1') || vehicleId.endsWith('3') || vehicleId.endsWith('6')) {
    return 'Marcopolo Torino · Mercedes-Benz OF-1721'
  }
  if (vehicleId.endsWith('2') || vehicleId.endsWith('4')) {
    return 'CAIO Apache VIP · IVECO 170S28'
  }
  if (vehicleId.endsWith('5') || vehicleId.endsWith('7')) {
    return 'Mascarello GranVia · Volvo B270F'
  }
  return 'Daewoo BS120 · Cummins ISB'
}

function busSpeedOf(vehicle: VehicleState | undefined): string {
  if (!vehicle || vehicle.stale) return '0 km/h'
  const seed = (vehicle.location?.lat ?? 0) * 10000 + (vehicle.location?.lon ?? 0) * 10000
  const spd = 28 + Math.abs(Math.round(seed) % 14)
  return `${spd} km/h`
}

export function VehicleTelemetryPanel({
  vehicle,
  vehicleId,
  routeId,
  routeName,
  onClose,
  onSelectVehicle,
}: VehicleTelemetryPanelProps) {
  const [showCamera, setShowCamera] = useState(false)
  const occupancy = vehicle?.occupancy ?? null
  const live = vehicle && !vehicle.stale
  const passengerCount = occupancy && live ? occupancy.passengerCount : 38
  const capacity = occupancy ? occupancy.capacity : 90
  const percent = occupancy && live ? occupancy.percent : 42.2
  const statusKey = occupancy && live ? occupancy.status : 'MANY_SEATS_AVAILABLE'
  const statusInfo = statusDisplay[statusKey]

  const seatedCount = Math.min(passengerCount, 38)
  const standingCount = Math.max(0, passengerCount - seatedCount)

  const isCameraBus = vehicleId === cameraDemo.vehicleId

  const badgeCode = routeId ? routeId.replace(/^R/, '') : '142'

  return (
    <aside className="telemetry-panel">
      {/* 1. Header */}
      <div className="telemetry-header">
        <div className="telemetry-header-left">
          <div className="route-badge-box">{badgeCode}</div>
          <div>
            <div className="telemetry-title-row">
              <h3 className="telemetry-plate">{vehicleId}</h3>
              <span className="telemetry-status-pill">
                {live ? 'En Servicio' : 'Sin Reporte'}
              </span>
            </div>
            <p className="telemetry-chassis">{busChassisOf(vehicleId)}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="telemetry-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel"
          >
            ×
          </button>
        )}
      </div>

      <div className="telemetry-scroll-body">
        {/* 2. Aforo en Tiempo Real (Card matching Screen 5) */}
        <div className="telemetry-card">
          <div className="telemetry-card-header">
            <span className="telemetry-card-title">Aforo en Tiempo Real</span>
            <span className={`telemetry-tone-pill tone-${percent < 40 ? 'green' : percent < 75 ? 'amber' : 'red'}`}>
              {statusInfo.label}
            </span>
          </div>

          <div className="telemetry-aforo-row">
            <div className="telemetry-matrix-wrapper">
              <OccupancyDotMatrix percent={percent} size="lg" />
            </div>
            <div className="telemetry-aforo-numbers">
              <span className="telemetry-big-count">{passengerCount}</span>
              <span className="telemetry-cap-total">/ {capacity} pax</span>
            </div>
            <div className="telemetry-aforo-percent font-mono">{percent}%</div>
          </div>

          {/* Bar indicator */}
          <div className="telemetry-progress-track">
            <div
              className={`telemetry-progress-fill ${
                percent < 40 ? 'bg-green' : percent < 75 ? 'bg-amber' : 'bg-red'
              }`}
              style={{ width: `${Math.min(100, Math.max(8, percent))}%` }}
            />
          </div>

          <div className="telemetry-seats-breakdown">
            <span>🪑 {seatedCount} sentados (38 cap.)</span>
            <span>🚶 {standingCount} de pie (52 cap.)</span>
          </div>
        </div>

        {/* 3. Speed & Accessibility Row */}
        <div className="telemetry-grid-2">
          <div className="telemetry-card compact">
            <span className="telemetry-card-title">Velocidad Actual</span>
            <span className="telemetry-metric-bold">⚡ {busSpeedOf(vehicle)}</span>
          </div>
          <div className="telemetry-card compact">
            <span className="telemetry-card-title">Accesibilidad</span>
            <span className="telemetry-chip-ramp">♿ Con Rampa</span>
          </div>
        </div>

        {/* 4. 30-Min Occupancy Curve with Peak Flag */}
        <div className="telemetry-card">
          <div className="telemetry-card-header">
            <span className="telemetry-card-title">Curva de Aforo (Últimos 30 min)</span>
            <span className="telemetry-sub-hint">Intervalos de 5 min</span>
          </div>

          <div className="telemetry-chart-bars">
            <div className="bar-col">
              <div className="bar-fill blue-light" style={{ height: '38px' }} title="06:40 · 22 pax" />
              <span className="bar-time">06:40</span>
            </div>
            <div className="bar-col">
              <div className="bar-fill blue-mid" style={{ height: '50px' }} title="06:45 · 29 pax" />
              <span className="bar-time">06:45</span>
            </div>
            <div className="bar-col">
              <div className="bar-fill blue-deep" style={{ height: '65px' }} title="06:50 · 36 pax" />
              <span className="bar-time">06:50</span>
            </div>
            <div className="bar-col">
              <div className="bar-fill blue-deep" style={{ height: '72px' }} title="06:55 · 40 pax" />
              <span className="bar-time">06:55</span>
            </div>
            <div className="bar-col">
              <div className="bar-fill red-peak" style={{ height: '86px' }} title="07:00 · 44 pax (Pico)">
                <span className="peak-tag">PICO</span>
              </div>
              <span className="bar-time highlight">07:00</span>
            </div>
            <div className="bar-col">
              <div className="bar-fill amber-mid" style={{ height: '68px' }} title="07:05 · 38 pax" />
              <span className="bar-time">07:05</span>
            </div>
          </div>

          <p className="telemetry-peak-summary">
            Pico máximo detectado: <strong>44 pax a las 07:00</strong>
          </p>
        </div>

        {/* 5. Unidades Cercanas en Línea (Anti-Bunching Radar) */}
        <div className="telemetry-bunching-section">
          <span className="telemetry-card-title block-title">Unidades Cercanas en Línea</span>
          <div className="bunching-list">
            <div
              className="bunching-item"
              onClick={() => onSelectVehicle?.('SJB-12726')}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="bunching-plate">SJB-12726</strong>
                <span className="bunching-spacing">5 min adelante</span>
              </div>
              <div className="bunching-stat-right">
                <span className="bunching-load text-red">84/90 pax (Lleno)</span>
                <OccupancyDotMatrix percent={92} size="sm" />
              </div>
            </div>

            <div
              className="bunching-item"
              onClick={() => onSelectVehicle?.('SJB-3490')}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <strong className="bunching-plate">SJB-3490</strong>
                <span className="bunching-spacing">12 min atrás</span>
              </div>
              <div className="bunching-stat-right">
                <span className="bunching-load text-green">26/90 pax (Cómodo)</span>
                <OccupancyDotMatrix percent={28} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* 6. AI Vision Cabin Camera if camera bus */}
        {isCameraBus && (
          <div className="telemetry-card">
            <div className="telemetry-card-header">
              <span className="telemetry-card-title">Cámara IA en Cabina</span>
              <button
                type="button"
                className="telemetry-cam-toggle"
                onClick={() => setShowCamera(!showCamera)}
              >
                {showCamera ? 'Ocultar video' : 'Ver transmisión en vivo'}
              </button>
            </div>
            {showCamera && (
              <div style={{ marginTop: '8px' }}>
                <CameraPanel
                  isCameraBus={true}
                  occupancy={occupancy}
                  vehicleId={vehicleId}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. Action Footer */}
      <div className="telemetry-footer-actions">
        <button type="button" className="action-btn-dark">
          Ver Historial Completo
        </button>
        <button type="button" className="action-btn-outline">
          Centrar
        </button>
      </div>
    </aside>
  )
}
