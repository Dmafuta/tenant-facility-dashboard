import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { EngagementPageClient } from './EngagementPageClient'

export default function EngagementPage() {
  return (
    <DashboardLayout>
      <Topbar
        title="Engagement"
        subtitle="Votes, polls and anonymous feedback from residents"
      />
      <main className="flex-1 overflow-y-auto">
        <EngagementPageClient />
      </main>
    </DashboardLayout>
  )
}
