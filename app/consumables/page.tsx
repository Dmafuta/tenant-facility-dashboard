import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { ConsumablesPageClient } from './ConsumablesPageClient'

export default function ConsumablesPage() {
  return (
    <DashboardLayout>
      <Topbar
        title="Consumables"
        subtitle="Manage issuance of consumable items to residents"
      />
      <ConsumablesPageClient />
    </DashboardLayout>
  )
}
