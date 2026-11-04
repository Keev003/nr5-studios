/**
 * After a new deploy, old code-split files disappear. A visitor with the old
 * version open then fails to load the next page. We recover by reloading once
 * (guarded so a genuinely broken build can't cause a reload loop).
 */
const KEY = 'nr5-stale-reload-at'

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i.test(message)
}

/** Reloads the page unless we already did so in the last 30 seconds. Returns whether it reloaded. */
export function reloadOnceForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < 30_000) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}
