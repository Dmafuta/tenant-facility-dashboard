import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { FinancialsPageClient } from './FinancialsPageClient'

export default function FinancialsPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-auto">
        <FinancialsPageClient />
      </main>
    </DashboardLayout>
  )
}
