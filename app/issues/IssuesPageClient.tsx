'use client'
import { cn } from '@/lib/cn'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { createIssue, updateIssue, updateIssueStatus, escalateIssue, deleteIssue, type IssueData } from '@/lib/api/issues'
import { useIssues, useInvalidateIssues } from '@/lib/queries/issues'

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'billing_dispute', 'payment', 'complaint',
  'maintenance', 'noise', 'security', 'cleanliness',
  'utility', 'neighbor', 'common_area', 'other',
] as const

const CATEGORY_LABEL: Record<string, string> = {
  billing_dispute: 'Billing Dispute',
  payment:         'Payment Issue',
  complaint:       'General Complaint',
  maintenance:     'Maintenance',
  noise:           'Noise',
  security:        'Security',
  cleanliness:     'Cleanliness',
  utility:         'Water & Sewerage',
  neighbor:        'Neighbour',
  common_area:     'Common Area',
  other:           'Other',
}

const CATEGORY_ICON: Record<string, string> = {
  billing_dispute: '💳', payment: '💰', complaint: '📢',
  maintenance: '🔧', noise: '🔊', security: '🔐', cleanliness: '🧹',
  utility: '💧', neighbor: '👥', common_area: '🏢', other: '⚠️',
}

// Priority mapped to P1–P4 tiers
const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  urgent: { label: 'P1 · Critical', badge: 'bg-rose-100 text-rose-700 ring-1 ring-rose-600/20' },
  high:   { label: 'P2 · High',     badge: 'bg-orange-100 text-orange-700 ring-1 ring-orange-600/20' },
  medium: { label: 'P3 · Medium',   badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20' },
  low:    { label: 'P4 · Low',      badge: 'bg-neutral-100 text-steel-500 ring-1 ring-zinc-300/60' },
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  open:         { label: 'New',          badge: 'bg-sky-100 text-sky-700 ring-1 ring-sky-600/20' },
  acknowledged: { label: 'Acknowledged', badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20' },
  in_progress:  { label: 'In Progress',  badge: 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-600/20' },
  on_hold:      { label: 'On Hold',      badge: 'bg-neutral-100 text-steel-500 ring-1 ring-zinc-300/60' },
  resolved:     { label: 'Resolved',     badge: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20' },
  closed:       { label: 'Closed',       badge: 'bg-neutral-100 text-neutral-500 ring-1 ring-neutral-300/40' },
}

const STATUS_NEXT: Record<string, string[]> = {
  open:         ['acknowledged', 'in_progress', 'on_hold'],
  acknowledged: ['in_progress', 'on_hold'],
  in_progress:  ['on_hold', 'resolved'],
  on_hold:      ['in_progress', 'resolved'],
  resolved:     ['closed', 'in_progress'],
  closed:       ['open'],
}

const STATUSES   = ['open', 'acknowledged', 'in_progress', 'on_hold', 'resolved', 'closed'] as const
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const TABS       = ['Case Queue', 'SLA & Escalation', 'Insights & Hotspots', 'Playbooks', 'Satisfaction', 'Team Performance'] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function slaInfo(issue: IssueData): { pct: number; label: string; barColor: string; textColor: string } {
  const windowH: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 72 }
  const ageH = (Date.now() - new Date(issue.created_at ?? Date.now()).getTime()) / 3_600_000
  const win  = windowH[issue.priority] ?? 24
  const pct  = Math.min(Math.round((ageH / win) * 100), 100)
  if (['resolved', 'closed'].includes(issue.status))
    return { pct: 100, label: 'Completed', barColor: 'bg-emerald-500', textColor: 'text-emerald-600' }
  if (pct >= 100) return { pct: 100, label: 'Breached',  barColor: 'bg-rose-500',    textColor: 'text-rose-600' }
  if (pct >= 75)  return { pct,      label: 'At risk',   barColor: 'bg-amber-500',   textColor: 'text-amber-600' }
  return              { pct,      label: 'On track',  barColor: 'bg-emerald-500', textColor: 'text-emerald-600' }
}

function slaTime(issue: IssueData): string {
  const windowH: Record<string, number> = { urgent: 4, high: 8, medium: 24, low: 72 }
  const ageH = (Date.now() - new Date(issue.created_at ?? Date.now()).getTime()) / 3_600_000
  const win  = windowH[issue.priority] ?? 24
  const fmt  = (h: number) => h < 1 ? `${Math.round(h * 60)}m` : `${Math.round(h)}h`
  return `${fmt(Math.min(ageH, win))} / ${fmt(win)}`
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold', className)}>
      {children}
    </span>
  )
}

// ── Shared input styles ────────────────────────────────────────────────────────

const INPUT  = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white text-steel-900 placeholder:text-steel-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500'
const SELECT = INPUT + ' cursor-pointer'
const LABEL  = 'block text-[10px] font-bold uppercase tracking-widest text-steel-400 mb-1.5'

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
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-950/5 flex-shrink-0">
          <span className="text-xl">{CATEGORY_ICON[form.category] ?? '⚠️'}</span>
          <h2 className="flex-1 font-heading text-base font-semibold text-steel-900">
            {isNew ? 'Log Occurrence' : 'Edit Occurrence'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-steel-400 hover:text-steel-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={LABEL}>Summary <span className="text-rose-500 normal-case font-normal">*</span></label>
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
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p]?.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>Unit (House Number)</label>
            <input className={INPUT} value={form.unit_label} onChange={f('unit_label')} placeholder="e.g. A-101" />
          </div>
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
          <div>
            <label className={LABEL}>
              Linked Reference{' '}
              <span className="normal-case font-normal text-steel-400">(invoice no., M-Pesa ref, etc.)</span>
            </label>
            <input className={INPUT} value={form.linked_reference} onChange={f('linked_reference')} placeholder="e.g. WS-2026-00123 or QA9XYZ12" />
          </div>
          <div>
            <label className={LABEL}>Details</label>
            <textarea className={INPUT + ' resize-none'} rows={3} value={form.description} onChange={f('description')} placeholder="Full details of what was reported…" />
          </div>
          {!isNew && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Assigned To</label>
                <input className={INPUT} value={form.assigned_to} onChange={f('assigned_to')} placeholder="Person or team" />
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select className={SELECT} value={form.status} onChange={f('status')}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label}</option>)}
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
              A reference number (OCC-YYYY-NNNNN) will be generated automatically and an SMS sent to the caller's phone.
            </p>
          )}
          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-950/5 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-steel-500 hover:text-steel-900 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-steel-900 text-white font-semibold hover:bg-steel-800 disabled:opacity-50 transition-colors">
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
      onUpdated(updated); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to escalate') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-950/5 flex-shrink-0">
          <span className="text-xl">🚨</span>
          <h2 className="flex-1 font-heading text-base font-semibold text-steel-900">Escalate to P1 · Critical</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-steel-400 hover:text-steel-900">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-steel-500">
            <strong className="text-steel-900">{issue.reference_no ?? 'This occurrence'}</strong> will be marked{' '}
            <strong className="text-rose-600">P1 · Critical</strong> and moved to{' '}
            <strong className="text-steel-900">In Progress</strong>. A Telegram alert fires immediately.
          </p>
          <div>
            <label className={LABEL}>
              Escalation note{' '}
              <span className="normal-case font-normal text-steel-400">(optional)</span>
            </label>
            <textarea className={INPUT + ' resize-none'} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for escalation or additional context…" />
          </div>
          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-950/5 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-zinc-200 text-steel-500 hover:text-steel-900 transition-colors">Cancel</button>
          <button onClick={handleEscalate} disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {loading ? 'Escalating…' : '🚨 Escalate to P1'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status Actions ─────────────────────────────────────────────────────────────

function StatusActions({ issue, onUpdated }: { issue: IssueData; onUpdated: (v: IssueData) => void }) {
  const [loading, setLoading]     = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes]         = useState(issue.resolution_notes ?? '')

  async function moveTo(status: string) {
    if (loading) return
    if ((status === 'resolved' || status === 'closed') && !showNotes) { setShowNotes(true); return }
    setLoading(status)
    try {
      const updated = await updateIssueStatus(issue.id, status, { resolution_notes: notes || undefined })
      onUpdated(updated); setShowNotes(false)
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
          placeholder="Resolution notes (optional — included in SMS to caller)…"
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
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50',
              s === 'resolved' || s === 'closed' ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : s === 'in_progress'              ? 'bg-primary-600 text-white hover:bg-primary-700'
              :                                    'bg-neutral-100 text-steel-700 hover:bg-neutral-200'
            )}
          >
            {loading === s
              ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />{STATUS_META[s]?.label}</span>
              : `→ ${STATUS_META[s]?.label ?? s}`}
          </button>
        ))}
        {showNotes && (
          <button onClick={() => setShowNotes(false)} className="px-3 py-1.5 rounded-lg text-xs text-steel-400 hover:text-steel-700">Cancel</button>
        )}
      </div>
    </div>
  )
}

