import { useId, type ComponentPropsWithRef } from 'react'
import { classNames } from '../../lib/classNames'
import { Field, type FieldMeta } from './Field'
type SelectProps = ComponentPropsWithRef<'select'> & FieldMeta
export function Select({ id, label, hint, error, className, 'aria-describedby': describedBy, children, ...props }: SelectProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <select {...props} id={fieldId} className={classNames('rs-control', className)} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={classNames(describedBy, hint && `${fieldId}-hint`, error && `${fieldId}-error`) || undefined}>{children}</select>
    </Field>
  )
}
