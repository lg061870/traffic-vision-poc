export type HealthResponse = {
  status: string
  service: string
  timestampUtc: string
}

export type BackendStatus = 'checking' | 'connected' | 'offline'
