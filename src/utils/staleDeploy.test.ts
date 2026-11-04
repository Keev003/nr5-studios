import { isChunkLoadError, reloadOnceForNewVersion } from './staleDeploy'

describe('stale deploy recovery', () => {
  it('recognises the errors browsers give for missing code-split files', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/BookingPage-abc.js'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false)
  })

  it('reloads at most once per 30 seconds, so a broken build cannot loop', () => {
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location)
    sessionStorage.clear()
    expect(reloadOnceForNewVersion()).toBe(true)
    expect(reloadOnceForNewVersion()).toBe(false)
    expect(reload).toHaveBeenCalledOnce()
  })
})
