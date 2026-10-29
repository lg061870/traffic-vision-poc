// The Simbook file (.simbook): one scenario workbook with its Simsheets. Readable JSON, versioned so
// files saved today keep opening after the app changes. See docs/simbook-archivos-de-escenario.md.
import type { DayScheduleConfig, DayScheduleType, OperationalCostConfig } from '../../config/operatorSettings'
import type { StudioDay } from './studioModel'

export const SIMBOOK_FORMAT = 'buslab.simbook'
export const SIMBOOK_VERSION = 1
export const SIMBOOK_EXTENSION = '.simbook'

/** Everything the user can set for a run. A Simsheet freezes a copy of it. */
export interface SimbookParams {
  day: StudioDay
  fleet: number
  demandScale: number
  costConfig: OperationalCostConfig
  schedules: Record<DayScheduleType, DayScheduleConfig>
}

export interface SimsheetRecord {
  id: number
  label: string
  /** ISO time the Simsheet was run. */
  ranAt: string
  params: SimbookParams
}

export interface Simbook {
  format: typeof SIMBOOK_FORMAT
  version: number
  savedAt: string
  /** The parameters on screen when saved, which may differ from every Simsheet. */
  params: SimbookParams
  simsheets: SimsheetRecord[]
}

/** Same values, regardless of key order. */
export function sameParams(a: SimbookParams, b: SimbookParams) {
  return stableJson(a) === stableJson(b)
}

/** Compares what would be saved, to tell whether the open Simbook has unsaved changes. */
export const simbookKey = (params: SimbookParams, simsheets: SimsheetRecord[]) => stableJson({ params, simsheets })

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function serializeSimbook(params: SimbookParams, simsheets: SimsheetRecord[]): string {
  const book: Simbook = {
    format: SIMBOOK_FORMAT,
    version: SIMBOOK_VERSION,
    savedAt: new Date().toISOString(),
    params,
    simsheets,
  }
  return JSON.stringify(book, null, 2)
}

export class SimbookError extends Error {}

const DAYS: StudioDay[] = ['semana', 'sabado', 'domingo', 'lluvia', 'custom']

/**
 * Reads a .simbook. Values missing from an older or hand-edited file fall back to the defaults, so a
 * file stays usable as parameters are added; anything that is not a Simbook is refused.
 */
export function parseSimbook(text: string, defaults: SimbookParams): Simbook {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new SimbookError('El archivo no es un Simbook válido (no se pudo leer).')
  }
  const book = raw as Partial<Simbook> | null
  if (!book || typeof book !== 'object' || book.format !== SIMBOOK_FORMAT) {
    throw new SimbookError('El archivo no es un Simbook de BusLab.')
  }
  if (typeof book.version !== 'number' || book.version > SIMBOOK_VERSION) {
    throw new SimbookError('Este Simbook fue guardado con una versión más nueva de BusLab. Actualice la página e intente de nuevo.')
  }

  const simsheets = Array.isArray(book.simsheets) ? book.simsheets : []
  if (simsheets.length === 0) throw new SimbookError('El Simbook no tiene ninguna Simsheet.')

  return {
    format: SIMBOOK_FORMAT,
    version: book.version,
    savedAt: typeof book.savedAt === 'string' ? book.savedAt : '',
    params: readParams(book.params, defaults),
    simsheets: simsheets.map((s, i) => ({
      id: typeof s?.id === 'number' ? s.id : i + 1,
      label: typeof s?.label === 'string' ? s.label : `Simsheet ${i + 1}`,
      ranAt: typeof s?.ranAt === 'string' ? s.ranAt : '',
      params: readParams(s?.params, defaults),
    })),
  }
}

function readParams(value: unknown, defaults: SimbookParams): SimbookParams {
  const p = (value && typeof value === 'object' ? value : {}) as Partial<SimbookParams>
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
  const schedules = { ...defaults.schedules }
  for (const key of Object.keys(schedules) as DayScheduleType[]) {
    schedules[key] = { ...defaults.schedules[key], ...(p.schedules?.[key] ?? {}), id: key }
  }
  return {
    day: DAYS.includes(p.day as StudioDay) ? (p.day as StudioDay) : defaults.day,
    fleet: num(p.fleet, defaults.fleet),
    demandScale: num(p.demandScale, defaults.demandScale),
    costConfig: { ...defaults.costConfig, ...(p.costConfig ?? {}) },
    schedules,
  }
}
