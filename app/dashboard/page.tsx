import { cookies } from 'next/headers'
import { getSubjectFromSession } from '@/lib/auth/session'
import DashboardPageClient from './DashboardPageClient'
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
  openIssuesTotal: number
  pendingVerification: number
}

async function loadDashboardData(): Promise<DashboardData | null> {
  try {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
    // 30-second cache — dashboard data can be slightly stale
    const opts = { next: { revalidate: 30 }, headers: authHeader }

    // stats uses COUNT queries only — no full table scans for unit/people data
    const [statsRes, chargesRes, leasesRes, waterRes, issuesRes] = await Promise.all([
      fetch(`${backend}/api/dashboard/stats`, opts),
      fetch(`${backend}/api/charges?status=overdue`, opts),
      fetch(`${backend}/api/leases?status=active`, opts),
      fetch(`${backend}/api/water/balance`, opts),
      fetch(`${backend}/api/issues?status=open&limit=20`, opts),
    ])

    const stats: {
      unit_total: number; unit_occupied: number; unit_vacant: number; unit_maintenance: number
      pending_verification: number; open_issues: number; active_leases: number; overdue_charges: number
    } = statsRes.ok ? ((await statsRes.json()).data ?? {}) : {}

    const overdueCharges: ChargeData[] = chargesRes.ok ? ((await chargesRes.json()).data ?? []) : []
    const activeLeases: LeaseData[]    = leasesRes.ok  ? ((await leasesRes.json()).data  ?? []) : []
    const waterPeriods: WaterBalancePeriodData[] = waterRes.ok ? ((await waterRes.json()).data ?? []) : []
    const openIssues: IssueData[]      = issuesRes.ok  ? ((await issuesRes.json()).data  ?? []) : []

    return {
      unitStats: {
        total:       stats.unit_total       ?? 0,
        occupied:    stats.unit_occupied    ?? 0,
        vacant:      stats.unit_vacant      ?? 0,
        maintenance: stats.unit_maintenance ?? 0,
      },
      overdueCharges,
      activeLeases,
      waterPeriods,
      openIssues,
      openIssuesTotal:     stats.open_issues           ?? openIssues.length,
      pendingVerification: stats.pending_verification  ?? 0,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const [, data] = await Promise.all([getSubjectFromSession(), loadDashboardData()])
  return <DashboardPageClient data={data} />
}
