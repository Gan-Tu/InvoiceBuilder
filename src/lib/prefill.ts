import type { Invoice } from '../types'
import { normalizeInvoice } from './normalize.js'

type Dict = Record<string, unknown>
const isDict = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value)

const fields = {
  number: ['number', 'invoiceNumber'],
  issueDate: ['issueDate', 'date'],
  dueDate: ['dueDate'],
  currency: ['currency'],
  status: ['status'],
  accent: ['accent', 'accentColor'],
  pageSize: ['pageSize', 'paper'],
  taxRate: ['taxRate', 'tax'],
  discount: ['discount', 'discountRate'],
  credit: ['credit'],
  notes: ['notes', 'memo'],
  from: ['from', 'sender', 'business'],
  to: ['to', 'client', 'customer', 'billTo'],
  items: ['items', 'lineItems'],
  logo: ['logo'],
} as const

function canonicalize(input: Dict): Dict {
  const result: Dict = {}
  for (const [field, aliases] of Object.entries(fields)) {
    const alias = aliases.find((key) => Object.hasOwn(input, key))
    if (alias !== undefined) result[field] = input[alias]
  }
  return result
}

/** URL values overlay the saved invoice; omitted fields and party details survive. */
export function applyQueryPrefill(base: Invoice, search: string | URLSearchParams): {
  invoice: Invoice
  error: string | null
  applied: boolean
} {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  try {
    let patch: Dict = {}
    if (params.has('invoice')) {
      let payload: unknown
      try { payload = JSON.parse(params.get('invoice')!) } catch { throw new Error('The invoice URL parameter must contain valid JSON.') }
      if (!isDict(payload)) throw new Error('The invoice URL parameter must contain a JSON object.')
      patch = canonicalize(payload)
    }

    // Individual query parameters take precedence over the invoice JSON payload.
    for (const [field, aliases] of Object.entries(fields)) {
      if (field === 'from' || field === 'to' || field === 'items' || field === 'logo') continue
      const alias = aliases.find((key) => params.has(key))
      if (alias !== undefined) patch[field] = params.get(alias)
    }
    const itemsKey = fields.items.find((key) => params.has(key))
    if (itemsKey !== undefined) {
      try { patch.items = JSON.parse(params.get(itemsKey)!) } catch { throw new Error('The items URL parameter must contain valid JSON.') }
    }
    if (Object.hasOwn(patch, 'items') && (!Array.isArray(patch.items) || !patch.items.every((item) => isDict(item) || typeof item === 'string'))) {
      throw new Error('URL invoice items must be a JSON array of line items.')
    }

    for (const side of ['from', 'to'] as const) {
      let partyPatch = patch[side]
      if (typeof partyPatch === 'string') partyPatch = { name: partyPatch }
      if (partyPatch != null && !isDict(partyPatch)) throw new Error(`URL ${side} details must be an object or a name.`)
      const party: Dict = isDict(partyPatch) ? { ...partyPatch } : {}
      let supplied = Object.hasOwn(patch, side)
      for (const field of ['name', 'email', 'address'] as const) {
        const key = `${side}.${field}`
        if (params.has(key)) {
          party[field] = params.get(key)
          supplied = true
        }
      }
      if (supplied) patch[side] = { ...base[side], ...party }
    }

    if (Object.keys(patch).length === 0) return { invoice: base, error: null, applied: false }
    const invoice = normalizeInvoice({ ...base, ...patch })
    if (!Object.hasOwn(patch, 'items')) invoice.items = base.items
    return { invoice, error: null, applied: true }
  } catch (error) {
    return { invoice: base, error: error instanceof Error ? error.message : 'Could not read the invoice URL parameters.', applied: false }
  }
}
