import {
  ChangeEvent,
  DragEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Armchair,
  BarChart3,
  Bus,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock,
  Crosshair,
  Database,
  Film,
  Gauge,
  Home,
  Info,
  List,
  LogIn,
  LogOut,
  PersonStanding,
  Play,
  ScanLine,
  Settings,
  SlidersHorizontal,
  Upload,
  UserRoundCheck,
  Users,
  Video,
  Waypoints,
  X,
} from 'lucide-react'
import { BackendStatusPill } from './components/BackendStatusPill'
import {
  cancelVideoAnalysis,
  getHealth,
  getVideoAnalysis,
  startVideoAnalysis,
} from './services/api'
import type { BackendStatus } from './types/health'
import type {
  PassengerVideoFrame,
  VideoAnalysisJob,
} from './types/videoAnalysis'

const MAX_FILE_SIZE = 500 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv']

type CameraView = 'front' | 'rear'
type DoorPoint = { x: number; y: number }
type DoorEditorPhase = 'line' | 'inside' | null
type ReviewTab = 'timeline' | 'detections' | 'tracking' | 'door'

const passengerMetrics = [
  { label: 'Sitting', icon: Armchair, tone: 'magenta' },
  { label: 'Standing', icon: PersonStanding, tone: 'purple' },
  { label: 'Visible now', icon: Users, tone: 'blue' },
  { label: 'Boarded', icon: LogIn, tone: 'green' },
  { label: 'Exited', icon: LogOut, tone: 'orange' },
  { label: 'Event occupancy', icon: UserRoundCheck, tone: 'violet' },
  { label: 'Peak occupancy', icon: UserRoundCheck, tone: 'violet' },
] as const

