import { decodeTrackingCredential } from '../../../supabase/functions/_shared/trackingCredential.ts'
import { z } from 'zod'
import { reportTrackingCodePattern } from '../../../supabase/functions/_shared/reportContract.ts'
export const reportTypes = ['Banjir', 'Gempa bumi', 'Tanah longsor', 'Kebakaran', 'Gunung api', 'Lainnya'] as const
export const reportSchema = z.object({
  type: z.enum(reportTypes, { error: 'Pilih jenis kejadian.' }),
  title: z.string().trim().min(5, 'Judul minimal 5 karakter.').max(140, 'Judul maksimal 140 karakter.'),
  description: z.string().trim().min(20, 'Deskripsi minimal 20 karakter.').max(2000, 'Deskripsi maksimal 2.000 karakter.'),
  region: z.string().trim().min(3, 'Tuliskan wilayah kejadian.').max(120, 'Wilayah maksimal 120 karakter.'),
  location: z.string().trim().min(5, 'Tuliskan alamat atau koordinat yang lebih lengkap.').max(300, 'Lokasi maksimal 300 karakter.'),
  privacy: z.boolean().refine(value => value, 'Persetujuan privasi diperlukan untuk pemeriksaan draf.'),
})
export type ReportFields = z.infer<typeof reportSchema>
export const trackingSchema = z.object({
  code: z.string().trim().toUpperCase().regex(reportTrackingCodePattern, 'Gunakan kode RS- dengan 16 karakter hex atau RPT- dengan 10 huruf/angka.'),
  token: z.string().trim().regex(/^[a-f0-9]{64}$/, 'Token harus 64 karakter hex.'),
})
export type TrackingFields = z.infer<typeof trackingSchema>

export const singleTrackingSchema = z.object({
  code: z.string().trim().max(100).refine(value => { try { decodeTrackingCredential(value); return true } catch { return false } }, 'Masukkan kode rahasia RK2 lengkap dari bukti laporan.'),
  token: z.string(),
})
