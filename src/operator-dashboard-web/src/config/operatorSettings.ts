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

export interface RamalAllocation {
  routeId: string
  name: string
  busCount: number
  fare?: number
}

export const defaultRamales: RamalAllocation[] = [
  { routeId: 'R142', name: 'Ruta 142 · San José – Coronado', busCount: 24, fare: 460 },
  { routeId: 'R142-01', name: 'Ramal Cascajal', busCount: 2, fare: 460 },
  { routeId: 'R142-02', name: 'Ramal Las Nubes', busCount: 2, fare: 460 },
  { routeId: 'R142-03', name: 'Ramal Dulce Nombre', busCount: 2, fare: 400 },
  { routeId: 'R142-04', name: 'Ramal Patio de Agua', busCount: 2, fare: 400 },
  { routeId: 'R142-05', name: 'Ramal San Rafael', busCount: 2, fare: 400 },
  { routeId: 'R142-06', name: 'Ramal Patalillo', busCount: 2, fare: 400 },
  { routeId: 'R142-07', name: 'Ramal San Pedro', busCount: 1, fare: 400 },
  { routeId: 'R142-08', name: 'Ramal El Rodeo', busCount: 1, fare: 400 },
  { routeId: 'R142-09', name: 'Ramal San Francisco', busCount: 1, fare: 400 },
  { routeId: 'R142-10', name: 'Ramal La Colmena', busCount: 0, fare: 400 },
]

export type DayScheduleType = 'weekday' | 'saturday' | 'sunday_holiday'

export interface DayScheduleConfig {
  id: DayScheduleType
  label: string
  sublabel: string
  icon: string
  description: string
  peakFleetShare: number
  valleyFleetShare: number
  nightFleetShare: number
  firstDeparture: string
  lastDeparture: string
  trunkHeadwayMinutes: number
  feederHeadwayMinutes: number
  demandFactor: number
  dailyRidership?: number
  seniorShare?: number
  peakMorningFactor?: number
  peakEveningFactor?: number
  middayValleyFactor?: number
}

export const defaultDaySchedules: Record<DayScheduleType, DayScheduleConfig> = {
  weekday: {
    id: 'weekday',
    label: 'Lunes a Viernes',
    sublabel: 'Día Laborable (Doble Pico)',
    icon: '💼',
    description: 'Pico laboral y estudiantil hacia San José (05–09h) y retorno a Coronado (16–19h). Requiere el 100 % de la flota autorizada (39 unidades).',
    peakFleetShare: 1.0, // 39 buses
    valleyFleetShare: 0.55, // 21 buses
    nightFleetShare: 0.50, // 20 buses
    firstDeparture: '04:30',
    lastDeparture: '23:00',
    trunkHeadwayMinutes: 6,
    feederHeadwayMinutes: 15,
    demandFactor: 1.0,
    dailyRidership: 13012, // ARESEP RE-0060-IT-2024
    seniorShare: 0.12, // 12% adulto mayor
    peakMorningFactor: 1.0,
    peakEveningFactor: 1.0,
    middayValleyFactor: 0.35,
  },
  saturday: {
    id: 'saturday',
    label: 'Sábado',
    sublabel: 'Día Comercial (Pico Mediodía)',
    icon: '🛍️',
    description: 'Movilidad comercial y compras hacia San José y Guadalupe. Pico continuo entre 10:00 y 14:30. Flota requerida ~68 % (26 buses).',
    peakFleetShare: 0.68, // ~26 buses
    valleyFleetShare: 0.50, // ~19 buses
    nightFleetShare: 0.35, // ~14 buses
    firstDeparture: '05:00',
    lastDeparture: '23:00',
    trunkHeadwayMinutes: 10,
    feederHeadwayMinutes: 25,
    demandFactor: 0.72,
    dailyRidership: 7800, // ~60% del día laboral
    seniorShare: 0.135, // 13.5%
    peakMorningFactor: 0.65,
    peakEveningFactor: 0.70,
    middayValleyFactor: 1.0, // Pico comercial mediodía
  },
  sunday_holiday: {
    id: 'sunday_holiday',
    label: 'Domingo y Feriados',
    sublabel: 'Horario Reducido / Recreativo',
    icon: '⛪',
    description: 'Viajes recreativos (Cascajal, Braulio Carrillo, visitas familiares y servicios religiosos). Curva aplanada sin picos abruptos. Flota ~45 % (17 buses).',
    peakFleetShare: 0.45, // ~17 buses
    valleyFleetShare: 0.40, // ~15 buses
    nightFleetShare: 0.25, // ~10 buses
    firstDeparture: '05:30',
    lastDeparture: '22:00',
    trunkHeadwayMinutes: 15,
    feederHeadwayMinutes: 40,
    demandFactor: 0.48,
    dailyRidership: 4950, // ~38% del día laboral
    seniorShare: 0.165, // 16.5% misas, visitas familiares
    peakMorningFactor: 0.30,
    peakEveningFactor: 0.45,
    middayValleyFactor: 0.85, // Campana familiar mediodía
  },
}

