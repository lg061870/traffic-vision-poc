import { useEffect, useState, type ReactNode } from 'react'

// A centered dialog over the page; Escape or a click outside closes it.
export function Modal({
  title,
  onClose,
  allowMaximize = false,
  className = '',
  children,
}: {
  title: string
  onClose: () => void
  allowMaximize?: boolean
  className?: string
  children: ReactNode
}) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={`modal-backdrop ${isMaximized ? 'backdrop-maximized' : ''}`} onClick={onClose}>
      <div
        className={`modal ${allowMaximize ? 'modal-resizable' : ''} ${isMaximized ? 'modal-maximized' : ''} ${className}`}
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="drawer-header modal-header"
          onDoubleClick={() => allowMaximize && setIsMaximized((prev) => !prev)}
          title={allowMaximize ? 'Doble clic para alternar pantalla completa' : undefined}
        >
          <h2>{title}</h2>
          <div className="modal-header-actions">
            {allowMaximize && (
              <button
                type="button"
                className="icon-button modal-maximize-btn"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Restaurar tamaño (🗗)' : 'Maximizar a pantalla completa (🗖)'}
                aria-label={isMaximized ? 'Restaurar tamaño' : 'Maximizar a pantalla completa'}
              >
                {isMaximized ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="8" width="12" height="12" rx="2" />
                    <path d="M8 4h10a2 2 0 0 1 2 2v10" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                )}
              </button>
            )}
            <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

