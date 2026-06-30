'use client'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import {
  getExitRequests, billingReviewExit, type ExitRequest,
} from '@/lib/api/exitRequests'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  pending_billing: {
    label: 'Awaiting Billing',
    dot:  'bg-amber-400',
    bg:   'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
  },
  billing_approved: {
    label: 'Billing Cleared',
    dot:  'bg-green-500',
    bg:   'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
  },
  rejected: {
    label: 'Rejected',
    dot:  'bg-red-500',
    bg:   'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-400',
  },
  completed: {
    label: 'Completed',
    dot:  'bg-primary-500',
    bg:   'bg-primary-50 dark:bg-primary-900/20',
    text: 'text-primary-700 dark:text-primary-400',
  },
  cancelled: {
    label: 'Cancelled',
    dot:  'bg-gray-400',
    bg:   'bg-surface-muted dark:bg-dark-hover',
    text: 'text-text-muted',
  },
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.cancelled
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)    return 'Just now'
  if (diff < 60)   return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

// ── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ request, onClose, onDone }: {
  request: ExitRequest
  onClose: () => void
  onDone:  (updated: ExitRequest) => void
}) {
  const [action, setAction] = useState<'cleared' | 'waived' | 'rejected'>('cleared')
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function submit() {
    if ((action === 'waived' || action === 'rejected') && !notes.trim()) {
      setError(`Please provide a reason for ${action === 'waived' ? 'waiving' : 'rejecting'}.`)
      return
    }
    setSaving(true); setError('')
    try {
      const updated = await billingReviewExit(request.id, action, notes.trim() || undefined)
      onDone(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const hasOutstanding = request.outstanding_ws_balance > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div
        className="relative bg-surface dark:bg-dark-surface w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className="h-1 rounded-t-2xl bg-gradient-to-r from-primary-500 via-teal-500 to-primary-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text">Billing Review</h3>
            <p className="text-xs text-text-muted truncate">{request.person_name} · Unit {request.unit_label ?? '—'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">

          {/* Balance banner */}
          {hasOutstanding ? (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Outstanding W&S Balance</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{fmt(request.outstanding_ws_balance)}</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Unpaid water & sewerage invoices remain on this account.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">No Outstanding W&S Balance</p>
                <p className="text-xs text-green-600 dark:text-green-500">All water & sewerage bills have been settled.</p>
              </div>
            </div>
          )}

          {/* Request details — 2-col grid */}
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Request Details</p>
            <div className="grid grid-cols-2 gap-px bg-surface-border dark:bg-dark-border rounded-xl overflow-hidden border border-surface-border dark:border-dark-border">
              {([
                ['Tenant',       request.person_name ?? '—'],
                ['Unit',         request.unit_label ?? '—'],
                ['Move-out Date',fmtDate(request.move_out_date)],
                ['Submitted',    relativeTime(request.initiated_at)],
                ['Reason',       request.reason ?? '—', true],
                ['Initiated by', request.initiated_by_name ?? '—', true],
              ] as [string, string, boolean?][]).map(([label, value, full]) => (
                <div
                  key={label}
                  className={cn(
                    'bg-surface dark:bg-dark-surface px-4 py-2.5',
                    full && 'col-span-2'
                  )}
                >
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-text">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Decision */}
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">Your Decision</p>
            <div className="space-y-2">
              {([
                {
                  val:   'cleared'  as const,
                  label: 'Mark as Cleared',
                  desc:  'Tenant has settled all outstanding bills. Proceed with move-out.',
                  icon:  (
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ),
                  ring: 'border-green-400 dark:border-green-600 bg-green-50/60 dark:bg-green-900/10',
                },
                {
                  val:   'waived'   as const,
                  label: 'Waive Outstanding',
                  desc:  'Management decision to waive unpaid balance. Reason required.',
                  icon:  (
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                  ),
                  ring: 'border-amber-400 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-900/10',
                },
                {
                  val:   'rejected' as const,
                  label: 'Reject — Send Back',
                  desc:  'Tenant must settle bills before move-out can proceed. Reason required.',
                  icon:  (
                    <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ),
                  ring: 'border-red-400 dark:border-red-600 bg-red-50/60 dark:bg-red-900/10',
                },
              ]).map(opt => (
                <label
                  key={opt.val}
                  className={cn(
                    'flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all',
                    action === opt.val
                      ? opt.ring
                      : 'border-surface-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700 bg-surface dark:bg-dark-card'
                  )}
                >
                  <input
                    type="radio"
                    name="billing_action"
                    value={opt.val}
                    checked={action === opt.val}
                    onChange={() => setAction(opt.val)}
                    className="mt-1 accent-primary-600"
                  />
                  {opt.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{opt.label}</p>
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2">
              Notes / Reason
              {(action === 'waived' || action === 'rejected') && <span className="text-danger ml-1 normal-case tracking-normal">* required</span>}
              {action === 'cleared' && <span className="text-text-muted/60 ml-1 normal-case tracking-normal font-normal">(optional)</span>}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={
                action === 'waived'   ? 'Management approval reference or reason for waiver…' :
                action === 'rejected' ? 'Instructions for the tenant or front desk…' :
                'Any additional notes…'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-hover text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors placeholder:text-text-muted/50"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-surface-border dark:border-dark-border bg-surface-muted/40 dark:bg-dark-hover/40 rounded-b-2xl">
          <p className="text-xs text-text-muted hidden sm:block">
            {action === 'cleared'  && 'This will mark the billing stage as cleared.'}
            {action === 'waived'   && 'Outstanding balance will be waived by management.'}
            {action === 'rejected' && 'Request will be sent back to the front desk.'}
          </p>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-surface-border dark:border-dark-border text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className={cn(
                'px-5 py-2 text-sm font-semibold rounded-xl text-white transition-colors disabled:opacity-50 flex items-center gap-2',
                action === 'rejected' ? 'bg-danger hover:bg-red-700' :
                action === 'waived'   ? 'bg-amber-600 hover:bg-amber-700' :
                                        'bg-primary-600 hover:bg-primary-700'
              )}
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving…' :
                action === 'rejected' ? 'Reject Request' :
                action === 'waived'   ? 'Waive & Approve' :
                                        'Confirm Cleared'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'pending_billing',     label: 'Pending',  color: 'text-amber-600'   },
  { key: 'billing_approved',    label: 'Cleared',  color: 'text-green-600'   },
  { key: 'rejected',            label: 'Rejected', color: 'text-red-600'     },
  { key: 'completed,cancelled', label: 'All Done', color: 'text-text-muted'  },
]

const TH = 'px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap'
const TD = 'px-4 py-3 text-sm text-text'

export default function ClearancesPage() {
  const [requests,  setRequests]  = useState<ExitRequest[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState(FILTER_TABS[0].key)
  const [reviewing, setReviewing] = useState<ExitRequest | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getExitRequests(tab)
      setRequests(data)
    } catch {
      // silently ignore — polling will retry
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { setLoading(true); void load() }, [load])
  useEffect(() => {
    const id = setInterval(() => void load(), 20_000)
    return () => clearInterval(id)
  }, [load])

  const pending = requests.filter(r => r.status === 'pending_billing').length

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        <Topbar title="Move-Out Clearances" />

        <div className="flex-1 px-6 py-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-text">Move-Out Clearances</h2>
              <p className="text-sm text-text-muted mt-0.5">Review W&S balances before tenants move out</p>
            </div>
            {pending > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {pending} awaiting review
                </span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-muted dark:bg-dark-hover rounded-xl w-fit">
            {FILTER_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  tab === t.key
                    ? 'bg-surface dark:bg-dark-card shadow-sm text-text'
                    : 'text-text-muted hover:text-text'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-muted dark:bg-dark-hover flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="font-semibold text-text">
                {tab === 'pending_billing' ? 'No pending clearance requests' : 'Nothing here yet'}
              </p>
              <p className="text-sm text-text-muted mt-1 max-w-xs mx-auto">
                {tab === 'pending_billing'
                  ? 'Requests initiated from the front desk will appear here for billing review.'
                  : 'Processed requests will be listed here.'}
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border dark:border-dark-border bg-surface-muted/60 dark:bg-dark-hover/60">
                      <th className={TH}>Tenant</th>
                      <th className={TH}>Unit</th>
                      <th className={TH}>Move-out Date</th>
                      <th className={cn(TH, 'text-right')}>Outstanding W&S</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>Submitted</th>
                      <th className={TH}>Reviewed by</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                    {requests.map(r => (
                      <tr
                        key={r.id}
                        className="hover:bg-surface-muted/40 dark:hover:bg-dark-hover/40 transition-colors group"
                      >
                        {/* Tenant */}
                        <td className={TD}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-xs flex-shrink-0">
                              {(r.person_name ?? 'T').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-text truncate">{r.person_name ?? '—'}</p>
                              {r.reason && (
                                <p className="text-xs text-text-muted truncate max-w-[160px]">{r.reason}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className={TD}>
                          <span className="font-mono text-xs bg-surface-muted dark:bg-dark-hover px-2 py-0.5 rounded font-medium">
                            {r.unit_label ?? '—'}
                          </span>
                        </td>

                        {/* Move-out date */}
                        <td className={TD}>
                          <span className="whitespace-nowrap">{fmtDate(r.move_out_date)}</span>
                        </td>

                        {/* Outstanding balance */}
                        <td className={cn(TD, 'text-right')}>
                          {r.outstanding_ws_balance > 0 ? (
                            <span className="font-bold text-amber-600">
                              {fmt(r.outstanding_ws_balance)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Clear
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className={TD}>
                          <StatusBadge status={r.status} />
                          {r.billing_action && r.status === 'billing_approved' && (
                            <span className={cn(
                              'ml-1.5 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded',
                              r.billing_action === 'waived'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            )}>
                              {r.billing_action}
                            </span>
                          )}
                        </td>

                        {/* Submitted */}
                        <td className={cn(TD, 'text-text-muted whitespace-nowrap')}>
                          <p>{relativeTime(r.initiated_at)}</p>
                          {r.initiated_by_name && (
                            <p className="text-xs text-text-muted/70">{r.initiated_by_name}</p>
                          )}
                        </td>

                        {/* Reviewed by */}
                        <td className={cn(TD, 'text-text-muted whitespace-nowrap')}>
                          {r.billing_reviewed_by_name ? (
                            <>
                              <p className="text-sm font-medium text-text">{r.billing_reviewed_by_name}</p>
                              <p className="text-xs text-text-muted">{relativeTime(r.billing_reviewed_at)}</p>
                            </>
                          ) : (
                            <span className="text-text-muted/50">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          {r.status === 'pending_billing' ? (
                            <button
                              onClick={() => setReviewing(r)}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors whitespace-nowrap shadow-sm"
                            >
                              Review
                            </button>
                          ) : r.billing_notes ? (
                            <span
                              className="text-xs text-text-muted cursor-default max-w-[140px] block truncate"
                              title={r.billing_notes}
                            >
                              {r.billing_notes}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="px-4 py-2.5 border-t border-surface-border dark:border-dark-border bg-surface-muted/40 dark:bg-dark-hover/40">
                <p className="text-xs text-text-muted">
                  {requests.length} {requests.length === 1 ? 'request' : 'requests'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={updated => {
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
            setReviewing(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}
