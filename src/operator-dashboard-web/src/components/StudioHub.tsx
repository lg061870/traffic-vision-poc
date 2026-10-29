import React, { useEffect, useState } from 'react'
import './StudioHub.css'
import { UserMembershipView } from './UserMembershipView'
import {
  defaultDaySchedules,
  defaultOperationalCostConfig,
  simulationPresets,
  type DayScheduleConfig,
  type DayScheduleType,
  type OperationalCostConfig,
} from '../config/operatorSettings'
import { AyudaView } from './studio/AyudaView'
import { CostosView } from './studio/CostosView'
import { DemandaView } from './studio/DemandaView'
import { InicioView } from './studio/InicioView'
import { ResultadosView } from './studio/ResultadosView'
import { RutasView } from './studio/RutasView'
import { costPerBusHour, type StudioDay, type StudioTab } from './studio/studioModel'
import { DemandaParamsView } from './studio/DemandaParamsView'
import { DespachoParamsView } from './studio/DespachoParamsView'
import { defaultParams, executeRun, initialRuns, recordFromRun, runFromRecord, runOutput, type SimRun } from './studio/mockRun'
import {
  parseSimbook,
  sameParams,
  serializeSimbook,
  simbookKey,
  SimbookError,
  type OpenedBook,
  type SimbookDraft,
  type SimbookMeta,
  type Provenance,
  type SimbookParams,
  type SimsheetRecord,
} from './studio/simbook'
import { autoEntryFor, deriveProvenance, fieldLabel, readField, todayIso } from './studio/wizard/wizardModel'
import { SimbookInstructions } from './studio/SimbookInstructions'
import { NewSimbookWizard, type NewSimbookResult } from './studio/wizard/NewSimbookWizard'
import { RestoreParamsDialog, type RestoreChoice } from './studio/wizard/RestoreParamsDialog'
import {
  clearCompanyParams,
  loadCompanyParams,
  saveCompanyParams,
  SHARED_COMPUTER_WARNING,
  type SavedCompanyParams,
} from './studio/companyParams'
import { canSaveInPlace, openSimbookFile, saveSimbookFile, type SimbookHandle } from './studio/simbookFile'
import { StudioRibbon, type CostPreset, type ResultReport, type ScenarioPreset } from './studio/StudioRibbon'
import { AsignacionView } from './studio/results/AsignacionView'
import { CompararView } from './studio/results/CompararView'
import { CumplimientoView } from './studio/results/CumplimientoView'
import { EspacioTiempoView } from './studio/results/EspacioTiempoView'
import { EsperaView } from './studio/results/EsperaView'
import { HorarioView } from './studio/results/HorarioView'
import { MapaReplayView } from './studio/results/MapaReplayView'
import { SimsheetParamsView } from './studio/results/SimsheetParamsView'
import { PerfilCargaView } from './studio/results/PerfilCargaView'
import { TurnosView } from './studio/results/TurnosView'
import { BrochureView } from './BrochureView'
import './studio/studioViews.css'
import './studio/studioScreens.css'

interface StudioHubProps {
  onOpenSimulation: (scenarioId: string) => void
}

const ROUTE_LIST = [
  'Ruta 142',
  'Ramal Cascajal',
  'Ramal Las Nubes',
  'Ramal Dulce Nombre',
  'Ramal Patio de Agua',
  'Ramal San Rafael',
  'Ramal Purralito',
  'Ramal San Pedro',
  'Ramal El Rodeo',
  'Ramal San Francisco',
  'Ramal La Colmena',
]

const HOURLY_DATA = [
  { hour: '5h', pax: 39, isProfit: true },
  { hour: '6h', pax: 35, isProfit: true },
  { hour: '7h', pax: 26, isProfit: false },
  { hour: '8h', pax: 24, isProfit: false },
  { hour: '9h', pax: 13, isProfit: false },
  { hour: '10h', pax: 8, isProfit: false },
  { hour: '11h', pax: 6, isProfit: false },
  { hour: '12h', pax: 8, isProfit: false },
  { hour: '13h', pax: 9, isProfit: false },
  { hour: '14h', pax: 7, isProfit: false },
  { hour: '15h', pax: 19, isProfit: false },
  { hour: '16h', pax: 23, isProfit: false },
  { hour: '17h', pax: 36, isProfit: true },
  { hour: '18h', pax: 23, isProfit: false },
  { hour: '19h', pax: 6, isProfit: false },
  { hour: '20h', pax: 11, isProfit: false },
  { hour: '21h', pax: 8, isProfit: false },
  { hour: '22h', pax: 2, isProfit: false },
  { hour: '23h', pax: 1, isProfit: false },
]

const BREAK_EVEN = 34
const BAR_SCALE_MAX = 40

const ROUTE_CODES: Record<string, string> = {
  'Ruta 142': '142',
  'Ramal Cascajal': '142-2',
  'Ramal Las Nubes': '145-06',
  'Ramal Dulce Nombre': '140-03',
  'Ramal Patio de Agua': '142-04',
}

// Heatmap: one column per service hour, 4h..23h.
const HEAT_HOURS = Array.from({ length: 20 }, (_, i) => i + 4)

// Typical load relative to break-even for each hour (1 = pays its cost).
const HOUR_LOAD: Record<number, number> = {
  4: 0.6, 5: 1.15, 6: 1.2, 7: 1.0, 8: 0.9, 9: 0.65, 10: 0.5, 11: 0.45, 12: 0.55, 13: 0.5,
  14: 0.5, 15: 0.75, 16: 0.98, 17: 1.18, 18: 1.02, 19: 0.65, 20: 0.55, 21: 0.45, 22: 0.35, 23: 0.3,
}
const ROUTE_FACTOR = [1.05, 0.95, 0.9, 1.08, 0.88, 1.0, 0.85, 0.92, 1.0, 0.96, 0.86]
// Small branches stop running after this hour.
const ROUTE_LAST_HOUR = [23, 23, 22, 23, 22, 22, 21, 21, 22, 21, 20]

function heatCellClass(routeIdx: number, hour: number): string {
  if (hour > ROUTE_LAST_HOUR[routeIdx]) return 'no-service'
  const jitter = 1 + 0.12 * Math.sin(hour * 1.7 + routeIdx * 2.3)
  const ratio = HOUR_LOAD[hour] * ROUTE_FACTOR[routeIdx] * jitter
  if (ratio >= 1.1) return 'deep-green'
  if (ratio >= 0.95) return 'light-green'
  if (ratio >= 0.8) return 'light-red'
  return 'deep-red'
}

