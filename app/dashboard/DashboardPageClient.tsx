'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { useCountUp } from '@/hooks/useCountUp'
import { getMpesaTransactions } from '@/lib/api/mpesa'
import type { MpesaTransactionData } from '@/lib/api/mpesa'
import { getAllMeters, getMeterReadings } from '@/lib/api/meters'
import type { MeterData, MeterReadingData } from '@/lib/api/meters'
import { getOverdueUtilityCharges } from '@/lib/api/disconnection'
import type { ChargeData as UtilityChargeData } from '@/lib/api/disconnection'
import { getConsumableStock } from '@/lib/api/consumables'
import type { ConsumableStockData } from '@/lib/api/consumables'
import { getPendingExitCount } from '@/lib/api/exitRequests'
import type { DashboardData } from './page'

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(n: number) { return `KES ${n.toLocaleString()}` }

function KPICard({ label, value, sub, icon, color, trend }: {
  label: string; value: number | string; sub: string; icon: string; color: string; trend?: string
}) {
  const numVal = typeof value === 'number' ? value : 0
  const count  = useCountUp(numVal)
  const display = typeof value === 'number' ? count.toLocaleString() : value
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-text mt-0.5">{display}</p>
        <p className="text-xs text-text-muted mt-0.5">{sub}</p>
      </div>
      {trend && <span className={`text-[11px] font-semibold ${trend.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>{trend}</span>}
    </Card>
  )
}

// ── Mini bar chart (CSS-based, no lib needed) ───────────────────────────────
function MiniBarChart({ data, label, color = 'bg-teal-500' }: {
  data: { label: string; value: number }[]
  label: string
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-3">{label}</p>
      <div className="flex items-end gap-1 h-16">
        {data.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{ height: `${(d.value / max) * 52}px`, minHeight: d.value > 0 ? '3px' : '0' }}
            />
            <span className="text-[10px] text-text-muted">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Occupancy donut (CSS arc) ───────────────────────────────────────────────
function OccupancyRing({ pct }: { pct: number }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle cx={40} cy={40} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={40} cy={40} r={r} fill="none"
        stroke="#0d9488" strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x={40} y={44} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#111827">{pct}%</text>
    </svg>
  )
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-400',
  medium: 'bg-blue-400',
  low: 'bg-gray-300',
}

export default function DashboardPageClient({ data }: { data: DashboardData | null }) {
  const today = new Date()

  // ── Client-side live data (all fetched in parallel on mount) ─────────────
  const [mpesaTxns,     setMpesaTxns]     = useState<MpesaTransactionData[]>([])
  const [liveMeters,    setLiveMeters]    = useState<MeterData[]>([])
  const [overdueUtility,setOverdueUtility]= useState<UtilityChargeData[]>([])
  const [liveStock,     setLiveStock]     = useState<ConsumableStockData[]>([])
  const [pendingExits,  setPendingExits]  = useState(0)
  const [recentReadings,setRecentReadings]= useState<MeterReadingData[]>([])

  useEffect(() => {
    const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    Promise.all([
      getMpesaTransactions().catch(() => [] as MpesaTransactionData[]),
      getAllMeters({ meterType: 'postpaid' }).catch(() => [] as MeterData[]),
      getOverdueUtilityCharges().catch(() => [] as UtilityChargeData[]),
      getConsumableStock().catch(() => [] as ConsumableStockData[]),
      getPendingExitCount().catch(() => 0),
      getMeterReadings({ period: currentPeriod }).catch(() => [] as MeterReadingData[]),
    ]).then(([txns, meters, overdueUtil, stock, exitCount, readings]) => {
      setMpesaTxns(txns)
      setLiveMeters(meters)
      setOverdueUtility(overdueUtil)
      setLiveStock(stock)
      setPendingExits(exitCount)
      setRecentReadings(
        readings
          .filter(r => r.read_by)
          .sort((a, b) => (b.reading_date ?? '').localeCompare(a.reading_date ?? ''))
          .slice(0, 8)
      )
    })
  }, [])

  // Poll move-out clearances every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      getPendingExitCount().then(setPendingExits).catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // ── Occupancy ─────────────────────────────────────────────────────────────
  const total       = data?.unitStats.total       ?? 0
  const occupied    = data?.unitStats.occupied    ?? 0
  const vacant      = data?.unitStats.vacant      ?? 0
  const maintenance = data?.unitStats.maintenance ?? 0
  const occPct      = total > 0 ? Math.round((occupied / total) * 100) : 0

  // ── Overdue rent ──────────────────────────────────────────────────────────
  const overdueCharges = data?.overdueCharges ?? []
  const overdueAmt     = overdueCharges.reduce((s, c) => s + c.amount - c.paid_amount, 0)

  // ── Open issues ───────────────────────────────────────────────────────────
  const openIssues     = data?.openIssues     ?? []
  const openIssuesTotal = data?.openIssuesTotal ?? openIssues.length
  const urgentIssues   = openIssues.filter(i => i.priority === 'urgent').length

  // ── Expiring leases (within 60 days) ─────────────────────────────────────
  const expiringLeases = (data?.activeLeases ?? [])
    .filter(l => {
      if (!l.end_date) return false
      const diff = Math.floor((new Date(l.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 60
    })
    .map(l => ({
      ...l,
      daysLeft: Math.floor((new Date(l.end_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  // ── Water loss trend ──────────────────────────────────────────────────────
  const waterLossData = (data?.waterPeriods ?? []).slice(-4).map(p => ({
    label: p.period.slice(5),
    value: Math.round(p.lossPct ?? 0),
  }))

  // ── Revenue trend (last 6 months from M-Pesa) ────────────────────────────
  const revenueData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1)
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    const value = mpesaTxns
      .filter(p => {
        if (p.status !== 'completed' || !p.created_at) return false
        const pd = new Date(p.created_at)
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth()
      })
      .reduce((s, p) => s + p.amount, 0)
    return { label, value }
  })

  // ── Financials ────────────────────────────────────────────────────────────
  const recentPayments = mpesaTxns
    .filter(p => p.status === 'completed')
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 5)
  const collectedThisMonth = mpesaTxns
    .filter(p => {
      if (p.status !== 'completed' || !p.created_at) return false
      const d = new Date(p.created_at)
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
    })
    .reduce((s, p) => s + p.amount, 0)

  // ── Disconnection alerts (postpaid meters with overdue utility charges) ───
  const overdueUnitIds    = new Set(overdueUtility.map(c => c.unit_id))
  const postpaidOverdue   = liveMeters.filter(m => m.status === 'active' && m.unit_id && overdueUnitIds.has(m.unit_id))

  // ── Low stock consumables ─────────────────────────────────────────────────
  const lowStock = liveStock.filter(s => s.current_stock < s.reorder_level)

  // ── Pending KYC ───────────────────────────────────────────────────────────
  const pendingVerification = data?.pendingVerification ?? 0

  return (
    <DashboardLayout>
      <Topbar title="Dashboard" subtitle={`Green Valley Estate · ${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── KPI row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Occupancy"        value={`${occPct}%`}        sub={`${occupied}/${total} units occupied`}   icon="🏢" color="bg-teal-50 dark:bg-teal-900/20"   trend="+2%" />
          <KPICard label="Overdue Rent"     value={overdueCharges.length} sub={overdueCharges.length > 0 ? fmt(overdueAmt) : 'All clear'} icon="⚠️" color="bg-red-50 dark:bg-red-900/10" />
          <KPICard label="Open Issues"      value={openIssuesTotal}     sub={urgentIssues > 0 ? `${urgentIssues} urgent` : 'None urgent'} icon="🔧" color="bg-blue-50 dark:bg-blue-900/10" />
          <KPICard label="M-Pesa Collected" value={collectedThisMonth}  sub="This month"                              icon="💚" color="bg-green-50 dark:bg-green-900/10" trend="+12%" />
        </div>

        {/* ── Second KPI row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Leases Expiring"      value={expiringLeases.length}    sub="Next 60 days"             icon="📑" color="bg-amber-50" />
          <KPICard label="Pending Verification" value={pendingVerification}       sub="Awaiting KYC review"      icon="🪪" color="bg-purple-50" />
          <KPICard label="Disconnection Alerts" value={postpaidOverdue.length}    sub="Postpaid meters overdue"  icon="⚡" color="bg-orange-50" />
          <KPICard label="Low Stock Items"      value={lowStock.length}           sub="Below minimum threshold"  icon="📦" color="bg-gray-50" />
        </div>

        {/* ── Charts row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Occupancy ring */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Occupancy Overview</h3>
            <div className="flex items-center gap-5">
              <OccupancyRing pct={occPct} />
              <div className="space-y-2 flex-1">
                {([
                  { label: 'Occupied',    count: occupied,    color: 'bg-teal-500' },
                  { label: 'Vacant',      count: vacant,      color: 'bg-gray-300' },
                  { label: 'Maintenance', count: maintenance, color: 'bg-amber-400' },
                ] as { label: string; count: number; color: string }[]).map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${color}`} />
                    <span className="text-text-muted flex-1">{label}</span>
                    <span className="font-semibold text-text">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Revenue trend */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-1">Revenue Trend</h3>
            <p className="text-xs text-text-muted mb-3">Monthly M-Pesa collections (KES)</p>
            <MiniBarChart data={revenueData} label="" color="bg-teal-500" />
          </Card>

          {/* Water loss trend */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-1">Water Loss %</h3>
            <p className="text-xs text-text-muted mb-3">Unaccounted loss by period</p>
            {waterLossData.length > 0 ? (
              <MiniBarChart data={waterLossData} label="" color="bg-blue-400" />
            ) : (
              <p className="text-xs text-text-muted">No water balance data recorded.</p>
            )}
            {waterLossData.some(d => d.value > 25) && (
              <p className="text-xs text-red-600 mt-2 font-medium">Loss exceeds 25% — investigate leaks</p>
            )}
          </Card>
        </div>

        {/* ── Lower panels ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent M-Pesa payments */}
          <Card className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Recent M-Pesa Payments</h3>
              <a href="/financials" className="text-xs text-teal-600 hover:underline">View all →</a>
            </div>
            {recentPayments.length === 0 ? (
              <p className="text-xs text-text-muted">No recent payments.</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 px-3 py-2">
                    <span className="text-base">💚</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text truncate">{p.unit_label ?? '—'} · {p.person_name ?? p.phone}</p>
                      <p className="text-[11px] text-text-muted font-mono">{p.mpesa_receipt ?? 'Pending'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-green-700">{fmt(p.amount)}</p>
                      <p className="text-[10px] text-text-muted">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Action Required */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-4">Action Required</h3>
            <div className="space-y-2">
              {expiringLeases.length > 0 && (
                <a href="/leases" className="flex items-center gap-2.5 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors">
                  <span>📑</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900">{expiringLeases.length} lease{expiringLeases.length !== 1 ? 's' : ''} expiring soon</p>
                    <p className="text-[11px] text-amber-700">Earliest: {expiringLeases[0]?.unit_label} in {expiringLeases[0]?.daysLeft}d</p>
                  </div>
                </a>
              )}
              {urgentIssues > 0 && (
                <a href="/issues" className="flex items-center gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 hover:bg-red-100 transition-colors">
                  <span>🔧</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-900">{urgentIssues} urgent issue{urgentIssues !== 1 ? 's' : ''} open</p>
                    <p className="text-[11px] text-red-700">Immediate attention needed</p>
                  </div>
                </a>
              )}
              {overdueCharges.length > 0 && (
                <a href="/financials" className="flex items-center gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 hover:bg-red-100 transition-colors">
                  <span>⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-900">{overdueCharges.length} overdue charge{overdueCharges.length !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-red-700">{fmt(overdueAmt)} outstanding</p>
                  </div>
                </a>
              )}
              {postpaidOverdue.length > 0 && (
                <a href="/utilities" className="flex items-center gap-2.5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 hover:bg-orange-100 transition-colors">
                  <span>⚡</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-orange-900">{postpaidOverdue.length} meter{postpaidOverdue.length !== 1 ? 's' : ''} need disconnection notice</p>
                    <p className="text-[11px] text-orange-700">Postpaid overdue</p>
                  </div>
                </a>
              )}
              {lowStock.length > 0 && (
                <a href="/consumables" className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 hover:bg-gray-100 transition-colors">
                  <span>📦</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{lowStock.length} consumable{lowStock.length !== 1 ? 's' : ''} low on stock</p>
                    <p className="text-[11px] text-gray-500">Reorder needed</p>
                  </div>
                </a>
              )}
              {pendingVerification > 0 && (
                <a href="/people" className="flex items-center gap-2.5 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 hover:bg-purple-100 transition-colors">
                  <span>🪪</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-900">{pendingVerification} person{pendingVerification !== 1 ? 's' : ''} pending KYC</p>
                    <p className="text-[11px] text-purple-700">Awaiting verification</p>
                  </div>
                </a>
              )}
              {pendingExits > 0 && (
                <a href="/billing/clearances" className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800 px-3 py-2 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 transition-colors">
                  <span>🏠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                      {pendingExits} move-out clearance{pendingExits !== 1 ? 's' : ''} pending
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">W&S bills need billing review</p>
                  </div>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingExits > 9 ? '9+' : pendingExits}
                  </span>
                </a>
              )}
              {[expiringLeases.length, urgentIssues, overdueCharges.length, postpaidOverdue.length, lowStock.length, pendingVerification, pendingExits].every(n => n === 0) && (
                <div className="py-6 text-center text-sm text-text-muted">
                  <p className="text-2xl mb-1">✅</p>
                  All clear — no pending actions.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Expiring leases strip ──────────────────────────────────────── */}
        {expiringLeases.length > 0 && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Leases Expiring — Next 60 Days</h3>
              <a href="/leases" className="text-xs text-teal-600 hover:underline">Manage renewals →</a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {expiringLeases.map(l => (
                <div
                  key={l.id}
                  className={`rounded-lg border px-3 py-2.5 flex items-center gap-3 ${
                    l.daysLeft <= 14 ? 'border-red-200 bg-red-50' :
                    l.daysLeft <= 30 ? 'border-amber-200 bg-amber-50' :
                    'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{l.unit_label}</p>
                    <p className="text-xs text-text-muted truncate">{l.tenant_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${l.daysLeft <= 14 ? 'text-red-600' : l.daysLeft <= 30 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {l.daysLeft}d
                    </p>
                    <p className="text-[10px] text-text-muted">{new Date(l.end_date!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Open issues + Pending verification ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Open Issues</h3>
              <a href="/issues" className="text-xs text-teal-600 hover:underline">View all →</a>
            </div>
            {openIssues.length === 0 ? (
              <p className="text-xs text-text-muted">No open issues.</p>
            ) : (
              <div className="space-y-2">
                {openIssues.slice(0, 6).map(issue => {
                  const daysOpen = issue.created_at
                    ? Math.floor((today.getTime() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24))
                    : 0
                  return (
                    <div key={issue.id} className="flex items-center gap-3 text-xs">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_COLOR[issue.priority] ?? 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text truncate">{issue.title}</p>
                        <p className="text-text-muted">{issue.unit_label ?? 'Common area'} · {issue.assigned_to ?? 'Unassigned'}</p>
                      </div>
                      <span className={`font-medium flex-shrink-0 ${daysOpen > 7 ? 'text-red-500' : 'text-text-muted'}`}>{daysOpen}d</span>
                    </div>
                  )
                })}
                {openIssues.length > 6 && (
                  <p className="text-[11px] text-text-muted pt-1">+{openIssues.length - 6} more — <a href="/issues" className="text-teal-600 hover:underline">view all</a></p>
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">People Awaiting Verification</h3>
              <a href="/people" className="text-xs text-teal-600 hover:underline">Review →</a>
            </div>
            {pendingVerification === 0 ? (
              <div className="py-6 text-center">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-xs text-text-muted">All people verified.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-3xl font-bold text-purple-700">
                  {pendingVerification}
                </div>
                <p className="text-sm font-semibold text-text">{pendingVerification} person{pendingVerification !== 1 ? 's' : ''} pending KYC</p>
                <p className="text-xs text-text-muted text-center">
                  These residents have been added but have not yet had their identity verified.
                </p>
                <a href="/people" className="text-xs font-medium text-teal-600 hover:underline">
                  Go to People page to review →
                </a>
              </div>
            )}
          </Card>
        </div>

        {/* ── Recent Meter Readings ─────────────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text">Recent Meter Readings</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <a href="/utilities" className="text-xs text-teal-600 hover:underline">View all →</a>
          </div>
          {recentReadings.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-2xl mb-1">💧</p>
              <p className="text-xs text-text-muted">No meter readings recorded this period.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {recentReadings.map(r => {
                const utilityColors: Record<string, string> = {
                  water:       'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
                  water_sewer: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800',
                  electricity: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 dark:border-yellow-800',
                  gas:         'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
                }
                const utilityIcons: Record<string, string> = {
                  water: '💧', water_sewer: '🚿', electricity: '⚡', gas: '🔥',
                }
                const colorCls = utilityColors[r.utility_type] ?? 'bg-surface-muted dark:bg-dark-hover border-surface-border dark:border-dark-border'
                const icon     = utilityIcons[r.utility_type] ?? '📊'
                return (
                  <div key={r.id} className={`rounded-xl border p-3 ${colorCls}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-semibold text-text truncate flex-1">{r.unit_label ?? '—'}</span>
                      {r.anomaly && (
                        <span className="text-amber-500 text-xs flex-shrink-0" title="Anomaly detected">⚠</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-text leading-none">
                      {r.current_value.toLocaleString()}
                      <span className="text-xs font-normal text-text-muted ml-1">m³</span>
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 truncate">#{r.meter_number}</p>
                    <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center text-[9px] font-bold text-text flex-shrink-0">
                        {(r.read_by ?? 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-[11px] text-text-muted truncate flex-1">{r.read_by ?? 'Unknown'}</span>
                      <span className="text-[10px] text-text-muted flex-shrink-0">{r.reading_date ?? '—'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

      </main>
    </DashboardLayout>
  )
}