export function computeHourlyFleetSupply(
  totalBuses: number,
  schedule: DayScheduleConfig
): { hour: number; label: string; buses: number; period: 'peak' | 'valley' | 'night' | 'off' }[] {
  const [firstH = 4, firstM = 30] = (schedule.firstDeparture || '04:30').split(':').map(Number)
  const [lastH = 23, lastM = 0] = (schedule.lastDeparture || '23:00').split(':').map(Number)
  const firstFloat = firstH + firstM / 60
  const lastFloat = lastH + lastM / 60

  const result = []
  for (let h = 0; h < 24; h++) {
    const hourLabel = `${String(h).padStart(2, '0')}h`
    if (h < Math.floor(firstFloat) || h > Math.ceil(lastFloat)) {
      result.push({ hour: h, label: hourLabel, buses: 0, period: 'off' as const })
      continue
    }

    let buses = 0
    let period: 'peak' | 'valley' | 'night' | 'off' = 'valley'

    if (schedule.id === 'weekday') {
      if ((h >= 5 && h <= 8) || (h >= 16 && h <= 19)) {
        period = 'peak'
        buses = Math.round(totalBuses * schedule.peakFleetShare)
      } else if (h >= 9 && h <= 15) {
        period = 'valley'
        buses = Math.round(totalBuses * schedule.valleyFleetShare)
      } else if (h >= 20 && h <= 23) {
        period = 'night'
        buses = Math.round(totalBuses * schedule.nightFleetShare)
      } else {
        period = 'valley'
        buses = Math.round(totalBuses * schedule.valleyFleetShare * 0.7)
      }
    } else if (schedule.id === 'saturday') {
      if (h >= 10 && h <= 14) {
        period = 'peak'
        buses = Math.round(totalBuses * schedule.peakFleetShare)
      } else if ((h >= 6 && h <= 9) || (h >= 15 && h <= 18)) {
        period = 'valley'
        buses = Math.round(totalBuses * schedule.valleyFleetShare)
      } else if (h >= 19 && h <= 23) {
        period = 'night'
        buses = Math.round(totalBuses * schedule.nightFleetShare)
      } else {
        period = 'night'
        buses = Math.round(totalBuses * schedule.nightFleetShare * 0.6)
      }
    } else {
      // sunday_holiday
      if (h >= 10 && h <= 15) {
        period = 'peak'
        buses = Math.round(totalBuses * schedule.peakFleetShare)
      } else if (h >= 6 && h <= 9) {
        period = 'valley'
        buses = Math.round(totalBuses * schedule.valleyFleetShare)
      } else if (h >= 16 && h <= 21) {
        period = 'night'
        buses = Math.round(totalBuses * schedule.nightFleetShare)
      } else {
        period = 'off'
        buses = 0
      }
    }

    result.push({ hour: h, label: hourLabel, buses: Math.max(0, buses), period })
  }
  return result
}

export function computeHourlyPassengerDemand(
  schedule: DayScheduleConfig,
  globalDemandScale: number = 1.0
): { hour: number; label: string; passengers: number; period: 'peak' | 'valley' | 'night' | 'off' }[] {
  const baseTotal = (schedule.dailyRidership ?? 13012) * globalDemandScale
  const result = []

  for (let h = 0; h < 24; h++) {
    const hourLabel = `${String(h).padStart(2, '0')}h`
    let weight = 0
    let period: 'peak' | 'valley' | 'night' | 'off' = 'valley'

    if (schedule.id === 'weekday') {
      if (h >= 5 && h <= 8) {
        // Morning rush inbound to San José
        period = 'peak'
        const factors = [0.065, 0.088, 0.078, 0.052]
        weight = (factors[h - 5] || 0.065) * (schedule.peakMorningFactor ?? 1.0)
      } else if (h >= 16 && h <= 19) {
        // Evening rush outbound to Coronado
        period = 'peak'
        const factors = [0.072, 0.095, 0.082, 0.055]
        weight = (factors[h - 16] || 0.072) * (schedule.peakEveningFactor ?? 1.0)
      } else if (h >= 9 && h <= 15) {
        period = 'valley'
        weight = 0.048 * (schedule.middayValleyFactor ?? 0.35) * 1.6
      } else if (h >= 20 && h <= 22) {
        period = 'night'
        weight = 0.024
      } else if (h === 4 || h === 23) {
        period = 'night'
        weight = 0.010
      } else {
        period = 'off'
        weight = 0.001
      }
    } else if (schedule.id === 'saturday') {
      if (h >= 10 && h <= 14) {
        // Commercial shopping peak
        period = 'peak'
        weight = 0.088 * (schedule.middayValleyFactor ?? 1.0)
      } else if (h >= 6 && h <= 9) {
        period = 'valley'
        weight = 0.052
      } else if (h >= 15 && h <= 18) {
        period = 'valley'
        weight = 0.062
      } else if (h >= 19 && h <= 22) {
        period = 'night'
        weight = 0.024
      } else if (h === 5 || h === 23) {
        period = 'night'
        weight = 0.008
      } else {
        period = 'off'
        weight = 0.001
      }
    } else {
      // Sunday & holiday: church and family bell curve
      if (h >= 10 && h <= 15) {
        period = 'peak'
        weight = 0.096 * (schedule.middayValleyFactor ?? 0.85)
      } else if (h >= 7 && h <= 9) {
        period = 'valley'
        weight = 0.038
      } else if (h >= 16 && h <= 18) {
        period = 'valley'
        weight = 0.052
      } else if (h >= 19 && h <= 21) {
        period = 'night'
        weight = 0.018
      } else if (h === 6 || h === 22) {
        period = 'night'
        weight = 0.006
      } else {
        period = 'off'
        weight = 0.001
      }
    }

    const passengers = Math.round(baseTotal * weight)
    result.push({ hour: h, label: hourLabel, passengers, period })
  }

  return result
}

