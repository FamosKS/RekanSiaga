import type { HTMLAttributes } from 'react'
import { classNames } from '../../lib/classNames'
type CardProps = HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' | 'article'; padding?: 'sm' | 'md' | 'lg' }
export function Card({ as: Element = 'div', padding = 'md', className, ...props }: CardProps) {
  return <Element {...props} className={classNames('rs-card', `rs-card--${padding}`, className)}/>
}
