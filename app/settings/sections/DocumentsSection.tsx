'use client'
import React, { useState, useMemo } from 'react'
import {
  FileText, Home, Scale, Wrench, Briefcase, Building2,
  Download, Plus, Search, Eye, Trash2, Upload, RefreshCw,
  Globe, Zap, History, Info, Check, FileCheck2, Send,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────
type DocKind    = 'static' | 'dynamic'
type DocScope   = 'global' | 'property'
type DocStatus  = 'published' | 'draft' | 'archived'
type DocCategoryKey = 'lifecycle' | 'legal' | 'financial' | 'operations' | 'hr' | 'property'

type DocTemplate = {
  id:               string
  name:             string
  category:         DocCategoryKey
  kind:             DocKind
  scope:            DocScope
  property?:        string
  version:          string
  status:           DocStatus
  triggers:         string[]
  requireSignature: boolean
  fileName?:        string
  fileSizeKb?:      number
  updatedAt:        string
  updatedBy:        string
  variables?:       string[]
  description:      string
}

// ── Static data ────────────────────────────────────────────────────────────────
const DOC_CATEGORIES: { key: DocCategoryKey; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { key: 'lifecycle',   label: 'Resident lifecycle', icon: Home,       description: 'Welcome pack, house rules, handbooks, guides auto-sent to residents.' },
  { key: 'legal',       label: 'Legal & compliance', icon: Scale,      description: 'Lease agreements, notices, consents, addendums, waivers.' },
  { key: 'financial',   label: 'Financial & billing',icon: FileText,   description: 'Invoices, receipts, statements, payment plans.' },
  { key: 'operations',  label: 'Operations',         icon: Wrench,     description: 'Work orders, maintenance forms, visitor passes, access requests.' },
  { key: 'hr',          label: 'HR & staff',          icon: Briefcase,  description: 'Employment contracts, NDAs, payslips, staff handbook.' },
  { key: 'property',    label: 'Property collateral', icon: Building2,  description: 'Fact sheets, floor plans, certificates, brochures.' },
]

const TRIGGER_EVENTS: { key: string; label: string; category: DocCategoryKey }[] = [
  { key: 'resident.registered',  label: 'Resident registered (welcome)', category: 'lifecycle'  },
  { key: 'lease.signed',         label: 'Lease signed',                  category: 'legal'       },
  { key: 'lease.renewal',        label: 'Lease renewal offer',           category: 'legal'       },
  { key: 'moveout.scheduled',    label: 'Move-out scheduled',            category: 'lifecycle'  },
  { key: 'notice.rent_due',      label: 'Rent due notice',               category: 'legal'       },
  { key: 'notice.late_payment',  label: 'Late payment notice',           category: 'legal'       },
  { key: 'notice.breach',        label: 'Breach notice',                 category: 'legal'       },
  { key: 'invoice.issued',       label: 'Invoice issued',                category: 'financial'  },
  { key: 'receipt.issued',       label: 'Payment receipt',               category: 'financial'  },
  { key: 'statement.monthly',    label: 'Monthly statement',             category: 'financial'  },
  { key: 'maintenance.workorder',label: 'Work order dispatched',         category: 'operations' },
  { key: 'visitor.pass',         label: 'Visitor pass issued',           category: 'operations' },
  { key: 'staff.onboarded',      label: 'Staff onboarded',               category: 'hr'          },
  { key: 'payroll.payslip',      label: 'Payslip generated',             category: 'hr'          },
]

const PROPERTIES = ['GWG1', 'GWG2', 'Riverside Towers', 'Palm Court']

const INITIAL_DOCS: DocTemplate[] = [
  { id: 'd1', name: 'Rules & Regulations', category: 'lifecycle', kind: 'static', scope: 'property', property: 'GWG1',
    version: 'v2.0', status: 'published', triggers: ['resident.registered'], requireSignature: false,
    fileName: 'GWG1 Rules & Regulations_v2.pdf', fileSizeKb: 139.7,
    updatedAt: '2026-06-14', updatedBy: 'System Admin',
    description: 'Attached to the welcome email sent to every new resident upon registration.' },
  { id: 'd2', name: 'Welcome Pack', category: 'lifecycle', kind: 'dynamic', scope: 'global',
    version: 'v1.3', status: 'published', triggers: ['resident.registered'], requireSignature: false,
    updatedAt: '2026-05-02', updatedBy: 'Jane K.',
    variables: ['resident_name', 'unit', 'property_name', 'move_in_date', 'manager_name'],
    description: 'Personalised welcome letter with unit details and key contacts.' },
  { id: 'd3', name: 'Tenant Handbook', category: 'lifecycle', kind: 'static', scope: 'global',
    version: 'v4.1', status: 'published', triggers: ['resident.registered'], requireSignature: false,
    fileName: 'Tenant Handbook 2026.pdf', fileSizeKb: 812.4,
    updatedAt: '2026-04-11', updatedBy: 'System Admin',
    description: 'Comprehensive resident guide covering amenities, policies and contacts.' },
  { id: 'd4', name: 'Parking & Vehicle Policy', category: 'lifecycle', kind: 'static', scope: 'global',
    version: 'v1.0', status: 'published', triggers: [], requireSignature: false,
    fileName: 'Parking Policy.pdf', fileSizeKb: 210.0,
    updatedAt: '2026-02-20', updatedBy: 'Ops Manager',
    description: 'Parking allocation, guest parking and towing policy.' },
  { id: 'd5', name: 'Lease Agreement', category: 'legal', kind: 'dynamic', scope: 'global',
    version: 'v3.2', status: 'published', triggers: ['lease.signed'], requireSignature: true,
    updatedAt: '2026-06-01', updatedBy: 'Legal Counsel',
    variables: ['tenant_name', 'landlord_name', 'unit', 'rent_amount', 'deposit', 'term_months', 'start_date', 'end_date'],
    description: 'Standard residential lease. Requires e-signature from both parties.' },
  { id: 'd6', name: 'Late Payment Notice', category: 'legal', kind: 'dynamic', scope: 'global',
    version: 'v2.0', status: 'published', triggers: ['notice.late_payment'], requireSignature: false,
    updatedAt: '2026-05-18', updatedBy: 'Finance',
    variables: ['tenant_name', 'unit', 'amount_due', 'days_overdue', 'penalty'],
    description: 'Formal reminder sent after grace period lapses.' },
  { id: 'd7', name: 'Invoice Template', category: 'financial', kind: 'dynamic', scope: 'global',
    version: 'v5.0', status: 'published', triggers: ['invoice.issued'], requireSignature: false,
    updatedAt: '2026-06-25', updatedBy: 'Finance',
    variables: ['invoice_no', 'tenant_name', 'unit', 'line_items', 'subtotal', 'tax', 'total', 'due_date'],
    description: 'Branded invoice generated for every billing cycle.' },
  { id: 'd8', name: 'Payment Receipt', category: 'financial', kind: 'dynamic', scope: 'global',
    version: 'v2.1', status: 'published', triggers: ['receipt.issued'], requireSignature: false,
    updatedAt: '2026-06-25', updatedBy: 'Finance',
    variables: ['receipt_no', 'tenant_name', 'amount', 'method', 'date'],
    description: 'Auto-issued on successful payment via M-Pesa, card, or bank.' },
  { id: 'd9', name: 'Visitor Pass', category: 'operations', kind: 'dynamic', scope: 'global',
    version: 'v1.2', status: 'published', triggers: ['visitor.pass'], requireSignature: false,
    updatedAt: '2026-03-30', updatedBy: 'Security',
    variables: ['visitor_name', 'host_unit', 'valid_from', 'valid_to', 'qr_code'],
    description: 'Printable/SMS pass with QR for gate scan.' },
  { id: 'd10', name: 'Employment Contract', category: 'hr', kind: 'dynamic', scope: 'global',
    version: 'v2.0', status: 'draft', triggers: ['staff.onboarded'], requireSignature: true,
    updatedAt: '2026-07-01', updatedBy: 'HR',
    variables: ['employee_name', 'role', 'start_date', 'salary', 'manager'],
    description: 'Standard employment contract for facility staff.' },
  { id: 'd11', name: 'Property Fact Sheet', category: 'property', kind: 'static', scope: 'property', property: 'Riverside Towers',
    version: 'v1.0', status: 'published', triggers: [], requireSignature: false,
    fileName: 'Riverside Fact Sheet.pdf', fileSizeKb: 1240.0,
    updatedAt: '2026-01-14', updatedBy: 'Marketing',
    description: 'One-pager for prospective tenants and partners.' },
]

// ── Tiny helpers ───────────────────────────────────────────────────────────────
function DocField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text">{label}</label>
      {children}
    </div>
  )
}

