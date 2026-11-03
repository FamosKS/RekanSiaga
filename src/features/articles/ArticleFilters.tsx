import { Search } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
export function ArticleFilters({ search, category, categories, onSearch, onCategory }: { search: string; category: string; categories: readonly string[]; onSearch: (value: string) => void; onCategory: (value: string) => void }) {
  return <><div className="section-heading"><Search aria-hidden="true"/><h2>Temukan informasi</h2></div><Input label="Cari artikel" type="search" placeholder="Judul atau kata kunci..." value={search} onChange={event => onSearch(event.target.value)}/><fieldset className="filter-chips"><legend>Kategori artikel</legend><div className="chip-row"><Button size="sm" variant={category === '' ? 'primary' : 'secondary'} aria-pressed={!category} onClick={() => onCategory('')}>Semua</Button>{categories.map(item => <Button key={item} size="sm" variant={category === item ? 'primary' : 'secondary'} aria-pressed={category === item} onClick={() => onCategory(item)}>{item}</Button>)}</div></fieldset><p className="muted">Pencarian menyaring maksimal 100 artikel terbit terbaru yang dibaca dari database.</p></>
}
