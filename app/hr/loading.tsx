import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function HRLoading() {
  return (
    <DashboardLayout>
      <Topbar title="HR & Staff" subtitle="Facility staff roster, vendor contracts, and onboarding" />
      <main className="flex-1 p-6 space-y-6">
        <Skeleton className="h-12 rounded-xl" />
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_,i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </main>
    </DashboardLayout>
  )
}
