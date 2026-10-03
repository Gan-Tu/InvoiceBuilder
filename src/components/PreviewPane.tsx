import { useEffect, useRef, useState } from 'react'
import type { Invoice } from '../types'
import { InvoiceSheet } from '../invoice/dom'
import { PAGE_SIZES } from '../invoice/layout'

const PX_PER_PT = 96 / 72

export function PreviewPane({ invoice }: { invoice: Invoice }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const size = PAGE_SIZES[invoice.pageSize]
  const widthPx = size.w * PX_PER_PT

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const styles = getComputedStyle(el)
      const inner = el.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
      setScale(Math.min(1, inner / widthPx))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [widthPx])

  return (
    <div ref={ref} className="preview-bg h-full overflow-auto px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto flex flex-col items-center">
        <div className="mb-3 flex w-full items-center justify-between text-xs text-muted" style={{ maxWidth: widthPx * scale }}>
          <span className="font-medium">{invoice.number ? `${invoice.number}.pdf` : 'invoice.pdf'}</span>
          <span>{size.label}</span>
        </div>
        <div className="origin-top" style={{ zoom: scale }}>
          <InvoiceSheet invoice={invoice} />
        </div>
      </div>
    </div>
  )
}