const LOCAL_FILES = ['Baseline_2026.xlsx', 'Flota_Eléctrica_142.xlsx', 'Ajuste_Tarifario_RE0115.xlsx', 'Sim_HoraPico_Matutina.xlsx']

const CLOUD_FILES = [
  { name: 'Compartidos_2026.xlsx', syncing: true, onlineOnly: false },
  { name: 'Plan_Consolidado_R142.xlsx', syncing: false, onlineOnly: false },
  { name: 'Plan_Consolidado_R142_v2.xlsx', syncing: false, onlineOnly: true },
]

const PROFIT_SHARE = [32, 26, 22, 35, 28, 24, 26, 20, 22, 28, 25]

const GAUGE_VALUE = 18.7

// Gauge geometry: semicircle from 0 (left) to 90 (right).
const GAUGE_MAX = 90
const GAUGE_CX = 130
const GAUGE_CY = 118
const GAUGE_R = 96

function gaugePoint(value: number, r = GAUGE_R): [number, number] {
  const angle = Math.PI * (1 - value / GAUGE_MAX)
  return [GAUGE_CX + r * Math.cos(angle), GAUGE_CY - r * Math.sin(angle)]
}

function gaugeArc(from: number, to: number): string {
  const [x1, y1] = gaugePoint(from)
  const [x2, y2] = gaugePoint(to)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${GAUGE_R} ${GAUGE_R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function FunnelIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
    </svg>
  )
}

function DriveIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 24 21" aria-label="Google Drive">
      <path d="M8 0h8l8 14h-8z" fill="#fbbc04" />
      <path d="M8 0 0 14l4 7 8-14z" fill="#0f9d58" />
      <path d="M4 21h16l4-7H8z" fill="#4285f4" />
    </svg>
  )
}

function OneDriveIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 30 20" aria-label="OneDrive">
      <path d="M7 19a6 6 0 0 1-.6-12A8 8 0 0 1 21 6a6.5 6.5 0 0 1 2 13z" fill="#0364b8" />
    </svg>
  )
}

function DropboxIcon() {
  return (
    <svg width="15" height="14" viewBox="0 0 24 22" aria-label="Dropbox">
      <path d="M6 0 0 4l6 4 6-4zm12 0-6 4 6 4 6-4zM0 12l6 4 6-4-6-4zm18-4-6 4 6 4 6-4zM6 17.5l6 4 6-4-6-4z" fill="#0061ff" />
    </svg>
  )
}

function ExcelIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 20 22" aria-hidden="true">
      <rect x="2" y="0" width="18" height="22" rx="2" fill="#e8f5ec" stroke="#1d6f42" strokeWidth="1.2" />
      <rect x="0" y="5" width="11" height="12" rx="1.5" fill="#1d6f42" />
      <path d="M3 8l5 6M8 8l-5 6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 24 20" aria-hidden="true">
      <path d="M0 3a2 2 0 0 1 2-2h7l2 3h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z" fill="#f5b83d" />
    </svg>
  )
}

function CloudIcon({ sync = false }: { sync?: boolean }) {
  return (
    <svg width="14" height="12" viewBox="0 0 24 20" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17a5 5 0 0 1-.5-10A7 7 0 0 1 19 7.5a4.5 4.5 0 0 1-1 9.5z" />
      {sync && <path d="M12 15V9m-2.5 2.5L12 9l2.5 2.5" />}
    </svg>
  )
}

/** BusLab mark: a bus front whose windshield shows a simulation trace. */
function BusLabLogo() {
  return (
    <svg className="fs-brand-logo" width="26" height="26" viewBox="0 0 26 26" aria-label="BusLab">
      <defs>
        <linearGradient id="fs-buslab-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
      </defs>
      <rect width="26" height="26" rx="6" fill="url(#fs-buslab-bg)" />
      <rect x="6" y="5" width="14" height="14" rx="3" fill="#ffffff" />
      <rect x="8" y="7.2" width="10" height="5.6" rx="1.2" fill="#0c4a6e" />
      <polyline points="8.8,11.6 10.8,9.4 12.6,10.8 14.6,8.2 17.2,9.6" fill="none" stroke="#4ade80" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.3" cy="15.8" r="1.1" fill="#f59e0b" />
      <circle cx="16.7" cy="15.8" r="1.1" fill="#f59e0b" />
      <rect x="7.5" y="19" width="3" height="2.5" rx="0.8" fill="#ffffff" />
      <rect x="15.5" y="19" width="3" height="2.5" rx="0.8" fill="#ffffff" />
    </svg>
  )
}

// Signed-in account (mock until there is a sign-in); matches the membership screen.
const ACCOUNT = { name: 'Guillermo Jiménez', role: 'Propietario · Gerencia', initials: 'GJ' }

const RIBBON_TABS: { id: StudioTab; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'rutas', label: 'Rutas y Ramales' },
  { id: 'despacho', label: 'Despacho Horario' },
  { id: 'demanda', label: 'Nivel de Demanda' },
  { id: 'costos', label: 'Costos' },
  { id: 'ayuda', label: 'Ayuda' },
]

