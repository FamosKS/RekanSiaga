import { useState, type FormEvent } from 'react'
import { CheckCircle2, HeartHandshake } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
import { Dialog } from '../../components/ui/Dialog'
import { simulationCampaigns, simulationLabel } from './donationSimulation'
export function DonationSimulator() {
  const [campaign, setCampaign] = useState<string>(simulationCampaigns[0].id)
  const [amount, setAmount] = useState('100000')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [completed, setCompleted] = useState(false)
  const selected = simulationCampaigns.find(item => item.id === campaign)!
  const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amount))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (!Number.isInteger(Number(amount)) || Number(amount) < 1000 || Number(amount) > 100000000) { setError('Nominal contoh harus berupa bilangan bulat antara Rp1.000 dan Rp100.000.000.'); return }
    setConfirming(true)
  }
  if (completed) return <Card className="simulation-complete"><CheckCircle2 size={52} aria-hidden="true"/><h2>Latihan simulasi selesai</h2><p>{simulationLabel}</p><p>Skenario: {selected.title}</p><strong>{currency} (nominal contoh)</strong><p>Tidak ada uang dipindahkan, saldo dibuat, atau dana dikumpulkan.</p><Button onClick={() => setCompleted(false)}>Coba simulasi lagi</Button></Card>
  return <><form onSubmit={submit} noValidate className="simulation-layout"><section><h2>Pilih skenario simulasi</h2><p className="muted">Seluruh kartu berikut adalah skenario latihan, bukan campaign aktif atau kejadian nyata.</p><fieldset className="campaign-choices"><legend className="sr-only">Skenario simulasi donasi</legend>{simulationCampaigns.map(item => <label key={item.id} className={campaign === item.id ? 'campaign-choice is-selected' : 'campaign-choice'}><input type="radio" name="campaign" value={item.id} checked={campaign === item.id} onChange={() => setCampaign(item.id)}/><span><HeartHandshake size={24} aria-hidden="true"/><Badge tone="primary">SIMULASI</Badge><strong>{item.title}</strong><span>{item.description}</span></span></label>)}</fieldset></section><Card><h2>Nominal contoh</h2><p className="muted">Angka ini hanya digunakan untuk latihan antarmuka.</p><div className="amount-presets">{['100000', '250000', '500000'].map(value => <Button key={value} variant={amount === value ? 'primary' : 'secondary'} aria-pressed={amount === value} onClick={() => { setAmount(value); setError('') }}>Rp{Number(value).toLocaleString('id-ID')}</Button>)}</div><Input label="Nominal simulasi (rupiah)" type="number" min={1000} max={100000000} step={1000} value={amount} onChange={event => { setAmount(event.target.value); setError('') }} error={error}/><details open><summary>Detail skenario</summary><p>{selected.title}</p><p className="muted">{selected.description} Tidak ada penerima, rekening, atau payment gateway.</p></details><Button type="submit">Tinjau simulasi</Button></Card></form><Dialog open={confirming} onClose={() => setConfirming(false)} title="Konfirmasi simulasi" description={simulationLabel} footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Kembali</Button><Button onClick={() => { setConfirming(false); setCompleted(true) }}>Selesaikan simulasi</Button></>}><Alert tone="warning">{selected.title}<br/>Nominal contoh: {currency}<br/>Tidak ada pembayaran yang diproses.</Alert></Dialog></>
}
