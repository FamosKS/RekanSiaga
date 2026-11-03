import { ResourceModulesPage } from '../../features/admin/RemoteResourcePage'
import { Alert } from '../../components/ui/Alert'
const locationAlertsReady = import.meta.env.VITE_LOCATION_ALERTS_ENABLED === 'true'
export function AdminNotificationsPage() { return <>{!locationAlertsReady && <Alert tone="warning">Pengelolaan peringatan wilayah menunggu paket kontrak Cloud dan postflight. Notifikasi push/antrean tetap terpisah.</Alert>}<ResourceModulesPage names={locationAlertsReady ? ['alerts', 'rules', 'queue'] : ['rules', 'queue']}/></> }
