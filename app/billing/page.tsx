import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { BillingPageClient } from './BillingPageClient'

export default function BillingPage() {
  return (
    <DashboardLayout>
      <Topbar
        title="Billing"
        subtitle="Water & Sewerage, Service Charge, and other invoices"
      />
      <main className="flex-1 overflow-auto">
        <BillingPageClient />
      </main>
    </DashboardLayout>
  )
}
