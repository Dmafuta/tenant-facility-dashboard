import { Skeleton } from '@/components/ui/Skeleton'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
export default function PropertyLoading() {
  return (
    <DashboardLayout>
      <Topbar title="Property" />
      <main className="flex-1 p-6">
        <div className="flex gap-3 mb-4">{[...Array(4)].map((_,i)=><Skeleton key={i} className="h-9 w-32 rounded-lg"/>)}</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_,i)=><Skeleton key={i} className="h-36 rounded-lg"/>)}
        </div>
      </main>
    </DashboardLayout>
  )
}
