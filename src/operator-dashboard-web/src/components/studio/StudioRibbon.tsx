// The ribbon's tool strip: a different set of groups for each Studio tab, plus the Simulación
// group pinned at the right of every tab.
import { Children, isValidElement, type ReactNode } from 'react'
import type { OperationalCostConfig } from '../../config/operatorSettings'
import { Icon } from './icons'
import './studioRibbon.css'
import type { StudioDay, StudioTab } from './studioModel'

export type ResultReport =
  | 'rentabilidad'
  | 'estado'
  | 'comparar'
  | 'horario'
  | 'asignacion'
  | 'turnos'
  | 'espacio'
  | 'pelotonamiento'
  | 'carga'
  | 'espera'
  | 'mapa'
  | 'cumplimiento'

export type CostPreset = 'oficial' | 'diesel900' | 'flotaAntigua' | 'electrico'
export type ScenarioPreset = 'official' | 'highDemand' | 'optimized' | 'pilot10'

export interface StudioRibbonProps {
  tab: StudioTab
  day: StudioDay
  onDayChange: (day: StudioDay) => void
  fleet: number
  onFleetChange: (fleet: number) => void
  demandScale: number
  onDemandScaleChange: (scale: number) => void
  rutasView: 'diagrama' | 'tabla'
  onRutasView: (view: 'diagrama' | 'tabla') => void
  demandaView: 'parametros' | 'analisis'
  onDemandaView: (view: 'parametros' | 'analisis') => void
  costConfig: OperationalCostConfig
  onCostMode: (mode: OperationalCostConfig['mode']) => void
  onCostPreset: (preset: CostPreset) => void
  report: ResultReport
  onReport: (report: ResultReport) => void
  onScenarioPreset: (preset: ScenarioPreset) => void
  onRun: () => void
  onReset: () => void
  onOpenCloud: () => void
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onSaveDefaults: () => void
  onRestoreDefaults: () => void
  onClearDefaults: () => void
  notify: (message: string) => void
}

interface Big {
  icon: string
  label: ReactNode
  onClick: () => void
  active?: boolean
  title?: string
  color?: string
}

