import { cookies } from 'next/headers'
import { getSubjectFromSession } from '@/lib/auth/session'
import DashboardPageClient from './DashboardPageClient'
import type { UnitData } from '@/lib/api/units'
import type { LeaseData } from '@/lib/api/leases'
import type { IssueData } from '@/lib/api/issues'
import type { WaterBalancePeriodData } from '@/lib/api/water'
import type { ChargeData } from '@/lib/api/charges'

export type DashboardData = {
  unitStats: { total: number; occupied: number; vacant: number; maintenance: number }
  overdueCharges: ChargeData[]
  activeLeases: LeaseData[]
  waterPeriods: WaterBalancePeriodData[]
  openIssues: IssueData[]
  pendingVerification: number
}

async function loadDashboardData(): Promise<DashboardData | null> {
  try {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
    const opts = { cache: 'no-store' as const, headers: authHeader }

    const [unitsRes, peopleRes, chargesRes, leasesRes, waterRes, issuesRes] = await Promise.all([
      fetch(`${backend}/api/units`, opts),
      fetch(`${backend}/api/people`, opts),
      fetch(`${backend}/api/charges?status=overdue`, opts),
      fetch(`${backend}/api/leases?status=active`, opts),
      fetch(`${backend}/api/water/balance`, opts),
      fetch(`${backend}/api/issues`, opts),
    ])

    const units: UnitData[] = unitsRes.ok ? ((await unitsRes.json()).data ?? []) : []
    const apiPeople: { id: string; person_type: string; unit_ids: string[]; home_unit_id?: string; status: string }[] =
      peopleRes.ok ? ((await peopleRes.json()).data ?? []) : []
    const overdueCharges: ChargeData[] = chargesRes.ok ? ((await chargesRes.json()).data ?? []) : []
    const activeLeases: LeaseData[] = leasesRes.ok ? ((await leasesRes.json()).data ?? []) : []
    const waterPeriods: WaterBalancePeriodData[] = waterRes.ok ? ((await waterRes.json()).data ?? []) : []
    const allIssues: IssueData[] = issuesRes.ok ? ((await issuesRes.json()).data ?? []) : []

    // Build occupancy stats
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

    return {
      unitStats: { total: units.length, occupied, vacant, maintenance },
      overdueCharges,
      activeLeases,
      waterPeriods,
      openIssues: allIssues.filter(i => i.status !== 'resolved' && i.status !== 'closed'),
      pendingVerification: apiPeople.filter(p => p.status === 'pending_verification').length,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  await getSubjectFromSession()
  const data = await loadDashboardData()
  return <DashboardPageClient data={data} />
}
