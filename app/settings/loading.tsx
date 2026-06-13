import { Skeleton } from '@/components/ui/Skeleton'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
export default function Loading() {
  return (
    <DashboardLayout>
      <Topbar title="Settings" />
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_,i) => <Skeleton key={i} className="h-32 rounded-lg"/>)}
      </main>
    </DashboardLayout>
  )
}
