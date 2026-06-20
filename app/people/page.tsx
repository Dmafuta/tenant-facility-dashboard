import { cookies } from 'next/headers'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { PeoplePageClient } from './PeoplePageClient'
import type { Person, PersonType, PersonStatus, KycStatus, Unit } from '@/lib/types'
import type { PersonData } from '@/lib/api/people'
import type { UnitData } from '@/lib/api/units'

async function loadData(token?: string): Promise<{ people: Person[] | undefined; allUnits: Unit[] }> {
  const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
  const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const [peopleRes, unitsRes] = await Promise.all([
      fetch(`${backend}/api/people`, { cache: 'no-store', headers: authHeader }),
      fetch(`${backend}/api/units`,  { cache: 'no-store', headers: authHeader }),
    ])

    const apiPeople: PersonData[] = peopleRes.ok ? ((await peopleRes.json()).data ?? []) : []
    const apiUnits:  UnitData[]   = unitsRes.ok  ? ((await unitsRes.json()).data  ?? []) : []

    const typeMap: Record<string, PersonType> = {
      tenant: 'tenant', resident_owner: 'resident_owner',
      non_resident_owner: 'non_resident_owner', short_stay_guest: 'short_stay_guest',
      permanent_staff: 'permanent_staff', casual_staff: 'casual_staff', outsourced: 'outsourced',
    }
    const statusMap: Record<string, PersonStatus> = {
      pending_verification: 'pending_verification', active: 'active',
      inactive: 'inactive', suspended: 'suspended', former: 'former',
    }

    const people: Person[] = apiPeople.map(p => ({
      id: p.id,
      type: (typeMap[p.person_type] ?? 'tenant') as PersonType,
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email ?? '',
      phone: p.phone ?? '',
      national_id: p.national_id ?? undefined,
      unit_ids: p.unit_ids ?? [],
      home_unit_id: p.home_unit_id ?? undefined,
      status: (statusMap[p.status] ?? 'pending_verification') as PersonStatus,
      kyc_status: (p.kyc_status as KycStatus) ?? 'not_started',
      phone_verified_at: p.phone_verified_at ?? undefined,
      email_verified_at: p.email_verified_at ?? undefined,
      joined_date: p.joined_date ?? new Date().toISOString().slice(0, 10),
      is_outsourced: p.is_outsourced,
      agency_name: p.agency_name ?? undefined,
      agency_contact: p.agency_contact ?? undefined,
      agency_clearance_ref: p.agency_clearance_ref ?? undefined,
    }))

    // Build a map: unitId → people assigned to it, for deriving occupants
    const unitPeopleMap = new Map<string, PersonData[]>()
    for (const p of apiPeople) {
      for (const uid of p.unit_ids ?? []) {
        if (!unitPeopleMap.has(uid)) unitPeopleMap.set(uid, [])
        unitPeopleMap.get(uid)!.push(p)
      }
    }

    const unitStatusMap: Record<string, string> = {
      vacant: 'vacant', occupied: 'occupied',
      renovation: 'maintenance', reserved: 'reserved', off_market: 'vacant',
    }

    const allUnits: Unit[] = apiUnits.map(u => {
      const assigned = unitPeopleMap.get(u.id) ?? []
      const tenant        = assigned.find(p => p.person_type === 'tenant')
      const residentOwner = assigned.find(p => p.person_type === 'resident_owner' && p.home_unit_id === u.id)
      const occupantPerson = tenant ?? residentOwner
      const hasOccupant = !!occupantPerson
      return {
        id:               u.id,
        block:            u.block ?? '',
        floor:            u.floor ? (isNaN(Number(u.floor)) ? 0 : Number(u.floor)) : 0,
        number:           u.unit_label,
        size_sqm:         u.floor_area_sqm ?? 0,
        bedrooms:         u.bedrooms ?? 0,
        bathrooms:        u.bathrooms ?? 0,
        use_type:         (['commercial', 'shop'].includes(u.unit_type) ? 'commercial' : 'residential') as Unit['use_type'],
        status:           (hasOccupant ? 'occupied' : (unitStatusMap[u.status] ?? 'vacant')) as Unit['status'],
        monthly_rate:     u.asking_rent ?? 0,
        owners:           [],
        current_occupant: occupantPerson ? `${occupantPerson.first_name} ${occupantPerson.last_name}` : undefined,
      }
    })

    return { people, allUnits }
  } catch {
    return { people: undefined, allUnits: [] }
  }
}

export default async function PeoplePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const { people, allUnits } = await loadData(token)

  return (
    <DashboardLayout>
      <Topbar
        title="People"
        subtitle="Owners, tenants, staff — with household, vehicles and personal staff"
      />
      <main className="flex-1 overflow-hidden flex">
        <PeoplePageClient initialPeople={people} allUnits={allUnits} />
      </main>
    </DashboardLayout>
  )
}
