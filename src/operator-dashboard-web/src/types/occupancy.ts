// Response shapes of the Occupancy API read endpoints, as the API actually serializes them
// (enum names, plain numbers), like src/occupancy-reference-web/src/types/occupancy.ts.

export type OccupancyStatus =
  | 'EMPTY'
  | 'MANY_SEATS_AVAILABLE'
  | 'FEW_SEATS_AVAILABLE'
  | 'STANDING_ROOM_ONLY'
  | 'CRUSHED_STANDING_ROOM_ONLY'
  | 'FULL'

export type SensorSource = 'DOOR_COUNTER_3D' | 'CABIN_CAMERA' | 'DOOR_CAMERA' | 'SIMULATED'

export type TravelDirection = 'INBOUND' | 'OUTBOUND'

export interface GeoLocation {
  lat: number
  lon: number
  speedKmh?: number | null
  headingDeg?: number | null
}

export interface OccupancySnapshot {
  passengerCount: number
  capacity: number
  percent: number
  status: OccupancyStatus
  source: SensorSource
  measuredAt: string
}

export interface DeviceHealth {
  online: boolean
  lastSeen: string
  cameraOnline: boolean | null
  firmware: string | null
}

export interface VehicleState {
  vehicleId: string
  asOf: string
  stale: boolean
  location: GeoLocation | null
  /** Null while the bus is parked, and for buses whose device does not report a trip. */
  trip: { routeId: string; direction: TravelDirection } | null
  occupancy: OccupancySnapshot | null
  device: DeviceHealth
}

export interface VehicleList {
  vehicles: VehicleState[]
}

/** GET /api/v1/fleet/hourly: one bus during one clock hour. */
export interface HourlyUsage {
  hour: string
  routeId: string | null
  source: SensorSource | null
  serviceSeconds: number
  boardings: number
  alightings: number
  averagePercent: number
  peakPercent: number
  /** Seconds in service at 0–9 %, 10–19 % … 90–99 %, and 100 % or more. */
  secondsByBand: number[]
}

export interface BusHourlyUsage {
  vehicleId: string
  /** The route the bus is registered on. */
  routeId: string | null
  capacity: number | null
  hours: HourlyUsage[]
}

export interface FleetHourlyUsage {
  from: string
  to: string
  buses: BusHourlyUsage[]
}
