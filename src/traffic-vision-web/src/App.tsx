import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock,
  Database,
  Film,
  Gauge,
  Home,
  Info,
  List,
  Loader2,
  PersonStanding,
  Play,
  Route,
  ScanLine,
  Settings,
  Truck,
  Upload,
  Video,
  Waypoints,
  X,
} from 'lucide-react'
import { BackendStatusPill } from './components/BackendStatusPill'
import { getHealth } from './services/api'
import type { BackendStatus } from './types/health'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv']

const detectionClasses = [
  { label: 'Cars', icon: Car, tone: 'blue' },
  { label: 'Trucks', icon: Truck, tone: 'violet' },
  { label: 'Buses', icon: Bus, tone: 'amber' },
  { label: 'Motorcycles', icon: Bike, tone: 'green' },
  { label: 'Bicycles', icon: Bike, tone: 'orange' },
  { label: 'People', icon: PersonStanding, tone: 'red' },
] as const

const workflow = [
  { step: '1', label: 'Upload', note: 'Select a video file', icon: Upload },
  { step: '2', label: 'Analyze', note: 'Run AI detection', icon: Settings },
  { step: '3', label: 'View results', note: 'Review traffic insights', icon: BarChart3 },
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

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)

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

  const requestAnalysis = () => {
    if (!selectedFile) return
    setAnalysisMessage(
      backendStatus === 'connected'
        ? 'Upload and inference endpoints arrive in the next milestone. No analysis has been run.'
        : 'Start the backend before analysis can be connected. No analysis has been run.',
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Traffic Vision home">
          <span className="brand-mark"><Car size={26} aria-hidden="true" /></span>
          <span className="brand-name">Traffic Vision</span>
          <span className="brand-subtitle">POC · AI traffic analysis</span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a className="nav-link nav-link--active" href="#main"><Home size={18} />Home</a>
          <a className="nav-link" href="#about"><Info size={18} />About</a>
          <span className="nav-link nav-link--muted" aria-disabled="true"><Settings size={18} />Settings</span>
        </nav>
        <BackendStatusPill status={backendStatus} onRetry={() => void checkBackend()} />
      </header>

      <main id="main" className="page-frame">
        <section className="intro-panel" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow"><ScanLine size={16} />Road-scene workspace</p>
            <h1 id="page-title">Upload a road video</h1>
            <p>Prepare in-vehicle footage for vehicle and pedestrian detection in one focused workspace.</p>
          </div>
          <ol className="workflow" aria-label="Analysis workflow">
            {workflow.map(({ step, label, note, icon: Icon }, index) => (
              <li key={step} className={index === 0 ? 'workflow-step workflow-step--active' : 'workflow-step'}>
                <span className="workflow-icon"><Icon size={22} /></span>
                <span className="workflow-copy"><strong>{step}. {label}</strong><small>{note}</small></span>
                {index < workflow.length - 1 && <ChevronRight className="workflow-arrow" size={20} />}
              </li>
            ))}
          </ol>
        </section>

        <section className="workspace" aria-label="Traffic analysis workspace">
          <aside className="card upload-card">
            <div className="card-heading">
              <span className="heading-icon"><Film size={20} /></span>
              <div><span className="section-index">01</span><h2>Upload video</h2></div>
            </div>

            <div
              className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload size={32} strokeWidth={1.8} aria-hidden="true" />
              <strong>Drop road footage here</strong>
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
                  <small>{formatBytes(selectedFile.size)} · {formatDuration(videoDuration)}</small>
                </span>
                <button className="icon-button" type="button" onClick={clearFile} aria-label="Remove selected file"><X size={18} /></button>
              </div>
            ) : (
              <div className="selected-file selected-file--empty">
                <span className="file-icon"><Film size={20} /></span>
                <span className="file-copy"><strong>No video selected</strong><small>Your file stays in this browser for this scaffold.</small></span>
              </div>
            )}

            <button
              className="button button--run"
              type="button"
              disabled={!selectedFile}
              onClick={requestAnalysis}
            >
              <Play size={17} fill="currentColor" />
              Run analysis
            </button>
            {analysisMessage && <p className="inline-alert" role="status">{analysisMessage}</p>}
          </aside>

          <section className="card video-card" aria-labelledby="video-title">
            <div className="card-heading card-heading--spread">
              <div className="heading-group">
                <span className="heading-icon"><Video size={20} /></span>
                <div><span className="section-index">02</span><h2 id="video-title">Video preview</h2></div>
              </div>
              <span className="stage-badge">Overlay ready</span>
            </div>
            <div className="video-stage">
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  preload="metadata"
                  onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="video-empty">
                  <span className="scan-frame scan-frame--one" />
                  <span className="scan-frame scan-frame--two" />
                  <span className="video-empty-icon"><Video size={34} /></span>
                  <strong>Your video preview will appear here</strong>
                  <p>Select road footage to review it before analysis.</p>
                  <button className="text-action" type="button" onClick={() => inputRef.current?.click()}>Choose a video</button>
                </div>
              )}
            </div>
            <div className="video-meta">
              <span><CheckCircle2 size={15} />Original footage</span>
              <span><ScanLine size={15} />SVG/canvas overlay planned</span>
            </div>
          </section>

          <aside className="card summary-card">
            <div className="card-heading">
              <span className="heading-icon"><BarChart3 size={20} /></span>
              <div><span className="section-index">03</span><h2>Detection summary</h2></div>
            </div>
            <div className="summary-state"><span className="pulse-dot" />Awaiting analysis</div>
            <ul className="class-list">
              {detectionClasses.map(({ label, icon: Icon, tone }) => (
                <li key={label}>
                  <span className={`class-icon class-icon--${tone}`}><Icon size={20} /></span>
                  <span className="class-copy"><strong>{label}</strong><span className="metric-track"><span /></span></span>
                  <span className="class-value">—</span>
                </li>
              ))}
            </ul>
            <div className="summary-totals">
              <div><span><Database size={17} />Total objects</span><strong>—</strong></div>
              <div><span><Clock size={17} />Video duration</span><strong>{formatDuration(videoDuration)}</strong></div>
              <div><span><Gauge size={17} />Processed FPS</span><strong>—</strong></div>
            </div>
          </aside>
        </section>

        <section className="card review-panel" aria-labelledby="review-title">
          <div className="review-tabs" role="tablist" aria-label="Analysis views">
            <button className="review-tab review-tab--active" type="button" role="tab" aria-selected="true"><Film size={18} />Timeline</button>
            <button className="review-tab" type="button" role="tab" aria-selected="false" disabled><List size={18} />Detections</button>
            <button className="review-tab" type="button" role="tab" aria-selected="false" disabled><Waypoints size={18} />Tracking</button>
            <button className="review-tab" type="button" role="tab" aria-selected="false" disabled><Route size={18} />Direction</button>
          </div>
          <div className="timeline-empty" role="tabpanel">
            <div className="timeline-rail" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => <span key={index} />)}
            </div>
            <div className="timeline-copy">
              <span className="timeline-icon"><CircleGauge size={22} /></span>
              <div><h2 id="review-title">Timeline ready for detection metadata</h2><p>Frame-level results will populate here after the inference milestone.</p></div>
            </div>
          </div>
        </section>

        <section id="about" className="about-strip" aria-labelledby="about-title">
          <div><span className="eyebrow">Architecture checkpoint</span><h2 id="about-title">A clean boundary between interface and inference.</h2></div>
          <p>React previews the source video and will render metadata overlays. ASP.NET Core owns upload orchestration and future ONNX Runtime inference.</p>
          <div className="architecture-flow" aria-label="Application architecture">
            <span>React</span><ChevronRight size={16} /><span>ASP.NET Core</span><ChevronRight size={16} /><span>ONNX Runtime</span>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Traffic Vision POC</span>
        <span>Scaffold milestone · no AI results generated</span>
      </footer>
    </div>
  )
}

export default App
