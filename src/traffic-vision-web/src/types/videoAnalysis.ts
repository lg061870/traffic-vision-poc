export type VideoAnalysisStatus = 'Queued' | 'Processing' | 'Completed' | 'Failed' | 'Cancelled'

export type PixelBoundingBox = {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type TrackedPassengerDetection = {
  trackId: number
  confirmed: boolean
  classId: number
  className: 'sitting' | 'standing'
  score: number
  box: PixelBoundingBox
}

export type PassengerVideoFrame = {
  frameNumber: number
  timestampSeconds: number
  detections: TrackedPassengerDetection[]
}

export type PassengerDoorEvent = {
  trackId: number
  direction: 'boarded' | 'exited'
  timestampSeconds: number
}

export type NormalizedPoint = { x: number; y: number }

export type PassengerVideoSettings = {
  confidenceThreshold: number
  initialPassengers: number
  doorLineStart: NormalizedPoint
  doorLineEnd: NormalizedPoint
  insidePoint: NormalizedPoint
}

export type PassengerVideoSummary = {
  sittingPeak: number
  standingPeak: number
  visiblePeak: number
  uniquePassengers: number
  boarded: number
  exited: number
  finalEventOccupancy: number
  peakEventOccupancy: number
}

export type PassengerVideoResult = {
  video: string
  cameraView: 'front' | 'rear'
  width: number
  height: number
  durationSeconds: number
  sourceFps: number
  processingFps: number
  elapsedSeconds: number
  model: string
  analyzedAtUtc: string
  settings: PassengerVideoSettings
  frames: PassengerVideoFrame[]
  doorEvents: PassengerDoorEvent[]
  summary: PassengerVideoSummary
}

export type DemoVideo = {
  id: string
  video: string
  cameraView: 'front' | 'rear'
  durationSeconds: number
  analyzedFrames: number
  processingFps: number
  analyzedAtUtc: string
  summary: PassengerVideoSummary
}

export type VideoAnalysisAccepted = {
  jobId: string
  status: VideoAnalysisStatus
  createdAtUtc: string
}

export type VideoAnalysisJob = VideoAnalysisAccepted & {
  progressPercent: number
  stage: string
  error: string | null
  startedAtUtc: string | null
  completedAtUtc: string | null
  result: PassengerVideoResult | null
}

export type VideoAnalysisSettings = {
  cameraView: 'front' | 'rear'
  confidenceThreshold: number
  processingFps: number
  initialPassengers: number
  doorLine: { x: number; y: number }[]
  insidePoint: { x: number; y: number }
}