/** Operational, dispatch, and demand parameters governing fleet simulation. */
export interface SimulationParameters extends Assumptions {
  /** Total number of buses registered in the operator's fleet. */
  totalFleetSize: number
  /** Specific ramal allocations and bus counts. */
  ramales: RamalAllocation[]
  /** Global demand scale multiplier (1.0 = ~28k pax, ~0.47 = ~13.0k ARESEP official). */
  demandScale: number
  /** Morning peak demand multiplier (05:00–09:00). */
  morningPeakDemand: number
  /** Evening peak demand multiplier (16:00–19:00). */
  eveningPeakDemand: number
  /** Midday valley demand multiplier (09:00–16:00). */
  middayDemand: number
  /** Late night demand multiplier (23:00–05:00). */
  lateNightDemand: number
  /** Share of fleet in service during peak hours (05:00–09:00, 16:00–19:00), 0–1. */
  peakActiveShare: number
  /** Share of fleet in service during midday valley (09:00–16:00), 0–1. */
  valleyActiveShare: number
  /** Share of fleet in service during night (19:00–23:00), 0–1. */
  nightActiveShare: number
  /** Route fare overrides (optional). */
  fares?: Record<string, number>
  /** Active day schedule type */
  activeScheduleType?: DayScheduleType
  /** Schedule profiles per day type */
  daySchedules?: Record<DayScheduleType, DayScheduleConfig>
  /** Detailed operational cost model configuration (ARESEP) */
  operationalCostConfig?: OperationalCostConfig
}

export interface OperationalCostConfig {
  mode: 'aresep' | 'manual'
  manualCostPerBusHour: number
  dieselPricePerLiter: number
  fuelEfficiencyKmPerLiter: number
  averageSpeedKmH: number
  lubricantsCostPerHour: number
  driverHourlyWage: number
  driverSocialChargesRatio: number
  driverReliefMultiplier: number
  mechanicsAndDispatchPerHour: number
  maintenanceCostPerKm: number
  tiresCostPerHour: number
  canonCtpAndAresepPerHour: number
  insuranceAndInspectionPerHour: number
  fleetDepreciationPerHour: number
}

export const defaultOperationalCostConfig: OperationalCostConfig = {
  mode: 'aresep',
  manualCostPerBusHour: 12950,
  dieselPricePerLiter: 785, // RECOPE ₡785/L
  fuelEfficiencyKmPerLiter: 2.8, // 2.8 km/L
  averageSpeedKmH: 16.5, // 16.5 km/h
  lubricantsCostPerHour: 220,
  driverHourlyWage: 3150, // ₡3,150/h salario base operador CTP
  driverSocialChargesRatio: 0.36, // +36% CCSS + INS
  driverReliefMultiplier: 1.22, // 1.22 relevos
  mechanicsAndDispatchPerHour: 620,
  maintenanceCostPerKm: 55, // ₡55/km
  tiresCostPerHour: 350, // 6 llantas cada 45k km
  canonCtpAndAresepPerHour: 320,
  insuranceAndInspectionPerHour: 280,
  fleetDepreciationPerHour: 400,
}

