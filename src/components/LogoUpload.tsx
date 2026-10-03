import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import type { Logo } from '../types'

async function fileToLogo(file: File): Promise<Logo> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not read image'))
      el.src = url
    })
    const naturalW = img.naturalWidth || 512
    const naturalH = img.naturalHeight || 512
    const scale = Math.min(1, 800 / Math.max(naturalW, naturalH))
    const width = Math.max(1, Math.round(naturalW * scale))
    const height = Math.max(1, Math.round(naturalH * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    // Always re-encode as PNG: handles SVG/WebP/HEIC inputs and keeps the PDF renderer happy.
    return { src: canvas.toDataURL('image/png'), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function LogoUpload({ logo, onChange }: { logo: Logo | null; onChange: (logo: Logo | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    try {
      onChange(await fileToLogo(file))
    } catch (err) {
      console.error(err)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-3">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {logo ? (
        <div className="group relative flex h-14 w-28 items-center justify-center rounded-lg border border-line bg-white p-2">
          <img src={logo.src} alt="Logo" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove logo"
            className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border border-line bg-white text-muted opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void handleFiles(e.dataTransfer.files)
          }}
          className="flex h-14 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 text-muted transition-colors hover:border-neutral-400 hover:text-ink"
        >
          <ImagePlus className="size-4" />
          <span className="text-[11px] font-medium">Add logo</span>
        </button>
      )}
      <p className="text-xs leading-5 text-neutral-400">
        {logo ? (
          <button type="button" className="text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => inputRef.current?.click()}>
            Replace
          </button>
        ) : (
          'PNG, JPG or SVG. Shown in place of your business name.'
        )}
      </p>
    </div>
  )
}
