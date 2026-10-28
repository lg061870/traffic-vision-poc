// Made-up simulation runs for designing the Studio result screens. Nothing here is a real trip
// generator: the numbers only need to look plausible so the UI can be judged. Replace with the
// real generator once the screens are settled.
import type { DayScheduleConfig } from '../../config/operatorSettings'
import { officialCtpRoutes, type ManagedRoute } from '../../config/ctpRoutesData'
import type { FeatureCollection } from 'geojson'
import type { VehicleState } from '../../types/occupancy'
import { scheduleFor, type StudioDay } from './studioModel'

export interface SimRun {
  id: number
  label: string
  time: string
  day: StudioDay
  fleet: number
  demandScale: number
  costPerHour: number
  paramsVersion: number
}

export type TripDirection = 'IDA' | 'REGRESO'

export interface Trip {
  id: string
  routeId: string
  direction: TripDirection
  /** Minutes after midnight. */
  depart: number
  arrive: number
  busId: string
  /** Highest load on the trip, percent of capacity. */
  peakLoad: number
  passengers: number
  km: number
}

export interface BusBlock {
  busId: string
  routeId: string
  trips: Trip[]
  pullOut: number
  pullIn: number
}

export interface DriverShift {
  driverId: string
  busId: string
  start: number
  end: number
}

const CAPACITY = 80
const FARE_SHARE_PAID = 0.88

export const fmtTime = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}

function periodShare(schedule: DayScheduleConfig, hour: number) {
  const isPeak =
    schedule.id === 'weekday'
      ? (hour >= 5 && hour <= 8) || (hour >= 16 && hour <= 19)
      : hour >= 10 && hour <= (schedule.id === 'saturday' ? 14 : 15)
  if (isPeak) return { share: schedule.peakFleetShare, demand: 1 }
  if (hour >= 20 || hour < 5) return { share: schedule.nightFleetShare, demand: 0.3 }
  return { share: schedule.valleyFleetShare, demand: 0.45 }
}

/** Route stops as fractions of the route length, from their coordinates. */
export function stopFractions(route: ManagedRoute) {
  const d: number[] = [0]
  for (let i = 1; i < route.stops.length; i++) {
    const a = route.stops[i - 1]
    const b = route.stops[i]
    d.push(d[i - 1] + Math.hypot(a.lat - b.lat, (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)))
  }
  const total = d[d.length - 1] || 1
  return d.map((x) => x / total)
}

export interface RunOutput {
  run: SimRun
  schedule: DayScheduleConfig
  trips: Trip[]
  blocks: BusBlock[]
  shifts: DriverShift[]
  totals: {
    trips: number
    busKm: number
    busHours: number
    maxBuses: number
    drivers: number
    passengers: number
    revenue: number
    cost: number
    margin: number
    dieselLiters: number
    avgWaitMin: number
    crowdedTrips: number
  }
}

const cache = new Map<string, RunOutput>()

