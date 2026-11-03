import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open && !element.open) element.showModal()
    else if (!open && element.open) element.close()
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [open])
  return (
    <dialog ref={dialog} onKeyDown={event => {
      if (event.key !== 'Tab') return
      const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex="0"]')).filter(element => element.getClientRects().length > 0)
      const first = targets[0]
      const last = targets[targets.length - 1]
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }} className="rs-dialog" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
      onCancel={event => { event.preventDefault() }}>
      <div className="rs-dialog__content">
        <header className="rs-dialog__header">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" size="icon" autoFocus aria-label="Tutup dialog" onClick={onClose}><X size={20} aria-hidden="true"/></Button>
        </header>
        {description && <p className="muted" id={descriptionId}>{description}</p>}
        <div className="rs-dialog__body">{children}</div>
        {footer && <footer className="rs-dialog__footer">{footer}</footer>}
      </div>
    </dialog>
  )
}
