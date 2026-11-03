import { Button } from '../ui/Button'
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return <nav className="pagination" aria-label="Halaman hasil"><Button variant="secondary" disabled={page <= 1 || totalPages === 0} onClick={() => onChange(page - 1)}>Sebelumnya</Button><span aria-live="polite">{totalPages ? `Halaman ${page} dari ${totalPages}` : 'Belum ada halaman hasil'}</span><Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Berikutnya</Button></nav>
}
