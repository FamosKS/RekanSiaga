import { LoaderCircle } from 'lucide-react'
export function LoadingState({ label = 'Memuat data...' }: { label?: string }) {
  return <div className="rs-state" role="status" aria-live="polite"><LoaderCircle className="spinner" size={28} aria-hidden="true"/><p>{label}</p></div>
}
