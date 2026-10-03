import { useCallback, useEffect, useState } from 'react'
import type { Invoice } from '../types'
import { sampleInvoice } from './defaults'
import { applyQueryPrefill } from './prefill'

const KEY = 'invoice:v1'
export const SAVED_COOKIE = 'invoice_saved_v1'
const SAVED_PREFIX = 'invoice:saved:v1:'
const ONE_YEAR = 365 * 24 * 60 * 60
// Leave room beneath browsers' per-cookie and request-header limits.
const MAX_COOKIE_VALUE = 3500
const MAX_COOKIE_HEADER = 7800

type SavedEnvelope = { v: 1; invoice?: Omit<Invoice, 'logo'>; logoKey?: string; storageKey?: string }

function normalizeInvoice(value: unknown, fallback: Invoice): Invoice | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const parsed = value as Partial<Invoice>
  const strings = ['number', 'issueDate', 'dueDate', 'currency', 'accent', 'taxRate', 'discount', 'credit', 'notes'] as const
  if (strings.some(key => parsed[key] !== undefined && typeof parsed[key] !== 'string')) return null
  const partyValid = (party: unknown) => party === undefined || (
    !!party && typeof party === 'object' && !Array.isArray(party) &&
    ['name', 'email', 'address'].every(key => typeof (party as Record<string, unknown>)[key] === 'string')
  )
  if (!partyValid(parsed.from) || !partyValid(parsed.to)) return null
  if (parsed.status !== undefined && parsed.status !== 'paid' && parsed.status !== 'unpaid') return null
  if (parsed.pageSize !== undefined && parsed.pageSize !== 'LETTER' && parsed.pageSize !== 'A4') return null
  if (parsed.items !== undefined && (!Array.isArray(parsed.items) || parsed.items.some(item =>
    !item || ['id', 'description', 'quantity', 'unitPrice'].some(key => typeof (item as Record<string, unknown>)[key] !== 'string')
  ))) return null
  if (parsed.logo !== undefined && parsed.logo !== null && (
    typeof parsed.logo !== 'object' || typeof parsed.logo.src !== 'string' ||
    typeof parsed.logo.width !== 'number' || !Number.isFinite(parsed.logo.width) || parsed.logo.width <= 0 ||
    typeof parsed.logo.height !== 'number' || !Number.isFinite(parsed.logo.height) || parsed.logo.height <= 0
  )) return null
  return {
    ...fallback, ...parsed,
    from: { ...fallback.from, ...parsed.from },
    to: { ...fallback.to, ...parsed.to },
  }
}

