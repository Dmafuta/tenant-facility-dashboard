'use client'
import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import {
  listRuns, createRun, getRun, uploadAttendance,
  patchEntry, updateRunStatus, exportKcb,
  type PayrollRun, type PayrollEntry,
} from '@/lib/api/casualPayroll'

const fmt = (n: number | null | undefined) =>
  n == null ? '—' : `KES ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', in_review: 'In Review', approved: 'Approved', paid: 'Paid',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}

// ── Run List ──────────────────────────────────────────────────────────────────
function RunList({ runs, onSelect, onNew }: {
  runs: PayrollRun[]
  onSelect: (r: PayrollRun) => void
  onNew: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">Casual Payroll Runs</h2>
          <p className="text-xs text-text-muted mt-0.5">Bi-weekly attendance-based payroll for casual workers</p>
        </div>
        <button onClick={onNew} className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          + New Run
        </button>
      </div>

      {runs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-3xl mb-2">💵</p>
          <p className="text-sm font-medium text-text">No payroll runs yet</p>
          <p className="text-xs text-text-muted mt-1">Create a new run to upload a Deli attendance file</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {runs.map(r => (
            <Card key={r.id} className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(r)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-text">
                    {new Date(r.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' – '}
                    {new Date(r.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                  {r.unmatched_count != null && r.unmatched_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-600">
                      {r.unmatched_count} unmatched
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {r.entry_count ?? 0} workers · Net {fmt(r.total_net)}
                </p>
              </div>
              <span className="text-text-muted text-sm">→</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── New Run Modal ─────────────────────────────────────────────────────────────
function NewRunModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: PayrollRun) => void }) {
  const [start,   setStart]   = useState('')
  const [end,     setEnd]     = useState('')
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!start || !end) { setError('Period start and end are required'); return }
    setLoading(true); setError('')
    try {
      const run = await createRun({ period_start: start, period_end: end, notes: notes || undefined })
      onCreated(run)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text">New Payroll Run</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Period Start</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)} required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Period End</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} required
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. April 1–15 2026"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-bg">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Creating…' : 'Create Run'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Run Detail ────────────────────────────────────────────────────────────────
function RunDetail({ run: initialRun, onBack }: { run: PayrollRun; onBack: () => void }) {
  const [run,       setRun]       = useState<PayrollRun>(initialRun)
  const [uploading, setUploading] = useState(false)
  const [upError,   setUpError]   = useState('')
  const [saving,    setSaving]    = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const entries = run.entries ?? []
  const unmatched = entries.filter(e => !e.matched)
  const canUpload = run.status === 'draft' || run.status === 'in_review'

  async function handleFile(file: File) {
    setUploading(true); setUpError('')
    try {
      const updated = await uploadAttendance(run.id, file)
      // Re-fetch with entries
      const full = await getRun(run.id)
      setRun(full)
    } catch (err) {
      setUpError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function patchField(entry: PayrollEntry, patch: Record<string, unknown>) {
    setSaving(entry.id)
    try {
      const updated = await patchEntry(run.id, entry.id, patch)
      setRun(r => ({
        ...r,
        entries: r.entries?.map(e => e.id === updated.id ? updated : e),
      }))
      // Refresh run totals
      const full = await getRun(run.id)
      setRun(full)
    } finally {
      setSaving(null)
    }
  }

  async function changeStatus(status: string) {
    const updated = await updateRunStatus(run.id, status)
    setRun(r => ({ ...r, ...updated }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-text-muted hover:text-text text-sm">← Back</button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text">
              {new Date(run.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' – '}
              {new Date(run.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLOR[run.status]}`}>
              {STATUS_LABEL[run.status]}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {run.status === 'in_review' && (
            <button onClick={() => changeStatus('approved')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              Approve
            </button>
          )}
          {run.status === 'approved' && (
            <>
              <button onClick={() => exportKcb(run.id)}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                Export KCB CSV
              </button>
              <button onClick={() => changeStatus('paid')}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90">
                Mark as Paid
              </button>
            </>
          )}
          {run.status === 'paid' && (
            <button onClick={() => exportKcb(run.id)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-text-muted hover:bg-bg">
              Re-download CSV
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Workers',    value: run.entry_count ?? 0,           sub: `${unmatched.length} unmatched` },
          { label: 'Total Gross', value: fmt(run.total_gross),          sub: 'Before deductions' },
          { label: 'Total Net',  value: fmt(run.total_net),             sub: 'After deductions' },
          { label: 'Period',     value: `${run.entry_count ?? 0}`,      sub: `${run.period_start} → ${run.period_end}` },
        ].map(c => (
          <Card key={c.label} className="p-4">
            <p className="text-xs text-text-muted">{c.label}</p>
            <p className="text-lg font-bold text-text mt-0.5">{c.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* Upload area */}
      {canUpload && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-text">
                {entries.length > 0 ? 'Re-upload Deli attendance file' : 'Upload Deli attendance file'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Accepts .xls or .xlsx from the Deli biometric device</p>
            </div>
            <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text hover:bg-bg disabled:opacity-50">
              {uploading ? 'Parsing…' : '📂 Choose File'}
            </button>
          </div>
          {upError && <p className="text-xs text-red-600 mt-2">{upError}</p>}
        </Card>
      )}

      {/* Unmatched alert */}
      {unmatched.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{unmatched.length} workers not matched</strong> — their Deli device ID is not linked to anyone in the system.
          Set the <em>Biometric ID</em> on their staff profile (HR → Edit Staff) or assign them manually below.
          Net pay for unmatched workers is not included in the KCB export.
        </div>
      )}

      {/* Entries table */}
      {entries.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-bg">
                  {['Worker', 'Device ID', 'Days', 'OT Hrs', 'Late Min', 'Daily Rate', 'Gross', 'OT Pay', 'Net Pay', 'Notes', ''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-text-muted font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <EntryRow key={entry.id} entry={entry} runStatus={run.status}
                    saving={saving === entry.id} onPatch={p => patchField(entry, p)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {entries.length === 0 && run.status !== 'draft' && (
        <Card className="p-10 text-center text-sm text-text-muted">No entries — upload the attendance file above.</Card>
      )}
      {run.status === 'draft' && entries.length === 0 && (
        <Card className="p-10 text-center text-sm text-text-muted">
          Upload the Deli attendance file to populate this run.
        </Card>
      )}
    </div>
  )
}

// ── Entry Row (inline editing) ─────────────────────────────────────────────────
function EntryRow({ entry, runStatus, saving, onPatch }: {
  entry: PayrollEntry
  runStatus: string
  saving: boolean
  onPatch: (p: Record<string, unknown>) => void
}) {
  const editable = runStatus === 'in_review'
  const [daysWorked,   setDaysWorked]   = useState(String(entry.days_worked))
  const [overtimeHrs,  setOvertimeHrs]  = useState(String(entry.overtime_hours))
  const [dailyRate,    setDailyRate]    = useState(entry.daily_rate != null ? String(entry.daily_rate) : '')
  const [overrideNet,  setOverrideNet]  = useState(entry.override_net_pay != null ? String(entry.override_net_pay) : '')
  const [notes,        setNotes]        = useState(entry.notes ?? '')

  function commit(patch: Record<string, unknown>) { onPatch(patch) }

  const net = entry.override_net_pay != null ? entry.override_net_pay : entry.net_pay

  return (
    <tr className={`border-b border-border last:border-0 ${!entry.matched ? 'bg-amber-50/60' : ''} ${saving ? 'opacity-50' : ''}`}>
      <td className="px-3 py-2 whitespace-nowrap">
        <p className={`font-medium ${entry.matched ? 'text-text' : 'text-amber-700'}`}>
          {entry.person_name ?? entry.name_in_file}
        </p>
        {!entry.matched && <p className="text-[10px] text-amber-600">Unmatched</p>}
        {entry.matched && entry.bank_account_number && (
          <p className="text-[10px] text-text-muted">{entry.bank_account_number}</p>
        )}
        {entry.matched && !entry.bank_account_number && (
          <p className="text-[10px] text-red-500">No bank account</p>
        )}
      </td>
      <td className="px-3 py-2 text-text-muted">{entry.biometric_id}</td>
      <td className="px-3 py-2">
        {editable ? (
          <input type="number" min={0} max={entry.days_scheduled} value={daysWorked}
            className="w-14 border border-border rounded px-1.5 py-1 text-xs text-center bg-bg"
            onChange={e => setDaysWorked(e.target.value)}
            onBlur={() => commit({ days_worked: Number(daysWorked) })} />
        ) : (
          <span>{entry.days_worked}/{entry.days_scheduled}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {editable ? (
          <input type="number" min={0} step={0.5} value={overtimeHrs}
            className="w-16 border border-border rounded px-1.5 py-1 text-xs text-center bg-bg"
            onChange={e => setOvertimeHrs(e.target.value)}
            onBlur={() => commit({ overtime_hours: Number(overtimeHrs) })} />
        ) : (
          <span>{entry.overtime_hours > 0 ? entry.overtime_hours : '—'}</span>
        )}
      </td>
      <td className="px-3 py-2 text-text-muted">
        {entry.late_minutes > 0 ? entry.late_minutes : '—'}
      </td>
      <td className="px-3 py-2">
        {editable ? (
          <input type="number" min={0} step={50} value={dailyRate}
            className="w-20 border border-border rounded px-1.5 py-1 text-xs text-center bg-bg"
            onChange={e => setDailyRate(e.target.value)}
            onBlur={() => commit({ daily_rate: Number(dailyRate) })} />
        ) : (
          <span>{entry.daily_rate != null ? `KES ${Number(entry.daily_rate).toLocaleString()}` : '—'}</span>
        )}
      </td>
      <td className="px-3 py-2">{entry.gross_pay > 0 ? `KES ${Number(entry.gross_pay).toLocaleString()}` : '—'}</td>
      <td className="px-3 py-2">{entry.overtime_pay > 0 ? `KES ${Number(entry.overtime_pay).toLocaleString()}` : '—'}</td>
      <td className="px-3 py-2 font-semibold">
        {editable ? (
          <input type="number" min={0} value={overrideNet} placeholder="auto"
            className="w-24 border border-border rounded px-1.5 py-1 text-xs text-center bg-bg"
            onChange={e => setOverrideNet(e.target.value)}
            onBlur={() => commit({ override_net_pay: overrideNet === '' ? null : Number(overrideNet) })} />
        ) : (
          <span className={net > 0 ? 'text-green-700' : 'text-text-muted'}>
            {net > 0 ? `KES ${Number(net).toLocaleString()}` : '—'}
          </span>
        )}
      </td>
      <td className="px-3 py-2">
        {editable ? (
          <input type="text" value={notes} placeholder="—"
            className="w-32 border border-border rounded px-1.5 py-1 text-xs bg-bg"
            onChange={e => setNotes(e.target.value)}
            onBlur={() => commit({ notes })} />
        ) : (
          <span className="text-text-muted">{entry.notes ?? '—'}</span>
        )}
      </td>
      <td className="px-3 py-2">
        {saving && <span className="text-text-muted animate-pulse text-[10px]">saving…</span>}
      </td>
    </tr>
  )
}

// ── Page Root ─────────────────────────────────────────────────────────────────
export default function CasualPayrollClient() {
  const [runs,     setRuns]    = useState<PayrollRun[]>([])
  const [loading,  setLoading] = useState(true)
  const [showNew,  setShowNew] = useState(false)
  const [selected, setSelected]= useState<PayrollRun | null>(null)

  useEffect(() => {
    listRuns().then(setRuns).finally(() => setLoading(false))
  }, [])

  async function openRun(r: PayrollRun) {
    const full = await getRun(r.id)
    setSelected(full)
  }

  function onNewCreated(r: PayrollRun) {
    setShowNew(false)
    setRuns(prev => [r, ...prev])
    setSelected(r)
  }

  return (
    <DashboardLayout>
      <Topbar title="Payroll" subtitle="Casual worker bi-weekly payroll" />
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : selected ? (
          <RunDetail run={selected} onBack={() => setSelected(null)} />
        ) : (
          <RunList runs={runs} onSelect={openRun} onNew={() => setShowNew(true)} />
        )}
      </main>
      {showNew && <NewRunModal onClose={() => setShowNew(false)} onCreated={onNewCreated} />}
    </DashboardLayout>
  )
}
