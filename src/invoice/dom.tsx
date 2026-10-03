import type { CSSProperties } from 'react'
import type { Invoice } from '../types'
import { InvoiceLayout, PAGE_PADDING, PAGE_SIZES, type Primitives, type StyleProp } from './layout'

function flat(style: StyleProp): CSSProperties {
  if (!style) return {}
  const list = Array.isArray(style) ? style : [style]
  return Object.assign({}, ...list) as CSSProperties
}

const View: Primitives['View'] = ({ style, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, ...flat(style) }}>{children}</div>
)

const Text: Primitives['Text'] = ({ style, render, children }) => (
  <span style={{ minWidth: 0, ...flat(style) }}>{render ? render({ pageNumber: 1, totalPages: 1 }) : children}</span>
)

const Image: Primitives['Image'] = ({ src, style }) => (
  <img src={src} alt="" style={{ display: 'block', objectFit: 'contain', ...flat(style) }} />
)

const domPrimitives: Primitives = { View, Text, Image }

export function InvoiceSheet({ invoice }: { invoice: Invoice }) {
  const size = PAGE_SIZES[invoice.pageSize]
  return (
    <div
      className="sheet"
      style={{
        width: `${size.w}pt`,
        minHeight: `${size.h}pt`,
        padding: `${PAGE_PADDING.top}pt ${PAGE_PADDING.x}pt ${PAGE_PADDING.bottom}pt`,
      }}
    >
      <InvoiceLayout invoice={invoice} P={domPrimitives} />
    </div>
  )
}
