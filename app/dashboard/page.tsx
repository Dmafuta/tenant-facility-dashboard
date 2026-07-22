import { cookies } from 'next/headers'
import { getSubjectFromSession } from '@/lib/auth/session'
import DashboardPageClient from './DashboardPageClient'
import type { LeaseData } from '@/lib/api/leases'
import type { IssueData } from '@/lib/api/issues'
import type { WaterBalancePeriodData } from '@/lib/api/water'

export type DashboardData = {
  unitStats: { total: number; occupied: number; vacant: number; maintenance: number }
  overdueChargesCount: number
  overdueChargesAmount: number
  disconnectionAlerts: number
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
    const opts = { next: { revalidate: 60 }, headers: authHeader }

    const [statsRes, leasesRes, waterRes, issuesRes] = await Promise.all([
      fetch(`${backend}/api/dashboard/stats`, opts),
      fetch(`${backend}/api/leases?status=active`, opts),
      fetch(`${backend}/api/water/balance`, opts),
      fetch(`${backend}/api/issues?status=open&limit=20`, opts),
    ])

    const stats: {
      unit_total: number; unit_occupied: number; unit_vacant: number; unit_maintenance: number
      pending_verification: number; open_issues: number; active_leases: number; overdue_charges: number
      overdue_charges_amount: number; disconnection_alerts: number
    } = statsRes.ok ? ((await statsRes.json()).data ?? {}) : {}

    const activeLeases: LeaseData[]                   = leasesRes.ok ? ((await leasesRes.json()).data  ?? []) : []
    const waterPeriods: WaterBalancePeriodData[]      = waterRes.ok  ? ((await waterRes.json()).data   ?? []) : []
    const openIssues: IssueData[]                     = issuesRes.ok ? ((await issuesRes.json()).data  ?? []) : []

    return {
      unitStats: {
        total:       stats.unit_total       ?? 0,
        occupied:    stats.unit_occupied    ?? 0,
        vacant:      stats.unit_vacant      ?? 0,
        maintenance: stats.unit_maintenance ?? 0,
      },
      overdueChargesCount:  stats.overdue_charges        ?? 0,
      overdueChargesAmount: stats.overdue_charges_amount ?? 0,
      disconnectionAlerts:  stats.disconnection_alerts   ?? 0,
      activeLeases,
      waterPeriods,
      openIssues,
      openIssuesTotal:     stats.open_issues          ?? openIssues.length,
      pendingVerification: stats.pending_verification ?? 0,
    }
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const [, data] = await Promise.all([getSubjectFromSession(), loadDashboardData()])
  return <DashboardPageClient data={data} />
}
