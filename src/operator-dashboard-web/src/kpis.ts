// Indicators computed from what the Occupancy API reports plus the fares and assumptions in
// config/operatorSettings.ts. Pure functions, so every number on screen can be traced to a formula
// in docs/supuestos-dashboard-operador.md.
import { fareOf, sourcesWithBoardings, thresholds, type Assumptions } from './config/operatorSettings'
import type { BusHourlyUsage, FleetHourlyUsage, HourlyUsage, VehicleState } from './types/occupancy'

/** One bus during one hour, with the route it ran. */
export interface UsageRow {
  vehicleId: string
  routeId: string | null
  usage: HourlyUsage
}

export function usageRows(fleet: FleetHourlyUsage | null): UsageRow[] {
  if (!fleet) return []
  return fleet.buses.flatMap((bus: BusHourlyUsage) =>
    bus.hours.map((usage) => ({ vehicleId: bus.vehicleId, routeId: usage.routeId ?? bus.routeId, usage })),
  )
}

export interface Totals {
  buses: number
  serviceHours: number
  /** Service hours whose source counts door boardings; the base for riders per hour and money. */
  measuredHours: number
  boardings: number
  revenue: number
  cost: number
  /** Sum of (cost − revenue) over the bus-hours where revenue did not cover cost. */
  loss: number
  /** Service hours spent in those losing bus-hours. */
  lossHours: number
  /** What the bus-hours that covered their cost earned above it; gain − loss = revenue − cost. */
  gain: number
  averagePercent: number
  crowdedHours: number
  nearlyEmptyHours: number
  ridersPerBusHour: number
  /** Boardings per bus-hour needed to cover the cost, at these rows' average fare. */
  breakEven: number
}

const crowdedBand = Math.floor(thresholds.crowdedPercent / 10)
const nearlyEmptyBands = Math.floor(thresholds.nearlyEmptyPercent / 10)

export function totals(rows: UsageRow[], assumptions: Assumptions): Totals {
  const paying = 1 - assumptions.seniorShare
  let serviceSeconds = 0
  let measuredSeconds = 0
  let percentSeconds = 0
  let crowdedSeconds = 0
  let nearlyEmptySeconds = 0
  let boardings = 0
  let fareBoardings = 0
  let revenue = 0
  let cost = 0
  let loss = 0
  let lossSeconds = 0
  const buses = new Set<string>()

  for (const { vehicleId, routeId, usage } of rows) {
    const seconds = usage.serviceSeconds
    if (seconds > 0) buses.add(vehicleId)
    serviceSeconds += seconds
    percentSeconds += usage.averagePercent * seconds
    crowdedSeconds += usage.secondsByBand.slice(crowdedBand).reduce((a, b) => a + b, 0)
    nearlyEmptySeconds += usage.secondsByBand.slice(0, nearlyEmptyBands).reduce((a, b) => a + b, 0)

    // A camera-only bus has no door counter, so its boardings are unknown, not zero.
    if (!usage.source || !sourcesWithBoardings.has(usage.source)) continue
    const fare = fareOf(routeId)
    const hourRevenue = usage.boardings * fare * paying
    const hourCost = (seconds / 3600) * assumptions.costPerBusHour
    measuredSeconds += seconds
    boardings += usage.boardings
    fareBoardings += usage.boardings * fare
    revenue += hourRevenue
    cost += hourCost
    if (seconds > 0 && hourCost > hourRevenue) {
      loss += hourCost - hourRevenue
      lossSeconds += seconds
    }
  }

  const measuredHours = measuredSeconds / 3600
  const averageFare = boardings > 0 ? fareBoardings / boardings : fareOf(rows[0]?.routeId)
  return {
    buses: buses.size,
    serviceHours: serviceSeconds / 3600,
    measuredHours,
    boardings,
    revenue,
    cost,
    loss,
    lossHours: lossSeconds / 3600,
    gain: revenue - cost + loss,
    averagePercent: serviceSeconds > 0 ? percentSeconds / serviceSeconds : 0,
    crowdedHours: crowdedSeconds / 3600,
    nearlyEmptyHours: nearlyEmptySeconds / 3600,
    ridersPerBusHour: measuredHours > 0 ? boardings / measuredHours : 0,
    breakEven: breakEven(averageFare, assumptions),
  }
}

export function breakEven(fare: number, assumptions: Assumptions) {
  return assumptions.costPerBusHour / (fare * (1 - assumptions.seniorShare))
}

export function groupBy<K>(rows: UsageRow[], key: (row: UsageRow) => K): Map<K, UsageRow[]> {
  const groups = new Map<K, UsageRow[]>()
  for (const row of rows) {
    const k = key(row)
    groups.set(k, [...(groups.get(k) ?? []), row])
  }
  return groups
}

