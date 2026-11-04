import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Toast {
  id: number
  tone: 'success' | 'error'
  message: string
}

export interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextValue>({ success: () => {}, error: () => {} })

/** Small, polite notifications for "Lagret" / "Noe gikk galt" feedback. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tone, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 3500)
  }, [])

  const value = useMemo(() => ({ success: (m: string) => push('success', m), error: (m: string) => push('error', m) }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'animate-fade-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-card',
              t.tone === 'success' ? 'bg-ink text-paper' : 'bg-danger text-paper',
            )}
          >
            {t.tone === 'success' ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <XCircle className="size-4 shrink-0" aria-hidden />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
