import type { ComponentPropsWithoutRef } from 'react'
import { classNames } from '../../lib/classNames'
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
type BadgeProps = ComponentPropsWithoutRef<'span'> & { tone?: BadgeTone }
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span {...props} className={classNames('rs-badge', `rs-tone--${tone}`, className)}/>
}