/** Hour of the day in Costa Rica (UTC−6, no daylight saving). */
export function costaRicaHour(iso: string) {
  return (new Date(iso).getUTCHours() + 18) % 24
}

/** Buses start at 5 a. m.; before that, the service day worth showing is the one that just ended. */
export const serviceDayStartHour = 5

export interface ServiceDay {
  label: 'hoy' | 'ayer'
  /** Null for today: the API's default range, midnight until now. */
  range: { from: Date; to: Date } | null
}

export function serviceDay(now: number): ServiceDay {
  const local = new Date(now - 6 * 3600_000)
  if (local.getUTCHours() >= serviceDayStartHour) return { label: 'hoy', range: null }
  // Midnight in Costa Rica is 06:00 UTC.
  const todayMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 6)
  return { label: 'ayer', range: { from: new Date(todayMidnight - 24 * 3600_000), to: new Date(todayMidnight) } }
}

export type Period = 'all' | 'peak' | 'offpeak'

export const periodLabels: Record<Period, string> = { all: 'Todo el día', peak: 'Hora pico', offpeak: 'Valle' }

/** Rush hours as the simulator and trip planner define them: 6–9 a. m. and 4–7 p. m. */
export function isPeakHour(hour: number) {
  return (hour >= 6 && hour < 9) || (hour >= 16 && hour < 19)
}

export function inPeriod(hour: number, period: Period) {
  return period === 'all' || (period === 'peak') === isPeakHour(hour)
}

export function rowsInPeriod(rows: UsageRow[], period: Period) {
  return period === 'all' ? rows : rows.filter((row) => inPeriod(costaRicaHour(row.usage.hour), period))
}

/** Load groups for the time-at-occupancy bars, built from the API's 10 % bands. */
export const loadGroups = [
  { label: 'Casi vacío', range: '< 20 %', bands: [0, 1], color: '#c9dff7' },
  { label: 'Con asientos', range: '20–49 %', bands: [2, 3, 4], color: '#5bb34a' },
  { label: 'Pocos asientos', range: '50–79 %', bands: [5, 6, 7], color: '#d9a400' },
  { label: 'De pie', range: '80–89 %', bands: [8], color: '#e8730c' },
  { label: 'Saturado', range: '≥ 90 %', bands: [9, 10], color: '#d1352b' },
]

/** Share of service time in each load group, 0–1. */
export function loadShares(rows: UsageRow[]) {
  const seconds = loadGroups.map((group) =>
    rows.reduce((sum, row) => sum + group.bands.reduce((s, band) => s + (row.usage.secondsByBand[band] ?? 0), 0), 0),
  )
  const total = seconds.reduce((a, b) => a + b, 0)
  return seconds.map((value) => (total > 0 ? value / total : 0))
}

// ---- Live view, from GET /vehicles ----

/** Parked buses report no trip; a real device that reports no trip counts while it reports. */
export function inService(vehicle: VehicleState) {
  return !vehicle.stale && (vehicle.trip !== null || (vehicle.occupancy !== null && vehicle.occupancy.source !== 'SIMULATED'))
}

export function routeOf(vehicle: VehicleState, registry: Map<string, string | null>) {
  return vehicle.trip?.routeId ?? registry.get(vehicle.vehicleId) ?? null
}

export interface Bunch {
  routeId: string
  first: string
  second: string
  meters: number
}

/** Pairs of buses on the same route and direction closer than the bunching threshold. */
export function bunching(vehicles: VehicleState[]): Bunch[] {
  const moving = vehicles.filter((v) => inService(v) && v.trip && v.location)
  const bunches: Bunch[] = []
  for (let i = 0; i < moving.length; i++) {
    for (let j = i + 1; j < moving.length; j++) {
      const [a, b] = [moving[i], moving[j]]
      if (a.trip!.routeId !== b.trip!.routeId || a.trip!.direction !== b.trip!.direction) continue
      const meters = distanceMeters(a.location!.lat, a.location!.lon, b.location!.lat, b.location!.lon)
      if (meters < thresholds.bunchingMeters) bunches.push({ routeId: a.trip!.routeId, first: a.vehicleId, second: b.vehicleId, meters })
    }
  }
  return bunches.sort((x, y) => x.meters - y.meters)
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

// ---- Formatting ----

const colones = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 })
const whole = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

export const formatColones = (value: number) => colones.format(value)
export const formatWhole = (value: number) => whole.format(value)
export const formatOne = (value: number) => oneDecimal.format(value)
export const formatPercent = (value: number) => `${whole.format(value)} %`

/** ₡10 642 368 → ₡10,6 M; ₡959 133 → ₡959 k, for cards where space is short. */
export function formatColonesShort(value: number) {
  if (Math.abs(value) >= 1_000_000) return `₡${oneDecimal.format(value / 1_000_000)} M`
  if (Math.abs(value) >= 1_000) return `₡${whole.format(value / 1_000)} k`
  return formatColones(value)
}
