import { PageHeader } from '../../components/shared/PageElements'
import { Card } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Alert'
import { LinkButton } from '../../components/ui/LinkButton'
import { TrackingForm } from '../../features/reports/TrackingForm'
export function ReportTrackingPage() { return <div className="form-page"><Card><PageHeader title="Lacak laporan" description="Jaga kerahasiaan kode dan token pelacakan pribadi Anda."/><Alert tone="primary">Data laporan tidak boleh dibuka hanya dengan kode yang mudah ditebak. Akses hanya diberikan melalui gateway setelah kode dan token diverifikasi.</Alert><TrackingForm/><LinkButton to="/laporan" variant="secondary">Kembali ke laporan</LinkButton></Card></div> }
