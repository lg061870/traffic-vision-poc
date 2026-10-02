// Response shapes of the Occupancy API read endpoints, as the API actually serializes them.
// The OpenAPI document declares the enums as integers and numbers as "integer | string";
// the JSON on the wire uses enum names and plain numbers, which is what these types follow.

export type OccupancyStatus =
  | 'EMPTY'
  | 'MANY_SEATS_AVAILABLE'
  | 'FEW_SEATS_AVAILABLE'
  | 'STANDING_ROOM_ONLY'
  | 'CRUSHED_STANDING_ROOM_ONLY'
  | 'FULL'

export type SensorSource = 'DOOR_COUNTER_3D' | 'CABIN_CAMERA' | 'DOOR_CAMERA' | 'SIMULATED'

export interface GeoLocation {
  lat: number
  lon: number
  speedKmh?: number | null
  /** Degrees clockwise from true north, [0, 360). Absent when stopped or the GPS has no course. */
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
  occupancy: OccupancySnapshot | null
  device: DeviceHealth
}

export interface VehicleList {
  vehicles: VehicleState[]
}

export interface VehicleDoorEvent {
  door: number
  boardings: number
  alightings: number
  location: GeoLocation | null
  openedAt: string
  closedAt: string
  occupancyAfter: number | null
}

export interface VehicleEventList {
  vehicleId: string
  events: VehicleDoorEvent[]
}

export interface OccupancyHistoryPoint {
  time: string
  passengerCount: number
  peakPassengerCount: number
  capacity: number
  percent: number
}

export interface OccupancyHistory {
  vehicleId: string
  from: string
  to: string
  interval: string
  points: OccupancyHistoryPoint[]
}
