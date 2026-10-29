// The Simbook file (.simbook): one scenario workbook with its Simsheets. Readable JSON, versioned so
// files saved today keep opening after the app changes. See docs/simbook-archivos-de-escenario.md and
// docs/asistente-nuevo-simbook.md.
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

/** Where a value came from: official data, a BusLab estimate, the operator, another Simbook, or nobody yet. */
export type FieldSource = 'publica' | 'estimado' | 'operador' | 'copia' | 'vacio'

/** The source of one parameter value, keyed by its path (e.g. "costConfig.dieselPricePerLiter"). */
export interface ProvenanceEntry {
  source: FieldSource
  unit?: string
  /** Date the value refers to: the official document's date, or when the operator entered it. */
  date?: string
  /** Document or Simbook it comes from, e.g. "CTP-DT-DAC-INF-0557-2023". */
  reference?: string
}

export type Provenance = Record<string, ProvenanceEntry>

/** Parameters being edited and not run yet. A new Simbook is only a draft until its first run. */
export interface SimbookDraft {
  /** The Simsheet the draft started from; null for the initial draft. */
  basedOn: number | null
  params: SimbookParams
  provenance: Provenance
}

export interface SimsheetResults {
  trips: number
  passengers: number
  revenue: number
  cost: number
  margin: number
}

/** A run, frozen: its parameters and everything needed to tell how it was produced. */
export interface SimsheetRecord {
  id: number
  label: string
  /** ISO time the Simsheet was run. */
  ranAt: string
  ranBy: string
  method: 'estandar'
  engineVersion: string
  seed: number
  params: SimbookParams
  /** Sources of the values, frozen with them. */
  provenance: Provenance
  results: SimsheetResults
}

/** What the Nuevo Simbook wizard recorded about the book. Optional: older files have none. */
export interface SimbookMeta {
  description: string
  company: { name: string; concession: string }
  purpose: string | null
  method: 'estandar'
  /** How each wizard section was loaded: automatic (CTP/ARESEP), manual or copied. */
  origins: Record<string, 'auto' | 'manual' | 'copy'>
}

export interface Simbook {
  format: typeof SIMBOOK_FORMAT
  version: number
  savedAt: string
  meta: SimbookMeta | null
  draft: SimbookDraft | null
  simsheets: SimsheetRecord[]
}

/** A value a Simbook did not have: in which Simsheet (or "Borrador") and at which parameter path. */
export interface MissingValue {
  where: string
  path: string
}

/** A Simbook as read from disk, with the values the file did not have. */
export interface OpenedBook extends Simbook {
  missing: MissingValue[]
}

/** Same values, regardless of key order. */
export function sameParams(a: SimbookParams, b: SimbookParams) {
  return stableJson(a) === stableJson(b)
}

/** Compares what would be saved, to tell whether the open Simbook has unsaved changes. */
export const simbookKey = (meta: SimbookMeta | null, draft: SimbookDraft | null, simsheets: SimsheetRecord[]) =>
  stableJson({ meta, draft, simsheets })

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function serializeSimbook(meta: SimbookMeta | null, draft: SimbookDraft | null, simsheets: SimsheetRecord[]): string {
  const book: Simbook = {
    format: SIMBOOK_FORMAT,
    version: SIMBOOK_VERSION,
    savedAt: new Date().toISOString(),
    meta,
    draft,
    simsheets,
  }
  return JSON.stringify(book, null, 2)
}

export class SimbookError extends Error {}

const DAYS: StudioDay[] = ['semana', 'sabado', 'domingo', 'lluvia', 'custom']

/**
 * Reads a .simbook. A value the file does not have is never assumed silently: it is filled from
 * `reference` so the screens can show something, and listed in `missing` so the user can accept the
 * reference value or replace it before running. Anything that is not a Simbook is refused.
 */
