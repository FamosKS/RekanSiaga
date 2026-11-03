import { Select } from '../../components/ui/Select'
import { RegionSelector } from '../regions/RegionSelector'
import { eventStatusLabels } from '../content/contentService'
const eventStatusOptions = Object.entries(eventStatusLabels)
export type MonitoringFilterValues = { region: string; regionCode?: string; kind: string; status: string }
export function MonitoringFilters({ value, onChange, kinds = [] }: { value: MonitoringFilterValues; onChange: (value: MonitoringFilterValues) => void; kinds?: readonly string[] }) {
  return <div className="monitoring-filters">
    <RegionSelector maxLevel="village" onChange={selection => onChange({ ...value, region: selection?.name ?? '', regionCode: selection?.code ?? '' })} hint="Pilih tingkat wilayah untuk mempersempit daftar."/>
    <Select label="Jenis bencana" value={value.kind} onChange={event => onChange({ ...value, kind: event.target.value })}><option value="">Semua jenis</option>{kinds.map(kind => <option key={kind}>{kind}</option>)}</Select>
    <Select label="Status kejadian" value={value.status} hint="Status perkembangan kejadian, terpisah dari verifikasi laporan." onChange={event => onChange({ ...value, status: event.target.value })}><option value="">Semua status</option>{eventStatusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select>
  </div>
}
