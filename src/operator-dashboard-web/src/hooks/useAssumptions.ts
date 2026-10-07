import { useEffect, useState } from 'react'
import { defaultAssumptions, type Assumptions } from '../config/operatorSettings'

const key = 'operator-dashboard.assumptions'

// The operator can type in their real cost and senior share during a call; the values stay in
// this browser only. Storage may be unavailable (private windows), so every access is guarded.
export function useAssumptions() {
  const [assumptions, setAssumptions] = useState<Assumptions>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) ?? 'null')
      return saved ? { ...defaultAssumptions, ...saved } : defaultAssumptions
    } catch {
      return defaultAssumptions
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(assumptions))
    } catch {
      // Not saved; the values still apply until the page is closed.
    }
  }, [assumptions])

  const isDefault =
    assumptions.costPerBusHour === defaultAssumptions.costPerBusHour && assumptions.seniorShare === defaultAssumptions.seniorShare

  return { assumptions, setAssumptions, reset: () => setAssumptions(defaultAssumptions), isDefault }
}