const workflow = [
  { step: '1', label: 'Upload', note: 'Select onboard footage', icon: Upload },
  { step: '2', label: 'Analyze', note: 'Detect and track passengers', icon: ScanLine },
  { step: '3', label: 'View results', note: 'Review passenger insights', icon: BarChart3 },
] as const

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`
}

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60)
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

function formatPoint(point: DoorPoint) {
  return `${Math.round(point.x * 100)}%, ${Math.round(point.y * 100)}%`
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null)
  const [analysisJob, setAnalysisJob] = useState<VideoAnalysisJob | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [videoTime, setVideoTime] = useState(0)
  const [reviewTab, setReviewTab] = useState<ReviewTab>('timeline')
  const [cameraView, setCameraView] = useState<CameraView>('front')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.4)
  const [processingFps, setProcessingFps] = useState(1)
  const [initialPassengers, setInitialPassengers] = useState(0)
  const [doorLine, setDoorLine] = useState<DoorPoint[]>([
    { x: 0.1, y: 0.7 },
    { x: 0.9, y: 0.7 },
  ])
  const [insidePoint, setInsidePoint] = useState<DoorPoint>({ x: 0.5, y: 0.35 })
  const [doorEditorPhase, setDoorEditorPhase] = useState<DoorEditorPhase>(null)

  const videoUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  )

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const checkBackend = useCallback(async () => {
    setBackendStatus('checking')
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 4500)

    try {
      const health = await getHealth(controller.signal)
      setBackendStatus(health.status === 'ok' ? 'connected' : 'offline')
    } catch {
      setBackendStatus('offline')
    } finally {
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    void checkBackend()
  }, [checkBackend])

  useEffect(() => {
    if (!analysisJobId) return

    let disposed = false
    let timer = 0
    const controller = new AbortController()
    const poll = async () => {
      try {
        const job = await getVideoAnalysis(analysisJobId, controller.signal)
        if (disposed) return
        setAnalysisJob(job)
        if (job.status === 'Completed') {
          setAnalysisMessage(`Analysis complete: ${job.result?.frames.length ?? 0} sampled frames with real RF-DETR results.`)
          setVideoTime(0)
          if (videoRef.current) videoRef.current.currentTime = 0
          return
        }
        if (job.status === 'Failed') {
          setAnalysisMessage(job.error ?? 'Video analysis failed.')
          return
        }
        if (job.status === 'Cancelled') {
          setAnalysisMessage('Video analysis was cancelled.')
          return
        }
        timer = window.setTimeout(() => void poll(), 1000)
      } catch (error) {
        if (disposed || controller.signal.aborted) return
        setAnalysisMessage(error instanceof Error ? error.message : 'Could not read analysis progress.')
        timer = window.setTimeout(() => void poll(), 2500)
      }
    }

    void poll()
    return () => {
      disposed = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [analysisJobId])

  const acceptFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setUploadError('Choose an MP4, MOV, AVI, or MKV video.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('The selected file is larger than the 500 MB POC limit.')
      return
    }

    setSelectedFile(file)
    setVideoDuration(null)
    setUploadError(null)
    setAnalysisMessage(null)
    setAnalysisJobId(null)
    setAnalysisJob(null)
    setVideoTime(0)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) acceptFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) acceptFile(file)
  }

  const clearFile = () => {
    setSelectedFile(null)
    setVideoDuration(null)
    setUploadError(null)
    setAnalysisMessage(null)
    setAnalysisJobId(null)
    setAnalysisJob(null)
    setVideoTime(0)
  }

  const selectCamera = (view: CameraView) => {
    setCameraView(view)
    setDoorEditorPhase(null)
    setAnalysisMessage(null)
    setAnalysisJobId(null)
    setAnalysisJob(null)
  }

  const requestAnalysis = async () => {
    if (!selectedFile) return
    if (backendStatus !== 'connected') {
      setAnalysisMessage('Start the backend before running passenger analysis.')
      return
    }

    setIsUploading(true)
    setAnalysisMessage('Uploading the video to the local analysis worker…')
    setAnalysisJobId(null)
    setAnalysisJob(null)
    setVideoTime(0)
    try {
      const accepted = await startVideoAnalysis(selectedFile, {
        cameraView,
        confidenceThreshold,
        processingFps,
        initialPassengers,
        doorLine,
        insidePoint,
      })
      setAnalysisJobId(accepted.jobId)
      setAnalysisMessage('Video queued. RF-DETR inference and passenger tracking will run in the background.')
    } catch (error) {
      setAnalysisMessage(error instanceof Error ? error.message : 'Could not start video analysis.')
    } finally {
      setIsUploading(false)
    }
  }

  const stopAnalysis = async () => {
    if (!analysisJobId) return
    await cancelVideoAnalysis(analysisJobId).catch(() => undefined)
    setAnalysisMessage('Cancelling video analysis…')
  }

  const startDoorLineEdit = () => {
    if (cameraView !== 'rear') return
    setSettingsOpen(false)
    setDoorLine([])
    setDoorEditorPhase('line')
  }

  const handleDoorLineClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!doorEditorPhase || cameraView !== 'rear') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    }

    if (doorEditorPhase === 'inside') {
      setInsidePoint(point)
      setDoorEditorPhase(null)
      return
    }

    setDoorLine((current) => {
      if (current.length === 1) {
        setDoorEditorPhase('inside')
        return [current[0], point]
      }
      return [point]
    })
  }

  const result = analysisJob?.result ?? null
  const analysisRunning = isUploading || analysisJob?.status === 'Queued' || analysisJob?.status === 'Processing'
  const activeFrame = useMemo<PassengerVideoFrame | null>(() => {
    if (!result?.frames.length) return null
    let nearest = result.frames[0]
    for (const frame of result.frames) {
      if (Math.abs(frame.timestampSeconds - videoTime) < Math.abs(nearest.timestampSeconds - videoTime)) {
        nearest = frame
      }
      if (frame.timestampSeconds > videoTime) break
    }
    return nearest
  }, [result, videoTime])
  const visibleDetections = activeFrame?.detections ?? []
  const currentSitting = visibleDetections.filter((item) => item.className === 'sitting').length
  const currentStanding = visibleDetections.filter((item) => item.className === 'standing').length
  const metricValues: Record<string, number | null> = {
    Sitting: result ? currentSitting : null,
    Standing: result ? currentStanding : null,
    'Visible now': result ? currentSitting + currentStanding : null,
    Boarded: result?.summary.boarded ?? null,
    Exited: result?.summary.exited ?? null,
    'Event occupancy': result?.summary.finalEventOccupancy ?? null,
    'Peak occupancy': result?.summary.peakEventOccupancy ?? null,
  }
  const timelineFrames = useMemo(() => {
    if (!result?.frames.length) return []
    const step = Math.max(1, Math.floor(result.frames.length / 10))
    return result.frames.filter((_, index) => index % step === 0).slice(0, 10)
  }, [result])
  const trackSummaries = useMemo(() => {
    if (!result) return []
    const tracks = new Map<number, { id: number; first: number; last: number; observations: number; className: string }>()
    for (const frame of result.frames) {
      for (const detection of frame.detections) {
        const existing = tracks.get(detection.trackId)
        if (existing) {
          existing.last = frame.timestampSeconds
          existing.observations++
          existing.className = detection.className
        } else {
          tracks.set(detection.trackId, {
            id: detection.trackId,
            first: frame.timestampSeconds,
            last: frame.timestampSeconds,
            observations: 1,
            className: detection.className,
          })
        }
      }
    }
    return [...tracks.values()].sort((a, b) => a.id - b.id)
  }, [result])

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Bus Passenger Vision home">
          <span className="brand-mark"><Bus size={26} aria-hidden="true" /></span>
          <span className="brand-name">Bus Passenger Vision</span>
          <span className="brand-subtitle">POC · Onboard passenger analysis</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a className="nav-link nav-link--active" href="#main"><Home size={18} />Home</a>
          <a className="nav-link" href="#about"><Info size={18} />About</a>
          <button className="nav-link nav-button" type="button" onClick={() => setSettingsOpen(true)}>
            <Settings size={18} />Settings
          </button>
        </nav>
        <BackendStatusPill status={backendStatus} onRetry={() => void checkBackend()} />
      </header>

      <main id="main" className="page-frame">
        <section className="intro-panel" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow"><Camera size={16} />Onboard camera workspace</p>
            <h1 id="page-title">Upload bus camera footage</h1>
            <p>Detect seated and standing passengers and count boardings and exits from onboard camera video.</p>
          </div>
          <ol className="workflow" aria-label="Passenger analysis workflow">
            {workflow.map(({ step, label, note, icon: Icon }, index) => (
              <li key={step} className={index === 0 ? 'workflow-step workflow-step--active' : 'workflow-step'}>
                <span className="workflow-icon"><Icon size={22} /></span>
                <span className="workflow-copy"><strong>{step}. {label}</strong><small>{note}</small></span>
                {index < workflow.length - 1 && <ChevronRight className="workflow-arrow" size={20} />}
              </li>
            ))}
          </ol>
        </section>

        <section className="workspace" aria-label="Bus passenger analysis workspace">
          <aside className="card upload-card">
            <div className="card-heading">
              <span className="heading-icon"><Film size={20} /></span>
              <div><span className="section-index">01</span><h2>Upload footage</h2></div>
            </div>

            <fieldset className="camera-selector">
              <legend>Camera view</legend>
              <div className="camera-options">
                <button
                  className={cameraView === 'front' ? 'camera-option camera-option--active' : 'camera-option'}
                  type="button"
                  onClick={() => selectCamera('front')}
                  aria-pressed={cameraView === 'front'}
                >
                  <Camera size={17} /><span><strong>Front</strong><small>Seating area</small></span>
                </button>
                <button
                  className={cameraView === 'rear' ? 'camera-option camera-option--active' : 'camera-option'}
                  type="button"
                  onClick={() => selectCamera('rear')}
                  aria-pressed={cameraView === 'rear'}
                >
                  <LogIn size={17} /><span><strong>Rear</strong><small>Front door</small></span>
                </button>
              </div>
            </fieldset>

            <div
              className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload size={30} strokeWidth={1.8} aria-hidden="true" />
              <strong>Drop bus camera footage here</strong>
              <span>or choose a file from your computer</span>
              <button className="button button--primary" type="button" onClick={() => inputRef.current?.click()}>
                Choose video file
              </button>
              <input
                ref={inputRef}
                className="visually-hidden"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
                onChange={handleFileChange}
              />
            </div>
            <p className="file-hint">MP4, MOV, AVI or MKV · up to 500 MB</p>
            {uploadError && <p className="inline-alert inline-alert--error" role="alert">{uploadError}</p>}

            {selectedFile ? (
              <div className="selected-file">
                <span className="file-icon"><Video size={20} /></span>
                <span className="file-copy">
                  <strong title={selectedFile.name}>{selectedFile.name}</strong>
                  <small>{formatBytes(selectedFile.size)} · {formatDuration(videoDuration)} · {cameraView === 'front' ? 'Front camera' : 'Rear camera'}</small>
                </span>
                <button className="icon-button" type="button" onClick={clearFile} aria-label="Remove selected file"><X size={18} /></button>
              </div>
            ) : (
              <div className="selected-file selected-file--empty">
                <span className="file-icon"><Film size={20} /></span>
                <span className="file-copy"><strong>No video selected</strong><small>Select footage to send it to the real RF-DETR analysis API.</small></span>
              </div>
            )}

            <button className="button button--run" type="button" disabled={!selectedFile || analysisRunning} onClick={() => void requestAnalysis()}>
              <Play size={17} fill="currentColor" />{isUploading ? 'Uploading…' : analysisRunning ? 'Analysis running…' : 'Run passenger analysis'}
            </button>
            {analysisRunning && (
              <div className="analysis-progress" aria-label="Video analysis progress">
                <span><i style={{ width: `${analysisJob?.progressPercent ?? 0}%` }} /></span>
                <div><strong>{analysisJob?.progressPercent ?? 0}%</strong><small>{analysisJob?.stage ?? 'Uploading video'}</small></div>
                {analysisJobId && <button type="button" onClick={() => void stopAnalysis()}>Cancel</button>}
              </div>
            )}
            {analysisMessage && <p className="inline-alert" role="status">{analysisMessage}</p>}
          </aside>

          <section className="card video-card" aria-labelledby="video-title">
            <div className="card-heading card-heading--spread">
              <div className="heading-group">
                <span className="heading-icon"><Video size={20} /></span>
                <div><span className="section-index">02</span><h2 id="video-title">Passenger video preview</h2></div>
              </div>
              <span className="stage-badge">{cameraView === 'front' ? 'Front · seating area' : 'Rear · front door'}</span>
            </div>
            <div className={`video-stage${doorEditorPhase ? ' video-stage--editing' : ''}`}>
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls={!doorEditorPhase}
                  preload="metadata"
                  onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
                  onTimeUpdate={(event) => setVideoTime(event.currentTarget.currentTime)}
                  onSeeked={(event) => setVideoTime(event.currentTarget.currentTime)}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="video-empty">
                  <span className="scan-frame scan-frame--one" />
                  <span className="scan-frame scan-frame--two" />
                  <span className="video-empty-icon"><Users size={34} /></span>
                  <strong>Your onboard video preview will appear here</strong>
                  <p>Select bus footage to review it before passenger analysis.</p>
                  <button className="text-action" type="button" onClick={() => inputRef.current?.click()}>Choose a video</button>
                </div>
              )}

              {result && activeFrame && (
                <svg
                  className="analysis-overlay"
                  viewBox={`0 0 ${result.width} ${result.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  aria-label={`Passenger detections at ${activeFrame.timestampSeconds.toFixed(1)} seconds`}
                >
                  {activeFrame.detections.map((detection) => {
                    const color = detection.className === 'sitting' ? '#ec3fc8' : '#843fe5'
                    const labelY = Math.max(18, detection.box.y1)
                    return (
                      <g key={`${activeFrame.frameNumber}-${detection.trackId}`}>
                        <rect
                          className="detection-box"
                          x={detection.box.x1}
                          y={detection.box.y1}
                          width={Math.max(1, detection.box.x2 - detection.box.x1)}
                          height={Math.max(1, detection.box.y2 - detection.box.y1)}
                          style={{ stroke: color }}
                        />
                        <rect
                          className="detection-label-bg"
                          x={detection.box.x1}
                          y={labelY - 18}
                          width={Math.min(150, Math.max(102, detection.box.x2 - detection.box.x1))}
                          height={18}
                          style={{ fill: color }}
                        />
                        <text x={detection.box.x1 + 4} y={labelY - 5}>
                          ID {detection.trackId} · {detection.className} {(detection.score * 100).toFixed(0)}%
                        </text>
                      </g>
                    )
                  })}
                </svg>
              )}

              {cameraView === 'rear' && doorLine.length > 0 && (
                <svg className="door-line-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Configured door event line">
                  {doorLine.length === 2 && (
                    <line x1={doorLine[0].x * 100} y1={doorLine[0].y * 100} x2={doorLine[1].x * 100} y2={doorLine[1].y * 100} />
                  )}
                  {doorLine.map((point, index) => <circle key={index} cx={point.x * 100} cy={point.y * 100} r="1.1" />)}
                  {doorLine.length === 2 && <circle className="inside-point" cx={insidePoint.x * 100} cy={insidePoint.y * 100} r="1.5" />}
                </svg>
              )}

              {doorEditorPhase && (
                <div className="door-line-editor" onClick={handleDoorLineClick} role="button" tabIndex={0} aria-label="Configure the door counting line and inside side">
                  <span><Crosshair size={18} />{
                    doorEditorPhase === 'inside'
                      ? 'Click the side of the line that is inside the bus'
                      : doorLine.length === 0
                        ? 'Click the first door-line point'
                        : 'Click the second door-line point'
                  }</span>
                </div>
              )}
            </div>
            <div className="video-meta">
              <span><CheckCircle2 size={15} />Original footage</span>
              <span className="class-legend"><i className="legend-dot legend-dot--sitting" />Sitting</span>
              <span className="class-legend"><i className="legend-dot legend-dot--standing" />Standing</span>
              {cameraView === 'rear' && <span><Crosshair size={15} />{doorLine.length === 2 ? 'Door line + inside side configured' : 'Door line not configured'}</span>}
            </div>
          </section>

          <aside className="card summary-card">
            <div className="card-heading">
              <span className="heading-icon"><BarChart3 size={20} /></span>
              <div><span className="section-index">03</span><h2>Passenger summary</h2></div>
            </div>
            <div className={`summary-state${analysisRunning ? ' summary-state--running' : result ? ' summary-state--complete' : ''}`}>
              <span className="pulse-dot" />
              {analysisRunning ? `${analysisJob?.progressPercent ?? 0}% · ${analysisJob?.stage ?? 'Uploading'}` : result ? 'Real analysis complete' : 'Awaiting analysis'}
            </div>
            <ul className="class-list">
              {passengerMetrics.map(({ label, icon: Icon, tone }) => (
                <li key={label}>
                  <span className={`class-icon class-icon--${tone}`}><Icon size={20} /></span>
                  <span className="class-copy"><strong>{label}</strong><span className="metric-track"><span style={{ width: metricValues[label] === null ? '0%' : `${Math.min(100, (metricValues[label] ?? 0) * 12)}%` }} /></span></span>
                  <span className="class-value">{metricValues[label] ?? '—'}</span>
                </li>
              ))}
            </ul>
            <div className="summary-totals">
              <div><span><Database size={17} />Unique passengers (tracked)</span><strong>{result?.summary.uniquePassengers ?? '—'}</strong></div>
              <div><span><Clock size={17} />Video duration</span><strong>{formatDuration(result?.durationSeconds ?? videoDuration)}</strong></div>
              <div><span><Gauge size={17} />Processed FPS</span><strong>{result ? result.processingFps.toFixed(1) : '—'}</strong></div>
              {result && <div><span><Clock size={17} />Analysis time</span><strong>{formatDuration(result.elapsedSeconds)}</strong></div>}
            </div>
          </aside>
        </section>

        <section className="card review-panel" aria-labelledby="review-title">
          <div className="review-tabs" role="tablist" aria-label="Passenger analysis views">
            <button className={`review-tab${reviewTab === 'timeline' ? ' review-tab--active' : ''}`} type="button" role="tab" aria-selected={reviewTab === 'timeline'} onClick={() => setReviewTab('timeline')}><Film size={18} />Timeline</button>
            <button className={`review-tab${reviewTab === 'detections' ? ' review-tab--active' : ''}`} type="button" role="tab" aria-selected={reviewTab === 'detections'} disabled={!result} onClick={() => setReviewTab('detections')}><List size={18} />Detections</button>
            <button className={`review-tab${reviewTab === 'tracking' ? ' review-tab--active' : ''}`} type="button" role="tab" aria-selected={reviewTab === 'tracking'} disabled={!result} onClick={() => setReviewTab('tracking')}><Waypoints size={18} />Tracking</button>
            <button className={`review-tab${reviewTab === 'door' ? ' review-tab--active' : ''}`} type="button" role="tab" aria-selected={reviewTab === 'door'} disabled={!result} onClick={() => setReviewTab('door')}><LogIn size={18} />Door events</button>
          </div>
          {!result ? (
            <div className="timeline-empty" role="tabpanel">
              <div className="timeline-rail" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div>
              <div className="timeline-copy">
                <span className="timeline-icon"><CircleGauge size={22} /></span>
                <div><h2 id="review-title">Timeline ready for real passenger metadata</h2><p>Run analysis to populate detections, stable track IDs, and door events.</p></div>
              </div>
            </div>
          ) : reviewTab === 'timeline' ? (
            <div className="result-timeline" role="tabpanel">
              {timelineFrames.map((frame) => (
                <button key={frame.frameNumber} type="button" onClick={() => { if (videoRef.current) videoRef.current.currentTime = frame.timestampSeconds }}>
                  <strong>{formatDuration(frame.timestampSeconds)}</strong>
                  <span>{frame.detections.length} visible</span>
                  <small>{frame.detections.map((item) => `ID ${item.trackId}`).join(' · ') || 'No detections'}</small>
                </button>
              ))}
            </div>
          ) : reviewTab === 'detections' ? (
            <div className="result-table-wrap" role="tabpanel">
              <table className="result-table"><thead><tr><th>Time</th><th>Track</th><th>Class</th><th>Confidence</th></tr></thead><tbody>
                {result.frames.flatMap((frame) => frame.detections.map((detection) => (
                  <tr key={`${frame.frameNumber}-${detection.trackId}`}><td>{formatDuration(frame.timestampSeconds)}</td><td>ID {detection.trackId}</td><td>{detection.className}</td><td>{(detection.score * 100).toFixed(1)}%</td></tr>
                ))).slice(0, 250)}
              </tbody></table>
            </div>
          ) : reviewTab === 'tracking' ? (
            <div className="track-grid" role="tabpanel">
              {trackSummaries.map((track) => <article key={track.id}><strong>ID {track.id}</strong><span>{track.className}</span><small>{formatDuration(track.first)} → {formatDuration(track.last)} · {track.observations} observations</small></article>)}
            </div>
          ) : (
            <div className="door-events" role="tabpanel">
              {result.doorEvents.length ? result.doorEvents.map((event, index) => <article key={`${event.trackId}-${index}`}><span className={`event-direction event-direction--${event.direction}`}>{event.direction}</span><strong>ID {event.trackId}</strong><time>{formatDuration(event.timestampSeconds)}</time></article>) : <p>No confirmed door-line crossings were detected in this video.</p>}
            </div>
          )}
        </section>

        <section id="about" className="about-strip" aria-labelledby="about-title">
          <div><span className="eyebrow">Architecture checkpoint</span><h2 id="about-title">Fixed-camera passenger vision, separated by responsibility.</h2></div>
          <p>React previews onboard video and will render passenger boxes, tracks, and the rear-camera door line. ASP.NET Core owns RF-DETR inference, tracking, door events, and occupancy analytics.</p>
          <div className="architecture-flow" aria-label="Application architecture">
            <span>React overlay</span><ChevronRight size={16} /><span>ASP.NET Core</span><ChevronRight size={16} /><span>RF-DETR ONNX</span>
          </div>
        </section>

        <section className="attribution-card" aria-labelledby="attribution-title">
          <h2 id="attribution-title">Media and training-data attribution</h2>
          <p>
            Bus interior video by <a href="https://pixabay.com/users/kimdaejeung-7703165/" target="_blank" rel="noreferrer">dae jeung kim</a> from Pixabay (video 142755). Bus stop video by <a href="https://pixabay.com/users/expatsiam-1490930/" target="_blank" rel="noreferrer">Expatsiam</a> from Pixabay (video 31967).
          </p>
          <p>
            Training data includes Roboflow Universe datasets <a href="https://universe.roboflow.com/deakin-07shj/passenger-mmpbi" target="_blank" rel="noreferrer">“Passenger” (Deakin)</a> and <a href="https://universe.roboflow.com/msu-4qpkq/passenger-utkuj" target="_blank" rel="noreferrer">“passenger” (MSU)</a>, both licensed under CC BY 4.0.
          </p>
        </section>
      </main>

      <footer className="footer">
        <span>Bus Passenger Vision POC</span>
        <span>Real ONNX inference · asynchronous video analysis · passenger tracking</span>
      </footer>

      {settingsOpen && (
        <div className="settings-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div><span className="eyebrow"><SlidersHorizontal size={15} />Analysis controls</span><h2 id="settings-title">Passenger vision settings</h2></div>
              <button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={19} /></button>
            </div>

            <label className="setting-field">
              <span><strong>Confidence threshold</strong><output>{confidenceThreshold.toFixed(2)}</output></span>
              <input type="range" min="0.1" max="0.9" step="0.05" value={confidenceThreshold} onChange={(event) => setConfidenceThreshold(Number(event.target.value))} />
              <small>RF-DETR v1 recommended default: 0.40.</small>
            </label>

            <label className="setting-field">
              <span><strong>Processing rate</strong></span>
              <select value={processingFps} onChange={(event) => setProcessingFps(Number(event.target.value))}>
                <option value={1}>1 FPS · recommended CPU demo</option>
                <option value={2}>2 FPS · smoother tracking</option>
                <option value={5}>5 FPS</option>
                <option value={10}>10 FPS</option>
                <option value={15}>15 FPS</option>
              </select>
              <small>1 FPS completes this 45-second sample in about 3–4 minutes on the development PC. Higher rates take proportionally longer.</small>
            </label>

            <label className="setting-field">
              <span><strong>Initial passengers</strong><output>{initialPassengers}</output></span>
              <input type="number" min="0" step="1" value={initialPassengers} onChange={(event) => setInitialPassengers(Math.max(0, Number.parseInt(event.target.value || '0', 10)))} />
              <small>Event occupancy starts here, then adds boarded passengers and subtracts exits.</small>
            </label>

            <div className="setting-field">
              <span><strong>Rear-camera door line</strong></span>
              <p className="coordinate-readout">
                {doorLine.length === 2 ? `${formatPoint(doorLine[0])} → ${formatPoint(doorLine[1])} · inside near ${formatPoint(insidePoint)}` : 'Not configured'}
              </p>
              <button className="button button--secondary" type="button" disabled={cameraView !== 'rear'} onClick={startDoorLineEdit}>
                <Crosshair size={17} />{doorLine.length === 2 ? 'Redraw line and inside side' : 'Configure on video'}
              </button>
              <small>{cameraView === 'rear' ? 'The line is used to classify boarded and exited tracks.' : 'Select the Rear (front door) camera view to configure door events.'}</small>
            </div>

            <div className="settings-note">
              <Info size={17} /><p>These settings are sent with each video job and control real server-side inference, tracking, and door-event analysis.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
