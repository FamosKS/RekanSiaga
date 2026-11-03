import { ChecklistGroup } from './ChecklistGroup'
const exampleItems = ['Catat kontak keluarga dan titik berkumpul', 'Periksa tas siaga dan kebutuhan pribadi', 'Kenali jalur evakuasi di lingkungan Anda'] as const
export function PreparednessChecklist() { return <ChecklistGroup title="Coba checklist persiapan pribadi" items={exampleItems} demo/> }
