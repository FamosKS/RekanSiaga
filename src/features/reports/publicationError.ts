import { ApiError } from '../../../supabase/functions/_shared/reportContract.ts'
export function publicationError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : ''
  if (code === 'UNAUTHORIZED') return 'Sesi Admin tidak valid atau kedaluwarsa. Masuk kembali sebelum mengelola publikasi foto.'
  if (code === 'FORBIDDEN') return 'Role akun tidak mengizinkan persetujuan atau pencabutan foto publik.'
  if (code === 'NOT_FOUND') return 'Lampiran tidak ditemukan atau tidak diizinkan untuk publikasi.'
  if (code === 'INVALID_PHOTO') return 'Foto ditolak oleh pemeriksaan format atau sanitasi. Foto asli tetap privat.'
  if (code === 'APPROVAL_FAILED') return 'Backend menolak persetujuan salinan foto. Periksa penerapan RPC approval dan kelayakan laporan verified.'
  if (code === 'REVOKE_FAILED') return 'Backend belum mengonfirmasi pencabutan publikasi foto. Periksa status sebelum mencoba kembali.'
  if (code === 'SOURCE_UNAVAILABLE') return 'Pipeline tidak dapat membaca foto asli atau ukuran foto melebihi batas.'
  if (code === 'PUBLIC_COPY_FAILED') return 'Pipeline gagal menyimpan salinan foto yang disanitasi. Periksa bucket tujuan dan deployment.'
  if (code === 'SERVICE_NOT_READY') return 'Konfigurasi function publikasi foto belum siap.'
  return 'Publikasi foto belum dapat dikonfirmasi. Periksa koneksi/CORS dan deployment report-publication. Jangan ulangi persetujuan sebelum memastikan hasil; tidak perlu mengirim ulang laporan.'
}
