// What the Nuevo Simbook wizard asks, section by section (docs/asistente-nuevo-simbook.md, section 4).
// Each field says where its automatic value comes from, so the wizard never labels an estimate as
// official: see docs/supuestos-dashboard-operador.md for every source.
import type { DayScheduleType } from '../../../config/operatorSettings'
import type { SimbookParams } from '../simbook'

export type SectionId = 'empresa' | 'rutas' | 'flota' | 'frecuencias' | 'costos' | 'demanda'

/** How the user chose to load a section. */
export type SectionOrigin = 'auto' | 'manual' | 'copy'

/** Where a value came from: official data, a BusLab estimate, the operator, or another Simbook. */
export type FieldSource = 'publica' | 'estimado' | 'operador' | 'copia' | 'vacio'

export interface FieldDef {
  /** Path in the wizard values: `company.*` for the Simbook's company, otherwise a SimbookParams path. */
  path: string
  label: string
  unit?: string
  kind: 'number' | 'percent' | 'time' | 'text'
  /** Label of the automatic value: official (CTP/ARESEP/INEC) or a BusLab estimate. */
  auto: 'publica' | 'estimado'
  /** Group heading inside the section (e.g. the day type). */
  group?: string
}

export interface SectionDef {
  id: SectionId
  title: string
  description: string
  fields: FieldDef[]
  /** Origins the section offers today; routes cannot be entered by hand yet. */
  origins: SectionOrigin[]
  /** Shown in the section when it is loaded automatically. */
  autoNote?: string
}

const DAYS: [DayScheduleType, string][] = [
  ['weekday', 'Lunes a Viernes'],
  ['saturday', 'Sábado'],
  ['sunday_holiday', 'Domingo y Feriados'],
]

const perDay = (make: (day: DayScheduleType, group: string) => FieldDef[]) => DAYS.flatMap(([day, group]) => make(day, group))