export function parseSimbook(text: string, reference: SimbookParams): OpenedBook {
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

  const missing: MissingValue[] = []
  const rawSheets = Array.isArray(book.simsheets) ? book.simsheets : []
  const simsheets: SimsheetRecord[] = rawSheets.map((s, i) => {
    const label = typeof s?.label === 'string' ? s.label : `Simsheet ${i + 1}`
    return {
      id: typeof s?.id === 'number' ? s.id : i + 1,
      label,
      ranAt: typeof s?.ranAt === 'string' ? s.ranAt : '',
      ranBy: typeof s?.ranBy === 'string' ? s.ranBy : '',
      method: 'estandar',
      engineVersion: typeof s?.engineVersion === 'string' ? s.engineVersion : '',
      seed: typeof s?.seed === 'number' ? s.seed : 0,
      params: readParams(s?.params, reference, label, missing),
      provenance: readProvenance(s?.provenance),
      results: { trips: 0, passengers: 0, revenue: 0, cost: 0, margin: 0, ...((s?.results ?? {}) as Partial<SimsheetResults>) },
    }
  })

  const rawDraft = book.draft as Partial<SimbookDraft> | null | undefined
  const draft: SimbookDraft | null = rawDraft
    ? {
        basedOn: typeof rawDraft.basedOn === 'number' ? rawDraft.basedOn : null,
        params: readParams(rawDraft.params, reference, 'Borrador', missing),
        provenance: readProvenance(rawDraft.provenance),
      }
    : null
  if (!draft && simsheets.length === 0) throw new SimbookError('El Simbook está vacío: no tiene borrador ni Simsheets.')

  return {
    format: SIMBOOK_FORMAT,
    version: book.version,
    savedAt: typeof book.savedAt === 'string' ? book.savedAt : '',
    meta: readMeta(book.meta),
    draft,
    simsheets,
    missing,
  }
}

function readParams(value: unknown, reference: SimbookParams, where: string, missing: MissingValue[]): SimbookParams {
  const p = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const note = (path: string) => missing.push({ where, path })

  const num = (v: unknown, fallback: number, path: string) => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    note(path)
    return fallback
  }
  // Fills each missing (or non-matching) field of `fallback` and notes it.
  const section = <T extends object>(v: unknown, fallback: T, path: string): T => {
    const given = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
    const out = { ...fallback } as Record<string, unknown>
    for (const [key, ref] of Object.entries(fallback)) {
      if (ref === undefined) continue
      if (typeof given[key] === typeof ref) out[key] = given[key]
      else note(`${path}.${key}`)
    }
    // Optional values the reference leaves empty (e.g. a schedule's dailyRidership) are kept as given.
    for (const [key, v] of Object.entries(given)) {
      if ((fallback as Record<string, unknown>)[key] === undefined && typeof v === 'number') out[key] = v
    }
    return out as T
  }

  const day = DAYS.includes(p.day as StudioDay) ? (p.day as StudioDay) : (note('day'), reference.day)
  const givenSchedules = (p.schedules && typeof p.schedules === 'object' ? p.schedules : {}) as Record<string, unknown>
  const schedules = { ...reference.schedules }
  for (const key of Object.keys(schedules) as DayScheduleType[]) {
    schedules[key] = { ...section(givenSchedules[key], reference.schedules[key], `schedules.${key}`), id: key }
  }
  return {
    day,
    fleet: num(p.fleet, reference.fleet, 'fleet'),
    demandScale: num(p.demandScale, reference.demandScale, 'demandScale'),
    costConfig: section(p.costConfig, reference.costConfig, 'costConfig'),
    schedules,
  }
}

function readMeta(value: unknown): SimbookMeta | null {
  if (!value || typeof value !== 'object') return null
  const m = value as Partial<SimbookMeta>
  const text = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    description: text(m.description),
    company: { name: text(m.company?.name), concession: text(m.company?.concession) },
    purpose: typeof m.purpose === 'string' ? m.purpose : null,
    method: 'estandar',
    origins: m.origins && typeof m.origins === 'object' ? m.origins : {},
  }
}

const SOURCES: FieldSource[] = ['publica', 'estimado', 'operador', 'copia', 'vacio']

/** Keeps only well-formed entries; a file without sources (older ones) simply has none. */
function readProvenance(value: unknown): Provenance {
  const out: Provenance = {}
  if (!value || typeof value !== 'object') return out
  for (const [path, raw] of Object.entries(value as Record<string, unknown>)) {
    const e = raw as Partial<ProvenanceEntry> | null
    if (!e || !SOURCES.includes(e.source as FieldSource)) continue
    out[path] = { source: e.source as FieldSource }
    if (typeof e.unit === 'string') out[path].unit = e.unit
    if (typeof e.date === 'string') out[path].date = e.date
    if (typeof e.reference === 'string') out[path].reference = e.reference
  }
  return out
}
