import type { ComponentProps } from 'react'

/** Stacked invoice sheets with a folded corner, three lines and a dollar sign. */
export function Logo(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M11 16v24a4 4 0 0 0 4 4h17" />
      <path d="M30 6H20a4 4 0 0 0-4 4v26a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4V16" />
      <path d="M31 5v8a2 2 0 0 0 2 2h8z" fill="currentColor" stroke="none" />
      <path d="M22 18h10M22 23.5h8M22 29h5.5" strokeWidth="3" />
      <path d="M36.2 27.6c-.8-1.2-2.6-1.6-3.9-1-1.6.7-1.6 2.7-.1 3.4l2.6 1.1c1.6.7 1.5 2.9-.2 3.5-1.4.5-3.2 0-3.9-1.2M33.5 24.6v12.2" strokeWidth="2.4" />
    </svg>
  )
}
