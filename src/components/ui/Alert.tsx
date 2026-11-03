import type { HTMLAttributes, ReactNode } from 'react'
import { CircleAlert, Info } from 'lucide-react'
import { classNames } from '../../lib/classNames'
type AlertProps = HTMLAttributes<HTMLDivElement> & { tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'; heading?: string; icon?: ReactNode }
export function Alert({ tone = 'neutral', heading, icon, role, className, children, ...props }: AlertProps) {
  return (
    <div {...props} role={role ?? (tone === 'danger' ? 'alert' : 'status')} className={classNames('rs-alert', `rs-tone--${tone}`, className)}>
      <span className="rs-alert__icon" aria-hidden="true">{icon ?? (tone === 'danger' ? <CircleAlert size={20}/> : <Info size={20}/>)}</span>
      <div>{heading && <p className="rs-alert__heading">{heading}</p>}{children}</div>
    </div>
  )
}
