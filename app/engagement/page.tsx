import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { EngagementPageClient } from './EngagementPageClient'

export default function EngagementPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-y-auto">
        <EngagementPageClient />
      </main>
    </DashboardLayout>
  )
}
