import { useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import type { LineItem } from '../types'
import { formatMoney, lineAmount } from '../lib/money'
import { Input } from './ui'
import { cx } from '../lib/cx'

const grid = 'grid grid-cols-[minmax(0,1fr)_56px_96px_88px_24px] items-center gap-2'

export function LineItems({
  items,
  currency,
  onChange,
  onAdd,
  onRemove,
}: {
  items: LineItem[]
  currency: string
  onChange: (id: string, patch: Partial<LineItem>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const lastAdded = useRef<string | null>(null)
  const prevCount = useRef(items.length)

  useEffect(() => {
    if (items.length > prevCount.current) {
      lastAdded.current = items[items.length - 1].id
      const el = document.querySelector<HTMLInputElement>(`[data-item-desc="${lastAdded.current}"]`)
      el?.focus()
    }
    prevCount.current = items.length
  }, [items])

  return (
    <div>
      <div className={cx(grid, 'mb-1.5 px-0 text-[11px] font-medium text-neutral-400')}>
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Price</span>
        <span className="text-right">Amount</span>
        <span />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className={cx(grid, 'group')}>
            <Input
              data-item-desc={item.id}
              value={item.description}
              placeholder="Description"
              onChange={(e) => onChange(item.id, { description: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) onAdd()
              }}
            />
            <Input
              value={item.quantity}
              inputMode="decimal"
              placeholder="1"
              className="text-right tabular-nums"
              onChange={(e) => onChange(item.id, { quantity: e.target.value })}
            />
            <Input
              value={item.unitPrice}
              inputMode="decimal"
              placeholder="0.00"
              className="text-right tabular-nums"
              onChange={(e) => onChange(item.id, { unitPrice: e.target.value })}
            />
            <span className="truncate text-right text-[13px] text-muted tabular-nums">
              {formatMoney(lineAmount(item.quantity, item.unitPrice), currency)}
            </span>
            <button
              type="button"
              aria-label="Remove item"
              disabled={items.length === 1}
              onClick={() => onRemove(item.id)}
              className="flex size-6 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-[opacity,color,background-color] group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-neutral-100 hover:text-ink focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-muted transition-colors hover:bg-neutral-100 hover:text-ink"
      >
        <Plus className="size-3.5" />
        Add item
      </button>
    </div>
  )
}
