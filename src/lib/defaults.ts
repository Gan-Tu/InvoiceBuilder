import type { Invoice } from '../types'
import { addDays, toISODate } from './dates'

export const ACCENTS = ['#635bff', '#1a1f36', '#0570de', '#0e9f6e', '#f0932b', '#e5467a', '#0d9488']

export function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function sampleInvoice(): Invoice {
  const today = toISODate(new Date())
  return {
    number: 'INV-0001',
    issueDate: today,
    dueDate: addDays(today, 14),
    currency: 'USD',
    status: 'unpaid',
    accent: ACCENTS[0],
    pageSize: 'LETTER',
    from: {
      name: 'Northwind Studio',
      email: 'billing@northwind.studio',
      address: '1 Market Street, Suite 400\nSan Francisco, CA 94105\nUnited States',
    },
    to: {
      name: 'Acme Corporation',
      email: 'accounts@acme.com',
      address: '548 Market Street\nSan Francisco, CA 94104\nUnited States',
    },
    items: [
      { id: uid(), description: 'Product design — October sprint', quantity: '40', unitPrice: '150' },
      { id: uid(), description: 'Frontend development', quantity: '32', unitPrice: '150' },
      { id: uid(), description: 'Hosting and maintenance', quantity: '1', unitPrice: '49' },
    ],
    taxRate: '0',
    discount: '0',
    credit: '0',
    notes: 'Thank you for your business. Payment is due within 14 days of the issue date by bank transfer.',
    logo: null,
  }
}

export function blankInvoice(base: Invoice): Invoice {
  const today = toISODate(new Date())
  return {
    ...base,
    number: nextNumber(base.number),
    issueDate: today,
    dueDate: addDays(today, 14),
    status: 'unpaid',
    credit: '0',
    to: { name: '', email: '', address: '' },
    items: [{ id: uid(), description: '', quantity: '1', unitPrice: '' }],
  }
}

export function nextNumber(current: string): string {
  const m = /^(.*?)(\d+)$/.exec(current.trim())
  if (!m) return current ? `${current}-2` : 'INV-0001'
  const digits = m[2]
  const next = String(Number(digits) + 1).padStart(digits.length, '0')
  return `${m[1]}${next}`
}