// ── Occurrence Detail (Right Panel) ───────────────────────────────────────────

function OccurrenceDetail({ issue, onUpdated, onDeleted, onEdit, onEscalate }: {
  issue: IssueData
  onUpdated: (v: IssueData) => void
  onDeleted: (id: string) => void
  onEdit: () => void
  onEscalate: () => void
}) {
  const sla          = slaInfo(issue)
  const canEscalate  = issue.priority !== 'urgent' && !['resolved', 'closed'].includes(issue.status)

  const tags = [
    { text: STATUS_META[issue.status]?.label,           cls: STATUS_META[issue.status]?.badge },
    { text: PRIORITY_META[issue.priority]?.label,       cls: PRIORITY_META[issue.priority]?.badge },
    { text: CATEGORY_LABEL[issue.category] ?? issue.category, cls: 'bg-neutral-100 text-steel-600 ring-1 ring-zinc-300/40' },
    ...(issue.priority === 'urgent' ? [{ text: 'escalated', cls: 'bg-rose-50 text-rose-600 ring-1 ring-rose-300/40' }] : []),
  ].filter(t => t.text)

  async function handleDelete() {
    if (!window.confirm(`Delete occurrence ${issue.reference_no ?? issue.id}?`)) return
    try { await deleteIssue(issue.id); onDeleted(issue.id) } catch {}
  }

  const metaGrid = [
    { label: 'UNIT',         value: issue.unit_label       ?? '—' },
    { label: 'REPORTED BY',  value: issue.reported_by_name ?? '—' },
    { label: 'CONTACT',      value: issue.caller_phone     ?? '—' },
    { label: 'CHANNEL',      value: '—' },
    { label: 'LOGGED',       value: issue.created_at
        ? new Date(issue.created_at).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })
        : '—' },
    { label: 'OWNING TEAM',  value: '—' },
    { label: 'ASSIGNEE',     value: issue.assigned_to      ?? '—' },
    { label: 'LINKED REF',   value: issue.linked_reference ?? '—' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header: ref + actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-950/5 bg-white flex-shrink-0 flex-wrap">
        {issue.reference_no && (
          <span className="font-mono text-xs font-bold text-primary-600 mr-2">{issue.reference_no}</span>
        )}
        <div className="flex-1" />
        {canEscalate && (
          <button onClick={onEscalate} className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors">
            🚨 Escalate
          </button>
        )}
        <button className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-200 text-steel-600 hover:bg-steel-50 transition-colors">
          📞 Call resident
        </button>
        <button className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-200 text-steel-600 hover:bg-steel-50 transition-colors">
          🔧 Raise work order
        </button>
        <button onClick={onEdit} className="h-8 px-3 text-xs font-semibold rounded-lg border border-zinc-200 text-steel-500 hover:text-steel-900 transition-colors">
          Edit
        </button>
        <button onClick={handleDelete} className="h-8 px-3 text-xs font-semibold rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors">
          Delete
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Title + tag pills */}
        <div>
          <h2 className="font-heading text-xl font-bold text-steel-900 leading-tight mb-2.5">{issue.title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t, i) => (
              <Pill key={i} className={t.cls}>{t.text}</Pill>
            ))}
          </div>
        </div>

        {/* 4-col meta grid */}
        <div className="grid grid-cols-4 gap-px bg-zinc-950/5 border border-zinc-950/5 rounded-lg overflow-hidden">
          {metaGrid.map(f => (
            <div key={f.label} className="bg-white px-3 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 mb-1">{f.label}</p>
              <p className="text-sm font-medium text-steel-900 break-all leading-tight">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        {issue.description && (
          <div className="border border-zinc-950/5 rounded-lg p-4 bg-white">
            <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 mb-2">DETAILS</p>
            <p className="text-sm text-steel-700 whitespace-pre-wrap leading-relaxed">{issue.description}</p>
          </div>
        )}

        {/* Resolution notes */}
        {issue.resolution_notes && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 mb-2">RESOLUTION NOTES</p>
            <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed">{issue.resolution_notes}</p>
          </div>
        )}

        {/* SLA / metrics footer */}
        <div className="grid grid-cols-3 gap-px bg-zinc-950/5 border border-zinc-950/5 rounded-lg overflow-hidden">
          <div className="bg-white px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 mb-1.5">RESOLUTION SLA</p>
            <p className={cn('text-sm font-semibold', sla.textColor)}>{sla.label}</p>
            <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', sla.barColor)} style={{ width: `${sla.pct}%` }} />
            </div>
            <p className="text-[10px] text-steel-400 mt-1">{slaTime(issue)}</p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 mb-1.5">FIRST RESPONSE</p>
            <p className="text-sm font-semibold text-steel-400">—</p>
            <p className="text-[10px] text-steel-400 mt-1">tracking soon</p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 mb-1.5">RESIDENT SATISFACTION</p>
            <p className="text-sm font-semibold text-steel-400">
              {['resolved', 'closed'].includes(issue.status) ? 'Survey pending' : '—'}
            </p>
          </div>
        </div>

        {/* Status workflow */}
        {issue.status !== 'closed' && (
          <div className="border border-zinc-950/5 rounded-lg p-4 bg-white">
            <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 mb-3">MOVE TO</p>
            <StatusActions issue={issue} onUpdated={onUpdated} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function IssuesPageClient() {
  const { data: rawIssues, isLoading: loading } = useIssues()
  const issues = Array.isArray(rawIssues) ? rawIssues : []
  const invalidate = useInvalidateIssues()
  const [selected, setSelected]         = useState<IssueData | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<IssueData | null>(null)
  const [showEscalate, setShowEscalate] = useState(false)
  const [activeTab, setActiveTab]       = useState<typeof TABS[number]>('Case Queue')

  const [search, setSearch]                   = useState('')
  const [statusFilter, setStatusFilter]       = useState('open_cases')
  const [priorityFilter, setPriorityFilter]   = useState('all')
  const [categoryFilter, setCategoryFilter]   = useState('all')

  function onSaved(v: IssueData) {
    invalidate()
    setSelected(v)
  }
  function onUpdated(v: IssueData) {
    invalidate()
    setSelected(v)
  }
  function onDeleted(_id: string) {
    invalidate()
    setSelected(null)
  }

  // KPI stats — mix of real data and mock placeholders
  const openCount     = issues.filter(i => !['resolved','closed'].includes(i.status)).length
  const inProgress    = issues.filter(i => i.status === 'in_progress').length
  const resolvedToday = issues.filter(i => {
    if (!i.resolved_at) return false
    return new Date(i.resolved_at).toDateString() === new Date().toDateString()
  }).length
  const atRiskCount   = issues.filter(i => {
    const s = slaInfo(i); return s.label === 'At risk' || s.label === 'Breached'
  }).length
  const slaBreached   = issues.filter(i => slaInfo(i).label === 'Breached').length

  // Filtered list
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
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'open_cases' && !['resolved','closed'].includes(i.status))
        || i.status === statusFilter
      const matchPriority  = priorityFilter  === 'all' || i.priority  === priorityFilter
      const matchCategory  = categoryFilter  === 'all' || i.category  === categoryFilter
      return matchSearch && matchStatus && matchPriority && matchCategory
    })
  }, [issues, search, statusFilter, priorityFilter, categoryFilter])

  const kpiCards = [
    { label: 'OPEN CASES',         value: openCount,          sub: `${inProgress} in progress`,      icon: '📬', ring: 'bg-sky-50' },
    { label: 'SLA BREACHED',       value: slaBreached,        sub: slaBreached > 0 ? 'needs attention' : 'no active breaches', icon: '⚠️', ring: 'bg-rose-50' },
    { label: 'AT RISK',            value: atRiskCount,        sub: '≥75% of SLA window used',        icon: '🕐', ring: 'bg-amber-50' },
    { label: 'SLA COMPLIANCE',     value: '—',                sub: 'full tracking coming soon',      icon: '🔄', ring: 'bg-emerald-50' },
    { label: 'AVG FIRST RESPONSE', value: '—',                sub: 'response tracking coming soon',  icon: '⏱', ring: 'bg-blue-50' },
    { label: 'RESOLVED (24H)',     value: resolvedToday,      sub: 'resolved today',                 icon: '✅', ring: 'bg-emerald-50' },
    { label: 'RESIDENT CSAT',      value: '—',                sub: 'surveys coming soon',            icon: '😊', ring: 'bg-violet-50' },
  ]

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col overflow-hidden">

        {/* ── Page header ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-b border-zinc-950/5 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-steel-400 mb-0.5">
                FacilityOS · Facility
              </p>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-steel-900">
                Issues & Occurrences
              </h1>
              <p className="mt-1 text-sm text-steel-400">
                Resident complaints desk — front-desk intake, occurrence tracking, escalation and resolution follow-up.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
              <button className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg border border-zinc-200 text-steel-600 hover:bg-steel-50 transition-colors">
                ↓ Export
              </button>
              <button className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg border border-zinc-200 text-steel-600 hover:bg-steel-50 transition-colors">
                📡 Broadcast update
              </button>
              <button
                onClick={() => { setEditing(null); setShowForm(true) }}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-sm rounded-lg bg-steel-900 text-white font-semibold hover:bg-steel-800 transition-colors"
              >
                + Log occurrence
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI cards ────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-b border-zinc-950/5 px-6 py-4">
          <div className="grid grid-cols-7 gap-2.5">
            {kpiCards.map(k => (
              <div key={k.label} className="border border-zinc-950/5 rounded-lg p-3">
                <div className="flex items-start justify-between gap-1 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-steel-400 leading-tight">{k.label}</p>
                  <span className={cn('flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm', k.ring)}>
                    {k.icon}
                  </span>
                </div>
                <p className="font-heading text-2xl font-bold text-steel-900 leading-none mb-1">{k.value}</p>
                <p className="text-[10px] text-steel-400 leading-tight">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Intelligence banner ───────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-b border-zinc-950/5 px-6 py-3">
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
            <span className="text-lg flex-shrink-0 mt-0.5">🤖</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-800 mb-0.5">QuantumAI · Occurrence intelligence</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                Billing disputes are trending 27% following the July meter cycle — attaching the invoice reference at intake cuts resolution time by an estimated 40%.{' '}
                <strong>Water & utility complaints</strong> cluster around Block A risers; likely a single root cause rather than separate faults.
              </p>
            </div>
            <button className="flex-shrink-0 inline-flex items-center gap-1 h-7 px-3 text-xs font-semibold text-indigo-700 hover:text-indigo-900 whitespace-nowrap rounded-md hover:bg-indigo-100 transition-colors">
              Open briefing →
            </button>
          </div>
        </div>

        {/* ── Tab nav ──────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 bg-white border-b border-zinc-950/5 px-6">
          <nav className="flex">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab
                    ? 'border-steel-900 text-steel-900'
                    : 'border-transparent text-steel-400 hover:text-steel-700 hover:border-steel-200'
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────────── */}
        {activeTab === 'Case Queue' ? (
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Left: case list */}
            <div className={cn(
              'flex-shrink-0 border-r border-zinc-950/5 bg-white flex flex-col',
              selected ? 'hidden lg:flex lg:w-[320px]' : 'flex w-full lg:w-[320px]'
            )}>
              {/* Filters */}
              <div className="p-3 space-y-2 border-b border-zinc-950/5">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-steel-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search ref, unit, caller, tag…"
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-neutral-50 pl-9 pr-3 text-sm text-steel-900 placeholder:text-steel-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="flex-1 h-8 appearance-none rounded-lg border border-zinc-200 bg-white px-2 text-xs text-steel-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="open_cases">Open cases</option>
                    <option value="all">All cases</option>
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s]?.label}</option>)}
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                    className="flex-1 h-8 appearance-none rounded-lg border border-zinc-200 bg-white px-2 text-xs text-steel-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="all">All priority</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_META[p]?.label}</option>)}
                  </select>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="flex-1 h-8 appearance-none rounded-lg border border-zinc-200 bg-white px-2 text-xs text-steel-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="all">All categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </select>
                </div>
                <p className="text-[10px] font-medium text-steel-400">
                  {filtered.length} of {issues.length} occurrences
                </p>
              </div>

              {/* List rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-950/5">
                {loading && (
                  <div className="py-12 flex justify-center">
                    <span className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                  </div>
                )}
                {!loading && filtered.length === 0 && (
                  <p className="py-10 text-sm text-steel-400 text-center">No occurrences found.</p>
                )}
                {!loading && filtered.map(i => {
                  const sla  = slaInfo(i)
                  const slaT = slaTime(i)
                  return (
                    <button
                      key={i.id}
                      onClick={() => setSelected(i)}
                      className={cn(
                        'w-full text-left px-4 py-3.5 transition-colors hover:bg-steel-50 border-l-2',
                        selected?.id === i.id
                          ? 'bg-primary-50 border-l-primary-600'
                          : 'border-l-transparent'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-[10px] font-bold text-primary-600">{i.reference_no ?? '—'}</span>
                        <span className="text-[10px] text-steel-400 flex-shrink-0">{timeAgo(i.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold text-steel-900 leading-snug line-clamp-1 mb-1.5">
                        {i.title}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        <Pill className={STATUS_META[i.status]?.badge ?? 'bg-neutral-100 text-steel-500 ring-1 ring-zinc-300/40'}>
                          {STATUS_META[i.status]?.label ?? i.status}
                        </Pill>
                        {i.priority !== 'low' && (
                          <Pill className={PRIORITY_META[i.priority]?.badge ?? 'bg-neutral-100 text-steel-500 ring-1 ring-zinc-300/40'}>
                            {PRIORITY_META[i.priority]?.label ?? i.priority}
                          </Pill>
                        )}
                      </div>
                      <p className="text-xs text-steel-400 mb-2">
                        {i.unit_label ?? '—'} · {i.reported_by_name ?? '—'} · —
                      </p>
                      {/* SLA progress bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', sla.barColor)}
                            style={{ width: `${sla.pct}%` }}
                          />
                        </div>
                        <span className={cn('text-[10px] font-semibold whitespace-nowrap', sla.textColor)}>
                          {sla.label}
                        </span>
                        <span className="text-[10px] text-steel-400 whitespace-nowrap">{slaT}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right: detail panel */}
            <div className={cn('flex-1 flex flex-col overflow-hidden bg-steel-50', !selected && 'hidden lg:flex')}>
              {/* Mobile back */}
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
                <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-steel-400">
                  <span className="text-2xl">📋</span>
                  Select an occurrence to view details
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Placeholder for other tabs */
          <div className="flex flex-1 items-center justify-center bg-steel-50">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-steel-100 mx-auto mb-3">
                <span className="text-steel-400 text-xl">🚧</span>
              </div>
              <p className="font-heading text-sm font-semibold text-steel-700">{activeTab}</p>
              <p className="text-xs text-steel-400 mt-1 max-w-xs">This section is being built. Check back soon.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
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
