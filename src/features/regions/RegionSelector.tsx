import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { contentError } from '../content/contracts'
import { getRegionPath, listRegions, regionSteps, type RegionLevel, type RegionOption, type RegionStep } from './regionService'

export type RegionSelection = RegionOption | null
type Props = { value?: string; onChange: (selection: RegionSelection) => void; label?: string; required?: boolean; disabled?: boolean; maxLevel?: RegionLevel; hint?: string; error?: string }
type Selected = Partial<Record<RegionStep, RegionSelection>>
type SelectionState = { value?: string; emittedValue?: string; selected?: Selected }
const labels: Record<RegionStep, string> = { province: 'Provinsi', regency_city: 'Kabupaten / Kota', district: 'Kecamatan', village: 'Desa / Kelurahan' }
const stepFor = (level: RegionLevel): RegionStep => level === 'regency' || level === 'city' ? 'regency_city' : level

export function RegionSelector({ value, onChange, label = 'Wilayah', required, disabled, maxLevel = 'village', hint, error }: Props) {
  const lastStep = stepFor(maxLevel)
  const levels = regionSteps.slice(0, regionSteps.indexOf(lastStep) + 1)
  const pathQuery = useQuery({ queryKey: ['regions', 'path', value], queryFn: ({ signal }) => value ? getRegionPath(value, signal) : Promise.resolve([]), enabled: !!value, retry: 1 })
  const [selectionState, setSelectionState] = useState<SelectionState>({ value })
  // Keep the local path while a controlled parent acknowledges our selection.
  // External record changes/resets must hydrate the new value's own path.
  let state = selectionState
  if (state.value !== value) {
    state = { value, ...(state.emittedValue === value ? { emittedValue: state.emittedValue, selected: state.selected } : {}) }
    setSelectionState(state)
  }
  const selected: Selected = state.selected ?? Object.fromEntries((pathQuery.data ?? []).map(region => [stepFor(region.region_type), region]))
  const provinceQuery = useQuery({ queryKey: ['regions', 'province', null], queryFn: ({ signal }) => listRegions(null, 'province', signal), enabled: levels.includes('province'), retry: 1 })
  const regencyParent = selected.province?.id ?? null
  const regencyCityQuery = useQuery({ queryKey: ['regions', 'regency_city', regencyParent], queryFn: ({ signal }) => listRegions(regencyParent, 'regency_city', signal), enabled: levels.includes('regency_city') && !!regencyParent, retry: 1 })
  const districtParent = selected.regency_city?.id ?? null
  const districtQuery = useQuery({ queryKey: ['regions', 'district', districtParent], queryFn: ({ signal }) => listRegions(districtParent, 'district', signal), enabled: levels.includes('district') && !!districtParent, retry: 1 })
  const villageParent = selected.district?.id ?? null
  const villageQuery = useQuery({ queryKey: ['regions', 'village', villageParent], queryFn: ({ signal }) => listRegions(villageParent, 'village', signal), enabled: levels.includes('village') && !!villageParent, retry: 1 })
  const options = { province: provinceQuery, regency_city: regencyCityQuery, district: districtQuery, village: villageQuery }
  const parents = { province: null, regency_city: regencyParent, district: districtParent, village: villageParent }
  const activeLevels = levels.filter(level => level === 'province' || !!parents[level])
  const pathLoading = pathQuery.isFetching && !state.selected
  const loading = pathLoading || activeLevels.some(level => options[level].isFetching)
  const failed = pathQuery.isError || activeLevels.some(level => options[level].isError)
  function choose(level: RegionStep, id: string) {
    const region = options[level].data?.find(item => item.id === id) ?? null
    const next = { ...selected }
    // Reset all descendants, including hidden fields when maxLevel is shorter.
    regionSteps.slice(regionSteps.indexOf(level)).forEach(child => { next[child] = child === level ? region : null })
    setSelectionState({ value, emittedValue: region?.id, selected: next })
    onChange(region)
  }
  const retry = () => {
    if (value && pathQuery.isError) void pathQuery.refetch()
    void Promise.all(activeLevels.map(level => options[level].refetch()))
  }
  return <fieldset className="form-stack" style={{ border: 0, padding: 0 }} aria-label={label}>
    {levels.map(level => <Select key={level} label={labels[level]} value={selected[level]?.id ?? ''} required={required && level === lastStep} disabled={disabled || pathLoading || options[level].isFetching || (level !== 'province' && !parents[level])} onChange={event => choose(level, event.target.value)} error={level === lastStep ? error : undefined} hint={level === 'province' && pathQuery.isError ? contentError(pathQuery.error) : level === lastStep ? hint : undefined}>
      <option value="">{`Pilih ${labels[level].toLocaleLowerCase('id')}`}</option>
      {options[level].data?.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
    </Select>)}
    {loading && <p className="muted" role="status">Memuat direktori wilayah…</p>}
    {!loading && failed && <><p className="field-error" role="alert">Direktori wilayah gagal dimuat.</p><Button type="button" variant="secondary" size="sm" onClick={retry}>Coba lagi</Button></>}
  </fieldset>
}