export function computeOperationalCost(config: OperationalCostConfig): {
  totalCostPerHour: number
  fuelPerHour: number
  crewPerHour: number
  maintenancePerHour: number
  fixedPerHour: number
  costPerKm: number
  fuelPct: number
  crewPct: number
  maintenancePct: number
  fixedPct: number
} {
  if (config.mode === 'manual') {
    const cost = config.manualCostPerBusHour || 12950
    return {
      totalCostPerHour: cost,
      fuelPerHour: Math.round(cost * 0.374),
      crewPerHour: Math.round(cost * 0.451),
      maintenancePerHour: Math.round(cost * 0.097),
      fixedPerHour: Math.round(cost * 0.078),
      costPerKm: config.averageSpeedKmH > 0 ? Math.round(cost / config.averageSpeedKmH) : 785,
      fuelPct: 37,
      crewPct: 45,
      maintenancePct: 10,
      fixedPct: 8,
    }
  }

  const fuelOnly = (config.averageSpeedKmH / Math.max(0.5, config.fuelEfficiencyKmPerLiter)) * config.dieselPricePerLiter
  const fuelPerHour = Math.round(fuelOnly + config.lubricantsCostPerHour)
  const crewPerHour = Math.round(
    config.driverHourlyWage * (1 + config.driverSocialChargesRatio) * config.driverReliefMultiplier +
      config.mechanicsAndDispatchPerHour
  )
  const maintenancePerHour = Math.round(
    config.maintenanceCostPerKm * config.averageSpeedKmH + config.tiresCostPerHour
  )
  const fixedPerHour = Math.round(
    config.canonCtpAndAresepPerHour + config.insuranceAndInspectionPerHour + config.fleetDepreciationPerHour
  )
  const totalCostPerHour = Math.max(1000, fuelPerHour + crewPerHour + maintenancePerHour + fixedPerHour)
  const costPerKm = config.averageSpeedKmH > 0 ? Math.round(totalCostPerHour / config.averageSpeedKmH) : 785

  const fuelPct = Math.round((fuelPerHour / totalCostPerHour) * 100)
  const crewPct = Math.round((crewPerHour / totalCostPerHour) * 100)
  const maintenancePct = Math.round((maintenancePerHour / totalCostPerHour) * 100)
  const fixedPct = 100 - fuelPct - crewPct - maintenancePct

  return {
    totalCostPerHour,
    fuelPerHour,
    crewPerHour,
    maintenancePerHour,
    fixedPerHour,
    costPerKm,
    fuelPct,
    crewPct,
    maintenancePct,
    fixedPct,
  }
}

/** Our estimates until the operator gives real figures; the dashboard lets them be changed. */
export const defaultAssumptions: Assumptions = {
  costPerBusHour: 12950,
  seniorShare: 0.12,
}

export const defaultSimulationParameters: SimulationParameters = {
  costPerBusHour: 12950,
  operationalCostConfig: defaultOperationalCostConfig,
  seniorShare: 0.12,
  totalFleetSize: 39,
  ramales: defaultRamales,
  demandScale: 1.75,
  morningPeakDemand: 1.0,
  eveningPeakDemand: 1.0,
  middayDemand: 0.20,
  lateNightDemand: 0.03,
  peakActiveShare: 1.0,
  valleyActiveShare: 0.55,
  nightActiveShare: 0.50,
  activeScheduleType: 'weekday',
  daySchedules: defaultDaySchedules,
}

export const simulationPresets = {
  official: {
    name: 'Flota Oficial CTP / ARESEP (39 buses · ~13 012 pax/día)',
    description: 'Demanda real oficial según ARESEP RE-0025-IT-2024 (395 787 pasajeros/mes en 12 ramales, 39 unidades autorizadas).',
    parameters: defaultSimulationParameters,
  },
  highDemand: {
    name: 'Escenario Alta Demanda (39 buses · ~28 000 pax/día)',
    description: 'Flota completa oficial de 39 unidades con factor de demanda elevado a 1.0.',
    parameters: {
      ...defaultSimulationParameters,
      totalFleetSize: 39,
      demandScale: 1.0,
    },
  },
  optimized: {
    name: 'Flota Optimizada (Ahorro en Valle)',
    description: 'Reduce la flota activa en el valle a 35 % para mitigar pérdidas en horas bajo punto de equilibrio.',
    parameters: {
      ...defaultSimulationParameters,
      totalFleetSize: 39,
      valleyActiveShare: 0.35,
      nightActiveShare: 0.30,
    },
  },
  pilot10: {
    name: 'Piloto Controlado (5 a 10 buses)',
    description: 'Escenario enfocado en la prueba piloto inicial de 10 unidades en la troncal.',
    parameters: {
      ...defaultSimulationParameters,
      totalFleetSize: 10,
      demandScale: 0.25,
    },
  },
} as const

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