export const SECTIONS: SectionDef[] = [
  {
    id: 'empresa',
    title: 'Empresa',
    description: 'Quién opera y con qué concesión.',
    origins: ['auto', 'manual', 'copy'],
    fields: [
      { path: 'company.name', label: 'Razón social', kind: 'text', auto: 'publica' },
      { path: 'company.concession', label: 'Concesión', kind: 'text', auto: 'publica' },
    ],
  },
  {
    id: 'rutas',
    title: 'Rutas, ramales y paradas',
    description: 'La troncal, los ramales y sus paradas.',
    origins: ['auto'],
    fields: [],
    autoNote:
      'Se usan la troncal R142 y los ramales que trae BusLab. Son aproximados: ARESEP fija 12 ramales y algunos nombres de BusLab están por confirmar. Definirlos a mano o importarlos del documento CTP del operador llegará más adelante.',
  },
  {
    id: 'flota',
    title: 'Flota',
    description: 'Cuántos buses tiene la concesión.',
    origins: ['auto', 'manual', 'copy'],
    fields: [{ path: 'fleet', label: 'Flota autorizada', unit: 'buses', kind: 'number', auto: 'publica' }],
    autoNote: 'Flota autorizada por el CTP: 39 buses (oficio CTP-DT-DAC-INF-0557-2023).',
  },
  {
    id: 'frecuencias',
    title: 'Frecuencias, horarios y turnos',
    description: 'Primer y último despacho, intervalos y cuánta flota sale en cada franja, por tipo de día.',
    origins: ['auto', 'manual', 'copy'],
    autoNote: 'BusLab todavía no tiene las frecuencias autorizadas por el CTP: estos valores son estimaciones del equipo.',
    fields: perDay((day, group) => [
      { path: `schedules.${day}.firstDeparture`, label: 'Primer despacho', kind: 'time', auto: 'estimado', group },
      { path: `schedules.${day}.lastDeparture`, label: 'Último despacho', kind: 'time', auto: 'estimado', group },
      { path: `schedules.${day}.trunkHeadwayMinutes`, label: 'Intervalo troncal', unit: 'min', kind: 'number', auto: 'estimado', group },
      { path: `schedules.${day}.feederHeadwayMinutes`, label: 'Intervalo ramales', unit: 'min', kind: 'number', auto: 'estimado', group },
      { path: `schedules.${day}.peakFleetShare`, label: 'Flota en pico', unit: '%', kind: 'percent', auto: 'estimado', group },
      { path: `schedules.${day}.valleyFleetShare`, label: 'Flota en valle', unit: '%', kind: 'percent', auto: 'estimado', group },
      { path: `schedules.${day}.nightFleetShare`, label: 'Flota de noche', unit: '%', kind: 'percent', auto: 'estimado', group },
    ]),
  },
  {
    id: 'costos',
    title: 'Costos, tarifas e ingresos',
    description: 'Lo que cuesta una hora de bus en servicio. Las tarifas son las del pliego ARESEP vigente.',
    origins: ['auto', 'manual', 'copy'],
    autoNote: 'Modelo de costos de ARESEP con valores estimados por el equipo: revíselos con los costos reales de su empresa.',
    fields: [
      { path: 'costConfig.dieselPricePerLiter', label: 'Precio diésel', unit: '₡/L', kind: 'number', auto: 'estimado', group: 'Combustible y energía' },
      { path: 'costConfig.fuelEfficiencyKmPerLiter', label: 'Rendimiento flota', unit: 'km/L', kind: 'number', auto: 'estimado', group: 'Combustible y energía' },
      { path: 'costConfig.averageSpeedKmH', label: 'Velocidad comercial', unit: 'km/h', kind: 'number', auto: 'estimado', group: 'Combustible y energía' },
      { path: 'costConfig.lubricantsCostPerHour', label: 'Lubricantes y filtros', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Combustible y energía' },
      { path: 'costConfig.driverHourlyWage', label: 'Salario base chofer', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Personal operativo' },
      { path: 'costConfig.driverSocialChargesRatio', label: 'Cargas sociales', unit: '%', kind: 'percent', auto: 'estimado', group: 'Personal operativo' },
      { path: 'costConfig.driverReliefMultiplier', label: 'Factor de relevo', unit: '×', kind: 'number', auto: 'estimado', group: 'Personal operativo' },
      { path: 'costConfig.mechanicsAndDispatchPerHour', label: 'Taller y despacho', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Personal operativo' },
      { path: 'costConfig.maintenanceCostPerKm', label: 'Mantenimiento', unit: '₡/km', kind: 'number', auto: 'estimado', group: 'Mantenimiento y flota' },
      { path: 'costConfig.tiresCostPerHour', label: 'Llantas y rodamiento', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Mantenimiento y flota' },
      { path: 'costConfig.fleetDepreciationPerHour', label: 'Depreciación flota', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Mantenimiento y flota' },
      { path: 'costConfig.canonCtpAndAresepPerHour', label: 'Canon CTP y ARESEP', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Cánones y fijos' },
      { path: 'costConfig.insuranceAndInspectionPerHour', label: 'Seguros e inspección', unit: '₡/h', kind: 'number', auto: 'estimado', group: 'Cánones y fijos' },
    ],
  },
  {
    id: 'demanda',
    title: 'Demanda y variación temporal',
    description: 'Cuántos pasajeros viajan y cómo se reparten en el día.',
    origins: ['auto', 'manual', 'copy'],
    autoNote: 'Solo los pasajeros de lunes a viernes son un dato oficial (ARESEP RE-0025-IT-2024); lo demás son estimaciones del equipo.',
    fields: [
      { path: 'demandScale', label: 'Escala de demanda', unit: '%', kind: 'percent', auto: 'estimado' },
      ...perDay((day, group) => [
        { path: `schedules.${day}.dailyRidership`, label: 'Pasajeros por día', unit: 'pasajeros', kind: 'number', auto: day === 'weekday' ? 'publica' : 'estimado', group },
        { path: `schedules.${day}.seniorShare`, label: 'Adultos mayores', unit: '%', kind: 'percent', auto: 'estimado', group },
        { path: `schedules.${day}.demandFactor`, label: 'Factor de demanda', unit: '×', kind: 'number', auto: 'estimado', group },
        { path: `schedules.${day}.peakMorningFactor`, label: 'Factor pico mañana', unit: '×', kind: 'number', auto: 'estimado', group },
        { path: `schedules.${day}.peakEveningFactor`, label: 'Factor pico tarde', unit: '×', kind: 'number', auto: 'estimado', group },
        { path: `schedules.${day}.middayValleyFactor`, label: 'Factor valle mediodía', unit: '×', kind: 'number', auto: 'estimado', group },
      ]),
    ],
  },
]

export interface Company {
  name: string
  concession: string
}

/** The concession BusLab ships data for. */
export const OFFICIAL_COMPANY: Company = { name: 'Autobuses Unidos de Coronado S.A.', concession: 'Concesión CTP N2 · ruta 142' }

export type FieldValue = string | number | null

/** Reads a field from the params, or from the company for `company.*` paths. */
export function readField(params: SimbookParams, company: Company, path: string): FieldValue {
  const [head, ...rest] = path.split('.')
  let node: unknown = head === 'company' ? company : (params as unknown as Record<string, unknown>)[head]
  for (const key of rest) node = node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined
  return typeof node === 'number' || typeof node === 'string' ? node : null
}

/** A copy of the params with one path set (company paths are handled by the caller). */
export function writeParam(params: SimbookParams, path: string, value: string | number): SimbookParams {
  const keys = path.split('.')
  const copy = structuredClone(params) as unknown as Record<string, unknown>
  let node = copy
  for (const key of keys.slice(0, -1)) node = node[key] as Record<string, unknown>
  node[keys[keys.length - 1]] = value
  return copy as unknown as SimbookParams
}

export const sectionOf = (path: string) => SECTIONS.find((s) => s.fields.some((f) => f.path === path))
