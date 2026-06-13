import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { UtilitiesPageClient } from './UtilitiesPageClient'

export default function UtilitiesPage() {
  return (
    <DashboardLayout>
      <Topbar
        title="Utilities"
        subtitle="Meter management, readings, and consumption tracking"
      />
      <main className="flex-1 overflow-auto">
        <UtilitiesPageClient />
      </main>
    </DashboardLayout>
  )
}
