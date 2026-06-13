import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { PeoplePageClient } from './PeoplePageClient'

export default function PeoplePage() {
  return (
    <DashboardLayout>
      <Topbar
        title="People"
        subtitle="Owners, tenants, staff — with household, vehicles and personal staff"
      />
      <main className="flex-1 overflow-hidden flex">
        <PeoplePageClient />
      </main>
    </DashboardLayout>
  )
}
