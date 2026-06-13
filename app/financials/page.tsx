import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { FinancialsPageClient } from './FinancialsPageClient'

export default function FinancialsPage() {
  return (
    <DashboardLayout>
      <Topbar
        title="Financials"
        subtitle="Rent, utilities, service charges, fines, and all billing"
      />
      <main className="flex-1 overflow-auto">
        <FinancialsPageClient />
      </main>
    </DashboardLayout>
  )
}
