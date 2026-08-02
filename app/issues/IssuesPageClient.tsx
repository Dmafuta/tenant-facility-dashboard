'use client'
import { cn } from '@/lib/cn'
import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { SearchInput } from '@/components/ui/SearchInput'
import { Badge } from '@/components/ui/Badge'
import { getIssues, createIssue, updateIssue, updateIssueStatus, escalateIssue, deleteIssue, type IssueData } from '@/lib/api/issues'

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'billing_dispute', 'payment', 'complaint',
  'maintenance', 'noise', 'security', 'cleanliness',
  'utility', 'neighbor', 'common_area', 'other',
] as const

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const STATUSES   = ['open', 'acknowledged', 'in_progress', 'on_hold', 'resolved', 'closed'] as const

const CATEGORY_LABEL: Record<string, string> = {
  billing_dispute: 'Billing Dispute', payment: 'Payment Issue', complaint: 'General Complaint',
  maintenance: 'Maintenance', noise: 'Noise', security: 'Security', cleanliness: 'Cleanliness',
  utility: 'Utility', neighbor: 'Neighbour', common_area: 'Common Area', other: 'Other',
}

const CATEGORY_ICON: Record<string, string> = {
  billing_dispute: '💳', payment: '💰', complaint: '📢',
  maintenance: '🔧', noise: '🔊', security: '🔐', cleanliness: '🧹',
  utility: '💧', neighbor: '👥', common_area: '🏢', other: '⚠️',
}

const STATUS_NEXT: Record<string, string[]> = {
  open:         ['acknowledged', 'in_progress', 'on_hold'],
  acknowledged: ['in_progress', 'on_hold'],
  in_progress:  ['on_hold', 'resolved'],
  on_hold:      ['in_progress', 'resolved'],
  resolved:     ['closed', 'in_progress'],
  closed:       ['open'],
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open', acknowledged: 'Acknowledged', in_progress: 'In Progress',
  on_hold: 'On Hold', resolved: 'Resolved', closed: 'Closed',
}

function statusBadge(status: string) {
  const map: Record<string, 'danger'|'warning'|'blue'|'default'|'success'> = {
    open: 'danger', acknowledged: 'blue', in_progress: 'warning',
    on_hold: 'default', resolved: 'success', closed: 'default',
  }
  return <Badge variant={map[status] ?? 'default'}>{STATUS_LABEL[status] ?? status}</Badge>
}