export function runOutput(run: SimRun): RunOutput {
  const key = `${run.id}:${run.day}:${run.fleet}:${run.demandScale}:${run.costPerHour}`
  const hit = cache.get(key)
  if (hit) return hit

  const random = rng(run.id * 7919 + run.fleet * 31)
  const schedule = scheduleFor(run.day)
  const first = toMinutes(schedule.firstDeparture)
  const last = toMinutes(schedule.lastDeparture)
  const fleetFactor = run.fleet / 39
  const trips: Trip[] = []
  const blocks: BusBlock[] = []
  let busSeq = 10601

  for (const route of officialCtpRoutes) {
    if (route.busCount === 0) continue
    const isTrunk = route.routeId === 'R142'
    const speed = isTrunk ? 16.5 : 21
    const runMinutes = (route.km / speed) * 60 + route.stops.length * 0.6
    const cycle = 2 * runMinutes + 10
    const baseHeadway = isTrunk ? schedule.trunkHeadwayMinutes : schedule.feederHeadwayMinutes

    // Departures from each terminal, spaced by the headway the assigned buses allow.
    const departures: { t: number; direction: TripDirection }[] = []
    for (const direction of ['IDA', 'REGRESO'] as TripDirection[]) {
      let t = first + (direction === 'REGRESO' ? runMinutes * 0.5 : 0)
      while (t <= last) {
        const hour = Math.floor(t / 60)
        const buses = Math.max(1, Math.round(route.busCount * fleetFactor * periodShare(schedule, hour).share))
        const headway = Math.max(baseHeadway, cycle / buses)
        departures.push({ t: Math.round(t), direction })
        t += headway * (0.9 + random() * 0.2)
      }
    }
    departures.sort((a, b) => a.t - b.t)

    // Greedy bus assignment: a bus waiting at the right terminal takes the next departure.
    // A route never uses more buses than it has assigned; a late bus delays the departure.
    const pool: { busId: string; freeAt: number; at: TripDirection; block: BusBlock }[] = []
    const routeFleet = Math.max(1, Math.round(route.busCount * fleetFactor))
    departures.forEach(({ t: planned, direction }, i) => {
      let t = planned
      // Lowest bus number first, so the buses not needed off-peak stay parked.
      let bus = pool.filter((b) => b.at === direction && b.freeAt <= t).sort((a, b) => a.busId.localeCompare(b.busId))[0]
      if (!bus && pool.length >= routeFleet) {
        bus = [...pool].sort((a, b) => (a.at === direction ? a.freeAt : a.freeAt + 30) - (b.at === direction ? b.freeAt : b.freeAt + 30))[0]
        t = Math.max(t, bus.freeAt)
      }
      if (!bus) {
        const busId = `SJB-${busSeq++}`
        const block: BusBlock = { busId, routeId: route.routeId, trips: [], pullOut: t - 15, pullIn: t }
        blocks.push(block)
        bus = { busId, freeAt: t, at: direction, block }
        pool.push(bus)
      }
      const hour = Math.floor(t / 60)
      const demand = periodShare(schedule, hour).demand * run.demandScale * schedule.demandFactor
      const directional = (direction === 'IDA') === hour < 12 ? 1.15 : 0.7
      const peakLoad = Math.round(Math.min(135, 100 * demand * directional * (0.55 + random() * 0.5)))
      const travel = runMinutes * (0.85 + random() * 0.35) * (demand > 0.9 ? 1.15 : 1)
      const trip: Trip = {
        id: `${route.routeId}-${i}`,
        routeId: route.routeId,
        direction,
        depart: t,
        arrive: Math.round(t + travel),
        busId: bus.busId,
        peakLoad,
        passengers: Math.round((peakLoad / 100) * CAPACITY * (isTrunk ? 1.6 : 1.2)),
        km: route.km,
      }
      trips.push(trip)
      bus.block.trips.push(trip)
      bus.block.pullIn = trip.arrive + 15
      bus.freeAt = trip.arrive + 5
      bus.at = direction === 'IDA' ? 'REGRESO' : 'IDA'
    })
  }

  // Driver shifts: cut each bus's day at the first gap after 7.5 hours behind the wheel.
  const shifts: DriverShift[] = []
  let driverSeq = 1
  for (const block of blocks) {
    let start = block.pullOut
    for (const trip of block.trips) {
      if (trip.arrive - start > 450) {
        shifts.push({ driverId: `CH-${String(driverSeq++).padStart(3, '0')}`, busId: block.busId, start, end: trip.arrive })
        start = trip.arrive
      }
    }
    if (block.pullIn - start > 20) {
      shifts.push({ driverId: `CH-${String(driverSeq++).padStart(3, '0')}`, busId: block.busId, start, end: block.pullIn })
    }
  }

  const busKm = trips.reduce((s, t) => s + t.km, 0)
  const busHours = blocks.reduce((s, b) => s + (b.pullIn - b.pullOut) / 60, 0)
  const passengers = trips.reduce((s, t) => s + t.passengers, 0)
  const revenue = passengers * 445 * FARE_SHARE_PAID
  const cost = busHours * run.costPerHour
  let maxBuses = 0
  for (let m = first; m <= last; m += 15) {
    maxBuses = Math.max(maxBuses, blocks.filter((b) => b.pullOut <= m && b.pullIn >= m).length)
  }

  const output: RunOutput = {
    run,
    schedule,
    trips,
    blocks,
    shifts,
    totals: {
      trips: trips.length,
      busKm,
      busHours,
      maxBuses,
      drivers: shifts.length,
      passengers,
      revenue,
      cost,
      margin: revenue - cost,
      dieselLiters: busKm / 2.8,
      avgWaitMin: 4 + (39 / Math.max(5, run.fleet)) * 2.5,
      crowdedTrips: trips.filter((t) => t.peakLoad >= 100).length,
    },
  }
  cache.set(key, output)
  return output
}

export const initialRuns: SimRun[] = [
  { id: 1, label: 'Corrida 1', time: '08:12', day: 'semana', fleet: 42, demandScale: 1, costPerHour: 12950, paramsVersion: -1 },
  { id: 2, label: 'Corrida 2', time: '09:40', day: 'semana', fleet: 30, demandScale: 1, costPerHour: 12950, paramsVersion: 0 },
]

export const routeById = (routeId: string) => officialCtpRoutes.find((r) => r.routeId === routeId) ?? officialCtpRoutes[0]

/** Route lines for the map, drawn through each route's stops. */
export const mockRouteLines: FeatureCollection = {
  type: 'FeatureCollection',
  features: officialCtpRoutes.map((r) => ({
    type: 'Feature',
    properties: { routeId: r.routeId, name: r.name },
    geometry: { type: 'LineString', coordinates: r.stops.map((s) => [s.lon, s.lat]) },
  })),
}

const withFallbackCache = new WeakMap<FeatureCollection, FeatureCollection>()

