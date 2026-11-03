import type { ComponentPropsWithoutRef } from 'react'
import { classNames } from '../../lib/classNames'
type SkeletonProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'>
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div {...props} aria-hidden="true" className={classNames('rs-skeleton', className)}/>
}
