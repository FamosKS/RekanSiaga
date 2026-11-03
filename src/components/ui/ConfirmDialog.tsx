import { Dialog } from './Dialog'
import { Button } from './Button'
export function ConfirmDialog({ open, onClose, title, description }: { open: boolean; onClose: () => void; title: string; description: string }) {
  return <Dialog open={open} onClose={onClose} title={title} description={description} footer={<><Button variant="secondary" onClick={onClose}>Kembali ke draf</Button><Button disabled>Konfirmasi belum tersedia</Button></>}><p>Konfirmasi server dan pemeriksaan izin belum terintegrasi. Tidak ada perubahan yang disimpan atau dikirim.</p></Dialog>
}
