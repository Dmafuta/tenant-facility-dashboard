import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function ConsumablesLoading() {
  return (
    <DashboardLayout>
      <Topbar title="Consumables" subtitle="Manage issuance of consumable items to residents" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-96 rounded" />
        <Skeleton className="h-64 rounded-xl" />
      </main>
    </DashboardLayout>
  )
}
