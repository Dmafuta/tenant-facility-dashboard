'use client'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import {
  getExitRequests, billingReviewExit, type ExitRequest,
} from '@/lib/api/exitRequests'

// ── Status config ────────────────────────────────────────────────────────────

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
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', c.bg, c.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
      {c.label}
    </span>
  )
}

function fmt(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'Just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

// ── Review modal ─────────────────────────────────────────────────────────────

function ReviewModal({ request, onClose, onDone }: {
  request: ExitRequest
  onClose: () => void
  onDone: (updated: ExitRequest) => void
}) {
  const [action, setAction] = useState<'cleared' | 'waived' | 'rejected'>('cleared')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function submit() {
    if ((action === 'waived' || action === 'rejected') && !notes.trim()) {
      setError(`Please provide a reason for ${action === 'waived' ? 'waiving' : 'rejecting'}.`)
      return
    }
    setSaving(true)
    setError('')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        className="relative bg-surface dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent */}
        <div className="h-1 bg-gradient-to-r from-primary-500 to-teal-500" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border dark:border-dark-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-lg flex-shrink-0">
            🧾
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text text-sm">Billing Review</h3>
            <p className="text-xs text-text-muted truncate">
              {request.person_name} — {request.unit_label ?? 'Unknown unit'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover text-xs"
          >✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Outstanding balance banner */}
          {hasOutstanding ? (
            <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-600">⚠</span>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Outstanding W&S Balance</span>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                {fmt(request.outstanding_ws_balance)}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                This tenant has unpaid Water & Sewerage invoices. You may clear (if paid), waive (management decision), or reject this request.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 flex-shrink-0">✓</div>
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">No Outstanding W&S Balance</p>
                <p className="text-xs text-green-600 dark:text-green-500">All water bills have been settled.</p>
              </div>
            </div>
          )}

          {/* Request summary */}
          <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden text-xs">
            {[
              ['Tenant',       request.person_name ?? '—'],
              ['Unit',         request.unit_label ?? '—'],
              ['Move-out Date',request.move_out_date ?? '—'],
              ['Reason',       request.reason ?? '—'],
              ['Submitted by', request.initiated_by_name ?? '—'],
              ['Submitted',    relativeTime(request.initiated_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start gap-3 px-4 py-2.5 border-b border-surface-border dark:border-dark-border last:border-b-0">
                <span className="w-28 text-text-muted flex-shrink-0">{label}</span>
                <span className="font-medium text-text flex-1">{value}</span>
              </div>
            ))}
          </div>

          {/* Action selection */}
          <div>
            <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Your Decision</p>
            <div className="space-y-2">
              {([
                { val: 'cleared' as const,  icon: '✅', label: 'Mark as Cleared',     desc: 'All outstanding bills have been paid. Proceed with move-out.' },
                { val: 'waived'  as const,  icon: '🔄', label: 'Waive Outstanding',   desc: 'Management decision to waive unpaid balance. Reason required.' },
                { val: 'rejected' as const, icon: '❌', label: 'Reject — Send Back',  desc: 'Tenant must settle bills first. Reason required.' },
              ] as const).map(opt => (
                <label
                  key={opt.val}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    action === opt.val
                      ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700'
                  )}
                >
                  <input
                    type="radio"
                    name="billing_action"
                    value={opt.val}
                    checked={action === opt.val}
                    onChange={() => setAction(opt.val)}
                    className="mt-0.5 accent-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-text">{opt.icon} {opt.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Notes / Reason
              {(action === 'waived' || action === 'rejected') && <span className="text-danger ml-0.5">*</span>}
              {action === 'cleared' && <span className="text-text-muted/60 ml-1 font-normal">(optional)</span>}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={
                action === 'waived'   ? 'Management approval reference or reason for waiver…' :
                action === 'rejected' ? 'Instructions for the tenant / front desk…' :
                'Any additional notes…'
              }
              className="w-full px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border dark:border-dark-border flex justify-end gap-2">
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
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'pending_billing',               label: 'Pending',   color: 'text-amber-600' },
  { key: 'billing_approved',              label: 'Cleared',   color: 'text-green-600' },
  { key: 'rejected',                      label: 'Rejected',  color: 'text-red-600'   },
  { key: 'completed,cancelled',           label: 'All Done',  color: 'text-text-muted'},
]

export default function ClearancesPage() {
  const [requests, setRequests] = useState<ExitRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState(FILTER_TABS[0].key)
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

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  // Poll every 20 seconds
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
          {/* Header card */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                🏠
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text">Move-Out Clearances</h2>
                <p className="text-sm text-text-muted">
                  Review outstanding Water & Sewerage bills before tenants move out
                </p>
              </div>
              {pending > 0 && (
                <div className="text-center px-5 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-2xl font-bold text-amber-600">{pending}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Awaiting Review</p>
                </div>
              )}
            </div>
          </Card>

          {/* Filter tabs */}
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

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="py-16 text-center">
              <div className="text-4xl mb-3">
                {tab === 'pending_billing' ? '✅' : '📭'}
              </div>
              <p className="font-semibold text-text">
                {tab === 'pending_billing' ? 'All clear — no pending requests' : 'Nothing here yet'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                {tab === 'pending_billing'
                  ? 'Requests from the front desk will appear here for your review.'
                  : 'Processed requests will be listed here.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map(r => (
                <Card key={r.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Status stripe */}
                  <div className={cn('h-1', {
                    'bg-amber-400': r.status === 'pending_billing',
                    'bg-green-500': r.status === 'billing_approved',
                    'bg-red-500':   r.status === 'rejected',
                    'bg-primary-500': r.status === 'completed',
                    'bg-gray-300':  r.status === 'cancelled',
                  })} />

                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-sm flex-shrink-0">
                        {(r.person_name ?? 'T').slice(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-text">{r.person_name ?? '—'}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-sm text-text-muted mt-0.5">
                          {r.unit_label ?? '—'} · Move-out: <span className="font-medium text-text">{r.move_out_date ?? '—'}</span>
                        </p>
                        {r.reason && (
                          <p className="text-xs text-text-muted mt-1">Reason: {r.reason}</p>
                        )}
                        {r.billing_notes && (
                          <p className={cn('text-xs mt-1 font-medium', {
                            'text-danger':  r.status === 'rejected',
                            'text-amber-600': r.status === 'billing_approved' && r.billing_action === 'waived',
                            'text-green-600': r.status === 'billing_approved' && r.billing_action === 'cleared',
                          })}>
                            {r.billing_notes}
                          </p>
                        )}
                      </div>

                      {/* Right side */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        {r.outstanding_ws_balance > 0 ? (
                          <div className="text-right">
                            <p className="text-[10px] text-text-muted">Outstanding W&S</p>
                            <p className="text-sm font-bold text-amber-600">{fmt(r.outstanding_ws_balance)}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">Bills Clear</span>
                        )}

                        {r.status === 'pending_billing' && (
                          <button
                            onClick={() => setReviewing(r)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                          >
                            Review
                          </button>
                        )}

                        <p className="text-[10px] text-text-muted">{relativeTime(r.initiated_at)}</p>
                      </div>
                    </div>

                    {/* Billing reviewer info */}
                    {r.billing_reviewed_by_name && (
                      <div className="mt-3 pt-3 border-t border-surface-border dark:border-dark-border flex items-center gap-2">
                        <span className="text-xs text-text-muted">Reviewed by</span>
                        <span className="text-xs font-medium text-text">{r.billing_reviewed_by_name}</span>
                        <span className="text-xs text-text-muted">· {relativeTime(r.billing_reviewed_at)}</span>
                        {r.billing_action && (
                          <span className={cn('ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', {
                            'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400': r.billing_action === 'cleared',
                            'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400': r.billing_action === 'waived',
                          })}>
                            {r.billing_action}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
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
