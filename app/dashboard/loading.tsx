import { Skeleton } from '@/components/ui/Skeleton'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <Topbar title="Dashboard" subtitle="Loading..." />
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
        </div>
      </main>
    </DashboardLayout>
  )
}