// Ejecutar now produces a run inside the Studio; the old simulator screen is no longer opened from here.
export function StudioHub(_props: StudioHubProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('resultados')
  const [selectedScenarioFile, setSelectedScenarioFile] = useState<string>('Flota_Eléctrica_142.xlsx')
  // The open Simbook: its name, where it lives (when the browser can save in place) and what was last saved.
  const [fileName, setFileName] = useState('Ejemplo_Coronado.simbook')
  const [fileHandle, setFileHandle] = useState<SimbookHandle | undefined>()
  const [savedKey, setSavedKey] = useState(() => simbookKey(null, null, initialRuns.map(recordFromRun)))
  const [meta, setMeta] = useState<SimbookMeta | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  // "Mis parámetros guardados", kept only in this browser, and the Simbook being restored from.
  const [savedParams, setSavedParams] = useState<SavedCompanyParams | null>(() => loadCompanyParams(defaultParams))
  const [restoring, setRestoring] = useState<{ fileName: string; book: OpenedBook } | null>(null)
  // Paths of values the open Simbook did not have, filled from the reference values until the user
  // accepts them or enters their own.
  const [missingPaths, setMissingPaths] = useState<string[]>([])
  // The sources recorded for `baseParams`; values changed since then are the operator's (deriveProvenance).
  const [baseParams, setBaseParams] = useState<SimbookParams>(initialRuns[initialRuns.length - 1].params)
  const [baseProvenance, setBaseProvenance] = useState<Provenance>(initialRuns[initialRuns.length - 1].provenance)
  const [activeScenarioDay, setActiveScenarioDay] = useState<StudioDay>('semana')
  const [showMembershipView, setShowMembershipView] = useState<boolean>(false)
  const [showBrochureView, setShowBrochureView] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.search.includes('view=brochure')
  })
  const [filterSearch, setFilterSearch] = useState<string>('')
  const [costConfig, setCostConfig] = useState<OperationalCostConfig>(initialRuns[initialRuns.length - 1].params.costConfig)
  const [schedules, setSchedules] = useState<Record<DayScheduleType, DayScheduleConfig>>(initialRuns[initialRuns.length - 1].params.schedules)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Full ribbon by default so first-time users see the labels; compact (icons only) is opt-in.
  const [ribbonCompact, setRibbonCompact] = useState(false)
  const [fleet, setFleet] = useState(initialRuns[initialRuns.length - 1].params.fleet)
  const [demandScale, setDemandScale] = useState(initialRuns[initialRuns.length - 1].params.demandScale)
  const [rutasView, setRutasView] = useState<'diagrama' | 'tabla'>('diagrama')
  const [demandaView, setDemandaView] = useState<'parametros' | 'analisis'>('parametros')
  const [report, setReport] = useState<ResultReport>('mapa')
  const [runs, setRuns] = useState<SimRun[]>(initialRuns)
  const [currentRunId, setCurrentRunId] = useState(initialRuns[initialRuns.length - 1].id)
  const [toast, setToast] = useState<string | null>(null)
  const [routeChips, setRouteChips] = useState<string[]>([
    'Ruta 142',
    'Ramal Cascajal',
    'Ramal Las Nubes',
    'Ramal Dulce Nombre',
    'Ramal Patio de Agua',
  ])

  // A new Simbook has no Simsheets until its first run.
  const currentRun: SimRun | undefined = runs.find((r) => r.id === currentRunId) ?? runs[runs.length - 1]
  const output = currentRun ? runOutput(currentRun) : null
  const params: SimbookParams = { day: activeScenarioDay, fleet, demandScale, costConfig, schedules }
  // The results are out of date when the parameters on screen are not the ones this Simsheet ran with.
  const stale = currentRun != null && !sameParams(currentRun.params, params)
  // Parameters not run yet are saved as the draft: all of them in a new Simbook, or edits since a Simsheet.
  const provenance = deriveProvenance(baseProvenance, baseParams, params, todayIso())
  const draft: SimbookDraft | null = !currentRun
    ? { basedOn: null, params, provenance }
    : stale
      ? { basedOn: currentRun.id, params, provenance }
      : null
  // A missing value stops counting once the operator enters one.
  const noCompany = { name: '', concession: '' }
  const missing = missingPaths.filter((path) => readField(params, noCompany, path) === readField(baseParams, noCompany, path))
  const dirty = simbookKey(meta, draft, runs.map(recordFromRun)) !== savedKey
  const hourCost = costPerBusHour(costConfig)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const changeDay = setActiveScenarioDay
  const changeFleet = setFleet
  const changeDemandScale = setDemandScale
  const changeCost = setCostConfig
  const changeSchedule = (schedule: DayScheduleConfig) => setSchedules((prev) => ({ ...prev, [schedule.id]: schedule }))

  const loadParams = (p: SimbookParams) => {
    setActiveScenarioDay(p.day)
    setFleet(p.fleet)
    setDemandScale(p.demandScale)
    setCostConfig(p.costConfig)
    setSchedules(p.schedules)
  }

  const loadSimbook = (
    name: string,
    handle: SimbookHandle | undefined,
    book: { meta: SimbookMeta | null; draft: SimbookDraft | null; simsheets: SimsheetRecord[] },
    missingValues: string[] = [],
    saved = true,
  ) => {
    const sheets = book.simsheets.map(runFromRecord)
    const last = sheets[sheets.length - 1]
    // The draft's parameters when there is one, otherwise those of the last Simsheet.
    const loaded = book.draft ?? last
    loadParams(loaded.params)
    setBaseParams(loaded.params)
    setBaseProvenance(loaded.provenance)
    setRuns(sheets)
    setCurrentRunId(book.draft?.basedOn ?? last?.id ?? 0)
    setFileName(name)
    setFileHandle(handle)
    // A book that was never saved counts as unsaved changes.
    setSavedKey(saved ? simbookKey(book.meta, book.draft, book.simsheets) : '')
    setMeta(book.meta)
    setMissingPaths(missingValues)
    setShowMembershipView(false)
    setActiveTab('resultados')
  }

  const discardChanges = () => !dirty || window.confirm(`${fileName} tiene cambios sin guardar. ¿Descartarlos?`)

  // Nuevo opens the wizard; the Simbook it creates is only an initial draft until its first run.
  const newSimbook = () => {
    if (!discardChanges()) return
    setWizardOpen(true)
  }

  const createSimbook = (r: NewSimbookResult) => {
    setWizardOpen(false)
    const bookMeta: SimbookMeta = { description: r.description, company: r.company, purpose: r.purpose, method: r.method, origins: r.origins }
    const newDraft = { basedOn: null, params: r.params, provenance: r.provenance }
    loadSimbook(`${r.name}.simbook`, undefined, { meta: bookMeta, draft: newDraft, simsheets: [] }, r.missing, false)
    const kept = r.saveAsDefaults && storeDefaults({ company: r.company, params: r.params, provenance: r.provenance, origin: `asistente (${r.name}.simbook)` })
    setToast(`${r.name}.simbook creado como borrador${kept ? ' · parámetros guardados en este navegador' : ''} · guárdelo con Guardar`)
  }

  const storeDefaults = (entry: Omit<SavedCompanyParams, 'schemaVersion' | 'updatedAt'>) => {
    const stored = saveCompanyParams(entry)
    if (!stored) setToast('Este navegador no permite guardar datos: sus parámetros no se guardaron.')
    else setSavedParams(stored)
    return stored !== null
  }

  // Explicit, never automatic: the parameters on screen become the defaults for new Simbooks.
  const saveDefaults = () => {
    const what = currentRun && !stale ? `${currentRun.label} de ${fileName}` : `borrador de ${fileName}`
    const question = `${savedParams ? '¿Reemplazar sus parámetros guardados' : '¿Guardar como sus parámetros predeterminados'} con los valores de ${what}?\n\n${SHARED_COMPUTER_WARNING}`
    if (!window.confirm(question)) return
    if (storeDefaults({ company: meta?.company ?? { name: '', concession: '' }, params, provenance, origin: what })) {
      setToast(`Parámetros guardados en este navegador (${what})`)
    }
  }

  const restoreDefaults = async () => {
    try {
      const opened = await openSimbookFile()
      if (!opened) return
      setRestoring({ fileName: opened.name, book: parseSimbook(opened.text, defaultParams) })
    } catch (error) {
      setToast(error instanceof SimbookError ? error.message : 'No se pudo abrir el archivo.')
    }
  }

  const finishRestore = (choice: RestoreChoice) => {
    if (!restoring) return
    const origin = `${choice.label} de ${restoring.fileName}`
    const company = restoring.book.meta?.company ?? { name: '', concession: '' }
    setRestoring(null)
    if (storeDefaults({ company, params: choice.params, provenance: choice.provenance, origin })) {
      setToast(`Parámetros restaurados desde ${origin}`)
    }
  }

  const clearDefaults = () => {
    if (!savedParams) {
      setToast('No hay parámetros guardados en este navegador.')
      return
    }
    if (!window.confirm('¿Borrar sus parámetros guardados de este navegador? Sus Simbooks no cambian.')) return
    clearCompanyParams()
    setSavedParams(null)
    setToast('Parámetros guardados borrados de este navegador')
  }

  // A draft from a Simsheet: its parameters come back on screen, ready to edit; the Simsheet is untouched.
  const editInDraft = (run: SimRun) => {
    const unrun = !runs.some((r) => sameParams(r.params, params))
    if (unrun && !window.confirm(`Ya hay un borrador con cambios sin ejecutar. ¿Reemplazarlo con los parámetros de ${run.label}?`)) return
    loadParams(run.params)
    setBaseParams(run.params)
    setBaseProvenance(run.provenance)
    setMissingPaths([])
    setCurrentRunId(run.id)
    setActiveTab('despacho')
    setToast(`Borrador basado en ${run.label}: cambie los parámetros y ejecute para crear la Simsheet ${Math.max(...runs.map((r) => r.id)) + 1}`)
  }

  const openSimbook = async () => {
    if (!discardChanges()) return
    try {
      const opened = await openSimbookFile()
      if (!opened) return
      const book = parseSimbook(opened.text, defaultParams)
      // Only the values on screen (the draft's, or the last Simsheet's) can still be completed;
      // earlier Simsheets are frozen, so their gaps are only reported.
      const onScreen = book.draft ? 'Borrador' : book.simsheets[book.simsheets.length - 1].label
      const current = book.missing.filter((m) => m.where === onScreen).map((m) => m.path)
      const earlier = book.missing.length - current.length
      loadSimbook(opened.name, opened.handle, book, current)
      const count = book.simsheets.length
      setToast(
        `${opened.name} abierto · ${count === 0 ? 'sin Simsheets' : `${count} Simsheet${count === 1 ? '' : 's'}`}` +
          (earlier > 0 ? ` · ${earlier} valores faltaban en Simsheets anteriores` : ''),
      )
    } catch (error) {
      setToast(error instanceof SimbookError ? error.message : 'No se pudo abrir el archivo.')
    }
  }

  const saveSimbook = async (saveAs: boolean) => {
    const sheets = runs.map(recordFromRun)
    try {
      const saved = await saveSimbookFile(serializeSimbook(meta, draft, sheets), fileName, saveAs ? undefined : fileHandle)
      if (!saved) return
      setFileName(saved.name)
      setFileHandle(saved.handle)
      setSavedKey(simbookKey(meta, draft, sheets))
      setToast(saved.handle ? `Guardado en ${saved.name}` : `${saved.name} descargado (este navegador no guarda sobre el mismo archivo)`)
    } catch {
      setToast('No se pudo guardar el Simbook.')
    }
  }

  // Ctrl+S saves, Ctrl+Shift+S saves as, Ctrl+O opens; closing the tab with unsaved changes asks first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        void saveSimbook(e.shiftKey)
      } else if (key === 'o') {
        e.preventDefault()
        void openSimbook()
      }
    }
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('beforeunload', onUnload)
    }
  })

  const applyCostPreset = (preset: CostPreset) => {
    const base = { ...costConfig, mode: 'aresep' as const }
    if (preset === 'oficial') changeCost({ ...defaultOperationalCostConfig, mode: 'aresep' })
    if (preset === 'diesel900') changeCost({ ...base, dieselPricePerLiter: 900 })
    if (preset === 'flotaAntigua') changeCost({ ...base, maintenanceCostPerKm: 85, tiresCostPerHour: 450 })
    if (preset === 'electrico') changeCost({ ...base, dieselPricePerLiter: 320, maintenanceCostPerKm: 30 })
  }

  const applyScenarioPreset = (preset: ScenarioPreset) => {
    const params = simulationPresets[preset].parameters
    setFleet(params.totalFleetSize)
    setDemandScale(preset === 'highDemand' ? 1 : preset === 'pilot10' ? 0.25 : 0.47)
    setSchedules((prev) => ({
      ...prev,
      weekday: { ...prev.weekday, valleyFleetShare: params.valleyActiveShare, nightFleetShare: params.nightActiveShare },
    }))
    setToast(`Escenario aplicado: ${simulationPresets[preset].name}`)
  }

  const runSimulation = () => {
    if (missing.length > 0) {
      setActiveTab('resultados')
      setToast('Faltan valores en este Simbook: revíselos antes de ejecutar.')
      return
    }
    const id = Math.max(0, ...runs.map((r) => r.id)) + 1
    const run = executeRun(id, params, provenance, ACCOUNT.name)
    setRuns((prev) => [...prev, run])
    setBaseParams(params)
    setBaseProvenance(provenance)
    setCurrentRunId(id)
    setActiveTab('resultados')
    setShowMembershipView(false)
    setToast(`${run.label} lista · ${runOutput(run).totals.trips.toLocaleString('es-CR')} viajes simulados`)
  }

  const resetAll = () => {
    setCostConfig(defaultOperationalCostConfig)
    setSchedules(defaultDaySchedules)
    setFleet(39)
    setDemandScale(1)
    setActiveScenarioDay('semana')
    setToast('Parámetros restablecidos a los valores oficiales')
  }

  const openTab = (tab: StudioTab) => {
    setActiveTab(tab)
    setShowMembershipView(false)
  }

  // Opening a simulation sheet lands on its results.
  const openScenarioFile = (file: string) => {
    setSelectedScenarioFile(file)
    openTab('resultados')
  }

  const handleRemoveChip = (chipToRemove: string) => {
    setRouteChips((prev) => prev.filter((c) => c !== chipToRemove))
  }

  const handleAddChip = () => {
    const nextRoute = ROUTE_LIST.find((r) => !routeChips.includes(r))
    if (nextRoute) {
      setRouteChips((prev) => [...prev, nextRoute])
    }
  }

  // Accepting marks each missing value with the source of its reference value (official or estimated).
  const acceptReferenceValues = () => {
    setBaseProvenance((prev) => ({
      ...prev,
      ...Object.fromEntries(missing.map((path) => [path, autoEntryFor(path) ?? { source: 'estimado' as const }])),
    }))
    setMissingPaths([])
  }

  // Values the open Simbook did not have; shown above the results until the user accepts them.
  const missingBanner = missing.length > 0 && (
    <div className="sv-stale sv-missing">
      <div>
        ⚠ Este Simbook no traía {missing.length === 1 ? 'un valor' : `${missing.length} valores`}. Se muestran los valores
        de referencia públicos (ARESEP, CTP) en su lugar. Acéptelos para poder ejecutar; después puede cambiar cualquiera.
        <ul>
          {missing.slice(0, 6).map((path) => (
            <li key={path}>{fieldLabel(path)}</li>
          ))}
          {missing.length > 6 && <li>y {missing.length - 6} más</li>}
        </ul>
      </div>
      <button type="button" className="sv-btn primary" onClick={acceptReferenceValues}>
        Usar valores de referencia
      </button>
    </div>
  )

  if (showBrochureView) {
    return <BrochureView onBackToStudio={() => setShowBrochureView(false)} />
  }

  return (
    <div className="fs-root">
      {/* --------------------------------------------------------------------
          1. TOP WINDOW BAR
          -------------------------------------------------------------------- */}
      <header className="fs-topbar">
        <div className="fs-topbar-left">
          <button
            type="button"
            className="fs-hamburger"
            title={sidebarOpen ? 'Ocultar escenarios' : 'Mostrar escenarios'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            ☰
          </button>
          <div className="fs-brand-box">
            <BusLabLogo />
            <div className="fs-brand-text">
              <div className="fs-brand-name">
                <span>
                  Bus<span className="fs-brand-accent">Lab</span>
                </span>
              </div>
              <span className="fs-brand-sub">Autobuses Unidos de Coronado S.A. - Concesión CTP N2</span>
            </div>
          </div>
        </div>

        {/* Clean Center Document Name (like mockup) */}
        <div className="fs-doc-center" title={dirty ? 'Cambios sin guardar' : canSaveInPlace ? 'Guardado' : undefined}>
          {fileName}
          {dirty && <span className="fs-doc-dirty"> •</span>}
        </div>

        <div className="fs-topbar-right">
          <button
            type="button"
            className="fs-top-btn"
            style={{ background: '#0284c7', borderColor: '#0369a1', fontWeight: 600 }}
            onClick={() => setShowBrochureView(true)}
            title="Ver folleto técnico ejecutivo de funcionalidades y resultados"
          >
            <span>📄</span>
            <span>Folleto Ejecutivo</span>
          </button>
          <button type="button" className="fs-top-btn" onClick={() => alert('Guía de Operación FleetSim v4.2')}>
            <span style={{ color: '#facc15' }}>●</span>
            <span>Guía</span>
          </button>
          <button type="button" className="fs-top-btn" onClick={() => alert('Modo Motor Estocástico BG Evolve Activo')}>
            <span style={{ color: '#10b981' }}>●</span>
            <span>BG Evolve</span>
          </button>

          {/* Signed-in account: opens the membership and storage settings. */}
          <button
            type="button"
            className="fs-account fs-account-top"
            onClick={() => setShowMembershipView(true)}
            title="Cuenta, asientos y repositorio"
          >
            <span className="fs-avatar">{ACCOUNT.initials}</span>
            <span className="fs-account-text">
              <span className="fs-account-name">{ACCOUNT.name}</span>
              <span className="fs-account-role">{ACCOUNT.role}</span>
            </span>
          </button>
        </div>
      </header>

      {/* Under the header: the scenarios sidebar (toggled by the hamburger) on the left; ribbon,
          content, sheet tabs and status bar share the column to its right. */}
      <div className="fs-frame">
      {/* LEFT PANEL: SCENARIOS & MODELOS */}
      <aside className={`fs-sidebar ${sidebarOpen ? '' : 'collapsed'}`} aria-hidden={!sidebarOpen}>
        <button
          type="button"
          className="fs-account fs-account-side"
          onClick={() => setShowMembershipView(true)}
          title="Cuenta, asientos y repositorio"
        >
          <span className="fs-avatar">{ACCOUNT.initials}</span>
          <span className="fs-account-text">
            <span className="fs-account-name">{ACCOUNT.name}</span>
            <span className="fs-account-role">{ACCOUNT.role}</span>
          </span>
        </button>

        <div className="fs-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderIcon />
            <span>Scenarios &amp; Modelos</span>
          </div>
          <span className="fs-sidebar-filter" title="Filtrar"><FunnelIcon /></span>
        </div>

        <div className="fs-sidebar-search">
          <input
            type="text"
            placeholder="Filtrar modelo..."
            className="fs-search-input"
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <span className="fs-search-icon">⌕</span>
        </div>

        <div className="fs-sidebar-actions">
          <button
            type="button"
            className="fs-side-action-btn"
            onClick={newSimbook}
            title="Simbook nuevo con los parámetros oficiales"
          >
            <span>+</span>
            <span>Nuevo</span>
          </button>
          <button
            type="button"
            className="fs-side-action-btn"
            onClick={() => void openSimbook()}
            title="Abrir un Simbook de esta computadora (Ctrl+O)"
          >
            <span>⤓</span>
            <span>Abrir</span>
          </button>
        </div>

        {/* Cloud drives the explorer can read from: opens the storage settings. */}
        <div className="fs-sidebar-cloud">
          <button
            type="button"
            className="fs-cloud-pill"
            onClick={() => setShowMembershipView(true)}
            title="Conectar y sincronizar con Google Drive, OneDrive o Dropbox"
          >
            <span className="fs-cloud-icons">
              <DriveIcon />
              <OneDriveIcon />
              <DropboxIcon />
            </span>
            <span className="fs-cloud-label">Vincular nube</span>
          </button>
        </div>

        {/* Tree */}
        <div className="fs-tree">
          <div className="fs-tree-group-title">
            <span className="fs-tree-caret">›</span>
            <FolderIcon />
            <span>Folders</span>
          </div>

          <div className="fs-tree-group-title">
            <span className="fs-tree-caret open">›</span>
            <FolderIcon />
            <span>Locales</span>
          </div>

          {LOCAL_FILES.filter((f) => f.toLowerCase().includes(filterSearch.toLowerCase())).map((file) => (
            <div
              key={file}
              className={`fs-tree-item ${selectedScenarioFile === file ? 'active' : ''}`}
              onClick={() => openScenarioFile(file)}
            >
              <ExcelIcon />
              <span>{file}</span>
            </div>
          ))}

          <div className="fs-tree-group-title" onClick={() => setShowMembershipView(true)}>
            <span className="fs-tree-caret open">›</span>
            <DriveIcon />
            <span>Google Drive (Mi unidad)</span>
          </div>

          {CLOUD_FILES.filter((f) => f.name.toLowerCase().includes(filterSearch.toLowerCase())).map((file) => (
            <div
              key={file.name}
              className={`fs-tree-item ${selectedScenarioFile === file.name ? 'active' : ''}`}
              onClick={() => openScenarioFile(file.name)}
            >
              {file.onlineOnly ? <CloudIcon /> : <ExcelIcon />}
              <span>{file.name}</span>
              {file.syncing && <span className="fs-tree-trailing"><CloudIcon sync /></span>}
            </div>
          ))}
        </div>

        {/* Bottom Scenario Metadata Inspector (matching mockup) */}
        <div className="fs-scenario-meta-box">
          <div style={{ fontWeight: 700, color: '#1e293b' }}>Scenario</div>
          <div>Active: {fileName}</div>
          <div>Metadata: -</div>
          <div>Escenario: 20115</div>
          <div>Conductores: -</div>
        </div>
      </aside>

      <div className="fs-shell">
      {/* --------------------------------------------------------------------
          2. RIBBON MENU TABS & ACTION GROUPS
          -------------------------------------------------------------------- */}
      <div className={`fs-ribbon ${ribbonCompact ? 'compact' : ''}`}>
        <div className="fs-ribbon-tabs">
          {RIBBON_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`fs-ribbon-tab ${activeTab === tab.id && !showMembershipView ? 'active' : ''}`}
              onClick={() => openTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            className="fs-ribbon-collapse-btn"
            title={ribbonCompact ? 'Mostrar etiquetas de la cinta' : 'Compactar la cinta (solo íconos)'}
            aria-pressed={ribbonCompact}
            onClick={() => setRibbonCompact((c) => !c)}
          >
            {ribbonCompact ? '▾' : '▴'}
          </button>
        </div>

        <StudioRibbon
          tab={activeTab}
          day={activeScenarioDay}
          onDayChange={changeDay}
          fleet={fleet}
          onFleetChange={changeFleet}
          demandScale={demandScale}
          onDemandScaleChange={changeDemandScale}
          rutasView={rutasView}
          onRutasView={setRutasView}
          demandaView={demandaView}
          onDemandaView={setDemandaView}
          costConfig={costConfig}
          onCostMode={(mode) => changeCost({ ...costConfig, mode })}
          onCostPreset={applyCostPreset}
          report={report}
          onReport={setReport}
          onScenarioPreset={applyScenarioPreset}
          onRun={runSimulation}
          onReset={resetAll}
          onOpenCloud={() => setShowMembershipView(true)}
          onNew={newSimbook}
          onOpen={() => void openSimbook()}
          onSave={() => void saveSimbook(false)}
          onSaveAs={() => void saveSimbook(true)}
          onSaveDefaults={saveDefaults}
          onRestoreDefaults={() => void restoreDefaults()}
          onClearDefaults={clearDefaults}
          notify={setToast}
        />
      </div>

      <div className="fs-body">

      <div className="fs-main">
      {/* --------------------------------------------------------------------
          3. FILTERS & ROUTE STRIP ("FILTROS Y RAMALES:")
          -------------------------------------------------------------------- */}
      {activeTab === 'resultados' && !showMembershipView && (
      <div className="fs-filter-strip">
        <div className="fs-filter-title">
          <FunnelIcon />
          <span>FILTROS Y RAMALES:</span>
        </div>

        <div className="fs-filter-control">
          <span className="fs-filter-label">Ramal / Ruta:</span>
          <select className="fs-filter-select" defaultValue="todas">
            <option value="todas">Toda la flota (Activas)</option>
            <option value="troncal">Ruta 142 Troncal</option>
            <option value="ramales">Solo Ramales</option>
          </select>
        </div>

        <div className="fs-filter-control">
          <span className="fs-filter-label">Franja Horaria:</span>
          <select className="fs-filter-select" defaultValue="dia">
            <option value="dia">Todo el día</option>
            <option value="pico">Hora Pico Mañana (06:00 - 08:30)</option>
            <option value="valle">Valle Central (09:00 - 16:00)</option>
            <option value="pico_tarde">Pico Tarde (16:30 - 19:00)</option>
          </select>
        </div>

        <div className="fs-filter-control">
          <span className="fs-filter-label">Unidades:</span>
          <select className="fs-filter-select" defaultValue="todas">
            <option value="todas">Todas (0 / 40 buses)</option>
            <option value="activas">Solo Activas (28 buses)</option>
            <option value="reserva">Reserva (12 buses)</option>
          </select>
        </div>

        {/* Selected Route Badges */}
        <div className="fs-route-chips">
          {routeChips.map((chip) => {
            const code = ROUTE_CODES[chip] ?? '142'
            return (
              <span key={chip} className="fs-route-chip">
                <span className="fs-route-chip-code">{code}</span>
                <span>{chip}</span>
                <span className="fs-route-chip-close" onClick={() => handleRemoveChip(chip)}>×</span>
              </span>
            )
          })}
        </div>

        <div className="fs-filter-actions">
          <button type="button" className="fs-btn-add-chip" onClick={handleAddChip}>
            + Agregar
          </button>
          <span className="fs-clear-filters" onClick={() => setRouteChips(['Ruta 142'])}>
            <FunnelIcon /> Limpiar Filtros
          </span>
        </div>
      </div>
      )}

      {/* --------------------------------------------------------------------
          4. TWO-COLUMN WORKSPACE
          -------------------------------------------------------------------- */}
      {showMembershipView ? (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <UserMembershipView onBackToDashboard={() => setShowMembershipView(false)} />
        </div>
      ) : (
        <div className="fs-workspace">

          {/* CENTER STAGE: 4-CARD ANALYTICS DASHBOARD */}
          {activeTab === 'inicio' && (
            <InicioView day={activeScenarioDay} costConfig={costConfig} scenarioFile={fileName} onNavigate={openTab} />
          )}
          {activeTab === 'rutas' && <RutasView view={rutasView} onEdit={setToast} />}
          {activeTab === 'despacho' && (
            <DespachoParamsView
              schedules={schedules}
              onScheduleChange={changeSchedule}
              fleet={fleet}
              day={activeScenarioDay}
              onDayChange={changeDay}
              costPerHour={hourCost}
            />
          )}
          {activeTab === 'demanda' &&
            (demandaView === 'parametros' ? (
              <DemandaParamsView
                schedules={schedules}
                onScheduleChange={changeSchedule}
                demandScale={demandScale}
                fleet={fleet}
                day={activeScenarioDay}
                onDayChange={changeDay}
                costPerHour={hourCost}
              />
            ) : (
              <DemandaView day={activeScenarioDay} costConfig={costConfig} onDayChange={changeDay} />
            ))}
          {activeTab === 'costos' && <CostosView costConfig={costConfig} onChange={changeCost} />}
          {activeTab === 'ayuda' && <AyudaView />}
          {activeTab === 'resultados' && !currentRun && (
            <div className="sv-results">
              {missingBanner}
              <SimbookInstructions />
            </div>
          )}
          {activeTab === 'resultados' && currentRun && output && (
            <div className="sv-results">
              {missingBanner}
              {stale && (
                <div className="sv-stale">
                  <span>
                    ⚠ Los parámetros cambiaron después de <strong>{currentRun.label}</strong>. Estos resultados ya no corresponden al escenario.
                  </span>
                  <button type="button" className="sv-btn primary" onClick={runSimulation}>
                    ▶ Ejecutar de nuevo
                  </button>
                </div>
              )}
              {report === 'estado' && <ResultadosView day={currentRun.day} costConfig={costConfig} scenarioFile={fileName} />}
              {report === 'comparar' && <CompararView runs={runs} current={currentRun} />}
              {report === 'horario' && <HorarioView output={output} />}
              {report === 'asignacion' && <AsignacionView output={output} />}
              {report === 'turnos' && <TurnosView output={output} />}
              {report === 'espacio' && <EspacioTiempoView output={output} />}
              {report === 'pelotonamiento' && <MapaReplayView output={output} mode="pelotonamiento" />}
              {report === 'carga' && <PerfilCargaView output={output} />}
              {report === 'espera' && <EsperaView output={output} />}
              {report === 'mapa' && <MapaReplayView output={output} mode="mapa" />}
              {report === 'cumplimiento' && <CumplimientoView output={output} />}
              {report === 'parametros' && (
                <SimsheetParamsView run={currentRun} baseline={runs[0]} company={meta?.company ?? null} onEditInDraft={() => editInDraft(currentRun)} />
              )}
              {report === 'rentabilidad' && (

            <main className="fs-stage">
              {/* TOP ROW: 2 CARDS */}
              <div className="fs-cards-grid-top">
                {/* Card 1: Abordajes por hora-bus (Speedometer Gauge) */}
                <div className="fs-card">
                  <div className="fs-card-header">
                    <div className="fs-card-title-block">
                      <span className="fs-card-title">Abordajes por hora-bus</span>
                    </div>
                    <span className="fs-help-dot" title="Promedio de pasajeros abordados por unidad y hora">?</span>
                  </div>
  
                  <div className="fs-gauge-container">
                    <svg className="fs-gauge-svg" viewBox="0 0 260 140">
                      <path d={gaugeArc(0, BREAK_EVEN - 6)} fill="none" stroke="#c93b3b" strokeWidth="26" />
                      <path d={gaugeArc(BREAK_EVEN - 6, BREAK_EVEN + 4)} fill="none" stroke="#f0a020" strokeWidth="26" />
                      <path d={gaugeArc(BREAK_EVEN + 4, GAUGE_MAX)} fill="none" stroke="#3f9142" strokeWidth="26" />
  
                      <text x={GAUGE_CX - GAUGE_R} y={GAUGE_CY + 22} fontSize="11" fill="#475569" textAnchor="middle">0</text>
                      <text x={GAUGE_CX + GAUGE_R} y={GAUGE_CY + 22} fontSize="11" fill="#475569" textAnchor="middle">90</text>
  
                      <line
                        x1={GAUGE_CX}
                        y1={GAUGE_CY}
                        x2={gaugePoint(GAUGE_VALUE, GAUGE_R - 18)[0]}
                        y2={gaugePoint(GAUGE_VALUE, GAUGE_R - 18)[1]}
                        stroke="#1f2937"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <circle cx={GAUGE_CX} cy={GAUGE_CY} r="7" fill="#1f2937" />
                    </svg>
  
                    <div className="fs-gauge-value">18,7</div>
                    <div className="fs-gauge-subtext">equilibrio 34,0</div>
                    <span className="fs-gauge-link" onClick={() => alert('Desglose de cálculo de punto de equilibrio: ARESEP ₡340 tarifa')}>
                      (ver desglose ⌕)
                    </span>
                  </div>
                </div>
  
                {/* Card 2: ¿Qué horas pagan su costo? (Hourly Bar Chart) */}
                <div className="fs-card">
                  <div className="fs-card-header">
                    <div className="fs-card-title-block">
                      <span className="fs-card-title">¿Qué horas pagan su costo?</span>
                      <span className="fs-card-sub">
                        <span className="fs-legend-dot" style={{ background: '#3f9142' }} /> Paga su costo
                        <span className="fs-legend-dot" style={{ background: '#c93b3b', marginLeft: '10px' }} /> Déficit · flota y ramales, por hora
                      </span>
                    </div>
                    <span className="fs-help-dot" title="Abordajes por hora-bus contra el punto de equilibrio">?</span>
                  </div>
  
                  <div className="fs-barchart">
                    <div className="fs-bar-yaxis">
                      <span>40</span>
                      <span>20</span>
                      <span>0</span>
                    </div>
                    <div className="fs-bar-plot">
                      <div className="fs-bar-gridline" style={{ bottom: '50%' }} />
                      <div className="fs-bar-gridline" style={{ bottom: '100%' }} />
                      <div className="fs-bar-equilibrium" style={{ bottom: `${(BREAK_EVEN / BAR_SCALE_MAX) * 100}%` }}>
                        <span>equilibrio 34,0</span>
                      </div>
                      {HOURLY_DATA.map((item) => (
                        <div key={item.hour} className="fs-bar-col">
                          <div
                            className={`fs-bar-rect ${item.isProfit ? 'profit' : 'loss'}`}
                            style={{ height: `${Math.min(100, (item.pax / BAR_SCALE_MAX) * 100)}%` }}
                            title={`${item.hour}: ${item.pax} abordajes/hora-bus (${item.isProfit ? 'paga su costo' : 'déficit'})`}
                          />
                          <span className="fs-bar-hour-label">{item.hour}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
  
              {/* BOTTOM ROW: 2 CARDS */}
              <div className="fs-cards-grid-bottom">
                {/* Card 3: Ruta x hora (one cell per route and hour) */}
                <div className="fs-card">
                  <div className="fs-card-header">
                    <div className="fs-card-title-block">
                      <span className="fs-card-title">Ruta x hora</span>
                      <span className="fs-card-sub">Horas en rojo: la ruta no cubre su costo en esa hora</span>
                    </div>
                    <div className="fs-heat-legend">
                      <span><i className="deep-green" /> Rentable</span>
                      <span><i className="light-green" /> Apenas</span>
                      <span><i className="light-red" /> Cerca</span>
                      <span><i className="deep-red" /> Déficit</span>
                      <span><i className="no-service" /> Sin servicio</span>
                    </div>
                  </div>
  
                  <div className="fs-heatmap" style={{ gridTemplateColumns: `112px repeat(${HEAT_HOURS.length}, 1fr)` }}>
                    <span />
                    {HEAT_HOURS.map((hour) => (
                      <span key={hour} className="fs-heat-hour">{hour % 2 === 0 ? hour : ''}</span>
                    ))}
                    {ROUTE_LIST.map((route, rIdx) => (
                      <React.Fragment key={route}>
                        <span className="fs-heat-route-name" title={route}>{route}</span>
                        {HEAT_HOURS.map((hour) => (
                          <span key={hour} className={`fs-heat-cell ${heatCellClass(rIdx, hour)}`} title={`${route} · ${hour}:00`} />
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
  
                {/* Card 4: Tiempo por nivel de ocupación (Horizontal Progress Bars) */}
                <div className="fs-card">
                  <div className="fs-card-header">
                    <div className="fs-card-title-block">
                      <span className="fs-card-title">Tiempo por nivel de ocupación</span>
                      <span className="fs-card-sub">Proporción de la jornada con ocupación rentable</span>
                    </div>
                  </div>
  
                  <div className="fs-occupancy-list">
                    {ROUTE_LIST.map((route, idx) => (
                      <div key={route} className="fs-occupancy-row">
                        <span className="fs-occupancy-name" title={route}>{route}</span>
                        <div className="fs-occupancy-bar-bg" title={`${PROFIT_SHARE[idx]}% de la jornada rentable`}>
                          <div className="fs-occupancy-bar-fill" style={{ width: `${PROFIT_SHARE[idx]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </main>
              )}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------
          6. BOTTOM WORKBOOK SHEET TABS (EXCEL STYLE)
          -------------------------------------------------------------------- */}
      <footer className="fs-sheet-tabs">
        <span className="fs-sheet-nav">◀</span>
        <span className="fs-sheet-nav">▶</span>
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            className={`fs-sheet-tab ${run.id === currentRunId ? 'active' : ''}`}
            onClick={() => {
              setCurrentRunId(run.id)
              openTab('resultados')
            }}
            title={`${run.label} · ${run.time} · ${run.fleet} buses`}
          >
            {run.label} · {run.time}
          </button>
        ))}
        <button type="button" className="fs-btn-add-sheet" onClick={runSimulation} title="Ejecutar una Simsheet nueva">
          +
        </button>
      </footer>
      </div>
      </div>

      {/* --------------------------------------------------------------------
          7. BOTTOM STATUS BAR
          -------------------------------------------------------------------- */}
      {toast && <div className="sv-toast">{toast}</div>}
      {wizardOpen && <NewSimbookWizard saved={savedParams} onCancel={() => setWizardOpen(false)} onCreate={createSimbook} />}
      {restoring && (
        <RestoreParamsDialog
          fileName={restoring.fileName}
          book={restoring.book}
          replacing={savedParams !== null}
          onCancel={() => setRestoring(null)}
          onRestore={finishRestore}
        />
      )}

      <div className="fs-statusbar">
        <div className="fs-status-telemetry">
          <span style={{ color: stale || !output ? '#f59e0b' : '#10b981' }}>●</span>
          <span>
            {currentRun && output ? (
              <>
                {currentRun.label} · {output.totals.trips.toLocaleString('es-CR')} viajes simulados ·{' '}
                {stale ? 'parámetros cambiados, ejecute de nuevo' : 'resultados al día'}
              </>
            ) : (
              'Borrador inicial · todavía no hay Simsheets'
            )}
          </span>
        </div>

        <div className="fs-status-controls">
          <span style={{ cursor: 'pointer' }} title="Vista cuadrícula">⊞</span>
          <span style={{ cursor: 'pointer' }} title="Vista dividida">⊟</span>
          <span style={{ cursor: 'pointer' }} title="Pantalla completa">🗖</span>
          <div className="fs-zoom-slider">
            <span style={{ cursor: 'pointer' }}>-</span>
            <span>100%</span>
            <span style={{ cursor: 'pointer' }}>+</span>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  )
}
