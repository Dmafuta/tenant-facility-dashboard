'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import {
  getPrepaidLoads, getPrepaidSummary, recordPrepaidLoad, deletePrepaidLoad,
  type PrepaidLoad, type PrepaidLoadSummary,
} from '@/lib/api/prepaidLoads'
import { getMetersPaged, type MeterData } from '@/lib/api/meters'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return 'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtUnits(n: number | null) {
  if (n == null) return '—'
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' m³'
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Record Load Modal ─────────────────────────────────────────────────────────

function RecordLoadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [meters, setMeters]         = useState<MeterData[]>([])
  const [meterSearch, setMeterSearch] = useState('')
  const [meterId, setMeterId]       = useState('')
  const [selectedMeter, setSelectedMeter] = useState<MeterData | null>(null)
  const [showDropdown, setShowDropdown]   = useState(false)
  const [amountPaid, setAmountPaid]   = useState('')
  const [unitsLoaded, setUnitsLoaded] = useState('')
  const [mpesaRef, setMpesaRef]       = useState('')
  const [loadedAt, setLoadedAt]       = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Load prepaid meters for dropdown
  useEffect(() => {
    getMetersPaged({ meterType: 'prepaid', utilityType: 'water', deployed: true, size: 100 })
      .then(r => setMeters(r.content))
      .catch(() => {})
  }, [])

  const filtered = meters.filter(m => {
    const q = meterSearch.toLowerCase()
    return !q || m.unit_label?.toLowerCase().includes(q) || m.meter_number.toLowerCase().includes(q)
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!meterId) { setError('Select a meter'); return }
    if (!amountPaid || parseFloat(amountPaid) <= 0) { setError('Enter amount paid'); return }
    setSaving(true); setError(null)
    try {
      await recordPrepaidLoad({
        meterId,
        amountPaid: parseFloat(amountPaid),
        unitsLoaded: unitsLoaded ? parseFloat(unitsLoaded) : null,
        mpesaReference: mpesaRef || null,
        loadedAt,
        notes: notes || null,
      })
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record load')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border dark:border-dark-border">
          <h2 className="font-semibold text-base">Record Prepaid Load</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Meter picker */}
          <div className="relative">
            <label className="block text-xs font-medium text-text-muted mb-1">Meter / Unit *</label>
            <input
              type="text"
              placeholder="Search by unit label or meter number…"
              value={selectedMeter ? `${selectedMeter.unit_label} — ${selectedMeter.meter_number}` : meterSearch}
              onChange={e => { setMeterSearch(e.target.value); setSelectedMeter(null); setMeterId(''); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {showDropdown && filtered.length > 0 && !selectedMeter && (
              <div className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-xl shadow-lg">
                {filtered.slice(0, 20).map(m => (
                  <button
                    key={m.id} type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted dark:hover:bg-dark-hover"
                    onClick={() => { setSelectedMeter(m); setMeterId(m.id); setMeterSearch(''); setShowDropdown(false) }}
                  >
                    <span className="font-medium">{m.unit_label}</span>
                    <span className="text-text-muted ml-2 text-xs">{m.meter_number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount paid */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Amount Paid (KES) *</label>
            <input
              type="number" min="1" step="0.01" value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Units loaded */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Units Loaded (m³) — optional</label>
            <input
              type="number" min="0" step="0.001" value={unitsLoaded}
              onChange={e => setUnitsLoaded(e.target.value)}
              placeholder="e.g. 10.5"
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* M-Pesa reference */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">M-Pesa Reference</label>
            <input
              type="text" value={mpesaRef} onChange={e => setMpesaRef(e.target.value.toUpperCase())}
              placeholder="e.g. QGH4K2P1X3"
              className="w-full px-3 py-2 text-sm font-mono border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Date loaded */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Date Loaded *</label>
            <input
              type="date" value={loadedAt} onChange={e => setLoadedAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving…' : 'Record Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function PrepaidTab() {
  const [loads, setLoads]       = useState<PrepaidLoad[]>([])
  const [summary, setSummary]   = useState<PrepaidLoadSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [loadsRes, summaryRes] = await Promise.all([
        getPrepaidLoads({ from: from || undefined, to: to || undefined, page, size: 25 }),
        getPrepaidSummary(from || undefined, to || undefined),
      ])
      setLoads(loadsRes.content)
      setTotalPages(loadsRes.totalPages)
      setTotalElements(loadsRes.totalElements)
      setSummary(summaryRes)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [from, to, page])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('Delete this load record?')) return
    setDeleting(id)
    try { await deletePrepaidLoad(id); load() }
    catch { /* silent */ }
    finally { setDeleting(null) }
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted mb-1">Total Collected</p>
          <p className="text-lg font-semibold text-primary-600">
            {summary ? fmt(summary.total_amount_paid) : '—'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted mb-1">Units Loaded</p>
          <p className="text-lg font-semibold">{summary ? fmtUnits(summary.total_units_loaded) : '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted mb-1">Total Loads</p>
          <p className="text-lg font-semibold">{summary?.total_loads ?? '—'}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-text-muted text-xs">From</label>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }}
            className="px-2 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <label className="text-text-muted text-xs">To</label>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0) }}
            className="px-2 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo(''); setPage(0) }}
              className="text-xs text-text-muted hover:text-text underline">Clear</button>
          )}
        </div>
        <div className="ml-auto">
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-medium">
            + Record Load
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : loads.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-10">No prepaid loads recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-hover">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Unit</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Meter</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">Amount (KES)</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-text-muted">Units (m³)</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">M-Pesa Ref</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Loaded By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted">Notes</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                {loads.map(l => (
                  <tr key={l.id} className="hover:bg-surface-muted/50 dark:hover:bg-dark-hover/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-text-muted whitespace-nowrap">{fmtDate(l.loaded_at)}</td>
                    <td className="px-4 py-2.5 font-medium">{l.unit_label ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{l.meter_number ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {l.amount_paid.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-muted tabular-nums">
                      {fmtUnits(l.units_loaded)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{l.mpesa_reference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted">{l.loaded_by_name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-text-muted max-w-[160px] truncate" title={l.notes ?? ''}>
                      {l.notes ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => handleDelete(l.id)}
                        disabled={deleting === l.id}
                        className={cn(
                          'text-xs text-danger hover:underline disabled:opacity-40',
                        )}
                      >
                        {deleting === l.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-border dark:border-dark-border">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="text-xs text-text-muted hover:text-text disabled:opacity-30 px-2 py-1">← Prev</button>
            <span className="text-xs text-text-muted">Page {page + 1} of {totalPages} · {totalElements} total</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="text-xs text-text-muted hover:text-text disabled:opacity-30 px-2 py-1">Next →</button>
          </div>
        )}
      </Card>

      {showModal && (
        <RecordLoadModal onClose={() => setShowModal(false)} onSaved={load} />
      )}
    </div>
  )
}
