import { Check } from 'lucide-react'
import type { Invoice, LineItem, Party } from '../types'
import { ACCENTS, uid } from '../lib/defaults'
import { CURRENCIES } from '../lib/money'
import { cx } from '../lib/cx'
import { Field, Input, Section, Segmented, Select, TextArea } from './ui'
import { LogoUpload } from './LogoUpload'
import { LineItems } from './LineItems'

type Props = {
  invoice: Invoice
  onChange: (next: Invoice) => void
}

export function Editor({ invoice, onChange }: Props) {
  const set = (patch: Partial<Invoice>) => onChange({ ...invoice, ...patch })
  const setParty = (key: 'from' | 'to', patch: Partial<Party>) => set({ [key]: { ...invoice[key], ...patch } })
  const setItem = (id: string, patch: Partial<LineItem>) =>
    set({ items: invoice.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })
  const addItem = () => set({ items: [...invoice.items, { id: uid(), description: '', quantity: '1', unitPrice: '' }] })
  const removeItem = (id: string) => {
    if (invoice.items.length === 1) return
    set({ items: invoice.items.filter((it) => it.id !== id) })
  }

  return (
    <div>
      <Section title="Your business">
        <div className="space-y-3">
          <LogoUpload logo={invoice.logo} onChange={(logo) => set({ logo })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={invoice.from.name} onChange={(e) => setParty('from', { name: e.target.value })} placeholder="Your company" />
            </Field>
            <Field label="Email">
              <Input type="email" value={invoice.from.email} onChange={(e) => setParty('from', { email: e.target.value })} placeholder="billing@company.com" />
            </Field>
          </div>
          <Field label="Address">
            <TextArea value={invoice.from.address} onChange={(e) => setParty('from', { address: e.target.value })} placeholder={'Street\nCity, State ZIP\nCountry'} />
          </Field>
        </div>
      </Section>

      <Section title="Bill to">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <Input value={invoice.to.name} onChange={(e) => setParty('to', { name: e.target.value })} placeholder="Client name" />
            </Field>
            <Field label="Email">
              <Input type="email" value={invoice.to.email} onChange={(e) => setParty('to', { email: e.target.value })} placeholder="client@company.com" />
            </Field>
          </div>
          <Field label="Address">
            <TextArea value={invoice.to.address} onChange={(e) => setParty('to', { address: e.target.value })} placeholder={'Street\nCity, State ZIP\nCountry'} />
          </Field>
        </div>
      </Section>

      <Section title="Details">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invoice number">
              <Input value={invoice.number} onChange={(e) => set({ number: e.target.value })} placeholder="INV-0001" className="tabular-nums" />
            </Field>
            <Field label="Currency">
              <Select value={invoice.currency} onChange={(e) => set({ currency: e.target.value })}>
                {CURRENCIES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {code} · {name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of issue">
              <Input type="date" value={invoice.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
            </Field>
            <Field label="Date due">
              <Input type="date" value={invoice.dueDate} min={invoice.issueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Segmented
                value={invoice.status}
                onChange={(status) => set({ status })}
                options={[
                  { value: 'unpaid', label: 'Due' },
                  { value: 'paid', label: 'Paid' },
                ]}
              />
            </Field>
            <Field label="Paper">
              <Segmented
                value={invoice.pageSize}
                onChange={(pageSize) => set({ pageSize })}
                options={[
                  { value: 'LETTER', label: 'Letter' },
                  { value: 'A4', label: 'A4' },
                ]}
              />
            </Field>
          </div>
          <Field label="Accent">
            <div className="flex h-9 items-center gap-2">
              {ACCENTS.map((color) => {
                const active = color.toLowerCase() === invoice.accent.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Accent ${color}`}
                    onClick={() => set({ accent: color })}
                    style={{ backgroundColor: color }}
                    className={cx(
                      'flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110',
                      active && 'ring-2 ring-ink/80 ring-offset-2 ring-offset-white',
                    )}
                  >
                    {active ? <Check className="size-3.5 text-white" strokeWidth={3} /> : null}
                  </button>
                )
              })}
              <label
                className="relative ml-1 flex size-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-neutral-400 hover:text-ink"
                title="Custom color"
              >
                <span className="text-sm leading-none">+</span>
                <input
                  type="color"
                  value={invoice.accent}
                  onChange={(e) => set({ accent: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Items">
        <LineItems items={invoice.items} currency={invoice.currency} onChange={setItem} onAdd={addItem} onRemove={removeItem} />
      </Section>

      <Section title="Adjustments">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tax rate" hint="%">
            <Input value={invoice.taxRate} inputMode="decimal" placeholder="0" className="tabular-nums" onChange={(e) => set({ taxRate: e.target.value })} />
          </Field>
          <Field label="Discount" hint="%">
            <Input value={invoice.discount} inputMode="decimal" placeholder="0" className="tabular-nums" onChange={(e) => set({ discount: e.target.value })} />
          </Field>
          <Field label="Credit" hint={invoice.currency}>
            <Input value={invoice.credit} inputMode="decimal" placeholder="0.00" className="tabular-nums" onChange={(e) => set({ credit: e.target.value })} />
          </Field>
        </div>
        <p className="mt-2.5 text-xs leading-5 text-neutral-400">Credit is a fixed amount already paid or owed back. It is subtracted from the total to give the amount due, and only appears when set.</p>
      </Section>

      <Section title="Notes">
        <TextArea value={invoice.notes} rows={3} onChange={(e) => set({ notes: e.target.value })} placeholder="Payment terms, bank details, a thank-you…" />
      </Section>
    </div>
  )
}
