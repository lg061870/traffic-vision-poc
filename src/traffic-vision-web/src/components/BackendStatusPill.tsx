import { Loader2, Wifi, WifiOff } from 'lucide-react'
import type { BackendStatus } from '../types/health'

type BackendStatusPillProps = {
  status: BackendStatus
  onRetry: () => void
}

export function BackendStatusPill({ status, onRetry }: BackendStatusPillProps) {
  const labels = {
    checking: 'Checking API',
    connected: 'Backend connected',
    offline: 'Backend offline',
  }

  const Icon = status === 'checking' ? Loader2 : status === 'connected' ? Wifi : WifiOff

  return (
    <button
      className={`connection-pill connection-pill--${status}`}
      type="button"
      onClick={onRetry}
      aria-label={`${labels[status]}. Check again.`}
      title="Check backend connection"
    >
      <Icon size={15} aria-hidden="true" className={status === 'checking' ? 'spin' : ''} />
      <span>{labels[status]}</span>
    </button>
  )
}
