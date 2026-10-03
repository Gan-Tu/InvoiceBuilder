import { useEffect, useState } from 'react'
import type { Invoice } from '../types'
import { sampleInvoice } from './defaults'

const KEY = 'invoice:v1'

function load(): Invoice {
  const fallback = sampleInvoice()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Invoice>
    return {
      ...fallback,
      ...parsed,
      from: { ...fallback.from, ...(parsed.from ?? {}) },
      to: { ...fallback.to, ...(parsed.to ?? {}) },
      items: Array.isArray(parsed.items) && parsed.items.length ? parsed.items : fallback.items,
    }
  } catch {
    return fallback
  }
}

export function usePersistedInvoice() {
  const [invoice, setInvoice] = useState<Invoice>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(invoice))
    } catch {
      // Storage may be full (large logo) or unavailable; keep working in memory.
    }
  }, [invoice])
  return [invoice, setInvoice] as const
}
