import { PageHeader } from '../../components/shared/PageElements'
import { Alert } from '../../components/ui/Alert'
import { DonationSimulator } from '../../features/donations/DonationSimulator'
import { simulationLabel } from '../../features/donations/donationSimulation'
export function DonationPage() { return <><PageHeader title="Simulasi donasi" description="Kenali alur dukungan kemanusiaan melalui latihan antarmuka, tanpa pembayaran."/><Alert tone="warning" heading={simulationLabel}>Tidak melibatkan pembayaran nyata, transfer uang, atau penggalangan dana. Jangan masukkan data kartu atau rekening.</Alert><DonationSimulator/></> }
