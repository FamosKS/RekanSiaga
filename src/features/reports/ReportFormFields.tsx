import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { ReportFields } from './reportSchema'
import { reportTypes } from './reportSchema'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { RegionSelector } from '../regions/RegionSelector'
export function ReportFormFields({ register, errors, onRegionChange, regionId }: { register: UseFormRegister<ReportFields>; errors: FieldErrors<ReportFields>; onRegionChange: (name: string, id?: string) => void; regionId?: string }) {
  return <><Select label="Jenis kejadian" {...register('type')} error={errors.type?.message}><option value="">Pilih jenis kejadian</option>{reportTypes.map(type => <option key={type}>{type}</option>)}</Select><Input label="Judul laporan" {...register('title')} error={errors.title?.message} placeholder="Ringkasan singkat kejadian"/><Textarea label="Deskripsi kejadian" {...register('description')} error={errors.description?.message} placeholder="Jelaskan kondisi yang Anda amati, waktu, dan dampaknya." rows={5}/><RegionSelector label="Wilayah kejadian" value={regionId} required onChange={selection => onRegionChange(selection?.name ?? '', selection?.id)} error={errors.region?.message} hint="Pilih sampai tingkat desa/kelurahan bila tersedia."/><Input label="Alamat atau koordinat kejadian" {...register('location')} error={errors.location?.message} placeholder="Alamat lengkap atau koordinat"/></>
}
