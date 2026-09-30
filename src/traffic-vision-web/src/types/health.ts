export type HealthResponse = {
  status: string
  service: string
  timestampUtc: string
  uploadsEnabled?: boolean
}

export type BackendStatus = 'checking' | 'connected' | 'offline'
