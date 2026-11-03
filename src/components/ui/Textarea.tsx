import { useId, type ComponentPropsWithRef } from 'react'
import { classNames } from '../../lib/classNames'
import { Field, type FieldMeta } from './Field'
type TextareaProps = ComponentPropsWithRef<'textarea'> & FieldMeta
export function Textarea({ id, label, hint, error, className, 'aria-describedby': describedBy, rows = 4, ...props }: TextareaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <textarea {...props} rows={rows} id={fieldId} className={classNames('rs-control', className)} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={classNames(describedBy, hint && `${fieldId}-hint`, error && `${fieldId}-error`) || undefined}/>
    </Field>
  )
}
