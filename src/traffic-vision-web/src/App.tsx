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
import { getHealth } from './services/api'
import type { BackendStatus } from './types/health'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv']

type CameraView = 'front' | 'rear'
type DoorPoint = { x: number; y: number }

const passengerMetrics = [
  { label: 'Sitting', icon: Armchair, tone: 'magenta' },
  { label: 'Standing', icon: PersonStanding, tone: 'purple' },
  { label: 'Boarded', icon: LogIn, tone: 'green' },
  { label: 'Exited', icon: LogOut, tone: 'orange' },
  { label: 'Current occupancy', icon: Users, tone: 'blue' },
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
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)
  const [cameraView, setCameraView] = useState<CameraView>('front')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.4)
  const [processingFps, setProcessingFps] = useState(15)
  const [doorLine, setDoorLine] = useState<DoorPoint[]>([])
  const [editingDoorLine, setEditingDoorLine] = useState(false)

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
    if (!settingsOpen) setEditingDoorLine(false)
  }, [settingsOpen])

  const acceptFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setUploadError('Choose an MP4, MOV, AVI, or MKV video.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('The selected file is larger than the 2 GB POC limit.')
      return
    }

    setSelectedFile(file)
    setVideoDuration(null)
    setUploadError(null)
    setAnalysisMessage(null)
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
  }

  const selectCamera = (view: CameraView) => {
    setCameraView(view)
    setEditingDoorLine(false)
    setAnalysisMessage(null)
  }

  const requestAnalysis = () => {
    if (!selectedFile) return
    setAnalysisMessage(
      backendStatus === 'connected'
        ? 'The RF-DETR model is not installed yet. No passenger analysis has been run.'
        : 'Start the backend before passenger analysis can be connected. No analysis has been run.',
    )
  }

  const startDoorLineEdit = () => {
    if (cameraView !== 'rear') return
    setSettingsOpen(false)
    setDoorLine([])
    setEditingDoorLine(true)
  }

  const handleDoorLineClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!editingDoorLine || cameraView !== 'rear') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    }

    setDoorLine((current) => {
      if (current.length === 1) {
        setEditingDoorLine(false)
        return [current[0], point]
      }
      return [point]
    })
  }

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
            <p className="file-hint">MP4, MOV, AVI or MKV · up to 2 GB</p>
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
                <span className="file-copy"><strong>No video selected</strong><small>Your file stays in this browser for this scaffold.</small></span>
              </div>
            )}

            <button className="button button--run" type="button" disabled={!selectedFile} onClick={requestAnalysis}>
              <Play size={17} fill="currentColor" />Run passenger analysis
            </button>
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
            <div className={`video-stage${editingDoorLine ? ' video-stage--editing' : ''}`}>
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls={!editingDoorLine}
                  preload="metadata"
                  onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
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

              {cameraView === 'rear' && doorLine.length > 0 && (
                <svg className="door-line-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Configured door event line">
                  {doorLine.length === 2 && (
                    <line x1={doorLine[0].x * 100} y1={doorLine[0].y * 100} x2={doorLine[1].x * 100} y2={doorLine[1].y * 100} />
                  )}
                  {doorLine.map((point, index) => <circle key={index} cx={point.x * 100} cy={point.y * 100} r="1.1" />)}
                </svg>
              )}

              {editingDoorLine && (
                <div className="door-line-editor" onClick={handleDoorLineClick} role="button" tabIndex={0} aria-label="Choose two points for the door line">
                  <span><Crosshair size={18} />{doorLine.length === 0 ? 'Click the first door-line point' : 'Click the second door-line point'}</span>
                </div>
              )}
            </div>
            <div className="video-meta">
              <span><CheckCircle2 size={15} />Original footage</span>
              <span className="class-legend"><i className="legend-dot legend-dot--sitting" />Sitting</span>
              <span className="class-legend"><i className="legend-dot legend-dot--standing" />Standing</span>
              {cameraView === 'rear' && <span><Crosshair size={15} />{doorLine.length === 2 ? 'Door line configured' : 'Door line not configured'}</span>}
            </div>
          </section>

          <aside className="card summary-card">
            <div className="card-heading">
              <span className="heading-icon"><BarChart3 size={20} /></span>
              <div><span className="section-index">03</span><h2>Passenger summary</h2></div>
            </div>
            <div className="summary-state"><span className="pulse-dot" />Awaiting analysis</div>
            <ul className="class-list">
              {passengerMetrics.map(({ label, icon: Icon, tone }) => (
                <li key={label}>
                  <span className={`class-icon class-icon--${tone}`}><Icon size={20} /></span>
                  <span className="class-copy"><strong>{label}</strong><span className="metric-track"><span /></span></span>
                  <span className="class-value">—</span>
                </li>
              ))}
            </ul>
            <div className="summary-totals">
              <div><span><Database size={17} />Unique passengers (tracked)</span><strong>—</strong></div>
              <div><span><Clock size={17} />Video duration</span><strong>{formatDuration(videoDuration)}</strong></div>
              <div><span><Gauge size={17} />Processed FPS</span><strong>—</strong></div>
            </div>
          </aside>
        </section>

        <section className="card review-panel" aria-labelledby="review-title">
          <div className="review-tabs" role="tablist" aria-label="Passenger analysis views">
            <button className="review-tab review-tab--active" type="button" role="tab" aria-selected="true"><Film size={18} />Timeline</button>
            <button className="review-tab" type="button" role="tab" aria-selected="false" disabled><List size={18} />Detections</button>
            <button className="review-tab" type="button" role="tab" aria-selected="false" disabled><Waypoints size={18} />Tracking</button>
            <button className="review-tab" type="button" role="tab" aria-selected="false" disabled><LogIn size={18} />Door events</button>
          </div>
          <div className="timeline-empty" role="tabpanel">
            <div className="timeline-rail" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
            </div>
            <div className="timeline-copy">
              <span className="timeline-icon"><CircleGauge size={22} /></span>
              <div>
                <h2 id="review-title">Timeline ready for passenger metadata</h2>
                <p>{cameraView === 'rear' ? 'Boarding and exit events will appear here with timestamps and thumbnails.' : 'Frame-level sitting, standing, and tracking results will appear here.'}</p>
              </div>
            </div>
          </div>
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
          <p>Training data includes Roboflow Universe datasets “Passenger” (Deakin) and “passenger” (MSU), both licensed under CC BY 4.0.</p>
        </section>
      </main>

      <footer className="footer">
        <span>Bus Passenger Vision POC</span>
        <span>No AI results generated · model integration pending</span>
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
                <option value={5}>5 FPS</option>
                <option value={10}>10 FPS</option>
                <option value={15}>15 FPS</option>
              </select>
              <small>15 FPS is the default upper limit for the POC.</small>
            </label>

            <div className="setting-field">
              <span><strong>Rear-camera door line</strong></span>
              <p className="coordinate-readout">
                {doorLine.length === 2 ? `${formatPoint(doorLine[0])} → ${formatPoint(doorLine[1])}` : 'Not configured'}
              </p>
              <button className="button button--secondary" type="button" disabled={cameraView !== 'rear'} onClick={startDoorLineEdit}>
                <Crosshair size={17} />{doorLine.length === 2 ? 'Redraw on video' : 'Choose two points on video'}
              </button>
              <small>{cameraView === 'rear' ? 'The line is used to classify boarded and exited tracks.' : 'Select the Rear (front door) camera view to configure door events.'}</small>
            </div>

            <div className="settings-note">
              <Info size={17} /><p>Settings are local UI controls until the upload and analysis endpoints are implemented.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
