import type { Invoice, LineItem, Logo, PageSize, Party, Status } from '../types'
import { ACCENTS, uid } from './defaults'

/**
 * Turns a loosely typed JSON payload (the HTTP API body) into a complete Invoice.
 * Everything is optional. Numbers may be numbers or strings. Missing sections stay
 * empty and are left out of the rendered PDF.
 */

type Dict = Record<string, unknown>

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v)

function str(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return ''
}

function numStr(v: unknown, fallback = '0'): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return v.trim()
  return fallback
}

function party(v: unknown): Party {
  if (typeof v === 'string') return { name: v, email: '', address: '' }
  const d = isDict(v) ? v : {}
  const address = Array.isArray(d.address) ? d.address.map(str).filter(Boolean).join('\n') : str(d.address)
  return { name: str(d.name), email: str(d.email), address }
}

function item(v: unknown): LineItem {
  if (typeof v === 'string') return { id: uid(), description: v, quantity: '1', unitPrice: '0' }
  const d = isDict(v) ? v : {}
  const unit = d.unitPrice ?? d.price ?? d.rate ?? d.amount
  return {
    id: uid(),
    description: str(d.description ?? d.name ?? d.title),
    quantity: numStr(d.quantity ?? d.qty, '1'),
    unitPrice: numStr(unit, '0'),
  }
}

function logo(v: unknown): Logo | null {
  if (!isDict(v)) return null
  const width = Number(v.width)
  const height = Number(v.height)
  if (typeof v.src !== 'string' || !v.src || !(width > 0) || !(height > 0)) return null
  return { src: v.src, width, height }
}

export function normalizeInvoice(input: unknown): Invoice {
  const d = isDict(input) ? input : {}
  const currency = str(d.currency).trim().toUpperCase()
  const accent = str(d.accent ?? d.accentColor).trim()
  const pageSize = str(d.pageSize ?? d.paper).trim().toUpperCase()
  const status = str(d.status).trim().toLowerCase()
  const rawItems = Array.isArray(d.items) ? d.items : Array.isArray(d.lineItems) ? d.lineItems : []

  return {
    number: str(d.number ?? d.invoiceNumber).trim(),
    issueDate: str(d.issueDate ?? d.date).trim(),
    dueDate: str(d.dueDate).trim(),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
    status: (status === 'paid' ? 'paid' : 'unpaid') satisfies Status,
    accent: /^#[0-9a-f]{6}$/i.test(accent) ? accent : ACCENTS[0],
    pageSize: (pageSize === 'A4' ? 'A4' : 'LETTER') satisfies PageSize,
    from: party(d.from ?? d.sender ?? d.business),
    to: party(d.to ?? d.client ?? d.customer ?? d.billTo),
    items: rawItems.map(item),
    taxRate: numStr(d.taxRate ?? d.tax),
    discount: numStr(d.discount ?? d.discountRate),
    credit: numStr(d.credit),
    notes: Array.isArray(d.notes) ? d.notes.map(str).filter(Boolean).join('\n') : str(d.notes ?? d.memo),
    logo: logo(d.logo),
  }
}
