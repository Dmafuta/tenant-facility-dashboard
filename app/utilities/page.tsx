import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { UtilitiesPageClient } from './UtilitiesPageClient'

export default function UtilitiesPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-auto">
        <UtilitiesPageClient />
      </main>
    </DashboardLayout>
  )
}
