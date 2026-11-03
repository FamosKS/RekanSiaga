import type { ReactNode } from 'react'
export type FieldMeta = { label?: string; hint?: string; error?: string }
type FieldProps = FieldMeta & { id: string; children: ReactNode; className?: string }
export function Field({ id, label, hint, error, children, className }: FieldProps) {
  return (
    <div className={className ? `rs-field ${className}` : 'rs-field'}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {hint && <p className="rs-field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="rs-field__error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  )
}
