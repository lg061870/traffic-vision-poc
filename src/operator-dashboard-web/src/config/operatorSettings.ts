// Fares, costs and thresholds the dashboard applies to what the buses report. Every value and its
// source is documented in docs/supuestos-dashboard-operador.md; update both together.

/** Regular fare per route (colones), ARESEP resolution RE-0115-IT-2026. */
export const fares: Record<string, number> = {
  R142: 460, // San José–Coronado
  'R142-01': 460, // Cascajal (Coronado–Las Nubes–Cascajal)
  'R142-02': 460, // Las Nubes
  'R142-03': 400, // Dulce Nombre
  'R142-04': 400, // Patio de Agua
  'R142-05': 400, // San Rafael
  'R142-06': 400, // Patalillo: not in the ARESEP table, short-branch fare until confirmed
  'R142-07': 400,
  'R142-08': 400,
  'R142-09': 400,
  'R142-10': 400,
}

/** Used for a route missing from the table above. */
export const defaultFare = 400

export const fareSource = 'Tarifas ARESEP RE-0115-IT-2026, vigentes desde el 4 sep 2026'

export interface Assumptions {
  /** Operating cost of one bus for one hour in service, colones. */
  costPerBusHour: number
  /** Share of boardings by seniors, who ride free on every branch (0–1). */
  seniorShare: number
}

/** Our estimates until the operator gives real figures; the dashboard lets them be changed. */
export const defaultAssumptions: Assumptions = {
  costPerBusHour: 12950,
  seniorShare: 0.12,
}

export const thresholds = {
  /** A bus in service at or above this load is flagged as crowded. */
  crowdedPercent: 90,
  /** A bus in service below this load is flagged as nearly empty. */
  nearlyEmptyPercent: 20,
  /** Two buses on the same route and direction closer than this are bunched. */
  bunchingMeters: 400,
}

/** Sources whose counts include door boardings, so their hours count toward revenue and loss. */
export const sourcesWithBoardings = new Set(['SIMULATED', 'DOOR_COUNTER_3D', 'DOOR_CAMERA'])

/**
 * The analyzed clip shown in the camera panel. The on-board app replays the same clip's detections
 * for `vehicleId` (Scenarios/ramal-san-rafael-camara.json), both looping on the Unix clock.
 */
export const cameraDemo = {
  vehicleId: 'SJB-10662',
  video: '/demo/la_bus_highlights.mp4',
  result: '/demo/la_bus_highlights.mp4.result.json',
}

export function fareOf(routeId: string | null | undefined) {
  return (routeId && fares[routeId]) || defaultFare
}
