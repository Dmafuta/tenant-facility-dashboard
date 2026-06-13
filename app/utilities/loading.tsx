import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function UtilitiesLoading() {
  return (
    <DashboardLayout>
      <Topbar title="Utilities" subtitle="Meter management, readings, and consumption tracking" />
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </main>
    </DashboardLayout>
  )
}
