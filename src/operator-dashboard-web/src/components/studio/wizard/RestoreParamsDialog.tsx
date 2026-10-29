// "Restaurar mis parámetros desde un Simbook": pick the draft or one of its Simsheets, then confirm.
// The Simbook itself is only read.
import { useState } from 'react'
import { SHARED_COMPUTER_WARNING } from '../companyParams'
import type { OpenedBook, Provenance, SimbookParams } from '../simbook'
import './newSimbookWizard.css'

export interface RestoreChoice {
  label: string
  params: SimbookParams
  provenance: Provenance
}

interface Props {
  fileName: string
  book: OpenedBook
  /** True when restoring will replace parameters already saved. */
  replacing: boolean
  onCancel: () => void
  onRestore: (choice: RestoreChoice) => void
}

export function RestoreParamsDialog({ fileName, book, replacing, onCancel, onRestore }: Props) {
  const choices: RestoreChoice[] = [
    ...(book.draft ? [{ label: 'Borrador (sin ejecutar)', params: book.draft.params, provenance: book.draft.provenance }] : []),
    ...book.simsheets.map((s, i) => ({
      label: i === 0 ? `${s.label} (línea base)` : s.label,
      params: s.params,
      provenance: s.provenance,
    })),
  ]
  const [picked, setPicked] = useState(choices.length - 1)

  return (
    <div className="wz-backdrop" role="dialog" aria-modal="true" aria-label="Restaurar mis parámetros">
      <div className="wz-panel wz-panel-small">
        <header className="wz-header">
          <div className="wz-title">Restaurar mis parámetros desde {fileName}</div>
        </header>
        <div className="wz-body">
          <p className="wz-lead">Elija de dónde tomar los valores. {fileName} no se modifica.</p>
          <div className="wz-choices" role="radiogroup">
            {choices.map((c, i) => (
              <label key={c.label} className="wz-check">
                <input type="radio" name="restore" checked={picked === i} onChange={() => setPicked(i)} />
                <span>
                  {c.label} · {c.params.fleet} buses
                </span>
              </label>
            ))}
          </div>
          <p className="wz-note">
            {replacing ? 'Esto reemplaza sus parámetros guardados actuales. ' : ''}
            {SHARED_COMPUTER_WARNING}
          </p>
        </div>
        <footer className="wz-footer">
          <button type="button" className="wz-btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <span className="wz-spacer" />
          <button type="button" className="wz-btn" onClick={() => onRestore(choices[picked])}>
            {replacing ? 'Reemplazar mis parámetros' : 'Guardar como mis parámetros'}
          </button>
        </footer>
      </div>
    </div>
  )
}
