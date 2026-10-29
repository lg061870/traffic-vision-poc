// The parameters a Simsheet ran with, read-only and laid out like the Nuevo Simbook wizard, with every
// difference from Simsheet 1 (the baseline) marked. Editing starts a draft; the Simsheet never changes.
import { useState } from 'react'
import type { SimRun } from '../mockRun'
import type { FieldSource } from '../simbook'
import { routes } from '../studioModel'
import { ViewHeader } from '../ViewHeader'
import { readField, SECTIONS, type Company, type FieldDef, type FieldValue } from '../wizard/wizardModel'
import '../wizard/newSimbookWizard.css'

interface Props {
  run: SimRun
  baseline: SimRun
  company: Company | null
  onEditInDraft: () => void
}

const SOURCE_LABEL: Record<FieldSource, string> = {
  publica: 'Referencia pública',
  estimado: 'Estimado',
  operador: 'Verificado por operador',
  copia: 'Copiado',
  vacio: 'Sin dato',
}

const NO_COMPANY: Company = { name: '', concession: '' }

function show(field: FieldDef, value: FieldValue) {
  if (value === null || value === '') return '—'
  if (field.kind === 'percent') return `${(Number(value) * 100).toLocaleString('es-CR', { maximumFractionDigits: 1 })} %`
  if (typeof value === 'number') return `${value.toLocaleString('es-CR')}${field.unit ? ` ${field.unit}` : ''}`
  return String(value)
}

export function SimsheetParamsView({ run, baseline, company, onEditInDraft }: Props) {
  const [sectionIndex, setSectionIndex] = useState(0)
  const isBaseline = run.id === baseline.id

  const valueOf = (r: SimRun, f: FieldDef) => readField(r.params, company ?? NO_COMPANY, f.path)
  const changed = (f: FieldDef) => !f.path.startsWith('company.') && valueOf(run, f) !== valueOf(baseline, f)
  const changes = SECTIONS.flatMap((s) => s.fields.filter(changed).map((f) => ({ section: s, field: f })))

  const section = SECTIONS[sectionIndex]
  const groups = [...new Set(section.fields.map((f) => f.group ?? ''))]
  const ranAt = new Date(run.ranAt)

  return (
    <main className="sv-stage">
      <ViewHeader
        title={`Parámetros de ${run.label}`}
        subtitle={`Ejecutada ${Number.isNaN(ranAt.getTime()) ? '' : ranAt.toLocaleString('es-CR')}${run.ranBy ? ` por ${run.ranBy}` : ''} · método estándar · motor ${run.engineVersion || 'desconocido'} · semilla ${run.seed}`}
      />

      <div className="sv-card sp-bar">
        <span>🔒 Solo lectura: una Simsheet ejecutada no cambia.</span>
        <span className="wz-spacer" />
        <button type="button" className="sv-btn primary" onClick={onEditInDraft}>
          ✎ Editar en un borrador
        </button>
      </div>

      <div className="sv-card sp-changes">
        {isBaseline ? (
          <span>
            <strong>Línea base.</strong> Las demás Simsheets se comparan con esta.
          </span>
        ) : changes.length === 0 ? (
          <span>
            <strong>Sin cambios vs. {baseline.label}.</strong> Mismos parámetros; los resultados pueden variar porque la simulación es aleatoria.
          </span>
        ) : (
          <>
            <strong>
              Cambios vs. {baseline.label} ({changes.length})
            </strong>
            <ul>
              {changes.map(({ section: s, field: f }) => (
                <li key={f.path}>
                  {s.title} · {[f.group, f.label].filter(Boolean).join(' · ')}: {show(f, valueOf(baseline, f))} <b>→</b> {show(f, valueOf(run, f))}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="sv-card wz-review sp-review">
        <nav className="wz-section-nav">
          {SECTIONS.map((s, i) => {
            const n = s.fields.filter(changed).length
            return (
              <button key={s.id} type="button" className={i === sectionIndex ? 'active' : ''} onClick={() => setSectionIndex(i)}>
                <span>
                  {i + 1}. {s.title}
                </span>
                <small>{n > 0 ? `${n} cambio${n === 1 ? '' : 's'}` : 'sin cambios'}</small>
              </button>
            )
          })}
        </nav>
        <section className="wz-section">
          <h3>
            {sectionIndex + 1}. {section.title}
          </h3>
          <p className="wz-muted">{section.description}</p>
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
          {section.id === 'empresa' && !company && <p className="wz-muted">Este Simbook no registra la empresa.</p>}
          {groups.map((group) => (
            <div key={group} className="wz-group">
              {group && <h4>{group}</h4>}
              <div className="wz-fields">
                {section.fields
                  .filter((f) => (f.group ?? '') === group && !(f.path.startsWith('company.') && !company))
                  .map((f) => {
                    const entry = run.provenance[f.path]
                    const diff = changed(f)
                    return (
                      <div key={f.path} className={`wz-field src-${entry?.source ?? 'vacio'} ${diff ? 'sp-changed' : ''}`}>
                        <span className="wz-field-label">{f.label}</span>
                        <span className="sp-value">{show(f, valueOf(run, f))}</span>
                        <span className="wz-source">
                          {entry ? SOURCE_LABEL[entry.source] : 'Fuente sin registrar'}
                          {entry?.reference ? ` · ${entry.reference}` : ''}
                          {entry?.date ? ` · ${entry.date}` : ''}
                        </span>
                        {diff && <span className="sp-was">{baseline.label}: {show(f, valueOf(baseline, f))}</span>}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
