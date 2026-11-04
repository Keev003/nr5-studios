import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useI18n } from '@/i18n/useI18n'
import { ACCEPTED_IMAGE_TYPES, validateReferenceImage, type ImageProblem } from '@/lib/validation'
import { cn } from '@/utils/cn'

interface ImageUploadProps {
  file: File | null
  onChange: (file: File | null) => void
}

/** Optional reference image: pick from phone or computer (or drop it), preview, replace or remove. */
export function ImageUpload({ file, onChange }: ImageUploadProps) {
  const { t } = useI18n()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<ImageProblem | null>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL is an external resource tied to the file
    setPreview(url)
    return () => {
      URL.revokeObjectURL(url)
      setPreview(null)
    }
  }, [file])

  const accept = (candidate: File | undefined) => {
    if (!candidate) return
    const problem = validateReferenceImage(candidate)
    setError(problem)
    if (!problem) onChange(candidate)
  }

  const open = () => inputRef.current?.click()

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {t.booking.referenceImage} <span className="font-normal text-muted">{t.booking.optional}</span>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-describedby={`${inputId}-hint`}
        onChange={(e) => {
          accept(e.target.files?.[0])
          e.target.value = '' // allow choosing the same file again after removing it
        }}
      />

      {file && preview ? (
        <div className="flex items-center gap-4 rounded-xl border border-line bg-paper p-3">
          <img src={preview} alt={t.booking.imagePreview} className="size-24 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={open}>
                <RefreshCw className="size-3.5" aria-hidden /> {t.booking.replace}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onChange(null)} className="text-danger hover:bg-danger-light">
                <Trash2 className="size-3.5" aria-hidden /> {t.booking.remove}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={open}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            accept(e.dataTransfer.files[0])
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            dragging ? 'border-olive bg-olive-light' : 'border-line bg-paper hover:border-olive/60',
          )}
        >
          <ImagePlus className="size-8 text-olive" aria-hidden />
          <span className="text-sm font-medium">{t.booking.uploadImage}</span>
          <span className="text-xs text-muted">{t.booking.uploadHelp}</span>
        </button>
      )}
      <p id={`${inputId}-hint`} className="text-xs text-muted">{t.booking.uploadHint}</p>
      {error && <p role="alert" className="text-xs font-medium text-danger">{t.validation[error]}</p>}
    </div>
  )
}
