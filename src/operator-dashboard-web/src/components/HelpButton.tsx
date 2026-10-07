import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { defaultAssumptions, type Assumptions } from '../config/operatorSettings'
import { helpTopic, type HelpKey } from '../help'

/** The assumptions in use, so help texts quote the current cost and senior share. */
export const AssumptionsContext = createContext<Assumptions>(defaultAssumptions)

const width = 340
const margin = 8

// A small "?" in a card's corner. Its box opens on the page's top layer, so cards that clip their
// content cannot cut it, and closes with its ×, a click anywhere else, Escape, or a scroll.
export function HelpButton({ topic }: { topic: HelpKey }) {
  const assumptions = useContext(AssumptionsContext)
  const button = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!box.current?.contains(target) && !button.current?.contains(target)) close()
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  // Below the button, right-aligned with it; above it when there is no room below.
  useLayoutEffect(() => {
    if (!open || !button.current || !box.current) return
    const anchor = button.current.getBoundingClientRect()
    const height = box.current.offsetHeight
    const left = Math.min(Math.max(anchor.right - width, margin), window.innerWidth - width - margin)
    const below = anchor.bottom + 6
    const top = below + height > window.innerHeight - margin ? Math.max(margin, anchor.top - height - 6) : below
    setPosition({ top, left })
  }, [open])

  const help = helpTopic(topic, assumptions)

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`help-button ${open ? 'open' : ''}`}
        aria-label={`Qué es «${help.title}» y cómo se calcula`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setPosition(null)
          setOpen((value) => !value)
        }}
      >
        ?
      </button>
      {open &&
        createPortal(
          <div
            ref={box}
            className="help-popover"
            role="dialog"
            aria-label={help.title}
            style={{ width, top: position?.top ?? -9999, left: position?.left ?? -9999 }}
          >
            <header>
              <strong>{help.title}</strong>
              <button type="button" className="help-close" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button>
            </header>
            <p>{help.what}</p>
            <h4>Cómo se calcula</h4>
            <ul>
              {help.how.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {help.note && <p className="help-note">{help.note}</p>}
          </div>,
          document.body,
        )}
    </>
  )
}
