import type { ComponentProps } from 'react'
import { cx } from '../lib/cx'

/** The Invoice Builder mark: stacked invoice sheets with a dollar sign. */
export function Logo({ className, ...props }: ComponentProps<'img'>) {
  return <img src="/logo.png" alt="" draggable={false} {...props} className={cx('select-none', className)} />
}
