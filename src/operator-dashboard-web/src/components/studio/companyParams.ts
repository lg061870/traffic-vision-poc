// "Mis parámetros guardados": the company's usual parameters, kept only in this browser to start new
// Simbooks from (docs/asistente-nuevo-simbook.md, section 5). Never sent to a server, and never a
// dependency of a Simbook: each Simbook gets its own copy.
import { parseSimbook, SIMBOOK_FORMAT, type Provenance, type SimbookParams } from './simbook'

const STORAGE_KEY = 'buslab.companyParams'
const SCHEMA_VERSION = 1

export interface SavedCompanyParams {
  schemaVersion: number
  /** ISO time they were last saved. */
  updatedAt: string
  company: { name: string; concession: string }
  params: SimbookParams
  provenance: Provenance
  /** Where they were taken from, e.g. "Simsheet 2 de Plan_2027.simbook". */
  origin: string
}

/** The saved parameters, or null when there are none (or the browser blocks storage). */
export function loadCompanyParams(reference: SimbookParams): SavedCompanyParams | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<SavedCompanyParams>
    if (saved.schemaVersion !== SCHEMA_VERSION) return null
    // Read through the Simbook reader so a damaged entry is checked the same way as a file.
    const book = parseSimbook(
      JSON.stringify({ format: SIMBOOK_FORMAT, version: 1, draft: { basedOn: null, params: saved.params, provenance: saved.provenance }, simsheets: [] }),
      reference,
    )
    if (!book.draft || book.missing.length > 0) return null
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: typeof saved.updatedAt === 'string' ? saved.updatedAt : '',
      company: { name: String(saved.company?.name ?? ''), concession: String(saved.company?.concession ?? '') },
      params: book.draft.params,
      provenance: book.draft.provenance,
      origin: typeof saved.origin === 'string' ? saved.origin : '',
    }
  } catch {
    return null
  }
}

/** Saves (replacing any earlier ones). False when the browser blocks storage. */
export function saveCompanyParams(entry: Omit<SavedCompanyParams, 'schemaVersion' | 'updatedAt'>): SavedCompanyParams | null {
  const saved: SavedCompanyParams = { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString(), ...entry }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    return saved
  } catch {
    return null
  }
}

export function clearCompanyParams() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: there was nothing to clear.
  }
}

/** Shown wherever the parameters are saved. */
export const SHARED_COMPUTER_WARNING =
  'Se guardan solo en este navegador. En una computadora compartida, otras personas que usen este mismo perfil del navegador podrán verlos.'
