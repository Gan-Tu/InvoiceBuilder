import type { ComponentType, ReactNode } from 'react'
import type { Invoice } from '../types'
import { computeTotals, formatMoney, formatQuantity, lineAmount } from '../lib/money'
import { formatDate } from '../lib/dates'

/**
 * The invoice is described once, here, using three tiny primitives (View, Text, Image).
 * The live preview renders it with DOM primitives; the PDF export renders the very same
 * tree with @react-pdf/renderer primitives. All sizes are in pt so both targets agree.
 *
 * Every section is optional: anything that was not supplied is simply left out.
 */

export type Style = Record<string, string | number>
export type StyleProp = Style | Style[] | undefined

export type PageInfo = { pageNumber: number; totalPages: number }

export type Primitives = {
  View: ComponentType<{ style?: StyleProp; fixed?: boolean; wrap?: boolean; children?: ReactNode }>
  Text: ComponentType<{ style?: StyleProp; fixed?: boolean; render?: (info: PageInfo) => ReactNode; children?: ReactNode }>
  Image: ComponentType<{ src: string; style?: StyleProp }>
}

export type RenderTarget = 'dom' | 'pdf'

export const PAGE_SIZES = {
  LETTER: { w: 612, h: 792, label: 'Letter' },
  A4: { w: 595.28, h: 841.89, label: 'A4' },
} as const

export const PAGE_PADDING = { top: 48, x: 48, bottom: 72 }
export const BODY_FONT_SIZE = 10
export const LINE_HEIGHT = 1.4

export const INK = '#1a1f36'
export const MUTED = '#697386'
export const LINE = '#e3e8ee'

const FOOTER = { fontSize: 8.5, paddingTop: 10, border: 1, offset: 30 }
const FOOTER_HEIGHT = FOOTER.paddingTop + FOOTER.border + FOOTER.fontSize * LINE_HEIGHT

const pt = (n: number) => `${n}pt`

const rule = (side: 'Top' | 'Bottom', color: string): Style => ({
  [`border${side}Width`]: pt(1),
  [`border${side}Style`]: 'solid',
  [`border${side}Color`]: color,
})

const s = {
  accent: (color: string): Style => ({
    position: 'absolute', top: 0, left: 0, right: 0, height: pt(5), backgroundColor: color,
  }),
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: pt(28), minHeight: pt(36) },
  brandName: { fontSize: pt(15), fontWeight: 600, paddingTop: pt(8) },
  pill: { backgroundColor: '#d7f7e8', borderRadius: pt(4), paddingTop: pt(3), paddingBottom: pt(3), paddingLeft: pt(8), paddingRight: pt(8) },
  pillText: { fontSize: pt(8.5), fontWeight: 600, color: '#0b6b45', textTransform: 'uppercase', letterSpacing: pt(0.6) },
  title: { fontSize: pt(22), fontWeight: 500, marginBottom: pt(14), lineHeight: 1.2 },
  meta: { marginBottom: pt(28) },
  metaRow: { flexDirection: 'row', marginBottom: pt(3) },
  metaLabel: { width: pt(112), color: MUTED },
  parties: { flexDirection: 'row', marginBottom: pt(30) },
  party: { flex: 1, paddingRight: pt(24) },
  partyLabel: { color: MUTED, marginBottom: pt(4) },
  partyName: { fontWeight: 600, marginBottom: pt(2) },
  hero: { fontSize: pt(16), fontWeight: 500, marginBottom: pt(22) },
  thead: { flexDirection: 'row', paddingBottom: pt(7), ...rule('Bottom', INK) },
  th: { fontSize: pt(9), fontWeight: 600 },
  tr: { flexDirection: 'row', paddingTop: pt(9), paddingBottom: pt(9), ...rule('Bottom', LINE) },
  colDesc: { flex: 1, paddingRight: pt(12) },
  colQty: { width: pt(56), textAlign: 'right' },
  colPrice: { width: pt(92), textAlign: 'right' },
  colAmount: { width: pt(92), textAlign: 'right' },
  totals: { alignItems: 'flex-end', marginTop: pt(2) },
  totalRow: { flexDirection: 'row', width: pt(240), paddingTop: pt(8), paddingBottom: pt(8), ...rule('Bottom', LINE) },
  totalRowLast: { flexDirection: 'row', width: pt(240), paddingTop: pt(8), paddingBottom: pt(8) },
  totalLabel: { flex: 1 },
  totalValue: { textAlign: 'right' },
  strong: { fontWeight: 600 },
  notes: { marginTop: pt(30) },
  notesLabel: { fontSize: pt(8.5), fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: pt(0.6), marginBottom: pt(6) },
  // react-pdf miscomputes the height of a fixed, absolutely positioned element when it
  // inherits a lineHeight, which breaks `bottom` anchoring. The PDF therefore anchors the
  // footer with `top`, computed from the page height; the DOM preview can grow taller than
  // one page, so it keeps `bottom`.
  footer: (pageHeight: number, target: RenderTarget): Style => ({
    position: 'absolute',
    left: pt(PAGE_PADDING.x),
    right: pt(PAGE_PADDING.x),
    ...(target === 'pdf' ? { top: pt(pageHeight - FOOTER.offset - FOOTER_HEIGHT) } : { bottom: pt(FOOTER.offset) }),
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: pt(FOOTER.paddingTop),
    ...rule('Top', LINE),
  }),
  footerText: { fontSize: pt(FOOTER.fontSize), color: MUTED },
} satisfies Record<string, Style | ((...a: never[]) => Style)>

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}

