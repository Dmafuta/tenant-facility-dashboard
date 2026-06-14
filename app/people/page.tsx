import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { PeoplePageClient } from './PeoplePageClient'
import { getPeople } from '@/lib/supabase/queries'

export default async function PeoplePage() {
  const people = await getPeople()

  return (
    <DashboardLayout>
      <Topbar
        title="People"
        subtitle="Owners, tenants, staff — with household, vehicles and personal staff"
      />
      <main className="flex-1 overflow-hidden flex">
        <PeoplePageClient initialPeople={people} />
      </main>
    </DashboardLayout>
  )
}
