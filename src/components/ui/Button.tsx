import type { ComponentPropsWithRef } from 'react'
import { LoaderCircle } from 'lucide-react'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles'
type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}
export function Button({ variant = 'primary', size = 'md', loading = false, disabled, type = 'button', className, children, ...props }: ButtonProps) {
  return (
    <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={buttonStyles(variant, size, className)}>
      {loading && <LoaderCircle className="spinner" size={18} aria-hidden="true"/>}
      {children}
    </button>
  )
}
