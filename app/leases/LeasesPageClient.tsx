'use client'
import { cn } from '@/lib/cn'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { LEASE_APPLICATIONS, ONBOARDING_APPLICATIONS } from '@/lib/mock-data'
import { getAllLeases, updateLease } from '@/lib/api/leases'
import type { LeaseData } from '@/lib/api/leases'
import type { LeaseApplication, OnboardingApplication, OnboardingStage, BillingCycle } from '@/lib/types'

// ── helpers ───────────────────────────────────────────────────────────────────
function leaseStatusBadge(status: string) {
  const map: Record<string, 'success'|'warning'|'danger'|'default'|'blue'> = {
    active:       'success',
    notice_given: 'warning',
    expired:      'default',
    terminated:   'danger',
    draft:        'blue',
  }
  return <Badge variant={map[status] ?? 'default'}>{status.replace(/_/g, ' ')}</Badge>
}

function appStatusBadge(status: LeaseApplication['status']) {
  const map: Record<string, 'default'|'blue'|'success'|'danger'|'warning'> = {
    submitted:    'blue',
    under_review: 'warning',
    approved:     'success',
    rejected:     'danger',
    withdrawn:    'default',
  }
  return <Badge variant={map[status] ?? 'default'}>{status.replace('_', ' ')}</Badge>
}

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:     'Monthly',
  quarterly:   'Quarterly (3 months)',
  semi_annual: 'Semi-Annual (6 months)',
  annual:      'Annual',
}

