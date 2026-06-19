'use client'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useCountUp } from '@/hooks/useCountUp'
import {
  UNITS, CHARGES, WORK_ORDERS, LEASES,
  WATER_BALANCE_PERIODS,
  ONBOARDING_APPLICATIONS, BREACH_RECORDS, INSPECTIONS,
  DOCUMENTS,
} from '@/lib/mock-data'
import { getMpesaTransactions } from '@/lib/api/mpesa'
import type { MpesaTransactionData } from '@/lib/api/mpesa'
import { getAllMeters } from '@/lib/api/meters'
import type { MeterData } from '@/lib/api/meters'
import { getOverdueUtilityCharges } from '@/lib/api/disconnection'
import type { ChargeData } from '@/lib/api/disconnection'
import { getConsumableStock } from '@/lib/api/consumables'
import type { ConsumableStockData } from '@/lib/api/consumables'

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

export default function DashboardPageClient({ unitStats }: {
  unitStats?: { total: number; occupied: number; vacant: number; maintenance: number } | null
}) {
  const today = new Date('2026-06-13')

  // ── M-Pesa live transactions ──────────────────────────────────────────────
  const [mpesaTxns, setMpesaTxns] = useState<MpesaTransactionData[]>([])
  useEffect(() => {
    getMpesaTransactions().then(setMpesaTxns).catch(() => {})
  }, [])

  // ── Live utilities: postpaid meters + overdue utility charges ─────────────
  const [liveMeters, setLiveMeters] = useState<MeterData[]>([])
  const [overdueUtility, setOverdueUtility] = useState<ChargeData[]>([])
  useEffect(() => {
    getAllMeters({ meterType: 'postpaid' }).then(setLiveMeters).catch(() => {})
    getOverdueUtilityCharges().then(setOverdueUtility).catch(() => {})
  }, [])

  // ── Live consumable stock ─────────────────────────────────────────────────
  const [liveStock, setLiveStock] = useState<ConsumableStockData[]>([])
  useEffect(() => {
    getConsumableStock().then(setLiveStock).catch(() => {})
  }, [])

  // ── Occupancy — live from server props, fallback to mock ──────────────────
  const total    = unitStats?.total       ?? UNITS.length
  const occupied = unitStats?.occupied    ?? UNITS.filter(u => u.status === 'occupied').length
  const vacant   = unitStats?.vacant      ?? UNITS.filter(u => u.status === 'vacant').length
  const maintenance = unitStats?.maintenance ?? UNITS.filter(u => u.status === 'maintenance').length
  const occPct   = total > 0 ? Math.round((occupied / total) * 100) : 0

  // ── Financials ───────────────────────────────────────────────────────────
  const overdueCharges  = CHARGES.filter(c => c.status === 'overdue')
  const overdueAmt      = overdueCharges.reduce((s, c) => s + c.amount - (c.paid_amount ?? 0), 0)
  const recentPayments  = mpesaTxns
    .filter(p => p.status === 'completed')
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 5)
  const now = new Date()
  const collectedThisMonth = mpesaTxns
    .filter(p => {
      if (p.status !== 'completed' || !p.created_at) return false
      const d = new Date(p.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, p) => s + p.amount, 0)

  // ── Expiring leases (within 60 days) ─────────────────────────────────────
  const expiringLeases = LEASES.filter(l => {
    if (l.status !== 'active') return false
    const end = new Date(l.end_date)
    const diff = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 60
  }).map(l => ({
    ...l,
    daysLeft: Math.floor((new Date(l.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
  })).sort((a, b) => a.daysLeft - b.daysLeft)

  // ── Maintenance ──────────────────────────────────────────────────────────
  const openWOs    = WORK_ORDERS.filter(w => w.status === 'open' || w.status === 'in_progress')
  const urgentWOs  = openWOs.filter(w => w.priority === 'urgent').length
  const overdueWOs = WORK_ORDERS.filter(w => {
    if (w.status !== 'open' && w.status !== 'in_progress') return false
    const created = new Date(w.created_at)
    return Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)) > 7
  })

  // ── Onboarding pipeline ──────────────────────────────────────────────────
  const inProgressOnboarding = ONBOARDING_APPLICATIONS.filter(o => o.status === 'in_progress')

  // ── Low stock consumables ─────────────────────────────────────────────────
  const lowStock = liveStock.filter(s => s.current_stock < s.reorder_level)

  // ── Water loss trend (last 3 periods) ────────────────────────────────────
  const waterLossData = WATER_BALANCE_PERIODS.slice(-4).map(p => ({
    label: p.period.slice(5),        // "06" from "2026-06"
    value: Math.round(p.loss_pct ?? 0),
  }))

  // ── Revenue bars (mock monthly from charges) ──────────────────────────────
  const revenueData = [
    { label: 'Jan', value: 285000 },
    { label: 'Feb', value: 310000 },
    { label: 'Mar', value: 298000 },
    { label: 'Apr', value: 342000 },
    { label: 'May', value: 325000 },
    { label: 'Jun', value: collectedThisMonth || 180000 },
  ]

  // ── Disconnection alerts (postpaid meters with overdue utility charges) ───
  const overdueUnitIds = new Set(overdueUtility.map(c => c.unit_id))
  const postpaidOverdue = liveMeters.filter(m =>
    m.status === 'active' && m.unit_id && overdueUnitIds.has(m.unit_id)
  )

  // ── Document expiries ─────────────────────────────────────────────────────
  const expiringDocs = DOCUMENTS.filter((d: { expiry_date?: string }) => {
    if (!d.expiry_date) return false
    const exp = new Date(d.expiry_date)
    const diff = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 60
  })

  // ── Breach escalations ────────────────────────────────────────────────────
  const activeBreach = BREACH_RECORDS.filter(b => b.status === 'warned' || b.status === 'fined')

  // ── Inspection due soon ───────────────────────────────────────────────────
  const dueInspections = INSPECTIONS.filter(i => i.status === 'scheduled').length

  return (
    <DashboardLayout>
      <Topbar title="Dashboard" subtitle={`Green Valley Estate · ${today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`} />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ── KPI row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Occupancy"       value={`${occPct}%`}        sub={`${occupied}/${total} units occupied`}  icon="🏢" color="bg-teal-50 dark:bg-teal-900/20"   trend="+2%" />
          <KPICard label="Overdue Rent"    value={overdueCharges.length} sub={fmt(overdueAmt)}                    icon="⚠️" color="bg-red-50 dark:bg-red-900/10"     trend={`${overdueCharges.length} units`} />
          <KPICard label="Open Work Orders" value={openWOs.length}      sub={`${urgentWOs} urgent`}              icon="🔧" color="bg-blue-50 dark:bg-blue-900/10"   />
          <KPICard label="M-Pesa Collected" value={collectedThisMonth}  sub="This month"                         icon="💚" color="bg-green-50 dark:bg-green-900/10" trend="+12%" />
        </div>

        {/* ── Second KPI row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Leases Expiring"   value={expiringLeases.length}      sub="Next 60 days"          icon="📑" color="bg-amber-50" />
          <KPICard label="Onboarding Active" value={inProgressOnboarding.length} sub="Applications in progress" icon="🎉" color="bg-purple-50" />
          <KPICard label="Disconnection Alerts" value={postpaidOverdue.length}  sub="Postpaid meters overdue" icon="⚡" color="bg-orange-50" />
          <KPICard label="Low Stock Items"   value={lowStock.length}            sub="Below minimum threshold" icon="📦" color="bg-gray-50" />
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
                  { label: 'Occupied',     count: occupied,     color: 'bg-teal-500' },
                  { label: 'Vacant',       count: vacant,       color: 'bg-gray-300' },
                  { label: 'Maintenance',  count: maintenance,  color: 'bg-amber-400' },
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
            <p className="text-xs text-text-muted mb-3">Monthly collections (KES)</p>
            <MiniBarChart data={revenueData} label="" color="bg-teal-500" />
          </Card>

          {/* Water loss trend */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-text mb-1">Water Loss %</h3>
            <p className="text-xs text-text-muted mb-3">Unaccounted loss by period</p>
            {waterLossData.length > 0 ? (
              <MiniBarChart data={waterLossData} label="" color="bg-blue-400" />
            ) : (
              <p className="text-xs text-text-muted">No water balance data</p>
            )}
            {waterLossData.some(d => d.value > 25) && (
              <p className="text-xs text-red-600 mt-2 font-medium">⚠ Loss exceeds 25% — investigate leaks</p>
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

          {/* Alerts summary panel */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Action Required</h3>
            </div>
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
              {overdueWOs.length > 0 && (
                <a href="/maintenance" className="flex items-center gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 hover:bg-blue-100 transition-colors">
                  <span>🔧</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-900">{overdueWOs.length} work order{overdueWOs.length !== 1 ? 's' : ''} stalled &gt;7 days</p>
                    <p className="text-[11px] text-blue-700">Needs follow-up</p>
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
              {activeBreach.length > 0 && (
                <a href="/rules" className="flex items-center gap-2.5 rounded-lg border border-red-100 bg-red-50 px-3 py-2 hover:bg-red-100 transition-colors">
                  <span>⚖</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-900">{activeBreach.length} breach{activeBreach.length !== 1 ? 'es' : ''} open</p>
                    <p className="text-[11px] text-red-700">Rules &amp; Breaches</p>
                  </div>
                </a>
              )}
              {expiringDocs.length > 0 && (
                <a href="/documents" className="flex items-center gap-2.5 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 hover:bg-purple-100 transition-colors">
                  <span>📁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-900">{expiringDocs.length} document{expiringDocs.length !== 1 ? 's' : ''} expiring soon</p>
                    <p className="text-[11px] text-purple-700">Upload renewals</p>
                  </div>
                </a>
              )}
              {dueInspections > 0 && (
                <a href="/inspections" className="flex items-center gap-2.5 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 hover:bg-teal-100 transition-colors">
                  <span>🔍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-teal-900">{dueInspections} inspection{dueInspections !== 1 ? 's' : ''} scheduled</p>
                    <p className="text-[11px] text-teal-700">Upcoming inspections</p>
                  </div>
                </a>
              )}
              {[expiringLeases.length, overdueWOs.length, postpaidOverdue.length, lowStock.length, activeBreach.length, expiringDocs.length, dueInspections].every(n => n === 0) && (
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
                    <p className="text-[10px] text-text-muted">{new Date(l.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Open work orders ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Open Work Orders</h3>
              <a href="/maintenance" className="text-xs text-teal-600 hover:underline">View all →</a>
            </div>
            {openWOs.length === 0 ? (
              <p className="text-xs text-text-muted">No open work orders.</p>
            ) : (
              <div className="space-y-2">
                {openWOs.slice(0, 5).map(wo => {
                  const daysOpen = Math.floor((today.getTime() - new Date(wo.created_at).getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <div key={wo.id} className="flex items-center gap-3 text-xs">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${wo.priority === 'urgent' ? 'bg-red-500' : wo.priority === 'high' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text truncate">{wo.title}</p>
                        <p className="text-text-muted">{wo.unit_label} · {wo.assigned_to ?? 'Unassigned'}</p>
                      </div>
                      <span className={`font-medium flex-shrink-0 ${daysOpen > 7 ? 'text-red-500' : 'text-text-muted'}`}>{daysOpen}d</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Onboarding pipeline */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text">Onboarding Pipeline</h3>
              <a href="/onboarding" className="text-xs text-teal-600 hover:underline">View all →</a>
            </div>
            {inProgressOnboarding.length === 0 ? (
              <p className="text-xs text-text-muted">No active onboarding applications.</p>
            ) : (
              <div className="space-y-3">
                {inProgressOnboarding.map(o => {
                  const completed = o.stage_history.filter(s => !!s.completed_at).length
                  const total_s   = o.stage_history.length
                  const pct       = Math.round((completed / total_s) * 100)
                  return (
                    <div key={o.id}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-text">{o.applicant_name} — {o.unit_label}</span>
                        <span className="text-text-muted">{completed}/{total_s} stages</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

      </main>
    </DashboardLayout>
  )
}
