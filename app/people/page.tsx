import { cookies } from 'next/headers'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { PeoplePageClient } from './PeoplePageClient'
import type { Unit } from '@/lib/types'
import type { UnitData } from '@/lib/api/units'

async function loadUnits(token?: string): Promise<Unit[]> {
  const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
  const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${backend}/api/units`, { next: { revalidate: 60 }, headers: authHeader })
    const apiUnits: UnitData[] = res.ok ? ((await res.json()).data ?? []) : []

    const statusMap: Record<string, Unit['status']> = {
      vacant: 'vacant', occupied: 'occupied',
      renovation: 'maintenance', reserved: 'reserved', off_market: 'vacant',
    }

    return apiUnits.map(u => ({
      id:               u.id,
      block:            u.block ?? '',
      floor:            u.floor ? (isNaN(Number(u.floor)) ? 0 : Number(u.floor)) : 0,
      number:           u.unit_label,
      size_sqm:         u.floor_area_sqm ?? 0,
      bedrooms:         u.bedrooms ?? 0,
      bathrooms:        u.bathrooms ?? 0,
      use_type:         (['commercial', 'shop'].includes(u.unit_type) ? 'commercial' : 'residential') as Unit['use_type'],
      status:           statusMap[u.status] ?? 'vacant',
      monthly_rate:     u.asking_rent ?? 0,
      owners:           [],
      current_occupant: u.current_occupant ?? undefined,
    }))
  } catch {
    return []
  }
}

export default async function PeoplePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const allUnits = await loadUnits(token)

  return (
    <DashboardLayout>
      <Topbar
        title="People"
        subtitle="Owners, tenants, staff — with household, vehicles and personal staff"
      />
      <main className="flex-1 overflow-hidden flex">
        <PeoplePageClient allUnits={allUnits} />
      </main>
    </DashboardLayout>
  )
}
