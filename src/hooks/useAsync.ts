import { useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error }

/**
 * Runs `load` whenever `deps` change and tracks its state. Results from
 * outdated runs are ignored, so fast clicks never show stale data.
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const [lastKey, setLastKey] = useState<readonly unknown[]>([...deps, nonce])

  // Reset to loading during render when inputs change (avoids a setState-in-effect cascade).
  const key = [...deps, nonce]
  if (key.length !== lastKey.length || key.some((v, i) => !Object.is(v, lastKey[i]))) {
    setLastKey(key)
    setState({ status: 'loading', data: null, error: null })
  }

  useEffect(() => {
    let active = true
    load().then(
      (data) => active && setState({ status: 'success', data, error: null }),
      (error: unknown) =>
        active && setState({ status: 'error', data: null, error: error instanceof Error ? error : new Error(String(error)) }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { ...state, reload: () => setNonce((n) => n + 1) }
}
