// Nuevo Simbook: choose where each section's data comes from, review the six sections, pick a purpose
// and method, then create the Simbook as an initial draft (docs/asistente-nuevo-simbook.md).
import { useState, type ReactNode } from 'react'
import { defaultParams } from '../mockRun'
import { parseSimbook, SimbookError, type Provenance, type ProvenanceEntry, type SimbookParams } from '../simbook'
import { openSimbookFile } from '../simbookFile'
import { SHARED_COMPUTER_WARNING, type SavedCompanyParams } from '../companyParams'
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
  /** Also keep these values as "mis parámetros guardados" for new Simbooks. */
  saveAsDefaults: boolean
}

interface Props {
  /** The company's saved parameters, offered first when there are any. */
  saved: SavedCompanyParams | null
  onCancel: () => void
  onCreate: (result: NewSimbookResult) => void
}

const STEPS = ['Origen de los datos', 'Revisar parámetros', 'Propósito y método', 'Crear']
const PAGE_TITLES = ['Bienvenido al asistente Nuevo Simbook', 'Revisar parámetros', 'Propósito y método', 'Crear el Simbook']

const ORIGIN_LABEL: Record<SectionOrigin, string> = {
  saved: 'Mis parámetros guardados',
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

function initialFields(section: SectionId, origin: SectionOrigin, copy: CopySource | null, saved: SavedCompanyParams | null): Record<string, FieldState> {
  const out: Record<string, FieldState> = {}
  for (const field of SECTIONS.find((s) => s.id === section)!.fields) {
    if (origin === 'manual') out[field.path] = { value: null, source: 'vacio' }
    else if (origin === 'saved' && saved) {
      // Saved values keep the source recorded with them; one saved while still empty stays empty.
      const entry = saved.provenance[field.path] ?? { source: 'copia', reference: 'Mis parámetros guardados' }
      const value = entry.source === 'vacio' ? null : readField(saved.params, saved.company, field.path)
      out[field.path] = value === null || value === '' ? { value: null, source: 'vacio' } : { value, source: entry.source, entry }
    }
    else if (origin === 'copy' && copy) {
      const value = readField(copy.params, copy.company ?? { name: '', concession: '' }, field.path)
      // A copied value keeps the source the other Simbook recorded; without one it is just "copied".
      const entry = copy.provenance[field.path] ?? { source: 'copia', ...(field.unit ? { unit: field.unit } : {}), reference: copy.name }
      out[field.path] = value === null || value === '' ? { value: null, source: 'vacio' } : { value, source: entry.source, entry }
    } else out[field.path] = { value: readField(defaultParams, OFFICIAL_COMPANY, field.path), source: field.auto }
  }
  return out
}

// With saved parameters every section starts from them; otherwise from the official data.
const startOrigin = (s: (typeof SECTIONS)[number], saved: SavedCompanyParams | null): SectionOrigin =>
  saved && s.origins.includes('saved') ? 'saved' : 'auto'

export function NewSimbookWizard({ saved, onCancel, onCreate }: Props) {
  const [step, setStep] = useState(0)
  const [origins, setOrigins] = useState<Record<SectionId, SectionOrigin>>(
    () => Object.fromEntries(SECTIONS.map((s) => [s.id, startOrigin(s, saved)])) as Record<SectionId, SectionOrigin>,
  )
  const [copy, setCopy] = useState<CopySource | null>(null)
  const [fields, setFields] = useState<Record<string, FieldState>>(() =>
    Object.assign({}, ...SECTIONS.map((s) => initialFields(s.id, startOrigin(s, saved), null, saved))),
  )
  // Offered checked the first time, so a company's first Simbook also sets its defaults; afterwards
  // replacing them is an explicit choice.
  const [saveAsDefaults, setSaveAsDefaults] = useState(saved === null)
  const [sectionIndex, setSectionIndex] = useState(0)
  const [purpose, setPurpose] = useState<SimbookPurpose | null>(null)
  const [name, setName] = useState('Mi_escenario')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  // The first page offers one choice for every section; "Elegir por sección" shows the table.
  const [perSection, setPerSection] = useState(false)

  const setOrigin = (section: SectionId, origin: SectionOrigin, source = copy) => {
    setOrigins((prev) => ({ ...prev, [section]: origin }))
    setFields((prev) => ({ ...prev, ...initialFields(section, origin, source, saved) }))
  }
  const setAll = (origin: SectionOrigin) => {
    for (const s of SECTIONS) if (s.origins.includes(origin)) setOrigin(s.id, origin)
  }

  // Copying needs a Simbook first; it then applies to every section already set to copy (or to all).
  const pickCopySource = async (thenSection?: SectionId | 'all') => {
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
      for (const s of SECTIONS) {
        if (!s.origins.includes('copy')) continue
        if (origins[s.id] === 'copy' || s.id === thenSection || thenSection === 'all') setOrigin(s.id, 'copy', source)
      }
    } catch (e) {
      setError(e instanceof SimbookError ? e.message : 'No se pudo abrir el Simbook.')
    }
  }

  const chooseOrigin = (section: SectionId, origin: SectionOrigin) => {
    if (origin === 'copy' && !copy) void pickCopySource(section)
    else setOrigin(section, origin)
  }

  // The choice the first page shows: the origin every (choosable) section shares, or "por sección".
  const choosable = SECTIONS.filter((s) => s.origins.length > 1)
  const shared = choosable.every((s) => origins[s.id] === origins[choosable[0].id]) ? origins[choosable[0].id] : null
  const globalChoice: SectionOrigin | 'custom' = perSection || !shared ? 'custom' : shared

  const chooseAll = (choice: SectionOrigin | 'custom') => {
    setPerSection(choice === 'custom')
    if (choice === 'custom') return
    if (choice === 'copy' && !copy) void pickCopySource('all')
    else setAll(choice)
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
    onCreate({
      name: clean,
      description: description.trim(),
      company,
      purpose,
      method: 'estandar',
      origins,
      params,
      provenance,
      missing: emptyFields.map((f) => f.path),
      saveAsDefaults,
    })
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
      <div className="wz-window">
        <div className="wz-titlebar">
          <WizardIcon />
          <span>BusLab · Nuevo Simbook</span>
          <span className="wz-spacer" />
          <button type="button" className="wz-close" aria-label="Cerrar" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="wz-main">
          <aside className="wz-side">
            <ol className="wz-steps">
              {STEPS.map((label, i) => (
                <li key={label} className={i === step ? 'active' : i < step ? 'done' : ''}>
                  <span>{i < step ? '✓' : i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
            <WizardArt />
          </aside>

          <div className="wz-page">
            <h2 className="wz-page-title">{PAGE_TITLES[step]}</h2>
            {step === 1 && <div className="wz-page-sub">Sección {sectionIndex + 1} de {SECTIONS.length}: {section.title}</div>}

            <div className="wz-body">
              {error && <div className="wz-error">{error}</div>}

              {step === 0 && (
                <>
                  <p className="wz-question">¿De dónde quiere tomar los parámetros?</p>
                  <div className="wz-options" role="radiogroup" aria-label="Origen de los parámetros">
                    {saved && (
                      <WizardOption checked={globalChoice === 'saved'} onChange={() => chooseAll('saved')} label="Usar mis parámetros guardados">
                        <span className="wz-saved">
                          {saved.company.name ? `${saved.company.name} · ` : ''}actualizados{' '}
                          {saved.updatedAt ? new Date(saved.updatedAt).toLocaleDateString('es-CR') : '—'}
                          {saved.origin ? ` · desde ${saved.origin}` : ''}. Se creará una copia independiente: los cambios posteriores en
                          sus parámetros guardados no modificarán este Simbook.
                        </span>
                      </WizardOption>
                    )}
                    <WizardOption checked={globalChoice === 'auto'} onChange={() => chooseAll('auto')} label="Cargar los datos oficiales CTP / ARESEP">
                      Precarga lo que trae BusLab para la ruta 142, marcado como referencia pública. Lo que no está en ningún documento
                      oficial queda marcado como estimado.
                    </WizardOption>
                    <WizardOption checked={globalChoice === 'manual'} onChange={() => chooseAll('manual')} label="Ingresar todo a mano">
                      Los campos empiezan vacíos y usted los llena sección por sección.
                    </WizardOption>
                    <WizardOption checked={globalChoice === 'copy'} onChange={() => chooseAll('copy')} label="Copiar de otro Simbook">
                      {copy ? `Copiando de ${copy.name}.` : 'Abre un Simbook y toma sus parámetros, con las fuentes que registró.'}
                    </WizardOption>
                    <WizardOption checked={globalChoice === 'custom'} onChange={() => chooseAll('custom')} label="Elegir por sección">
                      Por ejemplo, los datos oficiales para rutas y tarifas, y los de su empresa para los costos.
                    </WizardOption>
                  </div>

                  {globalChoice === 'custom' && (
                    <>
                      <div className="wz-quick">{copy && <span className="wz-copy-name">Copiando de {copy.name}</span>}</div>
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
                                  {((saved ? ['saved', 'auto', 'manual', 'copy'] : ['auto', 'manual', 'copy']) as SectionOrigin[]).map((o) => (
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
                  <p className="wz-question">¿Qué quiere averiguar? (opcional)</p>
                  <p className="wz-lead">Orienta la guía y los resultados que se destacan; no limita lo que puede simular.</p>
                  <div className="wz-chips">
                    {PURPOSES.map(([id, label]) => (
                      <button key={id} type="button" className={purpose === id ? 'active' : ''} onClick={() => setPurpose(purpose === id ? null : id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="wz-question">Método</p>
                  <div className="wz-chips">
                    <button type="button" className="active">Estándar</button>
                    <button type="button" disabled title="Llegará más adelante">Monte Carlo (próximamente)</button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <p className="wz-question">Nombre del Simbook</p>
                  <div className="wz-name">
                    <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del Simbook" />
                    <span>.simbook</span>
                  </div>
                  <textarea placeholder="Descripción (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                  <p className="wz-question">Resumen</p>
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
                  <label className="wz-check">
                    <input type="checkbox" checked={saveAsDefaults} onChange={(e) => setSaveAsDefaults(e.target.checked)} />
                    <span>
                      {saved ? 'Reemplazar mis parámetros guardados' : 'Guardar como mis parámetros predeterminados'} con estos valores para
                      nuevos Simbooks.
                      <span className="wz-muted"> {SHARED_COMPUTER_WARNING}</span>
                    </span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="wz-footer">
          <span className="wz-spacer" />
          <button type="button" className="wz-btn" onClick={back} disabled={step === 0}>
            &lt; Atrás
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="wz-btn default" onClick={next}>
              Siguiente &gt;
            </button>
          ) : (
            <button type="button" className="wz-btn default" onClick={create}>
              Crear Simbook
            </button>
          )}
          <button type="button" className="wz-btn wz-cancel" onClick={onCancel}>
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  )
}

function WizardOption({ checked, onChange, label, children }: { checked: boolean; onChange: () => void; label: string; children: ReactNode }) {
  return (
    <label className={`wz-option ${checked ? 'checked' : ''}`}>
      <input type="radio" name="wz-origin" checked={checked} onChange={onChange} />
      <span>
        <span className="wz-option-label">{label}</span>
        <span className="wz-option-desc">{children}</span>
      </span>
    </label>
  )
}

function WizardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="1.5" width="10" height="13" rx="1.5" fill="#ffffff" stroke="#17375e" />
      <rect x="4" y="3.5" width="10" height="11" rx="1.5" fill="#dbeafe" stroke="#17375e" />
      <path d="M6 7h6M6 9.5h6M6 12h4" stroke="#17375e" strokeWidth="1" />
    </svg>
  )
}

/** The panel's picture: a Simbook's sheets under rising chevrons, like a classic setup wizard. */
function WizardArt() {
  return (
    <svg className="wz-art" viewBox="0 0 170 210" aria-hidden="true">
      <g fill="#ffffff">
        <path d="M85 10 112 30H58Z" opacity="0.25" />
        <path d="M85 36 112 56H58Z" opacity="0.45" />
        <path d="M85 62 112 82H58Z" opacity="0.8" />
      </g>
      <rect x="35" y="96" width="100" height="100" fill="#0e4a57" stroke="#ffffff" strokeWidth="4" />
      <g transform="translate(55 112)">
        <rect x="0" y="6" width="50" height="62" rx="3" fill="#cbd5e1" />
        <rect x="6" y="2" width="50" height="62" rx="3" fill="#e2e8f0" />
        <rect x="12" y="-2" width="50" height="62" rx="3" fill="#ffffff" />
        <path d="M20 10h34M20 18h34M20 26h34M20 34h22" stroke="#17607a" strokeWidth="3" strokeLinecap="round" />
        <rect x="20" y="42" width="34" height="10" rx="2" fill="#f59e0b" />
      </g>
    </svg>
  )
}
