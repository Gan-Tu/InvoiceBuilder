import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Download, FilePlus2, Loader2, RotateCcw } from 'lucide-react'
import { Editor } from './components/Editor'
import { PreviewPane } from './components/PreviewPane'
import { Button, Kbd } from './components/ui'
import { usePersistedInvoice } from './lib/storage'
import { blankInvoice, sampleInvoice } from './lib/defaults'
import { cx } from './lib/cx'
import { Logo } from './components/Logo'

const SIDEBAR_KEY = 'invoice:sidebar'
const SIDEBAR = { default: 540, min: 400, max: 860 }

function clampWidth(n: number): number {
  return Math.min(SIDEBAR.max, Math.max(SIDEBAR.min, Math.round(n)))
}

function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(SIDEBAR_KEY))
      return stored >= SIDEBAR.min && stored <= SIDEBAR.max ? stored : SIDEBAR.default
    } catch {
      return SIDEBAR.default
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(width))
    } catch {
      // ignore
    }
  }, [width])
  return [width, setWidth] as const
}

function ResizeHandle({ onResize, onReset }: { onResize: (clientX: number) => void; onReset: () => void }) {
  const [active, setActive] = useState(false)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize editor"
      title="Drag to resize · double-click to reset"
      onDoubleClick={onReset}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        const target = e.currentTarget
        target.setPointerCapture(e.pointerId)
        setActive(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        const move = (ev: PointerEvent) => onResize(ev.clientX)
        const up = () => {
          setActive(false)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
          target.removeEventListener('pointermove', move)
          target.removeEventListener('pointerup', up)
          target.removeEventListener('pointercancel', up)
        }
        target.addEventListener('pointermove', move)
        target.addEventListener('pointerup', up)
        target.addEventListener('pointercancel', up)
      }}
      className="group relative hidden w-0 shrink-0 cursor-col-resize lg:block"
    >
      <div className="absolute inset-y-0 -left-1.5 z-10 w-3" />
      <div
        className={cx(
          'absolute inset-y-0 -left-px w-0.5 transition-colors duration-150',
          active ? 'bg-ink' : 'bg-line group-hover:bg-neutral-400',
        )}
      />
    </div>
  )
}

export default function App() {
  const [invoice, setInvoice] = usePersistedInvoice()
  const [sidebarWidth, setSidebarWidth] = useSidebarWidth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const [{ renderInvoicePdf }, { pdfFileName }] = await Promise.all([import('./invoice/pdf'), import('./invoice/document')])
      const blob = await renderInvoicePdf(invoice)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = pdfFileName(invoice.number)
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (err) {
      console.error(err)
      setError('Could not generate the PDF. Check the console for details.')
    } finally {
      setBusy(false)
    }
  }, [busy, invoice])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void download()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [download])

  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(t)
  }, [error])

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <div className="flex h-full flex-col lg:overflow-hidden" style={{ '--sidebar': `${sidebarWidth}px` } as CSSProperties}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-[15px] font-semibold tracking-tight">Invoice Builder</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setInvoice(sampleInvoice())} title="Reset to the sample invoice">
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button variant="outline" onClick={() => setInvoice(blankInvoice(invoice))} title="Start a new invoice, keeping your business details">
            <FilePlus2 className="size-3.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button variant="primary" onClick={download} disabled={busy} className="pr-2.5">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            Download PDF
            <Kbd>{isMac ? '⌘' : 'Ctrl'} S</Kbd>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-line bg-white lg:w-(--sidebar) lg:overflow-y-auto lg:border-b-0">
          <Editor invoice={invoice} onChange={setInvoice} />
          <div className="flex items-center gap-2 px-6 py-4 text-xs text-neutral-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Autosaved in this browser
          </div>
        </aside>
        <ResizeHandle onResize={(x) => setSidebarWidth(clampWidth(x))} onReset={() => setSidebarWidth(SIDEBAR.default)} />
        <main className="min-h-[60vh] min-w-0 flex-1 lg:min-h-0">
          <PreviewPane invoice={invoice} />
        </main>
      </div>

      {error ? (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-[13px] text-white shadow-lg">{error}</div>
      ) : null}
    </div>
  )
}
