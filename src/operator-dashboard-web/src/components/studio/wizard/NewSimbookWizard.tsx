// Nuevo Simbook: choose where each section's data comes from, review the six sections, pick a purpose
// and method, then create the Simbook as an initial draft (docs/asistente-nuevo-simbook.md).
import { useState } from 'react'
import { defaultParams } from '../mockRun'
import { parseSimbook, SimbookError, type Provenance, type ProvenanceEntry, type SimbookParams } from '../simbook'
import { openSimbookFile } from '../simbookFile'
import { routes } from '../studioModel'
import {
  autoEntry,
  OFFICIAL_COMPANY,
  readField,
  todayIso,
  SECTIONS,
  writeParam,
  type Company,
  type FieldDef,
  type FieldSource,
  type FieldValue,
  type SectionId,
  type SectionOrigin,
} from './wizardModel'
import './newSimbookWizard.css'

export type SimbookPurpose = 'frecuencias' | 'flota' | 'costos' | 'rentabilidad' | 'riesgo' | 'libre'

export interface NewSimbookResult {
  name: string
  description: string
  company: Company
  purpose: SimbookPurpose | null
  method: 'estandar'
  origins: Record<SectionId, SectionOrigin>
  params: SimbookParams
  /** The source of every value the wizard asked for. */
  provenance: Provenance
  /** Parameter paths left empty. */
  missing: string[]
}

interface Props {
  onCancel: () => void
  onCreate: (result: NewSimbookResult) => void
}

const STEPS = ['Origen de los datos', 'Revisar parámetros', 'Propósito y método', 'Crear']

const ORIGIN_LABEL: Record<SectionOrigin, string> = {
  auto: 'Automático (CTP / ARESEP)',
  manual: 'Manual',
  copy: 'Copiar de otro Simbook',
}

const SOURCE_LABEL: Record<FieldSource, string> = {
  publica: 'Referencia pública',
  estimado: 'Estimado, revise',
  operador: 'Verificado por operador',
  copia: 'Copiado',
  vacio: 'Sin dato',
}

const PURPOSES: [SimbookPurpose, string][] = [
  ['frecuencias', 'Cambiar frecuencias'],
  ['flota', 'Dimensionar la flota'],
  ['costos', 'Reducir costos'],
  ['rentabilidad', 'Analizar rentabilidad'],
  ['riesgo', 'Exposición a riesgo'],
  ['libre', 'Simulación libre'],
]

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields)

interface FieldState {
  value: FieldValue
  source: FieldSource
  /** Kept for copied values, whose original source travels with them. */
  entry?: ProvenanceEntry
}

interface CopySource {
  name: string
  params: SimbookParams
  provenance: Provenance
  company: Company | null
}

function initialFields(section: SectionId, origin: SectionOrigin, copy: CopySource | null): Record<string, FieldState> {
  const out: Record<string, FieldState> = {}
  for (const field of SECTIONS.find((s) => s.id === section)!.fields) {
    if (origin === 'manual') out[field.path] = { value: null, source: 'vacio' }
    else if (origin === 'copy' && copy) {
      const value = readField(copy.params, copy.company ?? { name: '', concession: '' }, field.path)
      // A copied value keeps the source the other Simbook recorded; without one it is just "copied".
      const entry = copy.provenance[field.path] ?? { source: 'copia', ...(field.unit ? { unit: field.unit } : {}), reference: copy.name }
      out[field.path] = value === null || value === '' ? { value: null, source: 'vacio' } : { value, source: entry.source, entry }
    } else out[field.path] = { value: readField(defaultParams, OFFICIAL_COMPANY, field.path), source: field.auto }
  }
  return out
}

