import type { HealthResponse } from '../types/health'
import type {
  VideoAnalysisAccepted,
  VideoAnalysisJob,
  VideoAnalysisSettings,
} from '../types/videoAnalysis'

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch('/api/health', { signal })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return response.json() as Promise<HealthResponse>
}

export async function startVideoAnalysis(
  video: File,
  settings: VideoAnalysisSettings,
  signal?: AbortSignal,
): Promise<VideoAnalysisAccepted> {
  const doorStart = settings.doorLine[0] ?? { x: 0.1, y: 0.7 }
  const doorEnd = settings.doorLine[1] ?? { x: 0.9, y: 0.7 }
  const form = new FormData()
  form.append('video', video)
  form.append('cameraView', settings.cameraView)
  form.append('confidenceThreshold', settings.confidenceThreshold.toString())
  form.append('processingFps', settings.processingFps.toString())
  form.append('initialPassengers', settings.initialPassengers.toString())
  form.append('doorLineX1', doorStart.x.toString())
  form.append('doorLineY1', doorStart.y.toString())
  form.append('doorLineX2', doorEnd.x.toString())
  form.append('doorLineY2', doorEnd.y.toString())
  form.append('insideX', settings.insidePoint.x.toString())
  form.append('insideY', settings.insidePoint.y.toString())

  const response = await fetch('/api/passenger-analysis/video', {
    method: 'POST',
    body: form,
    signal,
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null) as { title?: string } | null
    throw new Error(problem?.title ?? `Video upload failed with status ${response.status}`)
  }
  return response.json() as Promise<VideoAnalysisAccepted>
}

export async function getVideoAnalysis(jobId: string, signal?: AbortSignal): Promise<VideoAnalysisJob> {
  const response = await fetch(`/api/passenger-analysis/video/${jobId}`, { signal })
  if (!response.ok) {
    throw new Error(`Analysis status failed with status ${response.status}`)
  }
  return response.json() as Promise<VideoAnalysisJob>
}

export async function cancelVideoAnalysis(jobId: string): Promise<void> {
  const response = await fetch(`/api/passenger-analysis/video/${jobId}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Analysis cancellation failed with status ${response.status}`)
  }
}