function KpiTile({
  icon: Icon, label, value, tone = 'neutral',
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: 'neutral' | 'emerald' | 'blue' | 'amber' }) {
  const toneMap = {
    neutral: 'bg-surface-hover/40 dark:bg-dark-hover text-text-muted',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700',
    blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-700',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700',
  }
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-3">
      <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', toneMap[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-lg font-semibold text-text leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  )
}

function DocStatusPill({ status }: { status: DocStatus }) {
  const map: Record<DocStatus, string> = {
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    draft:     'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    archived:  'bg-surface text-text-muted border-surface-border dark:border-dark-border',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', map[status])}>
      {status}
    </span>
  )
}

// ── DocDetailDrawer ────────────────────────────────────────────────────────────
function DocDetailDrawer({
  doc, onClose, onUpdate, onDelete,
}: {
  doc: DocTemplate
  onClose: () => void
  onUpdate: (d: DocTemplate) => void
  onDelete: (id: string) => void
}) {
  const [tab, setTab] = useState<'overview' | 'content' | 'triggers' | 'versions'>('overview')
  const relevantTriggers = TRIGGER_EVENTS.filter((e) => e.category === doc.category || doc.triggers.includes(e.key))

  function toggleTrigger(key: string) {
    const has = doc.triggers.includes(key)
    onUpdate({ ...doc, triggers: has ? doc.triggers.filter((k) => k !== key) : [...doc.triggers, key] })
  }

  const inputCls = 'h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'
  const selectCls = inputCls

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="border-b border-surface-border dark:border-dark-border p-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text truncate">{doc.name}</h2>
              <p className="text-xs text-text-muted mt-1">{doc.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  'bg-surface text-text-muted border-surface-border dark:border-dark-border',
                )}>
                  {doc.kind === 'static' ? <FileText className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                  {doc.kind === 'static' ? 'Static PDF' : 'Dynamic'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                  {doc.scope === 'global' ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                  {doc.scope === 'global' ? 'Global' : doc.property}
                </span>
                <DocStatusPill status={doc.status} />
                <span className="text-[11px] text-text-muted">Version {doc.version}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none shrink-0">✕</button>
          </div>

          {/* Sub-tabs */}
          <div className="mt-4 flex gap-1 border-b border-surface-border dark:border-dark-border -mb-5">
            {(['overview', 'content', 'triggers', 'versions'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 transition-colors capitalize',
                  tab === t
                    ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                    : 'border-transparent text-text-muted hover:text-text',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DocField label="Name">
                  <input value={doc.name} onChange={(e) => onUpdate({ ...doc, name: e.target.value })} className={inputCls} />
                </DocField>
                <DocField label="Category">
                  <select value={doc.category} onChange={(e) => onUpdate({ ...doc, category: e.target.value as DocCategoryKey })} className={selectCls}>
                    {DOC_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </DocField>
                <DocField label="Scope">
                  <select
                    value={doc.scope}
                    onChange={(e) => onUpdate({ ...doc, scope: e.target.value as DocScope, property: e.target.value === 'global' ? undefined : (doc.property ?? PROPERTIES[0]) })}
                    className={selectCls}
                  >
                    <option value="global">Global (all properties)</option>
                    <option value="property">Per property override</option>
                  </select>
                </DocField>
                {doc.scope === 'property' && (
                  <DocField label="Property">
                    <select value={doc.property} onChange={(e) => onUpdate({ ...doc, property: e.target.value })} className={selectCls}>
                      {PROPERTIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </DocField>
                )}
                <DocField label="Status">
                  <select value={doc.status} onChange={(e) => onUpdate({ ...doc, status: e.target.value as DocStatus })} className={selectCls}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </DocField>
                <DocField label="Version">
                  <input value={doc.version} onChange={(e) => onUpdate({ ...doc, version: e.target.value })} className={inputCls} />
                </DocField>
              </div>
              <DocField label="Description">
                <textarea
                  rows={3}
                  value={doc.description}
                  onChange={(e) => onUpdate({ ...doc, description: e.target.value })}
                  className="w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </DocField>
              <div className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover p-3">
                <div className="flex items-start gap-2">
                  <FileCheck2 className="h-4 w-4 mt-0.5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-text">Require e-signature</p>
                    <p className="text-xs text-text-muted">Route through signature provider before finalising.</p>
                  </div>
                </div>
                <button
                  onClick={() => onUpdate({ ...doc, requireSignature: !doc.requireSignature })}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    doc.requireSignature ? 'bg-emerald-600' : 'bg-surface-border dark:bg-dark-border',
                  )}
                >
                  <span className={cn('inline-block h-4 w-4 rounded-full bg-white transition-transform', doc.requireSignature ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
            </div>
          )}

          {tab === 'content' && (
            <div className="space-y-4">
              {doc.kind === 'static' ? (
                <>
                  {doc.fileName ? (
                    <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-emerald-700" />
                        <div>
                          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">{doc.fileName}</p>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">{doc.fileSizeKb} KB • uploaded {doc.updatedAt}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="gap-1 h-8"><Eye className="h-3.5 w-3.5" /> Preview</Button>
                        <Button variant="ghost" size="sm" className="gap-1 h-8 text-danger hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">No file uploaded yet.</p>
                  )}
                  <Button variant="outline" size="sm" className="gap-2"><Upload className="h-3.5 w-3.5" /> Replace PDF</Button>
                  <p className="text-xs text-text-muted">PDF only, max 10 MB. Uploading creates a new version.</p>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-text mb-1.5">Merge variables</p>
                    <p className="text-xs text-text-muted mb-2">
                      Available placeholders. Reference in body as <code className="rounded bg-surface-hover dark:bg-dark-hover px-1 text-[11px]">{'{{variable}}'}</code>.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(doc.variables ?? []).map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 rounded-full border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-2 py-0.5 text-[11px] font-mono text-text-muted">
                          <Zap className="h-3 w-3" />{v}
                        </span>
                      ))}
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"><Plus className="h-3 w-3" /> Add variable</Button>
                    </div>
                  </div>
                  <DocField label="Body (rich text / HTML)">
                    <textarea
                      rows={10}
                      placeholder="Dear {{resident_name}},&#10;&#10;Welcome to {{property_name}}."
                      className="w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </DocField>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview with sample data</Button>
                    <Button variant="outline" size="sm" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Send test</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'triggers' && (
            <div className="space-y-3">
              <p className="text-xs text-text-muted">
                Select which events auto-attach or auto-generate this template. Multiple triggers may fire the same document.
              </p>
              <div className="overflow-hidden rounded-md border border-surface-border dark:border-dark-border divide-y divide-surface-border dark:divide-dark-border">
                {relevantTriggers.map((t) => {
                  const checked = doc.triggers.includes(t.key)
                  return (
                    <label key={t.key} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-hover/40 dark:hover:bg-dark-hover">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTrigger(t.key)}
                        className="rounded border-surface-border dark:border-dark-border accent-primary-600"
                      />
                      <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">{t.label}</p>
                        <p className="text-[11px] text-text-muted font-mono">{t.key}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'versions' && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-md border border-surface-border dark:border-dark-border divide-y divide-surface-border dark:divide-dark-border">
                {[
                  { v: doc.version, date: doc.updatedAt, by: doc.updatedBy, current: true },
                  { v: 'v1.0', date: '2025-11-02', by: 'System Admin', current: false },
                ].map((r) => (
                  <div key={r.v} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <History className="h-4 w-4 text-text-muted" />
                      <div>
                        <p className="text-sm font-medium text-text">
                          {r.v}{' '}
                          {r.current && (
                            <span className="ml-1 inline-flex items-center rounded-full border border-surface-border dark:border-dark-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                              current
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-text-muted">{r.date} • {r.by}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 gap-1"><Eye className="h-3.5 w-3.5" /> View</Button>
                      {!r.current && <Button variant="ghost" size="sm" className="h-7 gap-1"><RefreshCw className="h-3.5 w-3.5" /> Restore</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-4 flex items-center justify-between shrink-0">
          <Button variant="ghost" className="gap-1.5 text-danger hover:text-red-700" onClick={() => onDelete(doc.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Archive template
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={onClose}>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── AddDocDialog ───────────────────────────────────────────────────────────────
function AddDocDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreate: (d: DocTemplate) => void
}) {
  const [name,             setName]             = useState('')
  const [category,         setCategory]         = useState<DocCategoryKey>('lifecycle')
  const [kind,             setKind]             = useState<DocKind>('static')
  const [scope,            setScope]            = useState<DocScope>('global')
  const [property,         setProperty]         = useState(PROPERTIES[0])
  const [requireSignature, setRequireSignature] = useState(false)
  const [description,      setDescription]      = useState('')
  const [err,              setErr]              = useState('')

  function reset() {
    setName(''); setCategory('lifecycle'); setKind('static'); setScope('global')
    setProperty(PROPERTIES[0]); setRequireSignature(false); setDescription(''); setErr('')
  }

  function submit() {
    if (!name.trim()) { setErr('Name is required'); return }
    const now = new Date().toISOString().slice(0, 10)
    onCreate({
      id: `d${Date.now()}`,
      name: name.trim(),
      category, kind, scope,
      property: scope === 'property' ? property : undefined,
      version: 'v1.0',
      status: 'draft',
      triggers: [],
      requireSignature,
      updatedAt: now,
      updatedBy: 'You',
      description: description.trim() || 'Newly created template.',
      variables: kind === 'dynamic' ? ['resident_name', 'unit', 'property_name'] : undefined,
    })
    reset()
    onOpenChange(false)
  }

  if (!open) return null

  const inputCls = 'h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { reset(); onOpenChange(false) }} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card shadow-2xl">
        <div className="border-b border-surface-border dark:border-dark-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">New document template</h2>
            <p className="text-xs text-text-muted mt-0.5">Add a static PDF or a dynamic template with merge variables.</p>
          </div>
          <button onClick={() => { reset(); onOpenChange(false) }} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <DocField label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Move-out Inspection Checklist" className={inputCls} />
          </DocField>
          <div className="grid grid-cols-2 gap-3">
            <DocField label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as DocCategoryKey)} className={inputCls}>
                {DOC_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </DocField>
            <DocField label="Type">
              <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className={inputCls}>
                <option value="static">Static PDF (upload)</option>
                <option value="dynamic">Dynamic (merge variables)</option>
              </select>
            </DocField>
            <DocField label="Scope">
              <select value={scope} onChange={(e) => setScope(e.target.value as DocScope)} className={inputCls}>
                <option value="global">Global</option>
                <option value="property">Per property</option>
              </select>
            </DocField>
            {scope === 'property' && (
              <DocField label="Property">
                <select value={property} onChange={(e) => setProperty(e.target.value)} className={inputCls}>
                  {PROPERTIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </DocField>
            )}
          </div>
          <DocField label="Description">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </DocField>
          <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
            <input
              type="checkbox"
              checked={requireSignature}
              onChange={(e) => setRequireSignature(e.target.checked)}
              className="rounded border-surface-border accent-primary-600"
            />
            Require e-signature
          </label>
          {err && <p className="text-xs text-danger">{err}</p>}
        </div>
        <div className="border-t border-surface-border dark:border-dark-border px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Create template</Button>
        </div>
      </div>
    </div>
  )
}

// ── DocumentsSection ───────────────────────────────────────────────────────────
export function DocumentsSection() {
  const [docs,     setDocs]     = useState<DocTemplate[]>(INITIAL_DOCS)
  const [query,    setQuery]    = useState('')
  const [category, setCategory] = useState<DocCategoryKey | 'all'>('all')
  const [kind,     setKind]     = useState<DocKind | 'all'>('all')
  const [scope,    setScope]    = useState<DocScope | 'all'>('all')
  const [status,   setStatus]   = useState<DocStatus | 'all'>('all')
  const [selected, setSelected] = useState<DocTemplate | null>(null)
  const [addOpen,  setAddOpen]  = useState(false)

  const filtered = useMemo(() => docs.filter((d) => {
    if (category !== 'all' && d.category !== category) return false
    if (kind     !== 'all' && d.kind     !== kind)     return false
    if (scope    !== 'all' && d.scope    !== scope)    return false
    if (status   !== 'all' && d.status   !== status)   return false
    if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [docs, query, category, kind, scope, status])

  const stats = useMemo(() => ({
    total:     docs.length,
    published: docs.filter((d) => d.status === 'published').length,
    dynamic:   docs.filter((d) => d.kind   === 'dynamic').length,
    signature: docs.filter((d) => d.requireSignature).length,
  }), [docs])

  const hasFilters = category !== 'all' || kind !== 'all' || scope !== 'all' || status !== 'all' || !!query

  function clearFilters() {
    setCategory('all'); setKind('all'); setScope('all'); setStatus('all'); setQuery('')
  }

  const selectCls = 'h-9 rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Document templates</h2>
          <p className="text-sm text-text-muted mt-0.5 max-w-2xl">
            Central library of static PDFs and dynamic templates. Map templates to events to auto-attach on emails, portal or e-sign flows. Override per property when needed.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export library
          </Button>
          <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New template
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-3">
        <KpiTile icon={FileText}   label="Templates"      value={stats.total}     tone="neutral" />
        <KpiTile icon={FileCheck2} label="Published"      value={stats.published} tone="emerald" />
        <KpiTile icon={Zap}        label="Dynamic"        value={stats.dynamic}   tone="blue"    />
        <KpiTile icon={FileCheck2} label="E-sign required" value={stats.signature} tone="amber"  />
      </div>

      {/* Category cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Browse by category</p>
        <div className="grid grid-cols-3 gap-3">
          {DOC_CATEGORIES.map((c) => {
            const Icon    = c.icon
            const count   = docs.filter((d) => d.category === c.key).length
            const active  = category === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCategory(active ? 'all' : c.key)}
                className={cn(
                  'text-left rounded-lg border p-3 transition-colors',
                  active
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-surface-border dark:border-dark-border bg-white dark:bg-dark-card hover:bg-surface-hover/40 dark:hover:bg-dark-hover',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-md',
                    active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700',
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text truncate">{c.label}</p>
                      <span className="inline-flex items-center rounded-full border border-surface-border dark:border-dark-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted shrink-0">
                        {count}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{c.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface pl-8 pr-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Search templates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={cn(selectCls, 'w-[130px]')}>
          <option value="all">All types</option>
          <option value="static">Static PDF</option>
          <option value="dynamic">Dynamic</option>
        </select>
        <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={cn(selectCls, 'w-[140px]')}>
          <option value="all">All scopes</option>
          <option value="global">Global</option>
          <option value="property">Per property</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={cn(selectCls, 'w-[130px]')}>
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover/40 dark:bg-dark-hover">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-text-muted [&>th]:uppercase [&>th]:tracking-wide">
              <th>Template</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Triggers</th>
              <th>Version</th>
              <th>Status</th>
              <th>Updated</th>
              <th className="text-right pr-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {filtered.map((d) => {
              const cat     = DOC_CATEGORIES.find((c) => c.key === d.category)!
              const CatIcon = cat.icon
              return (
                <tr key={d.id} className="hover:bg-surface-hover/30 dark:hover:bg-dark-hover/30 [&>td]:px-3 [&>td]:py-2.5 [&>td]:align-middle">
                  <td>
                    <div className="flex items-start gap-2.5">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700">
                        <CatIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-text truncate">{d.name}</p>
                          {d.requireSignature && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium">
                              <FileCheck2 className="h-2.5 w-2.5" /> e-sign
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted line-clamp-1">{d.description}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {d.kind === 'static' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-surface-border dark:border-dark-border bg-surface px-2 py-0.5 text-[10px] text-text-muted">
                        <FileText className="h-3 w-3" /> Static PDF
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 px-2 py-0.5 text-[10px]">
                        <Zap className="h-3 w-3" /> Dynamic
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-text-muted">
                    {d.scope === 'global' ? (
                      <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> Global</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {d.property}</span>
                    )}
                  </td>
                  <td>
                    {d.triggers.length === 0 ? (
                      <span className="text-xs text-text-muted">— none —</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.triggers.slice(0, 2).map((t) => (
                          <span key={t} className="inline-flex items-center gap-0.5 rounded-full border border-surface-border dark:border-dark-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                            <Zap className="h-2.5 w-2.5 text-amber-500" />
                            {TRIGGER_EVENTS.find((e) => e.key === t)?.label ?? t}
                          </span>
                        ))}
                        {d.triggers.length > 2 && (
                          <span className="inline-flex items-center rounded-full border border-surface-border dark:border-dark-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                            +{d.triggers.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-xs text-text-muted">{d.version}</td>
                  <td><DocStatusPill status={d.status} /></td>
                  <td className="text-xs text-text-muted">
                    <div>{d.updatedAt}</div>
                    <div className="text-text-muted/60">{d.updatedBy}</div>
                  </td>
                  <td className="text-right pr-3">
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSelected(d)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-text-muted">
                  No templates match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Compliance note */}
      <div className="flex gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-900 dark:text-blue-300">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Versioning &amp; audit</p>
          <p className="mt-0.5 text-blue-800 dark:text-blue-400">
            Every replacement or edit creates a new version. Prior versions remain available for reference and are attached to any records that referenced them at the time of send. Dynamic templates render at send-time using the resident/property context.
          </p>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <DocDetailDrawer
          doc={selected}
          onClose={() => setSelected(null)}
          onUpdate={(next) => {
            setDocs((prev) => prev.map((d) => (d.id === next.id ? next : d)))
            setSelected(next)
          }}
          onDelete={(id) => {
            setDocs((prev) => prev.filter((d) => d.id !== id))
            setSelected(null)
          }}
        />
      )}

      <AddDocDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={(d) => setDocs((prev) => [d, ...prev])}
      />
    </div>
  )
}
