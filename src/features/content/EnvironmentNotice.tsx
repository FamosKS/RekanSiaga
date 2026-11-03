import { usePublicConfig } from './usePublicConfig'
import { Alert } from '../../components/ui/Alert'
export function EnvironmentNotice() {
  const config = usePublicConfig()
  return <Alert tone="primary"><strong>DEVELOPMENT - rekansiaga-dev</strong><p>Konten dibaca dari database bersama. Daftar kosong bukan tanda wilayah aman. Data diperbarui otomatis saat tab aktif dan koneksi pulih; sinkronisasi BMKG langsung belum tersedia.</p>{config.data?.public_notice && <p>{config.data.public_notice}</p>}{config.isError && <p>Pengaturan publik belum dapat dibaca.</p>}</Alert>
}
