import { useEffect, useState } from 'react'

export interface PollState<T> {
  data: T | null
  error: string | null
  updatedAt: Date | null
}

// Calls `load` now and every `intervalMs`, never overlapping requests. The last good data is
// kept when a poll fails, so a brief API outage shows an error without blanking the screen.
export function usePolling<T>(
  load: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  key: unknown = null,
): PollState<T> {
  const [state, setState] = useState<PollState<T>>({ data: null, error: null, updatedAt: null })

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined
    setState({ data: null, error: null, updatedAt: null })

    async function tick() {
      try {
        const data = await load(controller.signal)
        setState({ data, error: null, updatedAt: new Date() })
      } catch (error) {
        if (controller.signal.aborted) return
        setState((previous) => ({ ...previous, error: (error as Error).message }))
      }
      if (!controller.signal.aborted) timer = window.setTimeout(tick, intervalMs)
    }

    tick()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
    // `load` is expected to change only with `key`.
  }, [key, intervalMs])

  return state
}

// Re-renders once per interval, for "x s ago" labels.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
