import { cookies } from 'next/headers'
import { getSubjectFromSession } from '@/lib/auth/session'
import DashboardPageClient from './DashboardPageClient'
import type { UnitData } from '@/lib/api/units'

async function loadUnitStats() {
  try {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

    const [unitsRes, peopleRes] = await Promise.all([
      fetch(`${backend}/api/units`,  { cache: 'no-store', headers: authHeader }),
      fetch(`${backend}/api/people`, { cache: 'no-store', headers: authHeader }),
    ])
    if (!unitsRes.ok) return null

    const units: UnitData[] = (await unitsRes.json()).data ?? []
    const apiPeople: { id: string; person_type: string; unit_ids: string[]; home_unit_id?: string }[] =
      peopleRes.ok ? ((await peopleRes.json()).data ?? []) : []

    // Build map: unitId → people assigned to it (same logic as property page)
    const unitPeopleMap = new Map<string, typeof apiPeople>()
    for (const p of apiPeople) {
      for (const uid of p.unit_ids ?? []) {
        if (!unitPeopleMap.has(uid)) unitPeopleMap.set(uid, [])
        unitPeopleMap.get(uid)!.push(p)
      }
    }

    let occupied = 0, vacant = 0, maintenance = 0
    for (const u of units) {
      const assigned = unitPeopleMap.get(u.id) ?? []
      const hasTenant       = assigned.some(p => p.person_type === 'tenant')
      const hasResidentOwner = assigned.some(p => p.person_type === 'resident_owner' && p.home_unit_id === u.id)
      const isOccupied = hasTenant || hasResidentOwner || u.status === 'occupied'
      const isMaintenance = !isOccupied && u.status === 'renovation'

      if (isOccupied) occupied++
      else if (isMaintenance) maintenance++
      else vacant++
    }

    return { total: units.length, occupied, vacant, maintenance }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  await getSubjectFromSession()
  const unitStats = await loadUnitStats()
  return <DashboardPageClient unitStats={unitStats} />
}
