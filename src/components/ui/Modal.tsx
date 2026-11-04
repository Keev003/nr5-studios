import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

/** Accessible dialog built on <dialog>: focus trap, Escape to close, backdrop click closes. */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={title}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-card bg-paper p-0 text-ink shadow-card backdrop:bg-ink/50',
        'max-h-[90dvh] overflow-hidden',
        widths[size],
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <h2 className="font-display text-2xl">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Lukk" className="-mr-2 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-ink/5">
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-cream px-5 py-4 sm:px-6">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
