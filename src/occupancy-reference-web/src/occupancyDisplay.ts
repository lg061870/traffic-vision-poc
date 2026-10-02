import type { OccupancyStatus, SensorSource, VehicleState } from './types/occupancy'

// GTFS-Realtime occupancy levels, from emptiest to fullest.
export const statusDisplay: Record<OccupancyStatus, { label: string; color: string }> = {
  EMPTY: { label: 'Vacío', color: '#2e9e5b' },
  MANY_SEATS_AVAILABLE: { label: 'Muchos asientos', color: '#5bb34a' },
  FEW_SEATS_AVAILABLE: { label: 'Pocos asientos', color: '#d9a400' },
  STANDING_ROOM_ONLY: { label: 'Solo de pie', color: '#e8730c' },
  CRUSHED_STANDING_ROOM_ONLY: { label: 'Muy lleno', color: '#d1352b' },
  FULL: { label: 'Lleno', color: '#8e1b2c' },
}

export const staleColor = '#9aa0a6'

export const sourceDisplay: Record<SensorSource, string> = {
  DOOR_COUNTER_3D: 'Contador de puerta',
  CABIN_CAMERA: 'Cámara de cabina',
  DOOR_CAMERA: 'Cámara de puerta',
  SIMULATED: 'Simulado',
}

export function vehicleColor(vehicle: VehicleState) {
  if (vehicle.stale || !vehicle.occupancy) return staleColor
  return statusDisplay[vehicle.occupancy.status].color
}

const compassPoints = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

export function compassPoint(headingDeg: number) {
  return compassPoints[Math.round(headingDeg / 45) % 8]
}

export function secondsAgo(iso: string, now: number) {
  return Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
}

export function formatAgo(iso: string, now: number) {
  const seconds = secondsAgo(iso, now)
  if (seconds < 120) return `hace ${seconds} s`
  if (seconds < 7200) return `hace ${Math.round(seconds / 60)} min`
  return `hace ${Math.round(seconds / 3600)} h`
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}
