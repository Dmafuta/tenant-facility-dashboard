import { cookies } from 'next/headers'
import PropertyPageClient from './PropertyPageClient'
import type { Unit, UnitOwner, Person } from '@/lib/types'
import type { UnitData } from '@/lib/api/units'
import type { PersonData } from '@/lib/api/people'
import { apiPersonToPerson } from '@/lib/api/people'

async function loadData(): Promise<{ units: Unit[] | undefined; allPeople: Person[] }> {
  try {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

    const [unitsRes, peopleRes] = await Promise.all([
      fetch(`${backend}/api/units`,  { cache: 'no-store', headers: authHeader }),
      fetch(`${backend}/api/people`, { cache: 'no-store', headers: authHeader }),
    ])

    const apiUnits: UnitData[]    = unitsRes.ok  ? ((await unitsRes.json()).data  ?? []) : []
    const apiPeople: PersonData[] = peopleRes.ok ? ((await peopleRes.json()).data ?? []) : []

    const allPeople = apiPeople.map(apiPersonToPerson)

    // Build a map: unitId → list of people assigned to it
    const unitPeopleMap = new Map<string, PersonData[]>()
    for (const p of apiPeople) {
      for (const uid of p.unit_ids ?? []) {
        if (!unitPeopleMap.has(uid)) unitPeopleMap.set(uid, [])
        unitPeopleMap.get(uid)!.push(p)
      }
    }

    const statusMap: Record<string, string> = {
      vacant: 'vacant', occupied: 'occupied',
      renovation: 'maintenance', reserved: 'reserved', off_market: 'vacant',
    }

    const units: Unit[] = apiUnits.map(u => {
      const assigned = unitPeopleMap.get(u.id) ?? []

      // Build owners from resident/non-resident owners assigned to this unit.
      // resident_owner type means they live here by definition.
      // home_unit_id is used for multi-unit resident owners to identify their primary residence.
      const owners: UnitOwner[] = assigned
        .filter(p => p.person_type === 'resident_owner' || p.person_type === 'non_resident_owner')
        .map((p, idx) => ({
          person_id:      p.id,
          ownership_type: 'individual' as const,
          name:           `${p.first_name} ${p.last_name}`,
          share_percent:  100,
          // is_resident: only when explicitly marked "Lives in this unit" (home_unit_id set)
          is_resident:    p.home_unit_id === u.id,
          is_primary:     idx === 0,
        }))

      // A unit is occupied only when someone explicitly lives there:
      //  - tenant assigned (always occupies), OR
      //  - resident_owner whose home_unit_id === this unit
      const hasTenant       = assigned.some(p => p.person_type === 'tenant')
      const hasResidentHere = owners.some(o => o.is_resident)
      const hasOccupant     = hasTenant || hasResidentHere

      // Derive current occupant name: prefer tenant, then the resident owner living here
      const tenantPerson     = assigned.find(p => p.person_type === 'tenant')
      const residentOwner    = owners.find(o => o.is_resident)
      const current_occupant = tenantPerson
        ? `${tenantPerson.first_name} ${tenantPerson.last_name}`
        : residentOwner?.name

      // DB status is the source of truth — override when occupants detected from people data
      const rawStatus = statusMap[u.status] ?? 'vacant'
      const status = (hasOccupant ? 'occupied' : rawStatus) as Unit['status']

      return {
        id:               u.id,
        block:            u.block ?? '',
        floor:            u.floor ? (isNaN(Number(u.floor)) ? 0 : Number(u.floor)) : 0,
        number:           u.unit_label,
        size_sqm:         u.floor_area_sqm ?? 0,
        bedrooms:         u.bedrooms ?? 0,
        bathrooms:        u.bathrooms ?? 0,
        use_type:         (u.unit_type === 'commercial' || u.unit_type === 'shop' ? 'commercial'
                        : u.unit_type === 'bnb' ? 'bnb'
                        : u.unit_type === 'office' ? 'office'
                        : 'residential') as Unit['use_type'],
        status,
        monthly_rate:     u.asking_rent ?? 0,
        owners,
        current_occupant,
      }
    })

    return { units, allPeople }
  } catch {
    return { units: undefined, allPeople: [] }
  }
}

export default async function PropertyPage() {
  const { units, allPeople } = await loadData()
  return <PropertyPageClient initialUnits={units} allPeople={allPeople} />
}
