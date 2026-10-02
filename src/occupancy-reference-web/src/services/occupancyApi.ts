import type { OccupancyHistory, VehicleEventList, VehicleList } from '../types/occupancy'

// Empty by default: Vite proxies /api to the Occupancy API (see vite.config.ts).
// Set VITE_OCCUPANCY_API_URL to call a deployed API directly; it allows GET from any origin.
const baseUrl = (import.meta.env.VITE_OCCUPANCY_API_URL ?? '').replace(/\/$/, '')

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    // Errors come back as Problem Details; the title is enough for a status line.
    const problem = await response.json().catch(() => null)
    throw new Error(problem?.title ?? `HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

export function getVehicles(signal?: AbortSignal) {
  return getJson<VehicleList>('/api/v1/vehicles', signal)
}

export function getEvents(vehicleId: string, since: Date, signal?: AbortSignal) {
  const query = new URLSearchParams({ since: since.toISOString() })
  return getJson<VehicleEventList>(`/api/v1/vehicles/${encodeURIComponent(vehicleId)}/events?${query}`, signal)
}

export function getHistory(vehicleId: string, from: Date, to: Date, interval: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), interval })
  return getJson<OccupancyHistory>(`/api/v1/vehicles/${encodeURIComponent(vehicleId)}/history?${query}`, signal)
}