function priorityBadge(priority: string) {
  const map: Record<string, 'danger'|'warning'|'blue'|'default'> = {
    urgent: 'danger', high: 'warning', medium: 'blue', low: 'default',
  }
  return <Badge variant={map[priority] ?? 'default'}>{priority}</Badge>
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Input styles ───────────────────────────────────────────────────────────────

const INPUT  = 'w-full px-3 py-2 text-sm border border-zinc-950/10 rounded-lg bg-white text-steel-900 placeholder:text-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500'
const SELECT = INPUT + ' cursor-pointer'
const LABEL  = 'block text-xs font-medium text-steel-500 mb-1'

// ── Occurrence Modal ───────────────────────────────────────────────────────────

type IForm = {
  title: string; description: string; category: string; priority: string; status: string
  unit_label: string; reported_by_name: string; caller_phone: string
  linked_reference: string; assigned_to: string; resolution_notes: string
}

function OccurrenceModal({ item, onClose, onSaved }: {
  item: IssueData | null
  onClose: () => void
  onSaved: (v: IssueData) => void
}) {
  const [form, setForm] = useState<IForm>({
    title:            item?.title            ?? '',
    description:      item?.description      ?? '',
    category:         item?.category         ?? 'complaint',
    priority:         item?.priority         ?? 'medium',
    status:           item?.status           ?? 'open',
    unit_label:       item?.unit_label       ?? '',
    reported_by_name: item?.reported_by_name ?? '',
    caller_phone:     item?.caller_phone     ?? '',
    linked_reference: item?.linked_reference ?? '',
    assigned_to:      item?.assigned_to      ?? '',
    resolution_notes: item?.resolution_notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const f = (k: keyof IForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSave() {
    if (!form.title.trim()) { setError('Summary is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        title:            form.title.trim(),
        description:      form.description      || null,
        category:         form.category,
        priority:         form.priority,
        status:           form.status,
        unit_label:       form.unit_label        || null,
        reported_by_name: form.reported_by_name  || null,
        caller_phone:     form.caller_phone       || null,
        linked_reference: form.linked_reference  || null,
        assigned_to:      form.assigned_to        || null,
        resolution_notes: form.resolution_notes   || null,
      }
      const result = item ? await updateIssue(item.id, payload) : await createIssue(payload)
      onSaved(result); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const isNew = !item

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-950/5 flex-shrink-0">
          <span className="text-xl">{CATEGORY_ICON[form.category] ?? '⚠️'}</span>
          <h2 className="flex-1 font-heading text-base font-semibold text-steel-900">
            {isNew ? 'Log Occurrence' : 'Edit Occurrence'}
          </h2>
          <button onClick={onClose} className="p-1 text-steel-400 hover:text-steel-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Summary */}
          <div>
            <label className={LABEL}>Summary <span className="text-danger">*</span></label>
            <input className={INPUT} value={form.title} onChange={f('title')} placeholder="Brief description of the complaint or issue" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Category</label>
              <select className={SELECT} value={form.category} onChange={f('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Priority</label>
              <select className={SELECT} value={form.priority} onChange={f('priority')}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className={LABEL}>Unit (House Number)</label>
            <input className={INPUT} value={form.unit_label} onChange={f('unit_label')} placeholder="e.g. A-101" />
          </div>

          {/* Caller details — manual entry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Caller Name</label>
              <input className={INPUT} value={form.reported_by_name} onChange={f('reported_by_name')} placeholder="Name of person calling" />
            </div>
            <div>
              <label className={LABEL}>Caller Phone</label>
              <input className={INPUT} value={form.caller_phone} onChange={f('caller_phone')} placeholder="e.g. 0712 345 678" type="tel" />
            </div>
          </div>

          {/* Linked reference */}
          <div>
            <label className={LABEL}>Linked Reference <span className="text-text-muted font-normal">(optional — invoice no., M-Pesa ref, etc.)</span></label>
            <input className={INPUT} value={form.linked_reference} onChange={f('linked_reference')} placeholder="e.g. WS-2026-00123 or QA9XYZ12" />
          </div>

          {/* Description */}
          <div>
            <label className={LABEL}>Details</label>
            <textarea className={INPUT + ' resize-none'} rows={3} value={form.description} onChange={f('description')} placeholder="Full details of what was reported…" />
          </div>

          {/* Assigned to + Status (edit mode only) */}
          {!isNew && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Assigned To</label>
                <input className={INPUT} value={form.assigned_to} onChange={f('assigned_to')} placeholder="Person or team" />
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select className={SELECT} value={form.status} onChange={f('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            </div>
          )}

          {!isNew && (
            <div>
              <label className={LABEL}>Resolution Notes</label>
              <textarea className={INPUT + ' resize-none'} rows={2} value={form.resolution_notes} onChange={f('resolution_notes')} placeholder="Notes on how this was resolved…" />
            </div>
          )}

          {isNew && (
            <p className="text-xs text-steel-500 bg-steel-50 border border-zinc-950/5 rounded-lg px-4 py-3">
              A reference number will be generated automatically and an SMS sent to the caller's phone.
            </p>
          )}

          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-950/5 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-950/10 text-steel-500 hover:text-steel-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : isNew ? 'Log Occurrence' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Escalate Modal ─────────────────────────────────────────────────────────────

function EscalateModal({ issue, onClose, onUpdated }: {
  issue: IssueData
  onClose: () => void
  onUpdated: (v: IssueData) => void
}) {
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleEscalate() {
    setLoading(true); setError('')
    try {
      const updated = await escalateIssue(issue.id, note.trim() || undefined)
      onUpdated(updated)
      onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to escalate') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-950/5 flex-shrink-0">
          <span className="text-xl">🚨</span>
          <h2 className="flex-1 font-heading text-base font-semibold text-steel-900">Escalate Occurrence</h2>
          <button onClick={onClose} className="p-1 text-steel-400 hover:text-steel-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-steel-500">
            This will mark <strong className="text-steel-900">{issue.reference_no ?? 'this occurrence'}</strong> as{' '}
            <strong className="text-rose-600">Urgent</strong> and move it to{' '}
            <strong className="text-steel-900">In Progress</strong>. A Telegram alert will be sent immediately.
          </p>
          <div>
            <label className={LABEL}>Escalation note <span className="font-normal text-steel-400">(optional)</span></label>
            <textarea
              className={INPUT + ' resize-none'}
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Reason for escalation or additional context…"
            />
          </div>
          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-950/5 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-950/10 text-steel-500 hover:text-steel-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleEscalate}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Escalating…' : '🚨 Escalate to Urgent'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status Workflow Panel ──────────────────────────────────────────────────────

function StatusActions({ issue, onUpdated }: { issue: IssueData; onUpdated: (v: IssueData) => void }) {
  const [loading, setLoading]     = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes]         = useState(issue.resolution_notes ?? '')

  async function moveTo(status: string) {
    if (loading) return
    if ((status === 'resolved' || status === 'closed') && !showNotes) {
      setShowNotes(true); return
    }
    setLoading(status)
    try {
      const updated = await updateIssueStatus(issue.id, status, { resolution_notes: notes || undefined })
      onUpdated(updated)
      setShowNotes(false)
    } catch {}
    finally { setLoading(null) }
  }

  const nextStatuses = STATUS_NEXT[issue.status] ?? []

  return (
    <div className="space-y-2">
      {showNotes && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add resolution notes (optional — will be included in SMS to caller)…"
          className={INPUT + ' resize-none text-xs'}
          rows={3}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {nextStatuses.map(s => (
          <button
            key={s}
            onClick={() => moveTo(s)}
            disabled={loading !== null}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50',
              s === 'resolved' || s === 'closed'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : s === 'in_progress'
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-steel-100 text-steel-700 hover:bg-steel-200'
            )}
          >
            {loading === s
              ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />{STATUS_LABEL[s]}</span>
              : `→ ${STATUS_LABEL[s]}`}
          </button>
        ))}
        {showNotes && (
          <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 rounded-lg text-xs text-steel-400 hover:text-steel-700">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

// ── Occurrence Detail ──────────────────────────────────────────────────────────

function OccurrenceDetail({ issue, onUpdated, onDeleted, onEdit, onEscalate }: {
  issue: IssueData
  onUpdated: (v: IssueData) => void
  onDeleted: (id: string) => void
  onEdit: () => void
  onEscalate: () => void
}) {
  async function handleDelete() {
    if (!window.confirm(`Delete occurrence ${issue.reference_no ?? issue.id}?`)) return
    try { await deleteIssue(issue.id); onDeleted(issue.id) }
    catch {}
  }

  const canEscalate = issue.priority !== 'urgent' && !['resolved', 'closed'].includes(issue.status)

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0 leading-none mt-0.5">{CATEGORY_ICON[issue.category] ?? '⚠️'}</span>
        <div className="flex-1 min-w-0">
          {issue.reference_no && (
            <p className="text-xs font-mono font-semibold text-primary-600 mb-0.5">{issue.reference_no}</p>
          )}
          <h2 className="font-heading text-lg font-bold text-steel-900 leading-tight">{issue.title}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {statusBadge(issue.status)}
            {priorityBadge(issue.priority)}
            <Badge variant="default">{CATEGORY_LABEL[issue.category] ?? issue.category}</Badge>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {canEscalate && (
            <button onClick={onEscalate} className="px-3 py-1.5 text-xs rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors font-medium">
              🚨 Escalate
            </button>
          )}
          <button onClick={onEdit} className="px-3 py-1.5 text-xs rounded-lg border border-zinc-950/10 text-steel-500 hover:text-steel-900 transition-colors">
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 text-xs rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Unit',             value: issue.unit_label       ?? '—' },
          { label: 'Caller',           value: issue.reported_by_name ?? '—' },
          { label: 'Phone',            value: issue.caller_phone     ?? '—' },
          { label: 'Assigned To',      value: issue.assigned_to      ?? '—' },
          { label: 'Logged',           value: timeAgo(issue.created_at) },
          ...(issue.resolved_at ? [{ label: 'Resolved', value: timeAgo(issue.resolved_at) }] : []),
          ...(issue.linked_reference ? [{ label: 'Linked Ref', value: issue.linked_reference }] : []),
        ].map(f => (
          <div key={f.label} className="bg-steel-50 border border-zinc-950/5 rounded-lg p-3">
            <p className="text-xs text-steel-400">{f.label}</p>
            <p className="text-sm font-medium text-steel-900 mt-0.5 break-all">{f.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {issue.description && (
        <div className="bg-white border border-zinc-950/5 rounded-lg p-4">
          <p className="text-xs font-medium text-steel-400 mb-1.5">Details</p>
          <p className="text-sm text-steel-700 whitespace-pre-wrap">{issue.description}</p>
        </div>
      )}

      {/* Resolution notes */}
      {issue.resolution_notes && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 mb-1.5">Resolution Notes</p>
          <p className="text-sm text-green-800 whitespace-pre-wrap">{issue.resolution_notes}</p>
        </div>
      )}

      {/* Status workflow */}
      {issue.status !== 'closed' && (
        <div className="border border-zinc-950/5 rounded-lg p-4">
          <p className="text-xs font-medium text-steel-400 mb-3">Move to…</p>
          <StatusActions issue={issue} onUpdated={onUpdated} />
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function IssuesPageClient() {
  const [issues, setIssues]         = useState<IssueData[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<IssueData | null>(null)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<IssueData | null>(null)
  const [showEscalate, setShowEscalate] = useState(false)

  const [search, setSearch]                 = useState('')
  const [statusFilter, setStatusFilter]     = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    getIssues()
      .then(data => setIssues(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function onSaved(v: IssueData) {
    setIssues(prev => prev.some(x => x.id === v.id)
      ? prev.map(x => x.id === v.id ? v : x)
      : [v, ...prev])
    setSelected(v)
  }

  function onUpdated(v: IssueData) {
    setIssues(prev => prev.map(x => x.id === v.id ? v : x))
    setSelected(v)
  }

  function onDeleted(id: string) {
    setIssues(prev => prev.filter(x => x.id !== id))
    setSelected(null)
  }

  // ── Stats ──
  const openCount       = issues.filter(i => i.status === 'open').length
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length
  const urgentCount     = issues.filter(i => i.priority === 'urgent' && !['resolved','closed'].includes(i.status)).length
  const resolvedToday   = issues.filter(i => {
    if (!i.resolved_at) return false
    return new Date(i.resolved_at).toDateString() === new Date().toDateString()
  }).length

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return issues.filter(i => {
      const matchSearch = !q
        || i.title.toLowerCase().includes(q)
        || (i.reference_no      ?? '').toLowerCase().includes(q)
        || (i.unit_label        ?? '').toLowerCase().includes(q)
        || (i.reported_by_name  ?? '').toLowerCase().includes(q)
        || (i.caller_phone      ?? '').toLowerCase().includes(q)
        || (i.linked_reference  ?? '').toLowerCase().includes(q)
        || (i.description       ?? '').toLowerCase().includes(q)
      const matchStatus   = statusFilter   === 'all' || i.status   === statusFilter
      const matchPriority = priorityFilter === 'all' || i.priority === priorityFilter
      const matchCategory = categoryFilter === 'all' || i.category === categoryFilter
      return matchSearch && matchStatus && matchPriority && matchCategory
    })
  }, [issues, search, statusFilter, priorityFilter, categoryFilter])

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-950/5 flex-shrink-0 bg-white">
          <div className="flex gap-3 flex-1 flex-wrap">
            {[
              { label: 'Total',          value: issues.length,   color: 'text-steel-900' },
              { label: 'Open',           value: openCount,       color: openCount       > 0 ? 'text-rose-600'   : 'text-green-600' },
              { label: 'In Progress',    value: inProgressCount, color: inProgressCount > 0 ? 'text-amber-600'  : 'text-steel-400' },
              { label: 'Urgent',         value: urgentCount,     color: urgentCount     > 0 ? 'text-rose-600'   : 'text-green-600' },
              { label: 'Resolved Today', value: resolvedToday,   color: resolvedToday   > 0 ? 'text-green-600'  : 'text-steel-400' },
            ].map(k => (
              <div key={k.label} className="bg-steel-50 border border-zinc-950/5 rounded-lg px-4 py-3">
                <p className={`font-heading text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-steel-400 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="ml-4 flex-shrink-0 px-4 py-2 text-sm rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            + Log Occurrence
          </button>
        </div>

        {/* Body: list + detail */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Left: list */}
          <div className={cn('flex-shrink-0 border-r border-zinc-950/5 flex flex-col bg-white', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>

            {/* Filters */}
            <div className="p-3 space-y-2 border-b border-zinc-950/5">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by ref, unit, caller…" />
              <div className="grid grid-cols-3 gap-1.5">
                <select value={statusFilter}   onChange={e => setStatusFilter(e.target.value)}   className="text-xs px-2 py-1.5 rounded-lg border border-zinc-950/10 bg-white text-steel-700">
                  <option value="all">All Status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-zinc-950/10 bg-white text-steel-700">
                  <option value="all">All Priority</option>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-zinc-950/10 bg-white text-steel-700">
                  <option value="all">All Category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}</option>)}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-950/5">
              {loading && (
                <div className="py-12 flex justify-center">
                  <span className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <p className="py-10 text-sm text-steel-400 text-center">No occurrences found.</p>
              )}
              {!loading && filtered.map(i => (
                <button
                  key={i.id}
                  onClick={() => setSelected(i)}
                  className={cn(
                    'w-full text-left px-4 py-3 transition-colors hover:bg-steel-50',
                    selected?.id === i.id && 'bg-primary-50'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none mt-0.5 flex-shrink-0">{CATEGORY_ICON[i.category] ?? '⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-0.5">
                        {i.reference_no
                          ? <span className="text-[10px] font-mono font-semibold text-primary-600">{i.reference_no}</span>
                          : <span />
                        }
                        <span className="text-[10px] text-steel-400 flex-shrink-0">{timeAgo(i.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold text-steel-900 leading-snug line-clamp-1 mb-1">{i.title}</p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {statusBadge(i.status)}
                        {i.priority !== 'low' && priorityBadge(i.priority)}
                      </div>
                      <p className="text-xs text-steel-400">
                        {i.unit_label ?? '—'}{i.reported_by_name ? ` · ${i.reported_by_name}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: detail */}
          <div className={cn('flex-1 flex flex-col overflow-hidden bg-steel-50', !selected && 'hidden lg:flex')}>
            {selected && (
              <div className="lg:hidden flex items-center px-4 pt-3 pb-2 border-b border-zinc-950/5 bg-white flex-shrink-0">
                <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-steel-500 hover:text-steel-900">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                  </svg>
                  Back
                </button>
              </div>
            )}
            {selected ? (
              <OccurrenceDetail
                key={selected.id}
                issue={selected}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
                onEdit={() => { setEditing(selected); setShowForm(true) }}
                onEscalate={() => setShowEscalate(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-steel-400">
                Select an occurrence to view details
              </div>
            )}
          </div>
        </div>
      </main>

      {(showForm || editing !== null) && (
        <OccurrenceModal
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={v => { onSaved(v); setShowForm(false); setEditing(null) }}
        />
      )}

      {showEscalate && selected && (
        <EscalateModal
          issue={selected}
          onClose={() => setShowEscalate(false)}
          onUpdated={v => { onUpdated(v); setShowEscalate(false) }}
        />
      )}
    </DashboardLayout>
  )
}
