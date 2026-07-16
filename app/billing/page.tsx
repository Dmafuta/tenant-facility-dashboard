import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { BillingPageClient } from './BillingPageClient'

export default function BillingPage() {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-auto">
        <BillingPageClient />
      </main>
    </DashboardLayout>
  )
}