/** The road-following OSM lines, plus the stop-to-stop line for any route with buses that the file lacks. */
export function routeLinesWithFallback(osm: FeatureCollection): FeatureCollection {
  const cached = withFallbackCache.get(osm)
  if (cached) return cached
  const present = new Set(osm.features.map((f) => f.properties?.routeId))
  const missing = mockRouteLines.features.filter((f) => {
    const routeId = f.properties?.routeId
    return !present.has(routeId) && routeById(routeId).busCount > 0
  })
  const result: FeatureCollection = { ...osm, features: [...osm.features, ...missing] }
  withFallbackCache.set(osm, result)
  return result
}

interface Polyline {
  points: [number, number][] // [lon, lat], starting at the route's first stop
  cumulative: number[] // distance from the start, in degrees (only ratios matter)
}

const polylineCache = new WeakMap<FeatureCollection, Map<string, Polyline>>()

/** Each route's line, oriented so it starts at the route's first stop. */
function polylinesOf(lines: FeatureCollection): Map<string, Polyline> {
  const cached = polylineCache.get(lines)
  if (cached) return cached
  const map = new Map<string, Polyline>()
  for (const feature of lines.features) {
    const routeId = feature.properties?.routeId
    if (!routeId || feature.geometry.type !== 'LineString') continue
    let points = feature.geometry.coordinates.map(([lon, lat]) => [lon, lat] as [number, number])
    const first = routeById(routeId).stops[0]
    if (first) {
      const d = (p: [number, number]) => (p[0] - first.lon) ** 2 + (p[1] - first.lat) ** 2
      if (d(points[points.length - 1]) < d(points[0])) points = [...points].reverse()
    }
    const cumulative = [0]
    for (let i = 1; i < points.length; i++) {
      cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
    }
    map.set(routeId, { points, cumulative })
  }
  polylineCache.set(lines, map)
  return map
}

/** The point at fraction f (0 = first stop, 1 = last stop) along a route. */
function pointAlong(routeId: string, f: number, lines: FeatureCollection) {
  const line = polylinesOf(lines).get(routeId)
  if (line && line.points.length > 1) {
    const target = f * line.cumulative[line.cumulative.length - 1]
    let i = 1
    while (i < line.points.length - 1 && line.cumulative[i] < target) i++
    const span = Math.max(1e-12, line.cumulative[i] - line.cumulative[i - 1])
    const local = Math.min(1, Math.max(0, (target - line.cumulative[i - 1]) / span))
    const [aLon, aLat] = line.points[i - 1]
    const [bLon, bLat] = line.points[i]
    return { lat: aLat + (bLat - aLat) * local, lon: aLon + (bLon - aLon) * local }
  }
  const route = routeById(routeId)
  const fractions = stopFractions(route)
  let i = 1
  while (i < fractions.length - 1 && fractions[i] < f) i++
  const a = route.stops[i - 1]
  const b = route.stops[i]
  const local = (f - fractions[i - 1]) / Math.max(1e-6, fractions[i] - fractions[i - 1])
  return { lat: a.lat + (b.lat - a.lat) * local, lon: a.lon + (b.lon - a.lon) * local }
}

/** Where every bus of the run is at a given minute, shaped like the API's vehicle list. */
export function vehiclesAt(output: RunOutput, minute: number, lines: FeatureCollection = mockRouteLines): VehicleState[] {
  const asOf = new Date().toISOString()
  return output.blocks.map((block) => {
    const trip = block.trips.find((t) => t.depart <= minute && t.arrive >= minute)
    let location = null
    if (trip) {
      const progress = (minute - trip.depart) / Math.max(1, trip.arrive - trip.depart)
      const f = trip.direction === 'IDA' ? progress : 1 - progress
      location = { ...pointAlong(block.routeId, f, lines), speedKmh: 18, headingDeg: null }
    }
    const percent = trip ? Math.round(trip.peakLoad * (0.6 + 0.4 * Math.sin(((minute - trip.depart) / 20) * Math.PI) ** 2)) : 0
    return {
      vehicleId: block.busId,
      asOf,
      stale: false,
      location,
      trip: trip ? { routeId: trip.routeId, direction: trip.direction === 'IDA' ? 'INBOUND' : 'OUTBOUND' } : null,
      occupancy: trip
        ? {
            passengerCount: Math.round((percent / 100) * CAPACITY),
            capacity: CAPACITY,
            percent,
            status: percent >= 100 ? 'FULL' : percent >= 80 ? 'STANDING_ROOM_ONLY' : percent >= 50 ? 'FEW_SEATS_AVAILABLE' : 'MANY_SEATS_AVAILABLE',
            source: 'SIMULATED',
            measuredAt: asOf,
          }
        : null,
      device: { online: true, lastSeen: asOf, cameraOnline: null, firmware: null },
    }
  })
}

export const dayLabel = (day: StudioDay) =>
  day === 'sabado' ? 'Sábado' : day === 'domingo' ? 'Domingo' : day === 'lluvia' ? 'Lluvia intensa' : day === 'custom' ? 'Personalizado' : 'Lunes a Viernes'

