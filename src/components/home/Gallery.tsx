import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Section } from '@/components/ui'
import { galleryImages } from '@/data/images'
import { useI18n } from '@/i18n/useI18n'
import { cn } from '@/utils/cn'

export function Gallery() {
  const { t, lang } = useI18n()
  const [active, setActive] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const count = galleryImages.length
  const current = active === null ? null : galleryImages[active]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (active !== null && !dialog.open) dialog.showModal()
    if (active === null && dialog.open) dialog.close()
  }, [active])

  const step = (delta: number) => setActive((i) => (i === null ? i : (i + delta + count) % count))

  return (
    <Section
      id="arbeid"
      tone="ink"
      eyebrow={t.home.galleryEyebrow}
      title={t.home.galleryTitle}
      intro={t.home.galleryIntro}
    >
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {galleryImages.map((img, i) => (
          <li key={img.src} className={cn(i === 0 && 'lg:col-span-2 lg:row-span-2')}>
            <button
              type="button"
              onClick={() => setActive(i)}
              className="group relative block size-full overflow-hidden rounded-xl"
              aria-label={t.home.viewLarger(img.alt[lang])}
            >
              <img
                src={img.thumb}
                alt=""
                loading="lazy"
                className="aspect-square size-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4 text-left text-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {t.home.by(img.artist)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(1)
          if (e.key === 'ArrowLeft') step(-1)
        }}
        onClick={(e) => e.target === e.currentTarget && setActive(null)}
        aria-label={t.home.lightbox}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/90"
      >
        {current && (
          <figure className="relative flex max-h-[90svh] w-[min(92vw,1100px)] flex-col items-center">
            <img src={current.src} alt={current.alt[lang]} className="max-h-[80svh] w-auto rounded-xl object-contain" />
            <figcaption className="mt-3 text-sm text-paper/80">
              {current.alt[lang]} · {t.home.by(current.artist)} ({(active ?? 0) + 1}/{count})
            </figcaption>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => step(-1)} aria-label={t.home.previousImage} className="flex size-12 items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20">
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button type="button" onClick={() => setActive(null)} aria-label={t.common.close} className="flex size-12 items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20">
                <X className="size-6" aria-hidden />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={t.home.nextImage} className="flex size-12 items-center justify-center rounded-full bg-paper/10 text-paper hover:bg-paper/20">
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </div>
          </figure>
        )}
      </dialog>
    </Section>
  )
}