const STAGE_ORDER: OnboardingStage[] = [
  'applied','under_review','approved','lease_signing',
  'deposit_payment','move_in_inspection','key_handover','active',
]
const STAGE_LABELS: Record<OnboardingStage, string> = {
  applied: 'Applied', under_review: 'Under Review', approved: 'Approved',
  lease_signing: 'Lease Signing', deposit_payment: 'Deposit',
  move_in_inspection: 'Inspection', key_handover: 'Key Handover', active: 'Active',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── KPI Bar ───────────────────────────────────────────────────────────────────
function KPIBar({ leases }: { leases: LeaseData[] }) {
  const active      = leases.filter(l => l.status === 'active').length
  const noticeGiven = leases.filter(l => l.status === 'notice_given').length
  const pendingApps = LEASE_APPLICATIONS.filter(a => a.status === 'submitted' || a.status === 'under_review').length
  const inOnboarding = ONBOARDING_APPLICATIONS.filter(a => a.status === 'in_progress').length

  return (
    <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
      {[
        { label: 'Active Leases',        value: active,       color: 'text-green-600' },
        { label: 'Notice Given',         value: noticeGiven,  color: 'text-amber-600' },
        { label: 'Pending Applications', value: pendingApps,  color: 'text-blue-600' },
        { label: 'In Onboarding',        value: inOnboarding, color: 'text-primary-600' },
      ].map(k => (
        <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
          <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Active Leases ─────────────────────────────────────────────────────────────
function ActiveLeases({ initialLeases }: { initialLeases: LeaseData[] }) {
  const [leases,       setLeases]       = useState<LeaseData[]>(initialLeases)
  const [loading,      setLoading]      = useState(false)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected,     setSelected]     = useState<LeaseData | null>(null)
  const [renewTarget,  setRenewTarget]  = useState<LeaseData | null>(null)
  const [showRenew,    setShowRenew]    = useState(false)
  const [generating,   setGenerating]   = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setLeases(await getAllLeases()) } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [])

  const filtered = leases.filter(l => {
    const q = search.toLowerCase()
    const name  = (l.tenant_name ?? '').toLowerCase()
    const label = (l.unit_label  ?? '').toLowerCase()
    const matchQ = name.includes(q) || label.includes(q)
    const matchS = statusFilter === 'all' || l.status === statusFilter
    return matchQ && matchS
  }).sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))

  const daysLeft = (end: string | null) => {
    if (!end) return null
    return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)
  }

  function openDocument() {
    if (!selected) return
    setGenerating(true)
    window.open(`/api/leases/${selected.id}/document`, '_blank')
    setTimeout(() => setGenerating(false), 1500)
  }

  return (
    <>
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* ── List panel ── */}
      <div className={cn(
        'flex-shrink-0 border-r border-surface-border dark:border-dark-border overflow-y-auto',
        selected ? 'hidden lg:flex lg:flex-col lg:w-80' : 'flex flex-col w-full lg:w-80'
      )}>
        <div className="p-3 space-y-2 border-b border-surface-border dark:border-dark-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tenant or unit…" />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all',          label: 'All statuses' },
              { value: 'active',       label: 'Active' },
              { value: 'draft',        label: 'Draft' },
              { value: 'notice_given', label: 'Notice Given' },
              { value: 'expired',      label: 'Expired' },
              { value: 'terminated',   label: 'Terminated' },
            ]}
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <span className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(l => {
            const days = daysLeft(l.end_date)
            return (
              <button
                key={l.id}
                onClick={() => setSelected(l)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === l.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-text">{l.unit_label ?? '—'}</span>
                  {leaseStatusBadge(l.status)}
                </div>
                <p className="text-xs text-text-muted">{l.tenant_name ?? '—'}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                  {days !== null && days < 60 && days > 0 && (
                    <span className="ml-1.5 text-amber-600 font-medium">({days}d left)</span>
                  )}
                  {days !== null && days <= 0 && l.status !== 'terminated' && (
                    <span className="ml-1.5 text-red-500 font-medium">(expired)</span>
                  )}
                </p>
              </button>
            )
          })}
          {!loading && filtered.length === 0 && (
            <p className="px-4 py-8 text-sm text-text-muted text-center">No leases found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div className={cn('flex-1 flex flex-col overflow-y-auto', !selected && 'hidden lg:flex')}>
        {selected && (
          <div className="lg:hidden flex items-center px-4 pt-3 pb-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to list
            </button>
          </div>
        )}

        {!selected ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Select a lease to view details
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-text">{selected.unit_label ?? '—'}</h2>
                <p className="text-text-muted text-sm">{selected.tenant_name ?? '—'}</p>
                <p className="text-xs text-text-muted font-mono mt-0.5">{selected.id}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {leaseStatusBadge(selected.status)}

                {/* Generate Lease Document */}
                <button
                  onClick={openDocument}
                  disabled={generating}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {generating
                    ? <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    : '📄'}
                  Generate Lease
                </button>

                {selected.status === 'active' && (
                  <>
                    <button
                      onClick={() => { setRenewTarget(selected); setShowRenew(true) }}
                      className="px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      🔄 Renew
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                      Issue Notice
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* key terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Monthly Rent',   value: selected.monthly_rent  != null ? `KES ${selected.monthly_rent.toLocaleString()}` : '—' },
                { label: 'Deposit Held',   value: selected.deposit       != null ? `KES ${selected.deposit.toLocaleString()}`       : '—' },
                { label: 'Lease Start',    value: fmtDate(selected.start_date) },
                { label: 'Lease End',      value: fmtDate(selected.end_date) },
                { label: 'Billing Cycle',  value: BILLING_CYCLE_LABELS[(selected.billing_cycle ?? 'monthly') as BillingCycle] ?? selected.billing_cycle ?? '—' },
                ...(selected.notice_date   ? [{ label: 'Notice Date',     value: fmtDate(selected.notice_date) }]    : []),
                ...(selected.next_billing_date ? [{ label: 'Next Billing', value: fmtDate(selected.next_billing_date) }] : []),
              ].map(item => (
                <div key={item.label} className="bg-surface rounded-lg p-3 border border-surface-border dark:border-dark-border dark:bg-dark-surface">
                  <p className="text-xs text-text-muted mb-0.5">{item.label}</p>
                  <p className="text-sm font-semibold text-text">{item.value}</p>
                </div>
              ))}
            </div>

            {/* deposit ledger */}
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Deposit Ledger</h3>
              <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover dark:bg-dark-hover">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-text-muted">Type</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-text-muted">Amount</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-surface-border dark:border-dark-border">
                      <td className="px-4 py-2.5 text-text">Initial Deposit</td>
                      <td className="px-4 py-2.5 text-text font-medium">
                        {selected.deposit != null ? `KES ${selected.deposit.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-2.5"><Badge variant="success">Received</Badge></td>
                    </tr>
                    {(selected.status === 'terminated' || selected.status === 'expired') && selected.deposit && (
                      <tr className="border-t border-surface-border dark:border-dark-border">
                        <td className="px-4 py-2.5 text-text">Refund</td>
                        <td className="px-4 py-2.5 text-text font-medium">KES {Math.round(selected.deposit * 0.85).toLocaleString()}</td>
                        <td className="px-4 py-2.5"><Badge variant="blue">Processed</Badge></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* timeline */}
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Lease Timeline</h3>
              <div className="space-y-2">
                {[
                  { date: selected.start_date,  label: 'Lease commenced',          icon: '✅', show: true },
                  { date: selected.notice_date, label: 'Notice to vacate issued',   icon: '📨', show: !!selected.notice_date },
                  { date: selected.end_date,    label: 'Lease terminated',          icon: '🔴', show: selected.status === 'terminated' },
                  { date: selected.end_date,    label: 'Lease expired',             icon: '⏰', show: selected.status === 'expired' },
                ].filter(e => e.show).map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-base">{ev.icon}</span>
                    <span className="text-text-muted w-28 flex-shrink-0">{fmtDate(ev.date)}</span>
                    <span className="text-text">{ev.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* notes */}
            {selected.notes && (
              <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                <p className="text-xs font-semibold text-text-muted mb-1">Notes</p>
                <p className="text-sm text-text">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    <RenewLeaseModal
      lease={renewTarget}
      open={showRenew}
      onClose={() => setShowRenew(false)}
      onRenewed={async (updated) => {
        setShowRenew(false)
        setRenewTarget(null)
        await refresh()
        setSelected(updated)
      }}
    />
    </>
  )
}

// ── Renew Lease Modal ─────────────────────────────────────────────────────────
function RenewLeaseModal({ lease, open, onClose, onRenewed }: {
  lease: LeaseData | null
  open: boolean
  onClose: () => void
  onRenewed: (updated: LeaseData) => void
}) {
  const [escalationPct, setEscalationPct] = useState(5)
  const [newEndDate,    setNewEndDate]    = useState('')
  const [cycle,         setCycle]         = useState<BillingCycle>('monthly')
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')

  useEffect(() => {
    if (open && lease) {
      setEscalationPct(5)
      setNewEndDate('')
      setCycle((lease.billing_cycle as BillingCycle) ?? 'monthly')
      setError('')
    }
  }, [open, lease])

  if (!open || !lease) return null

  const newRent     = lease.monthly_rent != null ? Math.round(lease.monthly_rent * (1 + escalationPct / 100)) : 0
  const rentIncrease = lease.monthly_rent != null ? newRent - lease.monthly_rent : 0

  async function handleRenew() {
    if (!newEndDate || !lease) return
    setSaving(true); setError('')
    try {
      const updated = await updateLease(lease.unit_id, lease.id, {
        endDate:      newEndDate,
        monthlyRent:  newRent,
        billingCycle: cycle,
        status:       'active',
      })
      onRenewed(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to renew lease')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border dark:border-dark-border">
          <div>
            <h3 className="text-sm font-semibold text-text">Renew Lease — {lease.unit_label}</h3>
            <p className="text-xs text-text-muted mt-0.5">{lease.tenant_name} · Currently ends {fmtDate(lease.end_date)}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">New Lease End Date</label>
            <input
              type="date" value={newEndDate} min={lease.end_date ?? undefined}
              onChange={e => setNewEndDate(e.target.value)}
              className="w-full rounded-lg border border-surface-border dark:border-dark-border px-3 py-2 text-sm bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Billing Cycle</label>
            <select
              value={cycle} onChange={e => setCycle(e.target.value as BillingCycle)}
              className="w-full rounded-lg border border-surface-border dark:border-dark-border px-3 py-2 text-sm bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map(c => (
                <option key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-text-muted">Rent Escalation</label>
              <span className="text-xs font-semibold text-text">{escalationPct}%</span>
            </div>
            <input
              type="range" min={0} max={20} step={0.5}
              value={escalationPct} onChange={e => setEscalationPct(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-[11px] text-text-muted mt-1">
              <span>0% (no increase)</span><span>20%</span>
            </div>
          </div>

          <div className="rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-100 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Current rent</span>
              <span className="font-medium text-text">KES {lease.monthly_rent?.toLocaleString() ?? '—'}/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">New rent ({escalationPct}% increase)</span>
              <span className="font-bold text-teal-700">KES {newRent.toLocaleString()}/mo</span>
            </div>
            <div className="flex justify-between border-t border-teal-100 pt-1.5">
              <span className="text-text-muted">Increase amount</span>
              <span className="font-medium text-teal-700">+KES {rentIncrease.toLocaleString()}/mo</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 rounded-lg border border-surface-border dark:border-dark-border py-2 text-sm text-text-muted hover:bg-surface-muted">
              Cancel
            </button>
            <button
              onClick={handleRenew}
              disabled={!newEndDate || saving}
              className="flex-1 rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Renew Lease'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Applications (still mock) ─────────────────────────────────────────────────
function Applications() {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<LeaseApplication | null>(null)
  const filtered = LEASE_APPLICATIONS.filter(a =>
    a.applicant_name.toLowerCase().includes(search.toLowerCase()) ||
    a.unit_label.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border overflow-y-auto', selected ? 'hidden lg:flex lg:w-80' : 'flex flex-col w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Search applicant…" />
        </div>
        <div className="divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(a => (
            <button key={a.id} onClick={() => setSelected(a)}
              className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === a.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-text">{a.applicant_name}</span>
                {appStatusBadge(a.status)}
              </div>
              <p className="text-xs text-text-muted">{a.unit_label}</p>
              <p className="text-xs text-text-muted">Submitted {a.submitted_date}</p>
            </button>
          ))}
        </div>
      </div>
      <div className={cn('flex-1 flex flex-col', !selected && 'hidden lg:flex')}>
        {selected && (
          <div className="lg:hidden flex items-center px-4 pt-3 pb-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to list
            </button>
          </div>
        )}
        {!selected ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">Select an application</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">{selected.applicant_name}</h2>
                <p className="text-sm text-text-muted">{selected.unit_label} · {selected.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {appStatusBadge(selected.status)}
                {selected.status === 'under_review' && (
                  <>
                    <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">Approve</button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">Reject</button>
                  </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Email',          value: selected.applicant_email },
                { label: 'Phone',          value: selected.applicant_phone },
                { label: 'National ID',    value: selected.national_id },
                { label: 'Employer',       value: selected.employer ?? '—' },
                { label: 'Monthly Income', value: selected.monthly_income ? `KES ${selected.monthly_income.toLocaleString()}` : '—' },
                { label: 'Submitted',      value: selected.submitted_date },
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text">{f.value}</p>
                </div>
              ))}
            </div>
            {selected.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700 dark:text-red-300">{selected.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Onboarding Kanban (still mock) ────────────────────────────────────────────
function OnboardingKanban() {
  const byStage = STAGE_ORDER.map(stage => ({
    stage, label: STAGE_LABELS[stage],
    items: ONBOARDING_APPLICATIONS.filter(a => a.current_stage === stage && a.status === 'in_progress'),
  })).filter(col => col.items.length > 0 || ['applied','under_review','approved','deposit_payment'].includes(col.stage))

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
      <div className="flex gap-3 h-full" style={{ minWidth: `${byStage.length * 220}px` }}>
        {byStage.map(col => (
          <div key={col.stage} className="w-52 flex-shrink-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{col.label}</span>
              <span className="text-xs bg-surface border border-surface-border dark:border-dark-border rounded-full px-1.5 py-0.5 text-text-muted">{col.items.length}</span>
            </div>
            <div className="flex-1 bg-surface-hover dark:bg-dark-hover rounded-xl p-2 space-y-2 overflow-y-auto">
              {col.items.map(app => (
                <div key={app.id} className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 shadow-sm">
                  <p className="text-sm font-medium text-text">{app.applicant_name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{app.unit_label}</p>
                  <p className="text-xs text-text-muted">Move-in: {app.target_move_in}</p>
                  <div className="mt-2 pt-2 border-t border-surface-border dark:border-dark-border">
                    <div className="flex items-center gap-1 flex-wrap">
                      {STAGE_ORDER.map((s, i) => {
                        const current = STAGE_ORDER.indexOf(app.current_stage)
                        const done = app.stage_history.find(h => h.stage === s)?.completed_at
                        return (
                          <div key={s} className={`w-2 h-2 rounded-full ${done ? 'bg-primary-500' : i === current ? 'bg-amber-400' : 'bg-surface-border dark:bg-dark-border'}`} title={STAGE_LABELS[s]} />
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">{app.stage_history.filter(h => h.completed_at).length}/{STAGE_ORDER.length} stages</p>
                  </div>
                </div>
              ))}
              {col.items.length === 0 && <div className="text-center py-6 text-xs text-text-muted">Empty</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function LeasesPageClient({ initialLeases = [] }: { initialLeases?: LeaseData[] }) {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Leases" subtitle="Lease lifecycle, applications & onboarding" />
        <KPIBar leases={initialLeases} />
        <Tabs defaultValue="active" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="active">Active Leases</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="active"       className="flex flex-1 overflow-hidden min-h-0 mt-0">
            <ActiveLeases initialLeases={initialLeases} />
          </TabsContent>
          <TabsContent value="applications" className="flex flex-1 overflow-hidden min-h-0 mt-0">
            <Applications />
          </TabsContent>
          <TabsContent value="onboarding"   className="flex flex-1 overflow-hidden min-h-0 mt-0 flex-col">
            <OnboardingKanban />
          </TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
