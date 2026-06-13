import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { HRPageClient } from './HRPageClient'

export default function HRPage() {
  return (
    <DashboardLayout>
      <Topbar
        title="HR & Staff"
        subtitle="Facility staff roster, vendor contracts, and onboarding"
      />
      <main className="flex-1 overflow-auto">
        <HRPageClient />
      </main>
    </DashboardLayout>
  )
}
