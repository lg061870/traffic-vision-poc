import type { FleetHourlyUsage, VehicleList } from '../types/occupancy'

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

/** Per bus and per hour. Without a range: today in Costa Rica, from midnight until now. */
export function getFleetHourly(range: { from: Date; to: Date } | null, signal?: AbortSignal) {
  const query = range ? `?${new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() })}` : ''
  return getJson<FleetHourlyUsage>(`/api/v1/fleet/hourly${query}`, signal)
}
