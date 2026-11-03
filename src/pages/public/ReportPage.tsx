import { PageHeader } from '../../components/shared/PageElements'
import { Card } from '../../components/ui/Card'
import { LinkButton } from '../../components/ui/LinkButton'
import { ReportForm } from '../../features/reports/ReportForm'
export function ReportPage() { return <div className="form-page"><Card><PageHeader title="Laporan kejadian" description="Siapkan informasi lapangan yang jelas. Tidak perlu akun. Pengiriman memerlukan gateway yang telah diaktifkan dan verifikasi keamanan."/><ReportForm/><div className="report-help"><h2>Perlu informasi bantuan?</h2><p>Laporan ini bukan permintaan respons darurat. Gunakan layanan resmi di wilayah Anda.</p><div className="action-row"><LinkButton to="/darurat" variant="secondary">Buka pusat darurat</LinkButton><LinkButton to="/laporan/lacak" variant="ghost">Lacak laporan</LinkButton></div></div></Card></div> }