export function NewSimbookWizard({ onCancel, onCreate }: Props) {
  const [step, setStep] = useState(0)
  const [origins, setOrigins] = useState<Record<SectionId, SectionOrigin>>(
    () => Object.fromEntries(SECTIONS.map((s) => [s.id, 'auto'])) as Record<SectionId, SectionOrigin>,
  )
  const [copy, setCopy] = useState<CopySource | null>(null)
  const [fields, setFields] = useState<Record<string, FieldState>>(() =>
    Object.assign({}, ...SECTIONS.map((s) => initialFields(s.id, 'auto', null))),
  )
  const [sectionIndex, setSectionIndex] = useState(0)
  const [purpose, setPurpose] = useState<SimbookPurpose | null>(null)
  const [name, setName] = useState('Mi_escenario')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setOrigin = (section: SectionId, origin: SectionOrigin, source = copy) => {
    setOrigins((prev) => ({ ...prev, [section]: origin }))
    setFields((prev) => ({ ...prev, ...initialFields(section, origin, source) }))
  }
  const setAll = (origin: SectionOrigin) => {
    for (const s of SECTIONS) if (s.origins.includes(origin)) setOrigin(s.id, origin)
  }

  // Copying needs a Simbook first; it then applies to every section already set to copy.
  const pickCopySource = async (thenSection?: SectionId) => {
    setError(null)
    try {
      const opened = await openSimbookFile()
      if (!opened) return
      const book = parseSimbook(opened.text, defaultParams)
      const last = book.simsheets[book.simsheets.length - 1]
      const source: CopySource = {
        name: opened.name,
        params: book.draft?.params ?? last.params,
        provenance: book.draft?.provenance ?? last.provenance,
        company: book.meta?.company ?? null,
      }
      setCopy(source)
      for (const s of SECTIONS) if (origins[s.id] === 'copy' || s.id === thenSection) setOrigin(s.id, 'copy', source)
    } catch (e) {
      setError(e instanceof SimbookError ? e.message : 'No se pudo abrir el Simbook.')
    }
  }

  const chooseOrigin = (section: SectionId, origin: SectionOrigin) => {
    if (origin === 'copy' && !copy) void pickCopySource(section)
    else setOrigin(section, origin)
  }

  const editField = (field: FieldDef, raw: string) => {
    let value: FieldValue = raw.trim() === '' ? null : raw
    if (value !== null && (field.kind === 'number' || field.kind === 'percent')) {
      const n = Number(raw.replace(',', '.'))
      value = Number.isFinite(n) ? (field.kind === 'percent' ? n / 100 : n) : null
    }
    setFields((prev) => ({ ...prev, [field.path]: { value, source: value === null ? 'vacio' : 'operador' } }))
  }

  // The company is not a simulation input, so leaving it empty never blocks a run.
  const emptyFields = ALL_FIELDS.filter((f) => fields[f.path]?.value === null && !f.path.startsWith('company.'))

  const entryFor = (f: FieldDef): ProvenanceEntry => {
    const state = fields[f.path]
    if (state?.entry) return state.entry
    const source = state?.source ?? 'vacio'
    if (source === 'publica' || source === 'estimado') return autoEntry(f)
    return { source, ...(f.unit ? { unit: f.unit } : {}), ...(source === 'operador' ? { date: todayIso() } : {}) }
  }

  const create = () => {
    let params = defaultParams
    const company: Company = { name: '', concession: '' }
    for (const f of ALL_FIELDS) {
      const value = fields[f.path]?.value
      if (value === null || value === undefined) continue
      if (f.path.startsWith('company.')) company[f.path.slice(8) as keyof Company] = String(value)
      else params = writeParam(params, f.path, value)
    }
    const clean = name.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'Mi_escenario'
    const provenance: Provenance = Object.fromEntries(ALL_FIELDS.filter((f) => !f.path.startsWith('company.')).map((f) => [f.path, entryFor(f)]))
    onCreate({ name: clean, description: description.trim(), company, purpose, method: 'estandar', origins, params, provenance, missing: emptyFields.map((f) => f.path) })
  }

  const counts = (section: SectionId) => {
    const c: Partial<Record<FieldSource, number>> = {}
    for (const f of SECTIONS.find((s) => s.id === section)!.fields) {
      const source = fields[f.path]?.source ?? 'vacio'
      c[source] = (c[source] ?? 0) + 1
    }
    return c
  }

  const section = SECTIONS[sectionIndex]
  const groups = [...new Set(section.fields.map((f) => f.group ?? ''))]
  const lastSection = sectionIndex === SECTIONS.length - 1

  const next = () => {
    if (step === 1 && !lastSection) setSectionIndex((i) => i + 1)
    else setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const back = () => {
    if (step === 1 && sectionIndex > 0) setSectionIndex((i) => i - 1)
    else setStep((s) => Math.max(s - 1, 0))
  }

  const display = (field: FieldDef, value: FieldValue) =>
    value === null ? '' : field.kind === 'percent' ? String(Math.round(Number(value) * 1000) / 10) : String(value)

  return (
    <div className="wz-backdrop" role="dialog" aria-modal="true" aria-label="Nuevo Simbook">
      <div className="wz-panel">
        <header className="wz-header">
          <div className="wz-title">Nuevo Simbook</div>
          <ol className="wz-steps">
            {STEPS.map((label, i) => (
              <li key={label} className={i === step ? 'active' : i < step ? 'done' : ''}>
                <span>{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        </header>

        <div className="wz-body">
          {error && <div className="wz-error">{error}</div>}

          {step === 0 && (
            <>
              <h3>¿Cómo quiere cargar los parámetros?</h3>
              <p className="wz-lead">
                Elija para cada sección. <strong>Automático</strong> usa los datos oficiales del CTP y ARESEP que trae BusLab para la
                ruta 142, marcados como referencia pública; lo que no está en ningún documento oficial se marca como estimado.
                <strong> Manual</strong> deja los campos vacíos para que usted los llene.
              </p>
              <div className="wz-quick">
                <button type="button" onClick={() => setAll('auto')}>Todo automático</button>
                <button type="button" onClick={() => setAll('manual')}>Todo manual</button>
                {copy && <span className="wz-copy-name">Copiando de {copy.name}</span>}
              </div>
              <table className="wz-origin-table">
                <tbody>
                  {SECTIONS.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.title}</strong>
                        <div className="wz-muted">{s.description}</div>
                      </td>
                      <td>
                        <div className="wz-seg" role="radiogroup" aria-label={s.title}>
                          {(['auto', 'manual', 'copy'] as SectionOrigin[]).map((o) => (
                            <button
                              key={o}
                              type="button"
                              role="radio"
                              aria-checked={origins[s.id] === o}
                              className={origins[s.id] === o ? 'active' : ''}
                              disabled={!s.origins.includes(o)}
                              title={s.origins.includes(o) ? undefined : 'Todavía no disponible para esta sección'}
                              onClick={() => chooseOrigin(s.id, o)}
                            >
                              {ORIGIN_LABEL[o]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {step === 1 && (
            <div className="wz-review">
              <nav className="wz-section-nav">
                {SECTIONS.map((s, i) => {
                  const empty = s.fields.filter((f) => fields[f.path]?.value === null).length
                  return (
                    <button key={s.id} type="button" className={i === sectionIndex ? 'active' : ''} onClick={() => setSectionIndex(i)}>
                      <span>{i + 1}. {s.title}</span>
                      <small>{ORIGIN_LABEL[origins[s.id]]}{empty > 0 ? ` · ${empty} sin dato` : ''}</small>
                    </button>
                  )
                })}
              </nav>
              <section className="wz-section">
                <h3>
                  {sectionIndex + 1}. {section.title}
                </h3>
                <p className="wz-muted">{section.description}</p>
                {origins[section.id] === 'auto' && section.autoNote && <div className="wz-note">{section.autoNote}</div>}
                {section.id === 'rutas' && (
                  <table className="wz-routes">
                    <tbody>
                      {routes.map((r) => (
                        <tr key={r.routeId}>
                          <td>{r.routeId}</td>
                          <td>{r.name}</td>
                          <td>{r.stops.length} paradas</td>
                          <td>{r.busCount} buses</td>
                          <td>₡{r.fare}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {section.id === 'costos' && (
                  <div className="wz-note">
                    Tarifas: pliego ARESEP RE-0115-IT-2026 (referencia pública): ₡460 troncal, Cascajal y Las Nubes; ₡410
                    periféricas; ₡400 ramales cortos; adulto mayor ₡0.
                  </div>
                )}
                {groups.map((group) => (
                  <div key={group} className="wz-group">
                    {group && <h4>{group}</h4>}
                    <div className="wz-fields">
                      {section.fields
                        .filter((f) => (f.group ?? '') === group)
                        .map((f) => {
                          const state = fields[f.path] ?? { value: null, source: 'vacio' as FieldSource }
                          return (
                            <label key={f.path} className={`wz-field src-${state.source}`}>
                              <span className="wz-field-label">{f.label}</span>
                              <span className="wz-input">
                                <input
                                  type={f.kind === 'time' ? 'time' : 'text'}
                                  inputMode={f.kind === 'number' || f.kind === 'percent' ? 'decimal' : undefined}
                                  value={display(f, state.value)}
                                  onChange={(e) => editField(f, e.target.value)}
                                />
                                {f.unit && <em>{f.unit}</em>}
                              </span>
                              <span className="wz-source">{SOURCE_LABEL[state.source]}</span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </section>
            </div>
          )}

          {step === 2 && (
            <>
              <h3>¿Qué quiere averiguar? (opcional)</h3>
              <p className="wz-lead">Orienta la guía y los resultados que se destacan; no limita lo que puede simular.</p>
              <div className="wz-chips">
                {PURPOSES.map(([id, label]) => (
                  <button key={id} type="button" className={purpose === id ? 'active' : ''} onClick={() => setPurpose(purpose === id ? null : id)}>
                    {label}
                  </button>
                ))}
              </div>
              <h3>Método</h3>
              <div className="wz-chips">
                <button type="button" className="active">Estándar</button>
                <button type="button" disabled title="Llegará más adelante">Monte Carlo (próximamente)</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3>Nombre del Simbook</h3>
              <div className="wz-name">
                <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del Simbook" />
                <span>.simbook</span>
              </div>
              <textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              <h3>Resumen</h3>
              <table className="wz-summary">
                <tbody>
                  {SECTIONS.map((s) => {
                    const c = counts(s.id)
                    return (
                      <tr key={s.id}>
                        <td>{s.title}</td>
                        <td>{ORIGIN_LABEL[origins[s.id]]}</td>
                        <td>
                          {(Object.keys(c) as FieldSource[]).map((k) => (
                            <span key={k} className={`wz-pill src-${k}`}>
                              {c[k]} {SOURCE_LABEL[k].toLowerCase()}
                            </span>
                          ))}
                          {s.fields.length === 0 && <span className="wz-pill src-estimado">datos de BusLab</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="wz-lead">
                Propósito: {purpose ? PURPOSES.find(([id]) => id === purpose)![1] : 'ninguno'} · Método: Estándar.{' '}
                {emptyFields.length > 0
                  ? `${emptyFields.length} campos quedan sin dato: podrá crear el Simbook, pero tendrá que completarlos antes de ejecutar.`
                  : 'Todos los campos tienen valor.'}{' '}
                El Simbook se crea como borrador, sin Simsheets; guárdelo con Guardar.
              </p>
            </>
          )}
        </div>

        <footer className="wz-footer">
          <button type="button" className="wz-btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <span className="wz-spacer" />
          {step > 0 && (
            <button type="button" className="wz-btn ghost" onClick={back}>
              Anterior
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="wz-btn" onClick={next}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="wz-btn" onClick={create}>
              Crear Simbook
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