function logoSize(width: number, height: number) {
  const maxH = 36
  const maxW = 180
  const ratio = width > 0 && height > 0 ? width / height : 1
  let h = maxH
  let w = maxH * ratio
  if (w > maxW) {
    w = maxW
    h = maxW / ratio
  }
  return { width: pt(w), height: pt(h) }
}

function trimNum(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(n)
}

export function InvoiceLayout({ invoice, P, target = 'dom' }: { invoice: Invoice; P: Primitives; target?: RenderTarget }) {
  const { View, Text, Image } = P
  const t = computeTotals(invoice)
  const money = (n: number) => formatMoney(n, invoice.currency)
  const paid = invoice.status === 'paid'
  const page = PAGE_SIZES[invoice.pageSize]

  const fromLines = splitLines(invoice.from.address)
  const toLines = splitLines(invoice.to.address)
  const noteLines = splitLines(invoice.notes)
  const hasFrom = Boolean(invoice.from.name || invoice.from.email || fromLines.length)
  const hasTo = Boolean(invoice.to.name || invoice.to.email || toLines.length)
  const hasHeader = Boolean(invoice.logo || invoice.from.name || paid)
  const hasMeta = Boolean(invoice.number || invoice.issueDate || invoice.dueDate)
  const items = invoice.items.filter((it) => it.description.trim() || lineAmount(it.quantity, it.unitPrice) !== 0)

  const dueText = paid ? 'paid' : invoice.dueDate ? `due ${formatDate(invoice.dueDate)}` : 'due on receipt'
  const summary = `${money(t.amountDue)} ${invoice.currency} ${dueText}`

  return (
    <>
      <View style={s.accent(invoice.accent)} fixed />

      {hasHeader ? (
        <View style={s.header}>
          <View>
            {invoice.logo ? (
              <Image src={invoice.logo.src} style={logoSize(invoice.logo.width, invoice.logo.height)} />
            ) : invoice.from.name ? (
              <Text style={s.brandName}>{invoice.from.name}</Text>
            ) : null}
          </View>
          {paid ? (
            <View style={s.pill}>
              <Text style={s.pillText}>Paid</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={s.title}>Invoice</Text>

      {hasMeta ? (
        <View style={s.meta}>
          {invoice.number ? (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Invoice number</Text>
              <Text>{invoice.number}</Text>
            </View>
          ) : null}
          {invoice.issueDate ? (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date of issue</Text>
              <Text>{formatDate(invoice.issueDate)}</Text>
            </View>
          ) : null}
          {invoice.dueDate ? (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date due</Text>
              <Text>{formatDate(invoice.dueDate)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {hasFrom || hasTo ? (
        <View style={s.parties}>
          {hasFrom ? (
            <View style={s.party}>
              {invoice.from.name ? <Text style={s.partyName}>{invoice.from.name}</Text> : null}
              {fromLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
              {invoice.from.email ? <Text>{invoice.from.email}</Text> : null}
            </View>
          ) : null}
          {hasTo ? (
            <View style={s.party}>
              <Text style={s.partyLabel}>Bill to</Text>
              {invoice.to.name ? <Text style={s.partyName}>{invoice.to.name}</Text> : null}
              {toLines.map((line, i) => (
                <Text key={i}>{line}</Text>
              ))}
              {invoice.to.email ? <Text>{invoice.to.email}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={s.hero}>{summary}</Text>

      {items.length ? (
        <>
          <View style={s.thead}>
            <Text style={[s.th, s.colDesc]}>Description</Text>
            <Text style={[s.th, s.colQty]}>Qty</Text>
            <Text style={[s.th, s.colPrice]}>Unit price</Text>
            <Text style={[s.th, s.colAmount]}>Amount</Text>
          </View>

          {items.map((item) => (
            <View key={item.id} style={s.tr} wrap={false}>
              <Text style={s.colDesc}>{item.description || ' '}</Text>
              <Text style={s.colQty}>{formatQuantity(item.quantity)}</Text>
              <Text style={s.colPrice}>{money(lineAmount('1', item.unitPrice))}</Text>
              <Text style={s.colAmount}>{money(lineAmount(item.quantity, item.unitPrice))}</Text>
            </View>
          ))}

          <View style={s.totals} wrap={false}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{money(t.subtotal)}</Text>
            </View>
            {t.discount > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Discount ({trimNum(t.discountRate)}%)</Text>
                <Text style={s.totalValue}>-{money(t.discount)}</Text>
              </View>
            ) : null}
            {t.taxRate > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Tax ({trimNum(t.taxRate)}%)</Text>
                <Text style={s.totalValue}>{money(t.tax)}</Text>
              </View>
            ) : null}
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, s.strong]}>Total</Text>
              <Text style={[s.totalValue, s.strong]}>{money(t.total)}</Text>
            </View>
            {t.credit > 0 ? (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Credit applied</Text>
                <Text style={s.totalValue}>-{money(t.credit)}</Text>
              </View>
            ) : null}
            <View style={s.totalRowLast}>
              <Text style={[s.totalLabel, s.strong]}>{paid ? 'Amount paid' : 'Amount due'}</Text>
              <Text style={[s.totalValue, s.strong]}>
                {money(t.amountDue)} {invoice.currency}
              </Text>
            </View>
          </View>
        </>
      ) : null}

      {noteLines.length ? (
        <View style={s.notes} wrap={false}>
          <Text style={s.notesLabel}>Notes</Text>
          {noteLines.map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </View>
      ) : null}

      <View style={s.footer(page.h, target)} fixed>
        <Text style={s.footerText}>
          {invoice.number ? `${invoice.number} · ` : ''}
          {summary}
        </Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  )
}
