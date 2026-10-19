export type OccupancyStatus =
  | 'EMPTY'
  | 'MANY_SEATS_AVAILABLE'
  | 'FEW_SEATS_AVAILABLE'
  | 'STANDING_ROOM_ONLY'
  | 'CRUSHED_STANDING_ROOM_ONLY'
  | 'FULL'

export interface GeoPoint {
  lat: number
  lon: number
}

export interface TripPlace {
  name: string
  lat: number
  lon: number
  stopId: string | null
}

export interface VehicleTelemetry {
  location: GeoPoint
  speedKmh: number | null
  headingDeg: number | null
  passengerCount: number | null
  capacity: number | null
  percent: number | null
  status: OccupancyStatus | null
  distanceToStopMeters: number
}

export interface UpcomingBus {
  vehicleId: string
  arriveAt: string
  passengerCount: number | null
  capacity: number | null
  status: OccupancyStatus | null
}

export interface BusRide {
  routeId: string
  routeName: string
  direction: 'INBOUND' | 'OUTBOUND'
  headsign: string
  vehicleId: string
  waitMinutes: number
  stops: number
  vehicle: VehicleTelemetry
  laterBuses: UpcomingBus[]
  path: GeoPoint[]
}

export interface TripLeg {
  type: 'WALK' | 'BUS'
  from: TripPlace
  to: TripPlace
  departAt: string
  arriveAt: string
  minutes: number
  meters: number
  bus: BusRide | null
}

export interface TripOption {
  departAt: string
  arriveAt: string
  durationMinutes: number
  transfers: number
  legs: TripLeg[]
  warnings: string[]
  fareTotal?: number
}

export interface TripPlan {
  from: GeoPoint
  to: GeoPoint
  generatedAt: string
  options: TripOption[]
  message: string | null
}

export type PassengerFareType = 'ADULT' | 'STUDENT' | 'SENIOR'

export interface ServiceAlert {
  id: string
  title: string
  description: string
  category: 'TRAFFIC' | 'DETOUR' | 'SYSTEM'
  severity: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO'
  affectedRoutes: string[]
  updatedAt: string
}

export interface PlaceCatalogItem {
  id: string
  name: string
  aliases: string[]
  lat: number
  lon: number
  category: 'HITO' | 'PARADA' | 'DIRECCION'
}

export interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  actionSuggestions?: {
    label: string
    type: 'NAVIGATE' | 'SELECT_ROUTE' | 'SHOW_FARE'
    payload?: any
  }[]
}
