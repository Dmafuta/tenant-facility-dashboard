'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CONSUMABLE_STOCK } from '@/lib/mock-data'
import type { ConsumableStock } from '@/lib/types'
import { cn } from '@/lib/cn'
import {
  getConsumableTypes, createConsumableType, updateConsumableType, toggleConsumableType,
  getIssuances, createIssuance, issueOne, bulkIssue, generateRun,
  type ConsumableTypeData, type ConsumableIssuanceData,
} from '@/lib/api/consumables'

// ── Helpers ────────────────────────────────────────────────────────────────

type IssuanceStatus = 'issued' | 'withheld' | 'pending'

function statusBadge(status: IssuanceStatus) {
  const map: Record<IssuanceStatus, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
    issued:   { label: 'Issued',   variant: 'success' },
    withheld: { label: 'Withheld', variant: 'danger'  },
    pending:  { label: 'Pending',  variant: 'warning' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'warning' as const }
  return <Badge variant={variant}>{label}</Badge>
}

function freqLabel(f: string) {
  const MAP: Record<string, string> = {
    monthly:    'Monthly',
    bi_monthly: 'Bi-Monthly',
    quarterly:  'Quarterly',
    on_request: 'On Request',
  }
  return MAP[f] ?? f
}

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function prevPeriod(p: string) {
  const [y, m] = p.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextPeriod(p: string) {
  const [y, m] = p.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatPeriod(p: string) {
  const [y, m] = p.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const INPUT_CLS = 'w-full rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20'
const SELECT_CLS = 'w-full rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20'

const UNIT_TYPE_OPTIONS = [
  'apartment','studio','penthouse','commercial','parking_bay',
  'storage_room','staff_quarter','shop',
]
const CHARGE_TYPE_OPTIONS = [
  'rent','deposit','service_charge','water','electricity',
  'gas','internet','parking','penalty','maintenance','insurance','other',
]

// ── ConsumableTypeModal ────────────────────────────────────────────────────

function ConsumableTypeModal({
  existing, onClose, onSaved,
}: {
  existing?: ConsumableTypeData
  onClose: () => void
  onSaved: (t: ConsumableTypeData) => void
}) {
  const [form, setForm] = useState({
    name:                   existing?.name ?? '',
    description:            existing?.description ?? '',
    unit_of_issue:          existing?.unit_of_issue ?? '',
    quantity_per_unit:      existing?.quantity_per_unit ?? 1,
    quantity_per_issue:     existing?.quantity_per_issue ?? 1,
    issue_frequency:        existing?.issue_frequency ?? 'monthly',
    eligible_unit_types:    existing?.eligible_unit_types ?? [] as string[],
    requires_clearance:     existing?.requires_clearance ?? false,
    clearance_charge_types: existing?.clearance_charge_types ?? [] as string[],
    active:                 existing?.active ?? true,
    notes:                  existing?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function toggleArr(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  async function handleSave() {
    if (!form.name.trim())          { setError('Name is required.'); return }
    if (!form.unit_of_issue.trim()) { setError('Unit of issue is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        name:                   form.name.trim(),
        description:            form.description || null,
        unit_of_issue:          form.unit_of_issue.trim(),
        quantity_per_unit:      form.quantity_per_unit,
        quantity_per_issue:     form.quantity_per_issue,
        issue_frequency:        form.issue_frequency,
        eligible_unit_types:    form.eligible_unit_types,
        requires_clearance:     form.requires_clearance,
        clearance_charge_types: form.requires_clearance ? form.clearance_charge_types : [],
        active:                 form.active,
        notes:                  form.notes || null,
      }
      const saved = existing
        ? await updateConsumableType(existing.id, payload)
        : await createConsumableType(payload)
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-surface dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-border dark:border-dark-border">
          <span className="text-xl">📦</span>
          <h2 className="text-base font-semibold text-text">{existing ? 'Edit Consumable Type' : 'Add Consumable Type'}</h2>
          <button onClick={onClose} className="ml-auto text-text-muted hover:text-text">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-text-muted mb-1 block">Name <span className="text-danger">*</span></label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={INPUT_CLS} placeholder="Garbage Bags" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-text-muted mb-1 block">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={INPUT_CLS} placeholder="Optional description…" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Unit of Issue <span className="text-danger">*</span></label>
              <input value={form.unit_of_issue} onChange={e => setForm(f => ({ ...f, unit_of_issue: e.target.value }))} className={INPUT_CLS} placeholder="roll, pack, piece…" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Frequency</label>
              <select value={form.issue_frequency} onChange={e => setForm(f => ({ ...f, issue_frequency: e.target.value }))} className={SELECT_CLS}>
                <option value="monthly">Monthly</option>
                <option value="bi_monthly">Bi-Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="on_request">On Request</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Qty per Unit</label>
              <input type="number" min={1} value={form.quantity_per_unit} onChange={e => setForm(f => ({ ...f, quantity_per_unit: Number(e.target.value) }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Qty per Issue</label>
              <input type="number" min={1} value={form.quantity_per_issue} onChange={e => setForm(f => ({ ...f, quantity_per_issue: Number(e.target.value) }))} className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-2 block">Eligible Unit Types</label>
            <div className="flex flex-wrap gap-2">
              {UNIT_TYPE_OPTIONS.map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, eligible_unit_types: toggleArr(f.eligible_unit_types, t) }))}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    form.eligible_unit_types.includes(t)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-surface-border dark:border-dark-border text-text-muted hover:border-primary-400'
                  )}
                >
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted dark:bg-dark-hover">
            <div>
              <p className="text-sm font-medium text-text">Requires Clearance</p>
              <p className="text-xs text-text-muted">Withhold if outstanding charges exist</p>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, requires_clearance: !f.requires_clearance }))}
              className={cn('w-10 h-6 rounded-full transition-colors relative', form.requires_clearance ? 'bg-primary-600' : 'bg-surface-border dark:bg-dark-border')}
            >
              <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', form.requires_clearance ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
          </div>

          {form.requires_clearance && (
            <div>
              <label className="text-xs font-medium text-text-muted mb-2 block">Charge Types to Check</label>
              <div className="flex flex-wrap gap-2">
                {CHARGE_TYPE_OPTIONS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setForm(f => ({ ...f, clearance_charge_types: toggleArr(f.clearance_charge_types, c) }))}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      form.clearance_charge_types.includes(c)
                        ? 'bg-warning/20 text-warning border-warning/40'
                        : 'border-surface-border dark:border-dark-border text-text-muted hover:border-warning/40'
                    )}
                  >
                    {c.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={INPUT_CLS} placeholder="Optional notes…" />
          </div>

          {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-surface-border dark:border-dark-border">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Type'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── RecordIssuanceModal ────────────────────────────────────────────────────

function RecordIssuanceModal({
  types, period, onClose, onSaved,
}: {
  types: ConsumableTypeData[]
  period: string
  onClose: () => void
  onSaved: (i: ConsumableIssuanceData) => void
}) {
  const [form, setForm] = useState({
    consumable_type_id: types[0]?.id ?? '',
    unit_label: '',
    unit_id: '',
    person_name: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    if (!form.consumable_type_id) { setError('Select a consumable type.'); return }
    if (!form.unit_label.trim())  { setError('Unit label is required.'); return }
    setSaving(true); setError('')
    try {
      const saved = await createIssuance({
        consumable_type_id: form.consumable_type_id,
        unit_id:     form.unit_id || form.unit_label,
        unit_label:  form.unit_label.trim(),
        person_name: form.person_name || null,
        billing_period: period,
        notes: form.notes || null,
      })
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record issuance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-surface dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-border dark:border-dark-border">
          <span className="text-xl">⚡</span>
          <h2 className="text-base font-semibold text-text">Record Issuance</h2>
          <span className="ml-auto text-xs text-text-muted">{formatPeriod(period)}</span>
          <button onClick={onClose} className="text-text-muted hover:text-text ml-2">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Consumable Type <span className="text-danger">*</span></label>
            <select value={form.consumable_type_id} onChange={e => setForm(f => ({ ...f, consumable_type_id: e.target.value }))} className={SELECT_CLS}>
              {types.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Unit <span className="text-danger">*</span></label>
            <input value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))} className={INPUT_CLS} placeholder="e.g. A-101 or Block A Unit 101" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Resident Name</label>
            <input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} className={INPUT_CLS} placeholder="Optional" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={INPUT_CLS} placeholder="Optional" />
          </div>
          {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-surface-border dark:border-dark-border">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? 'Issuing…' : 'Issue Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── IssuanceRunTab ─────────────────────────────────────────────────────────

function IssuanceRunTab({ types }: { types: ConsumableTypeData[] }) {
  const [period,     setPeriod]     = useState(currentPeriod())
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [issuances,  setIssuances]  = useState<ConsumableIssuanceData[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showRecord, setShowRecord] = useState(false)
  const [issuing,    setIssuing]    = useState<string | null>(null)
  const [bulking,    setBulking]    = useState(false)
  const [generating, setGenerating] = useState(false)
  const [feedback,   setFeedback]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setIssuances(await getIssuances(period)) } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...types.map(t => ({ value: t.id, label: t.name })),
  ]

  const rows = useMemo(() => {
    return issuances
      .filter(r => typeFilter === 'all' || r.consumable_type_id === typeFilter)
      .filter(r => !search ||
        (r.unit_label ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.person_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.consumable_name ?? '').toLowerCase().includes(search.toLowerCase())
      )
  }, [issuances, period, search, typeFilter])

  const issued   = rows.filter(r => r.status === 'issued')
  const withheld = rows.filter(r => r.status === 'withheld')
  const pending  = rows.filter(r => r.status === 'pending')
  const coverage = rows.length > 0 ? Math.round((issued.length / rows.length) * 100) : 0

  async function handleIssueOne(id: string) {
    setIssuing(id)
    try {
      const updated = await issueOne(id)
      setIssuances(prev => prev.map(r => r.id === id ? updated : r))
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Failed to issue')
      setTimeout(() => setFeedback(''), 4000)
    } finally { setIssuing(null) }
  }

  async function handleBulkIssue() {
    if (typeFilter === 'all') {
      setFeedback('Select a specific consumable type to bulk issue.')
      setTimeout(() => setFeedback(''), 4000)
      return
    }
    setBulking(true)
    try {
      const result = await bulkIssue(period, typeFilter)
      setFeedback(`Bulk issue complete: ${result.issued} issued, ${result.withheld} withheld.`)
      setTimeout(() => setFeedback(''), 5000)
      await load()
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Bulk issue failed')
      setTimeout(() => setFeedback(''), 4000)
    } finally { setBulking(false) }
  }

  async function handleGenerateRun() {
    if (typeFilter === 'all') {
      setFeedback('Select a specific consumable type to generate a run.')
      setTimeout(() => setFeedback(''), 4000)
      return
    }
    setGenerating(true)
    try {
      const result = await generateRun(period, typeFilter)
      setFeedback(`Generated ${result.generated} pending record${result.generated !== 1 ? 's' : ''}.`)
      setTimeout(() => setFeedback(''), 5000)
      await load()
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : 'Generate failed')
      setTimeout(() => setFeedback(''), 4000)
    } finally { setGenerating(false) }
  }

  function exportCsv() {
    const headers = ['Unit','Resident','Item','Qty','Status','Reason/Notes','Issued By','Date']
    const lines = rows.map(r => [
      r.unit_label, r.person_name ?? '', r.consumable_name,
      r.quantity_issued, r.status, r.withheld_reason ?? r.notes ?? '',
      r.issued_by ?? '', r.issued_date ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...lines].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `issuance-run-${period}.csv`
    a.click()
  }

  return (
    <div className="space-y-5">
      {showRecord && (
        <RecordIssuanceModal
          types={types}
          period={period}
          onClose={() => setShowRecord(false)}
          onSaved={i => { setIssuances(prev => [i, ...prev]); setShowRecord(false) }}
        />
      )}

      {/* Period banner */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">Issuance run for</p>
          <h3 className="text-lg font-semibold text-text">{formatPeriod(period)}</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPeriod(prevPeriod(period))}>← Prev Month</Button>
          <Button variant="outline" size="sm" onClick={() => setPeriod(nextPeriod(period))}>Next Month →</Button>
          <Button variant="outline" size="sm" onClick={handleGenerateRun} disabled={generating}>
            {generating ? 'Generating…' : '🔄 Generate Run'}
          </Button>
          <Button variant="primary" size="sm" onClick={exportCsv}>⬇ Export Run</Button>
        </div>
      </div>

      {feedback && (
        <p className="text-sm text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg px-4 py-2">
          {feedback}
        </p>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: rows.length,    icon: '🏠' },
          { label: 'Issued',      value: issued.length,   icon: '✅', color: 'text-success' },
          { label: 'Withheld',    value: withheld.length, icon: '🚫', color: 'text-danger' },
          { label: 'Pending',     value: pending.length,  icon: '⏳', color: 'text-warning' },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <span className="text-2xl">{k.icon}</span>
            <div>
              <p className={cn('text-xl font-bold', k.color ?? 'text-text')}>{k.value}</p>
              <p className="text-xs text-text-muted">{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Coverage bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted w-24">Coverage</span>
        <div className="flex-1 h-2 bg-surface-border rounded-full overflow-hidden">
          <div className="h-2 bg-success rounded-full transition-all" style={{ width: `${coverage}%` }} />
        </div>
        <span className="text-xs font-medium text-text">{coverage}%</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search unit or resident…" containerClassName="w-full sm:w-64" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => setShowRecord(true)}>+ Record Issuance</Button>
        <Button variant="primary" size="sm" className="ml-auto" onClick={handleBulkIssue} disabled={bulking}>
          {bulking ? 'Issuing…' : '⚡ Bulk Issue Pending'}
        </Button>
      </div>

      {loading && <p className="text-center text-text-muted py-12">Loading…</p>}

      {!loading && (
        <>
          {/* Issued group */}
          {issued.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                <span className="text-success">✅</span> Issued ({issued.length})
              </h4>
              <IssuanceTable rows={issued} issuing={issuing} onIssue={handleIssueOne} />
            </div>
          )}

          {/* Withheld group */}
          {withheld.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                <span className="text-danger">🚫</span> Withheld ({withheld.length})
                <span className="text-xs font-normal text-text-muted">— Clearance condition not met</span>
              </h4>
              <IssuanceTable rows={withheld} issuing={issuing} onIssue={handleIssueOne} />
            </div>
          )}

          {/* Pending group */}
          {pending.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
                <span className="text-warning">⏳</span> Pending ({pending.length})
                <span className="text-xs font-normal text-text-muted">— Not yet processed</span>
              </h4>
              <IssuanceTable rows={pending} issuing={issuing} onIssue={handleIssueOne} />
            </div>
          )}

          {rows.length === 0 && (
            <p className="text-center text-text-muted py-12">No issuance records for this period or filter.</p>
          )}
        </>
      )}
    </div>
  )
}

function IssuanceTable({
  rows, issuing, onIssue,
}: {
  rows: ConsumableIssuanceData[]
  issuing: string | null
  onIssue: (id: string) => void
}) {
  return (
    <div className="rounded-lg border border-surface-border overflow-hidden mb-2">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-text-muted">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Unit</th>
            <th className="text-left px-4 py-2 font-medium">Resident</th>
            <th className="text-left px-4 py-2 font-medium">Item</th>
            <th className="text-center px-4 py-2 font-medium">Qty</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Reason / Notes</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={cn('border-t border-surface-border hover:bg-surface-hover transition-colors', i % 2 === 0 ? '' : 'bg-surface-muted/30')}>
              <td className="px-4 py-3 font-medium text-text">{r.unit_label}</td>
              <td className="px-4 py-3 text-text-muted">{r.person_name ?? '—'}</td>
              <td className="px-4 py-3 text-text">{r.consumable_name}</td>
              <td className="px-4 py-3 text-center text-text">{r.status === 'issued' ? r.quantity_issued : '—'}</td>
              <td className="px-4 py-3">{statusBadge(r.status)}</td>
              <td className="px-4 py-3 text-text-muted text-xs max-w-xs">{r.withheld_reason ?? r.notes ?? '—'}</td>
              <td className="px-4 py-3 text-right">
                {r.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => onIssue(r.id)} disabled={issuing === r.id}>
                    {issuing === r.id ? '…' : 'Issue'}
                  </Button>
                )}
                {r.status === 'withheld' && (
                  <Button variant="ghost" size="sm" className="text-text-muted">Check</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ConsumableTypesTab ─────────────────────────────────────────────────────

function ConsumableTypesTab({
  types, loading, onRefresh,
}: {
  types: ConsumableTypeData[]
  loading: boolean
  onRefresh: () => void
}) {
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [editing,  setEditing]  = useState<ConsumableTypeData | undefined>()
  const [toggling, setToggling] = useState<string | null>(null)

  const filtered = useMemo(() => types.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description ?? '').toLowerCase().includes(search.toLowerCase())
  ), [types, search])

  async function handleToggle(id: string) {
    setToggling(id)
    try { await toggleConsumableType(id); onRefresh() }
    catch { /* ignore */ }
    finally { setToggling(null) }
  }

  return (
    <div className="space-y-5">
      {(showAdd || editing) && (
        <ConsumableTypeModal
          existing={editing}
          onClose={() => { setShowAdd(false); setEditing(undefined) }}
          onSaved={() => { setShowAdd(false); setEditing(undefined); onRefresh() }}
        />
      )}

      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search consumable types…" containerClassName="w-full sm:w-64" />
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setShowAdd(true)}>+ Add Type</Button>
      </div>

      {loading && <p className="text-center text-text-muted py-12">Loading…</p>}

      {!loading && (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(t => (
            <ConsumableTypeCard key={t.id} type={t} toggling={toggling === t.id}
              onEdit={() => setEditing(t)} onToggle={() => handleToggle(t.id)} />
          ))}
          {filtered.length === 0 && <p className="text-center text-text-muted py-12">No consumable types found.</p>}
        </div>
      )}
    </div>
  )
}

function ConsumableTypeCard({
  type, toggling, onEdit, onToggle,
}: {
  type: ConsumableTypeData
  toggling: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  const isActive = type.active
  return (
    <Card className={cn('p-5', !isActive && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-text">{type.name}</h3>
            <Badge variant={isActive ? 'success' : 'default'} className="text-xs">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="blue" className="text-xs">{freqLabel(type.issue_frequency)}</Badge>
          </div>
          {type.description && <p className="text-sm text-text-muted mb-3">{type.description}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-muted mb-0.5">Issue Unit</p>
              <p className="font-medium text-text capitalize">{type.unit_of_issue}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Qty / Issue</p>
              <p className="font-medium text-text">{type.quantity_per_issue} {type.unit_of_issue}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Eligible Unit Types</p>
              <p className="font-medium text-text capitalize">{type.eligible_unit_types.join(', ') || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          <button
            onClick={onToggle}
            disabled={toggling}
            className="text-xs text-text-muted hover:text-text underline underline-offset-2 disabled:opacity-50"
          >
            {toggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {type.requires_clearance && (
        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
          <div className="flex items-center gap-2 font-medium text-warning mb-1">
            <span>⚠️</span> Clearance Required
          </div>
          <p className="text-text-muted text-xs">
            The following charges must be fully paid before issuance:{' '}
            <span className="font-medium text-text">
              {type.clearance_charge_types.map(c => c.replace(/_/g, ' ')).join(', ')}
            </span>
          </p>
          {type.notes && <p className="text-text-muted text-xs mt-1 italic">{type.notes}</p>}
        </div>
      )}
    </Card>
  )
}

// ── StockLevelsTab ─────────────────────────────────────────────────────────

function StockLevelsTab() {
  const stocks = CONSUMABLE_STOCK

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {stocks.filter(s => s.current_stock < s.reorder_level).length} item(s) below reorder level
        </p>
        <Button variant="primary" size="sm">+ Record Restock</Button>
      </div>

      <div className="rounded-lg border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Item</th>
              <th className="text-center px-4 py-3 font-medium">In Stock</th>
              <th className="text-center px-4 py-3 font-medium">Reorder At</th>
              <th className="text-left px-4 py-3 font-medium">Last Restocked</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => {
              const belowReorder = s.current_stock < s.reorder_level
              const outOfStock   = s.current_stock === 0
              return (
                <tr key={s.id} className={cn('border-t border-surface-border hover:bg-surface-hover transition-colors', i % 2 === 0 ? '' : 'bg-surface-muted/30')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{s.consumable_name}</p>
                    <p className="text-xs text-text-muted">{s.unit_of_issue}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('font-bold text-lg', outOfStock ? 'text-danger' : belowReorder ? 'text-warning' : 'text-success')}>
                      {s.current_stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">{s.reorder_level}</td>
                  <td className="px-4 py-3 text-text-muted">
                    <p>{s.last_restocked_date}</p>
                    <p className="text-xs">+{s.last_restocked_quantity} by {s.last_restocked_by}</p>
                  </td>
                  <td className="px-4 py-3">
                    {outOfStock ? (
                      <Badge variant="danger">Out of Stock</Badge>
                    ) : belowReorder ? (
                      <Badge variant="warning">Low Stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-xs">{s.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm">Restock</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function ConsumablesPageClient() {
  const [types,       setTypes]       = useState<ConsumableTypeData[]>([])
  const [typesLoading, setTypesLoading] = useState(true)

  const loadTypes = useCallback(async () => {
    setTypesLoading(true)
    try { setTypes(await getConsumableTypes()) } catch { /* ignore */ }
    finally { setTypesLoading(false) }
  }, [])

  useEffect(() => { loadTypes() }, [loadTypes])

  const activeTypes   = types.filter(t => t.active).length
  const lowStockCount = CONSUMABLE_STOCK.filter(s => s.current_stock < s.reorder_level).length

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Consumable Types', value: activeTypes,   icon: '📦', sub: 'active' },
          { label: 'Pending Issuance', value: '—',           icon: '⏳', sub: 'see issuance tab' },
          { label: 'Withheld',         value: '—',           icon: '🚫', sub: 'see issuance tab' },
          { label: 'Low Stock Items',  value: lowStockCount, icon: '⚠️', sub: 'below reorder', color: lowStockCount > 0 ? 'text-warning' : 'text-text' },
        ].map(k => (
          <Card key={k.label} className="p-5 flex items-center gap-4">
            <span className="text-3xl">{k.icon}</span>
            <div>
              <p className={cn('text-2xl font-bold', (k as { color?: string }).color ?? 'text-text')}>{k.value}</p>
              <p className="text-xs text-text-muted">{k.label}</p>
              <p className="text-xs text-text-muted">{k.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="issuance">
        <TabsList>
          <TabsTrigger value="issuance">📋 Issuance Run</TabsTrigger>
          <TabsTrigger value="types">📦 Consumable Types</TabsTrigger>
          <TabsTrigger value="stock">
            🏪 Stock Levels
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-xs font-bold">
                {lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issuance" className="pt-5">
          <IssuanceRunTab types={types} />
        </TabsContent>
        <TabsContent value="types" className="pt-5">
          <ConsumableTypesTab types={types} loading={typesLoading} onRefresh={loadTypes} />
        </TabsContent>
        <TabsContent value="stock" className="pt-5">
          <StockLevelsTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