function cookieValue(cookieHeader: string): string | undefined {
  return cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${SAVED_COOKIE}=`))?.slice(SAVED_COOKIE.length + 1)
}

export function loadSavedInvoice(cookieHeader: string, storage: Pick<Storage, 'getItem'>, fallback: Invoice): Invoice | null {
  try {
    const raw = cookieValue(cookieHeader)
    if (!raw) return null
    const envelope = JSON.parse(decodeURIComponent(raw)) as SavedEnvelope
    if (!envelope || envelope.v !== 1) return null
    if (envelope.storageKey) {
      if (!envelope.storageKey.startsWith(SAVED_PREFIX)) return null
      const stored = storage.getItem(envelope.storageKey)
      return stored ? normalizeInvoice(JSON.parse(stored), fallback) : null
    }
    const invoice = normalizeInvoice(envelope.invoice, { ...fallback, logo: null })
    if (!invoice) return null
    if (envelope.logoKey) {
      if (!envelope.logoKey.startsWith(SAVED_PREFIX)) return null
      const logo = storage.getItem(envelope.logoKey)
      if (logo) return normalizeInvoice({ ...invoice, logo: JSON.parse(logo) }, fallback)
    }
    return invoice
  } catch {
    return null
  }
}

export function saveInvoice(invoice: Invoice, cookieDocument: Pick<Document, 'cookie' | 'location'> = document, storage?: Storage): void {
  const previousRaw = cookieValue(cookieDocument.cookie)
  const revision = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const newKeys: string[] = []
  try {
    const { logo, ...fields } = invoice
    const envelope: SavedEnvelope = { v: 1, invoice: fields }
    if (logo) {
      storage ??= localStorage
      envelope.logoKey = `${SAVED_PREFIX}${revision}:logo`
      storage.setItem(envelope.logoKey, JSON.stringify(logo))
      newKeys.push(envelope.logoKey)
    }
    let encoded = encodeURIComponent(JSON.stringify(envelope))
    if (encoded.length > MAX_COOKIE_VALUE) {
      storage ??= localStorage
      const storageKey = `${SAVED_PREFIX}${revision}:invoice`
      storage.setItem(storageKey, JSON.stringify(invoice))
      newKeys.push(storageKey)
      encoded = encodeURIComponent(JSON.stringify({ v: 1, storageKey }))
    }
    const otherCookies = cookieDocument.cookie.split(';').map(part => part.trim()).filter(part => part && !part.startsWith(`${SAVED_COOKIE}=`)).join('; ')
    if (new TextEncoder().encode(`${otherCookies}; ${SAVED_COOKIE}=${encoded}`).length > MAX_COOKIE_HEADER) {
      throw new Error('Your browser has too many cookies for this site. Clear some site cookies and try again.')
    }
    cookieDocument.cookie = `${SAVED_COOKIE}=${encoded}; Max-Age=${ONE_YEAR}; Path=/; SameSite=Lax${cookieDocument.location.protocol === 'https:' ? '; Secure' : ''}`
    if (cookieValue(cookieDocument.cookie) !== encoded) {
      throw new Error('Could not save your invoice. Allow cookies for this site and try again.')
    }
    // Remove only the old saved snapshot after the replacement cookie is confirmed.
    if (previousRaw) {
      try {
        const previous = JSON.parse(decodeURIComponent(previousRaw)) as SavedEnvelope
        for (const key of [previous.logoKey, previous.storageKey]) {
          if (typeof key === 'string' && key.startsWith(SAVED_PREFIX)) (storage ?? localStorage).removeItem(key)
        }
      } catch { /* An invalid old snapshot should not prevent saving. */ }
    }
    // A complete snapshot already contains the logo.
    if (newKeys.length === 2) {
      try { storage?.removeItem(newKeys[0]) } catch { /* Cleanup is best effort. */ }
    }
  } catch (error) {
    for (const key of newKeys) {
      try { storage?.removeItem(key) } catch { /* Storage may be unavailable. */ }
    }
    if (error instanceof Error && error.message.includes('try again')) throw error
    throw new Error('Could not save your invoice. Browser storage may be full or unavailable. Free some space and try again.')
  }
}

export function loadInitial() {
  const fallback = sampleInvoice()
  let base = fallback
  try {
    let storage: Pick<Storage, 'getItem'> = { getItem: () => null }
    try { storage = localStorage } catch { /* Small saved invoices need only cookies. */ }
    const saved = loadSavedInvoice(document.cookie, storage, fallback)
    if (saved) base = saved
    else {
      const draft = storage.getItem(KEY)
      base = (draft ? normalizeInvoice(JSON.parse(draft), fallback) : null) ?? fallback
    }
  } catch { /* Cookies or storage may be unavailable. */ }
  return applyQueryPrefill(base, typeof window === 'undefined' ? '' : window.location.search)
}

export function usePersistedInvoice() {
  const [initial] = useState(loadInitial)
  const [invoice, setInvoice] = useState<Invoice>(initial.invoice)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(invoice))
    } catch {
      // Storage may be full (large logo) or unavailable; keep working in memory.
    }
  }, [invoice])
  const save = useCallback(() => saveInvoice(invoice), [invoice])
  return [invoice, setInvoice, save, initial.error] as const
}
