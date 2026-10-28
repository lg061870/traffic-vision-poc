/** The one maximize/restore button shared by the full-screen views (bunching diagram, replay map). */
export function MaximizeButton({
  maximized,
  onChange,
  className = '',
}: {
  maximized: boolean
  onChange: (maximized: boolean) => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={`bunching-action-btn ${className}`}
      aria-label={maximized ? 'Restaurar tamaño' : 'Maximizar vista'}
      title={maximized ? 'Restaurar tamaño (Esc)' : 'Maximizar vista'}
      onClick={() => onChange(!maximized)}
    >
      {maximized ? '❐' : '⛶'}
    </button>
  )
}
