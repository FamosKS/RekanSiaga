import { ResourceModulesPage } from '../../features/admin/RemoteResourcePage'
import { DraftRecovery } from '../../features/drafts/DraftRecovery'
export function AdminSettingsPage() { return <><DraftRecovery/><ResourceModulesPage names={['settings']}/></> }