// Plain text of a label (labels may hold <br />), used as the tooltip when the ribbon is compact.
function labelText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement<{ children?: ReactNode }>(child)) return child.type === 'br' ? '\n' : labelText(child.props.children)
      return ''
    })
    .join('')
    .replace(/-\n/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function tooltip(label: ReactNode, title?: string) {
  const text = labelText(label)
  return title ? `${text}: ${title}` : text
}

function BigButton({ icon, label, onClick, active, title, color }: Big) {
  return (
    <button type="button" className={`fs-tool-btn ${active ? 'active' : ''}`} onClick={onClick} title={tooltip(label, title)}>
      <span className="fs-tool-icon">
        <Icon name={icon} color={color} />
      </span>
      <span>{label}</span>
    </button>
  )
}

function SmallStack({ items }: { items: Big[] }) {
  return (
    <div className="fs-small-stack">
      {items.map((item) => (
        <button
          key={String(item.label)}
          type="button"
          className={`fs-small-btn ${item.active ? 'active' : ''}`}
          onClick={item.onClick}
          title={tooltip(item.label, item.title)}
        >
          <Icon name={item.icon} size={16} color={item.color} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fs-tool-group">
      <div className="fs-tool-buttons">{children}</div>
      <div className="fs-tool-group-label">
        <span>{label}</span>
      </div>
    </div>
  )
}

function Spinner({
  value,
  unit,
  step,
  min,
  max,
  onChange,
}: {
  value: number
  unit: string
  step: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="fs-spinner">
      <button type="button" onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <input type="number" value={value} onChange={(e) => onChange(clamp(e.target.valueAsNumber || min))} />
      <span>{unit}</span>
      <button type="button" onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </div>
  )
}

function Chips({ items }: { items: { label: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div className="fs-chip-row">
      {items.map((c) => (
        <button key={c.label} type="button" className={`fs-ribbon-chip ${c.active ? 'active' : ''}`} onClick={c.onClick}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

export function StudioRibbon(p: StudioRibbonProps) {
  const dayGroup = (
    <Group label="Día a simular">
      <BigButton icon="calendar" label={<>Lunes a<br />Viernes</>} active={p.day === 'semana'} onClick={() => p.onDayChange('semana')} />
      <BigButton icon="calendar" color="#d83b01" label="Sábado" active={p.day === 'sabado'} onClick={() => p.onDayChange('sabado')} />
      <BigButton icon="calendar" color="#c43e1c" label="Domingo" active={p.day === 'domingo'} onClick={() => p.onDayChange('domingo')} />
      <BigButton icon="rain" label={<>Lluvia<br />Intensa</>} active={p.day === 'lluvia'} onClick={() => p.onDayChange('lluvia')} />
      <BigButton icon="user" label={<>Escenario<br />Personalizado</>} active={p.day === 'custom'} onClick={() => p.onDayChange('custom')} />
    </Group>
  )

  const report = (id: ResultReport, icon: string, label: ReactNode, title: string): Big => ({
    icon,
    label,
    title,
    active: p.report === id,
    onClick: () => p.onReport(id),
  })

  let groups: ReactNode
  switch (p.tab) {
    case 'inicio':
      groups = (
        <>
          <Group label="Archivo">
            <BigButton icon="newFile" label="Nuevo" title="Simbook nuevo con los parámetros oficiales" onClick={p.onNew} />
            <SmallStack
              items={[
                { icon: 'folder', label: 'Abrir', title: 'Abrir un Simbook (Ctrl+O)', onClick: p.onOpen },
                { icon: 'save', label: 'Guardar', title: 'Guardar el Simbook (Ctrl+S)', onClick: p.onSave },
                { icon: 'save', label: 'Guardar como…', title: 'Guardar una copia con otro nombre (Ctrl+Shift+S)', onClick: p.onSaveAs },
              ]}
            />
            <SmallStack
              items={[
                { icon: 'import', label: 'Importar', onClick: () => p.notify('Importar escenario .json (maqueta)') },
                { icon: 'export', label: 'Exportar JSON', onClick: () => p.notify('Exportar escenario .json (maqueta)') },
              ]}
            />
          </Group>
          <Group label="Mis parámetros">
            <BigButton
              icon="user"
              label={<>Guardar como<br />predeterminados</>}
              title="Usar los parámetros en pantalla para empezar nuevos Simbooks (solo en este navegador)"
              onClick={p.onSaveDefaults}
            />
            <SmallStack
              items={[
                { icon: 'import', label: 'Restaurar desde un Simbook', title: 'Tomar mis parámetros de un Simbook, sin modificarlo', onClick: p.onRestoreDefaults },
                { icon: 'trash', label: 'Borrar', title: 'Borrar mis parámetros guardados de este navegador', onClick: p.onClearDefaults },
              ]}
            />
          </Group>
          <Group label="Nube">
            <BigButton icon="cloud" label={<>Vincular<br />Nube</>} onClick={p.onOpenCloud} />
            <BigButton icon="sync" label="Sincronizar" onClick={() => p.notify('Sincronizado con Google Drive (maqueta)')} />
          </Group>
          <Group label="Escenarios predefinidos">
            <BigButton icon="shield" label={<>Oficial<br />CTP/ARESEP</>} onClick={() => p.onScenarioPreset('official')} />
            <BigButton icon="users" label={<>Alta<br />demanda</>} onClick={() => p.onScenarioPreset('highDemand')} />
            <BigButton icon="sliders" label={<>Flota<br />optimizada</>} onClick={() => p.onScenarioPreset('optimized')} />
            <BigButton icon="bus" label={<>Piloto<br />10 buses</>} onClick={() => p.onScenarioPreset('pilot10')} />
          </Group>
        </>
      )
      break

    case 'rutas':
      groups = (
        <>
          <Group label="Red">
            <BigButton icon="plusRoute" label={<>Nueva<br />ruta</>} onClick={() => p.notify('Nueva ruta (maqueta)')} />
            <BigButton icon="pin" label={<>Editar<br />paradas</>} onClick={() => p.notify('Editor de paradas (maqueta)')} />
            <BigButton icon="trash" label="Eliminar" onClick={() => p.notify('Eliminar ruta (maqueta)')} />
          </Group>
          <Group label="Datos CTP">
            <BigButton icon="import" label={<>Importar<br />CTP</>} onClick={() => p.notify('Importar matriz CTP (maqueta)')} />
            <BigButton icon="export" label={<>Exportar<br />JSON</>} onClick={() => p.notify('Exportar red .json (maqueta)')} />
          </Group>
          <Group label="Flota">
            <BigButton icon="bus" label={<>Redistribuir<br />buses</>} onClick={() => p.notify('Redistribución automática por demanda (maqueta)')} />
            <BigButton icon="check" label={<>Validar<br />39 / 39</>} onClick={() => p.notify('39 de 39 buses asignados (maqueta)')} />
          </Group>
          <Group label="Vista">
            <BigButton icon="diagram" label="Diagrama" active={p.rutasView === 'diagrama'} onClick={() => p.onRutasView('diagrama')} />
            <BigButton icon="table" label="Tabla" active={p.rutasView === 'tabla'} onClick={() => p.onRutasView('tabla')} />
          </Group>
        </>
      )
      break

    case 'despacho':
      groups = (
        <>
          <Group label="Flota">
            <div className="fs-ribbon-field">
              <Spinner value={p.fleet} unit="buses" step={1} min={1} max={60} onChange={p.onFleetChange} />
              <Chips
                items={[39, 42, 20, 10].map((n) => ({
                  label: n === 39 ? '39 CTP' : n === 42 ? '42 Concesión' : String(n),
                  active: p.fleet === n,
                  onClick: () => p.onFleetChange(n),
                }))}
              />
            </div>
          </Group>
          {dayGroup}
          <Group label="Despachos">
            <BigButton icon="clock" label={<>Optimizar<br />horarios</>} onClick={() => p.notify('Optimizador de intervalos valle (maqueta)')} />
            <BigButton icon="check" label={<>Validar<br />frecuencias</>} onClick={() => p.notify('Frecuencias dentro de lo autorizado por el CTP (maqueta)')} />
          </Group>
        </>
      )
      break

    case 'demanda':
      groups = (
        <>
          <Group label="Escala global">
            <div className="fs-ribbon-field">
              <Spinner value={Math.round(p.demandScale * 100)} unit="%" step={5} min={5} max={300} onChange={(v) => p.onDemandScaleChange(v / 100)} />
              <Chips
                items={[
                  { label: '47 % Oficial ARESEP', v: 0.47 },
                  { label: '100 % Alta', v: 1 },
                  { label: '75 % Media', v: 0.75 },
                  { label: '35 % Baja', v: 0.35 },
                ].map((c) => ({ label: c.label, active: Math.abs(p.demandScale - c.v) < 0.001, onClick: () => p.onDemandScaleChange(c.v) }))}
              />
            </div>
          </Group>
          {dayGroup}
          <Group label="Vista">
            <BigButton icon="sliders" label="Parámetros" active={p.demandaView === 'parametros'} onClick={() => p.onDemandaView('parametros')} />
            <BigButton icon="barChart" label="Análisis" active={p.demandaView === 'analisis'} onClick={() => p.onDemandaView('analisis')} />
          </Group>
        </>
      )
      break

    case 'costos':
      groups = (
        <>
          <Group label="Modelo de costos">
            <BigButton icon="sliders" label={<>Paramétrico<br />ARESEP</>} active={p.costConfig.mode === 'aresep'} onClick={() => p.onCostMode('aresep')} />
            <BigButton icon="money" label={<>Valor<br />manual</>} active={p.costConfig.mode === 'manual'} onClick={() => p.onCostMode('manual')} />
          </Group>
          <Group label="Escenarios de costo">
            <BigButton
              icon="shield"
              label={<>Oficial<br />ARESEP</>}
              active={p.costConfig.mode === 'aresep' && p.costConfig.dieselPricePerLiter === 785 && p.costConfig.maintenanceCostPerKm === 55}
              onClick={() => p.onCostPreset('oficial')}
            />
            <BigButton icon="fuel" label={<>Diésel<br />₡900/L</>} active={p.costConfig.dieselPricePerLiter === 900} onClick={() => p.onCostPreset('diesel900')} />
            <BigButton icon="wrench" label={<>Flota<br />antigua</>} active={p.costConfig.maintenanceCostPerKm === 85} onClick={() => p.onCostPreset('flotaAntigua')} />
            <BigButton icon="bolt" label={<>Piloto<br />eléctrico</>} active={p.costConfig.dieselPricePerLiter === 320} onClick={() => p.onCostPreset('electrico')} />
          </Group>
        </>
      )
      break

    case 'resultados':
      groups = (
        <>
          <Group label="Mapa">
            <BigButton {...report('mapa', 'map', 'Mapa','Reproducir el día sobre el mapa')} />
          </Group>
          <Group label="Finanzas">
            <BigButton {...report('rentabilidad', 'gauge', 'Rentabilidad', 'Qué horas y ramales pagan su costo')} />
            <BigButton {...report('estado', 'coin', <>Estado de<br />resultados</>, 'Ingresos, costos y margen hora por hora')} />
            <BigButton {...report('comparar', 'compare', <>Comparar<br />Simsheets</>, 'Dos Simsheets lado a lado')} />
          </Group>
          <Group label="Operación">
            <BigButton {...report('horario', 'timetable', <>Horario de<br />salidas</>, 'Salidas de cada terminal, por ramal')} />
            <BigButton {...report('asignacion', 'gantt', <>Asignación<br />de buses</>, 'Qué hace cada bus durante el día')} />
            <BigButton {...report('turnos', 'users', <>Turnos de<br />choferes</>, 'Turnos y choferes necesarios')} />
          </Group>
          <Group label="Servicio">
            <BigButton {...report('espacio', 'spaceTime', <>Espacio-<br />tiempo</>, 'Cada viaje como una línea sobre las paradas')} />
            <BigButton {...report('pelotonamiento', 'bunching', <>Peloto-<br />namiento</>, 'Buses que viajan juntos')} />
            <BigButton {...report('carga', 'loadProfile', <>Perfil de<br />carga</>, 'Pasajeros a bordo a lo largo de la ruta')} />
            <BigButton {...report('espera', 'hourglass', <>Espera y<br />regularidad</>, 'Intervalos y espera en cada parada')} />
          </Group>
          <Group label="Regulación">
            <BigButton {...report('cumplimiento', 'shield', <>Cumplimiento<br />CTP</>, 'Frecuencias y flota contra lo autorizado')} />
          </Group>
          <Group label="Exportar">
            <SmallStack
              items={[
                { icon: 'excel', label: 'Excel', onClick: () => p.notify('Exportar reporte a Excel (maqueta)') },
                { icon: 'pdf', label: 'PDF', onClick: () => p.notify('Exportar reporte a PDF (maqueta)') },
              ]}
            />
          </Group>
        </>
      )
      break

    case 'ayuda':
      groups = (
        <Group label="Ayuda">
          <BigButton icon="bulb" label="Guía" onClick={() => p.notify('Guía de operación (maqueta)')} />
          <BigButton icon="flag" label="Tour" onClick={() => p.notify('Tour guiado (maqueta)')} />
          <BigButton icon="video" label={<>Video<br />App</>} onClick={() => p.notify('Video de la app de pasajeros (maqueta)')} />
          <BigButton icon="book" label={<>Supuestos y<br />fuentes</>} onClick={() => p.notify('docs/supuestos-dashboard-operador.md (maqueta)')} />
        </Group>
      )
      break
  }

  return (
    <div className="fs-ribbon-tools">
      {groups}
      <div className="fs-tool-group fs-tool-group-pinned">
        <div className="fs-tool-buttons">
          <button type="button" className="fs-run-box" onClick={p.onRun} title="Ejecutar el escenario con los parámetros actuales">
            <span className="fs-run-triangle">
              <Icon name="play" />
            </span>
            <span className="fs-run-title">
              EJECUTAR
              <br />
              SIMULACIÓN
            </span>
          </button>
          <SmallStack
            items={[
              { icon: 'reset', label: 'Restablecer', onClick: p.onReset },
              { icon: 'log', label: 'Ver logs', onClick: () => p.notify('Registro de la simulación (maqueta)') },
            ]}
          />
        </div>
        <div className="fs-tool-group-label">
          <span>Simulación</span>
        </div>
      </div>
    </div>
  )
}
