import { PageHeader } from '../../components/shared/PageElements'
import { PublicMap } from '../../features/maps/PublicMap'
import { contentFeedback, useDisasters } from '../../features/content/usePublicContent'
import { ContentSection } from '../../components/shared/ContentSection'
import { DisasterCard } from '../../features/disasters/DisasterCard'
export function MapPage() {
  const query = useDisasters()
  const disasters = query.data ?? []
  return <><PageHeader title="Peta RekanSiaga" description="Pilih lokasi kejadian atau bantuan dari database dev. Basemap eksternal dimuat hanya setelah Anda memilih tampilkan peta."/><PublicMap/><section><h2>Kejadian dari database dev</h2><ContentSection {...contentFeedback(query)} empty="Belum ada kejadian terbit" hasData={!!disasters.length}><div className="public-card-grid">{disasters.map(event => <DisasterCard key={event.id} event={event}/>)}</div></ContentSection></section></>
}
