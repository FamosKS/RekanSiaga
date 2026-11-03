import { useState } from 'react'
import { Button } from '../../components/ui/Button'
export function ChecklistGroup({ items, title, demo = false }: { items: readonly string[]; title: string; demo?: boolean }) {
  const [checked, setChecked] = useState<readonly number[]>([])
  const count = checked.filter(index => index < items.length).length
  const percent = items.length ? Math.round(count / items.length * 100) : 0
  return <section className="checklist-group"><div className="section-heading"><h2>{title}</h2><span aria-live="polite">{count} / {items.length} dipilih</span></div><label className="checklist-progress">Progres {demo ? 'contoh ' : ''}di perangkat<progress max={items.length || 1} value={count}/><small>{percent}% pilihan checklist lokal</small></label>{demo && <p className="muted">Contoh interaksi UI, bukan panduan resmi. Tidak tersinkronisasi atau disimpan ke backend.</p>}<fieldset><legend className="sr-only">{title}</legend>{items.map((item, index) => <label key={index} className="check"><input type="checkbox" checked={checked.includes(index)} onChange={event => setChecked(previous => event.target.checked ? [...previous, index] : previous.filter(value => value !== index))}/>{item}</label>)}</fieldset><Button variant="secondary" size="sm" disabled={!checked.length} onClick={() => setChecked([])}>Atur ulang checklist</Button></section>
}
