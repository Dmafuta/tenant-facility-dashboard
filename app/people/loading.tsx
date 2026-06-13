import { Skeleton } from '@/components/ui/Skeleton'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
export default function PeopleLoading() {
  return (
    <DashboardLayout>
      <Topbar title="People" />
      <main className="flex-1 flex" style={{ height:'calc(100vh - 56px)' }}>
        <div className="w-[420px] border-r border-surface-border p-4 space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          {[...Array(8)].map((_,i) => <Skeleton key={i} className="h-14 rounded-lg"/>)}
        </div>
        <div className="flex-1 p-6"><Skeleton className="h-full rounded-xl" /></div>
      </main>
    </DashboardLayout>
  )
}
