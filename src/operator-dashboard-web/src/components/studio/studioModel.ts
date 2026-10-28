// Daily figures behind the Studio tabs, built only from the shared simulation config so every tab
// shows the same numbers as the rest of the dashboard.
import {
  computeHourlyFleetSupply,
  computeHourlyPassengerDemand,
  computeOperationalCost,
  defaultDaySchedules,
  defaultSimulationParameters,
  type DayScheduleConfig,
  type OperationalCostConfig,
} from '../../config/operatorSettings'
import { officialCtpRoutes } from '../../config/ctpRoutesData'

/** Scenario buttons in the ribbon. Rain and custom have no profile of their own yet. */
export type StudioDay = 'semana' | 'sabado' | 'domingo' | 'lluvia' | 'custom'

export type StudioTab = 'inicio' | 'rutas' | 'despacho' | 'demanda' | 'costos' | 'resultados' | 'ayuda'

export function scheduleFor(day: StudioDay): DayScheduleConfig {
  if (day === 'sabado') return defaultDaySchedules.saturday
  if (day === 'domingo') return defaultDaySchedules.sunday_holiday
  return defaultDaySchedules.weekday
}

export const dayHasOwnProfile = (day: StudioDay) => day !== 'lluvia' && day !== 'custom'

export const totalFleet = defaultSimulationParameters.totalFleetSize
export const seniorShareDefault = defaultSimulationParameters.seniorShare
export const routes = officialCtpRoutes

/** Fare weighted by the buses assigned to each route. */
export const averageFare =
  routes.reduce((sum, r) => sum + r.fare * r.busCount, 0) / Math.max(1, routes.reduce((sum, r) => sum + r.busCount, 0))

export function costPerBusHour(config: OperationalCostConfig) {
  return config.mode === 'manual' ? config.manualCostPerBusHour : computeOperationalCost(config).totalCostPerHour
}

/** Boardings one bus needs in an hour to pay that hour, after free senior rides. */
export function breakEvenBoardings(costPerHour: number, fare: number, seniorShare: number) {
  return costPerHour / (fare * (1 - seniorShare))
}

export interface HourResult {
  hour: number
  label: string
  period: 'peak' | 'valley' | 'night' | 'off'
  buses: number
  passengers: number
  perBusHour: number
  revenue: number
  cost: number
  margin: number
}

export function dailyResults(day: StudioDay, costConfig: OperationalCostConfig) {
  const schedule = scheduleFor(day)
  const seniorShare = schedule.seniorShare ?? seniorShareDefault
  const supply = computeHourlyFleetSupply(totalFleet, schedule)
  const demand = computeHourlyPassengerDemand(schedule, defaultSimulationParameters.demandScale)
  const hourCost = costPerBusHour(costConfig)

  const hours: HourResult[] = supply.map((s, i) => {
    const passengers = demand[i].passengers
    const revenue = passengers * averageFare * (1 - seniorShare)
    const cost = s.buses * hourCost
    return {
      hour: s.hour,
      label: s.label,
      period: s.period,
      buses: s.buses,
      passengers,
      perBusHour: s.buses > 0 ? passengers / s.buses : 0,
      revenue,
      cost,
      margin: revenue - cost,
    }
  })

  const served = hours.filter((h) => h.buses > 0)
  const totals = {
    passengers: served.reduce((sum, h) => sum + h.passengers, 0),
    busHours: served.reduce((sum, h) => sum + h.buses, 0),
    revenue: served.reduce((sum, h) => sum + h.revenue, 0),
    cost: served.reduce((sum, h) => sum + h.cost, 0),
  }

  return {
    schedule,
    seniorShare,
    hourCost,
    breakEven: breakEvenBoardings(hourCost, averageFare, seniorShare),
    hours: served,
    totals: { ...totals, margin: totals.revenue - totals.cost },
    profitableHours: served.filter((h) => h.margin >= 0).length,
  }
}

export const colones = (value: number) => `₡${Math.round(value).toLocaleString('es-CR')}`
export const number = (value: number, digits = 0) =>
  value.toLocaleString('es-CR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
