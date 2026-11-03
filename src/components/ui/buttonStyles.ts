import { classNames } from '../../lib/classNames'
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'
export function buttonStyles(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return classNames('rs-button', `rs-button--${variant}`, `rs-button--${size}`, className)
}
