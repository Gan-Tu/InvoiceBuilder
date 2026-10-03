import type { ComponentProps, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from '../lib/cx'

export const inputClass =
  'w-full h-9 rounded-lg border border-line bg-white px-3 text-[13px] text-ink placeholder:text-neutral-400 ' +
  'outline-none transition-[border-color,box-shadow] duration-150 focus:border-ink/50 focus:ring-[3px] focus:ring-ink/8'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={cx(inputClass, className)} />
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea rows={3} {...props} className={cx(inputClass, 'h-auto resize-none py-2 leading-5', className)} />
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select {...props} className={cx(inputClass, 'appearance-none pr-8', className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-neutral-400" />
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block min-w-0', className)}>
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-muted">
        <span>{label}</span>
        {hint ? <span className="font-normal text-neutral-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line px-6 py-5 last:border-b-0">
      <div className="mb-3.5 flex h-6 items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: Array<{ value: T; label: ReactNode }>
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cx('inline-flex h-9 w-full rounded-lg border border-line bg-neutral-50 p-0.5', className)} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150',
              active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(26,31,54,0.12),0_0_0_1px_rgba(26,31,54,0.06)]' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'outline' | 'ghost'; size?: 'sm' | 'md' }

export function Button({ variant = 'outline', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition-[background-color,color,opacity,transform] duration-150',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
        variant === 'primary' && 'bg-ink text-white hover:bg-[#2b3150]',
        variant === 'outline' && 'border border-line bg-white text-ink hover:bg-neutral-50',
        variant === 'ghost' && 'text-muted hover:bg-neutral-100 hover:text-ink',
        className,
      )}
    />
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="ml-1 rounded-[5px] border border-white/20 bg-white/10 px-1.5 py-px font-sans text-[10.5px] font-medium text-white/80">
      {children}
    </kbd>
  )
}
