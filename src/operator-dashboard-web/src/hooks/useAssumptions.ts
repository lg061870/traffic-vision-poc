import { useCallback, useEffect, useState } from 'react'
import { defaultSimulationParameters, type SimulationParameters } from '../config/operatorSettings'
import { resetSimulationParameters, updateSimulationParameters } from '../services/occupancyApi'

const key = 'operator-dashboard.simulation-parameters-v2'

export function useAssumptions() {
  const [parameters, setParameters] = useState<SimulationParameters>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null')
      return saved ? { ...defaultSimulationParameters, ...saved } : defaultSimulationParameters
    } catch {
      return defaultSimulationParameters
    }
  })

  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [applySuccess, setApplySuccess] = useState<boolean>(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(parameters))
    } catch {
      // Storage unavailable in private browsing
    }
  }, [parameters])

  const isDefault =
    parameters.costPerBusHour === defaultSimulationParameters.costPerBusHour &&
    parameters.seniorShare === defaultSimulationParameters.seniorShare &&
    parameters.totalFleetSize === defaultSimulationParameters.totalFleetSize &&
    parameters.demandScale === defaultSimulationParameters.demandScale &&
    parameters.peakActiveShare === defaultSimulationParameters.peakActiveShare &&
    parameters.valleyActiveShare === defaultSimulationParameters.valleyActiveShare &&
    parameters.nightActiveShare === defaultSimulationParameters.nightActiveShare

  const applyToLiveSimulation = useCallback(
    async (onSuccess?: () => void) => {
      setIsApplying(true)
      setApplyError(null)
      setApplySuccess(false)
      try {
        await updateSimulationParameters(parameters)
        setApplySuccess(true)
        if (onSuccess) onSuccess()
        setTimeout(() => setApplySuccess(false), 3000)
      } catch (err: unknown) {
        setApplyError(err instanceof Error ? err.message : 'Error al conectar con la API')
      } finally {
        setIsApplying(false)
      }
    },
    [parameters],
  )

  const reset = useCallback(async () => {
    setParameters(defaultSimulationParameters)
    setIsApplying(true)
    setApplyError(null)
    setApplySuccess(false)
    try {
      await resetSimulationParameters()
      setApplySuccess(true)
      setTimeout(() => setApplySuccess(false), 3000)
    } catch {
      // If offline, still reset locally
    } finally {
      setIsApplying(false)
    }
  }, [])

  const exportRulesJson = useCallback(() => {
    const payload = {
      $schema: 'https://innova.transit/schemas/simulation-rules-v1.json',
      metadata: {
        title: 'Reglas y Supuestos de Simulación de Flota',
        operator: 'Autobuses Unidos de Coronado S.A.',
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      },
      rules: parameters,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reglas-simulacion-coronado-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [parameters])

  const importRulesJson = useCallback((jsonContent: string) => {
    try {
      const parsed = JSON.parse(jsonContent)
      const importedRules = parsed.rules ?? parsed
      if (typeof importedRules === 'object' && importedRules !== null) {
        setParameters((prev) => ({
          ...prev,
          ...importedRules,
        }))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  return {
    assumptions: parameters,
    setAssumptions: setParameters,
    parameters,
    setParameters,
    applyToLiveSimulation,
    exportRulesJson,
    importRulesJson,
    reset,
    isDefault,
    isApplying,
    applyError,
    applySuccess,
  }
}
