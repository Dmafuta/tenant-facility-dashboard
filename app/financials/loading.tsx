import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function FinancialsLoading() {
  return (
    <DashboardLayout>
      <Topbar title="Financials" subtitle="Rent, utilities, service charges, fines, and all billing" />
      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-96 rounded-xl" />
      </main>
    </DashboardLayout>
  )
}
