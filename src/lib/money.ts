import type { Invoice } from '../types'

export function parseNum(value: string): number {
  const n = parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function lineAmount(quantity: string, unitPrice: string): number {
  return round2(parseNum(quantity) * parseNum(unitPrice))
}

export function computeTotals(inv: Invoice) {
  const subtotal = round2(inv.items.reduce((sum, it) => sum + lineAmount(it.quantity, it.unitPrice), 0))
  const discountRate = parseNum(inv.discount)
  const taxRate = parseNum(inv.taxRate)
  const discount = round2(subtotal * (discountRate / 100))
  const taxable = subtotal - discount
  const tax = round2(taxable * (taxRate / 100))
  const total = round2(taxable + tax)
  const credit = Math.min(round2(Math.max(0, parseNum(inv.credit))), total)
  const amountDue = round2(total - credit)
  return { subtotal, discount, discountRate, tax, taxRate, total, credit, amountDue }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(amount: number, currency: string): string {
  let f = formatters.get(currency)
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    } catch {
      f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' })
    }
    formatters.set(currency, f)
  }
  return f.format(amount)
}

export function formatQuantity(quantity: string): string {
  const n = parseNum(quantity)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
}

export const CURRENCIES = [
  ['USD', 'US Dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'British Pound'],
  ['CAD', 'Canadian Dollar'],
  ['AUD', 'Australian Dollar'],
  ['CHF', 'Swiss Franc'],
  ['JPY', 'Japanese Yen'],
  ['INR', 'Indian Rupee'],
  ['SGD', 'Singapore Dollar'],
  ['SEK', 'Swedish Krona'],
  ['NOK', 'Norwegian Krone'],
  ['DKK', 'Danish Krone'],
  ['PLN', 'Polish Zloty'],
  ['BRL', 'Brazilian Real'],
  ['MXN', 'Mexican Peso'],
  ['NZD', 'New Zealand Dollar'],
  ['HKD', 'Hong Kong Dollar'],
  ['AED', 'UAE Dirham'],
] as const
