import { useState } from 'react'

// The day's result in words, with a button to paste it into a message or a presentation.
export function ExplainPanel({ paragraphs, scope }: { paragraphs: string[]; scope: string }) {
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(paragraphs.join('\n\n'))
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
    window.setTimeout(() => setCopied(null), 2500)
  }

  return (
    <div className="explain">
      <p className="explain-scope">{scope}</p>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index === paragraphs.length - 1 ? 'explain-note' : undefined}>{paragraph}</p>
      ))}
      <div className="explain-actions">
        <button type="button" className="button" onClick={copy}>Copiar texto</button>
        {copied === 'yes' && <span className="hint">Copiado</span>}
        {copied === 'failed' && <span className="hint">No se pudo copiar; seleccione el texto a mano.</span>}
      </div>
    </div>
  )
}
