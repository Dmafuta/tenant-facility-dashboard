'use client'
import { useState, useEffect, useMemo } from 'react'
import { MessageSquare, RefreshCw, Search, Phone, PhoneOff, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { getArrears, notifyArrears, ArrearsInvoice, ArrearsBucket } from '@/lib/api/invoices'

const BUCKET_COLORS: Record<string, string> = {
  '0-30':  'bg-amber-50 text-amber-700 border-amber-200',
  '31-60': 'bg-orange-50 text-orange-700 border-orange-200',
  '61-90': 'bg-red-50 text-red-700 border-red-200',
  '90+':   'bg-red-100 text-red-800 border-red-300',
}

const BUCKET_CARD_COLORS: Record<string, { bg: string; text: string; sub: string }> = {
  '0-30':  { bg: 'bg-amber-50',  text: 'text-amber-700',  sub: 'text-amber-500'  },
  '31-60': { bg: 'bg-orange-50', text: 'text-orange-700', sub: 'text-orange-500' },
  '61-90': { bg: 'bg-red-50',    text: 'text-red-700',    sub: 'text-red-500'    },
  '90+':   { bg: 'bg-red-100',   text: 'text-red-800',    sub: 'text-red-600'    },
}

const fmt = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const DEFAULT_TEMPLATE =
  'Dear {name}, your water bill for {period} (Acc: {unit}) is KES {balance} overdue. Pay via M-Pesa Paybill 522533, Acc {unit}. Queries: 0700000000.'

export function ArrearsTab({ category = 'WS' }: { category?: string }) {
  const [data,          setData]          = useState<import('@/lib/api/invoices').ArrearsData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [bucketFilter,  setBucketFilter]  = useState<string>('all')
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [showNotify,    setShowNotify]    = useState(false)
  const [template,      setTemplate]      = useState(DEFAULT_TEMPLATE)
  const [sending,       setSending]       = useState(false)
  const [sendResult,    setSendResult]    = useState<{ queued: number; skipped_no_phone: number } | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await getArrears(category)
      setData(result)
      setSelected(new Set())
    } catch {
      setError('Failed to load arrears data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [category]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered: ArrearsInvoice[] = useMemo(() => {
    if (!data) return []
    return data.invoices.filter(inv => {
      if (bucketFilter !== 'all' && inv.bucket !== bucketFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          inv.unit_label?.toLowerCase().includes(q) ||
          inv.person_name?.toLowerCase().includes(q) ||
          inv.statement_no?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [data, bucketFilter, search])

  const allFilteredIds = filtered.map(i => i.id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected   = allFilteredIds.some(id => selected.has(id))
  const selectedCount  = allFilteredIds.filter(id => selected.has(id)).length
  const selectedWithPhone = filtered.filter(i => selected.has(i.id) && i.has_phone).length

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); allFilteredIds.forEach(id => s.delete(id)); return s })
    } else {
      setSelected(prev => new Set([...prev, ...allFilteredIds]))
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function handleSend() {
    setSending(true)
    try {
      const ids = filtered.filter(i => selected.has(i.id)).map(i => i.id)
      const result = await notifyArrears(ids, template === DEFAULT_TEMPLATE ? undefined : template)
      setSendResult(result)
    } catch {
      setSendResult(null)
      setError('Failed to send SMS reminders.')
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-text-muted text-sm">
      <RefreshCw className="size-4 animate-spin mr-2" /> Loading arrears...
    </div>
  )

  if (error && !data) return (
    <div className="text-center py-16 text-danger text-sm">{error}</div>
  )

  return (
    <div className="space-y-5">

      {/* Bucket summary cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.buckets.map((b: ArrearsBucket) => {
            const c = BUCKET_CARD_COLORS[b.label]
            const active = bucketFilter === b.label
            return (
              <button
                key={b.label}
                onClick={() => setBucketFilter(active ? 'all' : b.label)}
                className={`${c.bg} rounded-xl p-4 text-left border-2 transition-all ${
                  active ? 'border-current ring-2 ring-offset-1 ring-current/30' : 'border-transparent'
                }`}
              >
                <p className={`text-xs font-medium ${c.sub} mb-1`}>{b.label} days</p>
                <p className={`text-lg font-bold ${c.text}`}>{b.count}</p>
                <p className={`text-xs ${c.sub} mt-0.5`}>{fmt(b.amount)}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Totals bar */}
      {data && (
        <Card className="p-4 flex flex-wrap gap-6 items-center">
          <div>
            <p className="text-xs text-text-muted mb-0.5">Total Outstanding</p>
            <p className="text-base font-bold text-danger">{fmt(data.total_balance)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Overdue Invoices</p>
            <p className="text-base font-semibold text-text">{data.total_count}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">With Phone</p>
            <p className="text-base font-semibold text-text">{data.with_phone} / {data.total_count}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={load}
              className="p-2 rounded-lg hover:bg-surface-hover text-text-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className="size-4" />
            </button>
            <button
              onClick={() => { setSendResult(null); setShowNotify(true) }}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <MessageSquare className="size-4" />
              Send SMS {selectedCount > 0 && `(${selectedCount})`}
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search unit, name..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-surface-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        {bucketFilter !== 'all' && (
          <button
            onClick={() => setBucketFilter('all')}
            className="text-xs text-primary-600 hover:underline"
          >
            Clear filter
          </button>
        )}
        <span className="text-xs text-text-muted ml-auto">{filtered.length} invoice{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-hover">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wide">Unit</th>
                <th className="px-3 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wide">Resident</th>
                <th className="px-3 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wide">Phone</th>
                <th className="px-3 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wide">Period</th>
                <th className="px-3 py-3 text-right font-medium text-text-muted text-xs uppercase tracking-wide">Balance</th>
                <th className="px-3 py-3 text-left font-medium text-text-muted text-xs uppercase tracking-wide">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-muted text-sm">
                    {search || bucketFilter !== 'all' ? 'No invoices match the current filter.' : 'No overdue invoices.'}
                  </td>
                </tr>
              ) : filtered.map(inv => (
                <tr
                  key={inv.id}
                  className={`hover:bg-surface-hover/50 transition-colors ${selected.has(inv.id) ? 'bg-primary-50/40' : ''}`}
                  onClick={() => toggleOne(inv.id)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggleOne(inv.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs font-semibold text-text">{inv.unit_label}</td>
                  <td className="px-3 py-3 text-text">{inv.person_name ?? <span className="text-text-muted italic">—</span>}</td>
                  <td className="px-3 py-3">
                    {inv.has_phone
                      ? <span className="flex items-center gap-1 text-text"><Phone className="size-3 text-success" />{inv.phone}</span>
                      : <span className="flex items-center gap-1 text-text-muted"><PhoneOff className="size-3" />No phone</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-text-muted">{inv.period}</td>
                  <td className="px-3 py-3 text-right font-semibold text-danger">{fmt(inv.balance)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BUCKET_COLORS[inv.bucket]}`}>
                      {inv.days_overdue}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SMS Notify Modal */}
      <Modal
        open={showNotify}
        onClose={() => { if (!sending) setShowNotify(false) }}
        title="Send SMS Reminders"
      >
        {sendResult ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-success/10 p-5 text-center">
              <p className="text-2xl font-bold text-success mb-1">{sendResult.queued}</p>
              <p className="text-sm text-text-muted">SMS messages queued</p>
              {sendResult.skipped_no_phone > 0 && (
                <p className="text-xs text-text-muted mt-2">{sendResult.skipped_no_phone} skipped — no phone number</p>
              )}
            </div>
            <button
              onClick={() => { setShowNotify(false); setSendResult(null) }}
              className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-surface-hover rounded-lg p-3">
                <p className="text-lg font-bold text-text">{selectedCount}</p>
                <p className="text-xs text-text-muted">Selected</p>
              </div>
              <div className="bg-surface-hover rounded-lg p-3">
                <p className="text-lg font-bold text-success">{selectedWithPhone}</p>
                <p className="text-xs text-text-muted">Will receive SMS</p>
              </div>
              <div className="bg-surface-hover rounded-lg p-3">
                <p className="text-lg font-bold text-text-muted">{selectedCount - selectedWithPhone}</p>
                <p className="text-xs text-text-muted">No phone</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Message Template</label>
              <p className="text-xs text-text-muted mb-2">
                Variables: <code className="bg-surface-hover px-1 rounded">{'{name}'}</code>{' '}
                <code className="bg-surface-hover px-1 rounded">{'{unit}'}</code>{' '}
                <code className="bg-surface-hover px-1 rounded">{'{period}'}</code>{' '}
                <code className="bg-surface-hover px-1 rounded">{'{balance}'}</code>
              </p>
              <textarea
                value={template}
                onChange={e => setTemplate(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              />
              <p className="text-xs text-text-muted mt-1 text-right">{template.length} chars</p>
            </div>

            {selectedWithPhone === 0 && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                None of the selected invoices have a phone number — no SMS will be sent.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowNotify(false)}
                className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm font-medium hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || selectedWithPhone === 0}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sending
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                  : <><MessageSquare className="size-4" /> Send {selectedWithPhone} SMS</>
                }
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
