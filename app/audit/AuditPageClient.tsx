'use client'
import { useState, useMemo } from 'react'
import { useAuditEvents } from '@/lib/queries/audit'
import { cn } from '@/lib/cn'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Activity, AlertTriangle, ArrowUpRight, BadgeCheck, Bell, Bookmark,
  ChevronRight, Clock, Copy, Database, Diff, Download, Eye, Fingerprint,
  Filter, Globe, Hash, Info, KeyRound, Link2, Lock, MapPin, Monitor,
  MoreHorizontal, RefreshCw, Search, Shield, ShieldAlert, ShieldCheck,
  Smartphone, Tag, Terminal, User, Users, Workflow, X, Zap,
} from 'lucide-react'
import { getAuditEvents, exportAuditCsv, type AuditEventApi } from '@/lib/api/audit'

// ── Category / severity mapping ───────────────────────────────────────────────

type Category = 'auth' | 'access' | 'data' | 'config' | 'billing' | 'integration' | 'security' | 'workflow' | 'export'
type Severity = 'info' | 'notice' | 'warning' | 'critical'
type Outcome  = 'success' | 'denied' | 'error' | 'pending'

const MODULE_CATEGORY: Record<string, Category> = {
  auth: 'auth', crb: 'access', kyc: 'access', rules: 'access', access: 'access',
  financials: 'billing', mpesa: 'integration', notifications: 'integration',
  settings: 'config', roles: 'config',
  leases: 'data', people: 'data', units: 'data', utilities: 'data',
  documents: 'data', hr: 'data', maintenance: 'workflow', notices: 'workflow',
  reports: 'export', export: 'export',
}

const ACTION_SEVERITY: Record<string, Severity> = {
  login: 'notice', logout: 'info',
  '2fa_challenge': 'warning', '2fa_failed': 'critical',
  deleted: 'warning', removed: 'warning',
  created: 'info', updated: 'info', assigned: 'info', toggled: 'info',
  sent: 'notice', exported: 'warning', approved: 'notice', rejected: 'warning',
}

const CATEGORY_META: Record<Category, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  auth:        { label: 'Authentication', icon: KeyRound,    tone: 'text-sky-700 bg-sky-50 border-sky-200' },
  access:      { label: 'Access Control', icon: Shield,      tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  data:        { label: 'Data',           icon: Database,    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  config:      { label: 'Configuration', icon: Workflow,     tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  billing:     { label: 'Billing',        icon: BadgeCheck,  tone: 'text-teal-700 bg-teal-50 border-teal-200' },
  integration: { label: 'Integration',   icon: Link2,        tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  security:    { label: 'Security',       icon: ShieldAlert, tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  workflow:    { label: 'Workflow',        icon: ArrowUpRight,tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  export:      { label: 'Export',         icon: Download,    tone: 'text-orange-700 bg-orange-50 border-orange-200' },
}

const SEVERITY_META: Record<Severity, { label: string; dot: string; text: string }> = {
  info:     { label: 'Info',     dot: 'bg-slate-400',  text: 'text-slate-600' },
  notice:   { label: 'Notice',   dot: 'bg-sky-500',    text: 'text-sky-700' },
  warning:  { label: 'Warning',  dot: 'bg-amber-500',  text: 'text-amber-700' },
  critical: { label: 'Critical', dot: 'bg-rose-600',   text: 'text-rose-700' },
}

const OUTCOME_META: Record<Outcome, { label: string; className: string }> = {
  success: { label: 'Success', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  denied:  { label: 'Denied',  className: 'bg-rose-50 text-rose-700 border-rose-200' },
  error:   { label: 'Error',   className: 'bg-orange-50 text-orange-700 border-orange-200' },
  pending: { label: 'Pending', className: 'bg-slate-50 text-slate-700 border-slate-200' },
}

function getCategory(e: AuditEventApi): Category {
  return MODULE_CATEGORY[e.module] ?? 'data'
}
function getSeverity(e: AuditEventApi): Severity {
  return ACTION_SEVERITY[e.action] ?? 'info'
}
function getOutcome(_e: AuditEventApi): Outcome {
  return 'success'
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function formatDateTime(iso: string) {
  return new Date(iso).toUTCString().replace(' GMT', ' UTC')
}

// ── KV / Panel helpers ───────────────────────────────────────────────────────

function Panel({ title, icon: Icon, children, action }: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-steel-200 bg-white">
      <header className="flex items-center justify-between border-b border-steel-100 bg-steel-50/60 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-steel-500">
          <Icon className="h-3.5 w-3.5" /> {title}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function KV({ label, value, mono, copy }: { label: string; value: React.ReactNode; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-steel-100 py-2 last:border-b-0">
      <span className="text-xs text-steel-500">{label}</span>
      <span className={cn('flex items-center gap-1.5 text-right text-xs text-steel-900', mono && 'font-mono')}>
        {value}
        {copy && <Copy className="h-3 w-3 cursor-pointer text-steel-400 hover:text-steel-700" />}
      </span>
    </div>
  )
}

function Metric({ label, value, sub, icon: Icon }: {
  label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-lg border border-steel-200 bg-white p-3">
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-steel-400">
        {label}<Icon className="h-3.5 w-3.5 text-steel-400" />
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-steel-900">{value}</div>
      <div className="truncate text-[11px] text-steel-500">{sub}</div>
    </div>
  )
}

// ── Saved views ──────────────────────────────────────────────────────────────

const SAVED_VIEWS: Array<{
  label: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  filter: { module?: string; action?: string }
}> = [
  { label: 'Auth events',    icon: KeyRound, tone: 'text-sky-700 bg-sky-50',          filter: { module: 'auth' } },
  { label: 'Data changes',   icon: Database, tone: 'text-emerald-700 bg-emerald-50',  filter: { action: 'updated' } },
  { label: 'Exports',        icon: Download, tone: 'text-orange-700 bg-orange-50',    filter: { action: 'exported' } },
  { label: 'Config changes', icon: Workflow, tone: 'text-amber-700 bg-amber-50',      filter: { module: 'settings' } },
]

// ── Tab content components ───────────────────────────────────────────────────

function SummaryTab({ event }: { event: AuditEventApi }) {
  const category = getCategory(event)
  const outcome  = getOutcome(event)
  return (
    <>
      <div className="mb-4 grid grid-cols-4 gap-3">
        <Metric label="Actor"   value={event.user_name ?? 'System'} sub={event.user_role ?? '—'}       icon={User} />
        <Metric label="Target"  value={event.entity_label ?? event.entity_type ?? '—'} sub={event.entity_type ?? '—'} icon={Database} />
        <Metric label="Module"  value={event.module} sub={category}                                     icon={Workflow} />
        <Metric label="Action"  value={event.action.replace(/_/g, ' ')} sub={OUTCOME_META[outcome].label} icon={Zap} />
      </div>

      <Panel title="What happened" icon={Zap}>
        <p className="text-sm leading-relaxed text-steel-700">
          <span className="font-semibold text-steel-900">{event.user_name ?? 'System'}</span>
          {event.user_role && <> ({event.user_role})</>} performed{' '}
          <span className="font-mono text-steel-900">{event.action}</span> on{' '}
          <span className="font-semibold text-steel-900">{event.entity_label ?? event.entity_type ?? '—'}</span>.
          {event.description && (
            <> {event.description}</>
          )}
        </p>
      </Panel>

      {event.changes && event.changes.length > 0 && (
        <Panel title={`Field changes · ${event.changes.length}`} icon={Diff}>
          <div className="overflow-hidden rounded-md border border-steel-200">
            <table className="w-full text-xs">
              <thead className="bg-steel-50 text-[10px] uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Field</th>
                  <th className="px-3 py-2 text-left font-semibold">Before</th>
                  <th className="px-3 py-2 text-left font-semibold">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {event.changes.map((c: { field: string; from: string; to: string }, i: number) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2 font-mono text-steel-700">{c.field}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-rose-700 line-through">{c.from || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700">{c.to || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}

function ActorTab({ event }: { event: AuditEventApi }) {
  const initials = (event.user_name ?? 'S').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="grid grid-cols-2 gap-4">
      <Panel title="Actor" icon={User}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-steel-900 font-heading text-sm font-semibold text-white">
            {initials}
          </div>
          <div>
            <div className="text-sm font-semibold text-steel-900">{event.user_name ?? 'System'}</div>
            <div className="text-xs text-steel-500">{event.user_role ?? '—'}</div>
          </div>
        </div>
        <KV label="Module"      value={event.module} />
        <KV label="Action"      value={event.action} />
        <KV label="Entity type" value={event.entity_type ?? '—'} />
        <KV label="Entity"      value={event.entity_label ?? event.entity_id ?? '—'} />
      </Panel>
      <Panel title="Session & Device" icon={Monitor}>
        <KV label="Timestamp"   value={event.timestamp ? formatDateTime(event.timestamp) : '—'} />
        {event.ip_address && <KV label="IP address" value={<span className="font-mono">{event.ip_address}</span>} copy />}
        <KV label="User ID"     value={event.user_id ?? '—'} mono copy />
        <KV label="Entity ID"   value={event.entity_id ?? '—'} mono copy />
      </Panel>
    </div>
  )
}

function ContextTab({ event }: { event: AuditEventApi }) {
  return (
    <Panel title="Event context" icon={Terminal}>
      <KV label="Event ID"     value={event.id} mono copy />
      <KV label="Timestamp"    value={event.timestamp ? formatDateTime(event.timestamp) : '—'} />
      <KV label="Module"       value={event.module} />
      <KV label="Action"       value={event.action} />
      {event.ip_address && <KV label="IP address"  value={event.ip_address} mono />}
      <KV label="Entity type"  value={event.entity_type ?? '—'} />
      <KV label="Entity label" value={event.entity_label ?? '—'} />
    </Panel>
  )
}

function RawTab({ event }: { event: AuditEventApi }) {
  return (
    <Panel
      title="Raw event JSON"
      icon={Hash}
      action={
        <button
          onClick={() => navigator.clipboard.writeText(JSON.stringify(event, null, 2))}
          className="inline-flex items-center gap-1 text-[11px] text-steel-500 hover:text-steel-900"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      }
    >
      <pre className="max-h-[420px] overflow-auto rounded-md bg-steel-900 p-4 font-mono text-[11px] leading-relaxed text-slate-100">
        {JSON.stringify(event, null, 2)}
      </pre>
    </Panel>
  )
}

// ── Detail panel ─────────────────────────────────────────────────────────────

function EventDetail({ event }: { event: AuditEventApi }) {
  const [tab, setTab] = useState('summary')
  const cat = CATEGORY_META[getCategory(event)]
  const sev = SEVERITY_META[getSeverity(event)]
  const out = OUTCOME_META[getOutcome(event)]
  const CatIcon = cat.icon

  const tabs = [
    { v: 'summary', label: 'Summary',        icon: Zap },
    { v: 'actor',   label: 'Actor & Session', icon: User },
    { v: 'context', label: 'Request Context', icon: Terminal },
    { v: 'raw',     label: 'Raw JSON',        icon: Hash },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Detail header */}
      <div className="border-b border-steel-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', cat.tone)}>
                <CatIcon className="h-3 w-3" /> {cat.label}
              </span>
              <span className={cn('inline-flex items-center gap-1 text-xs font-medium', sev.text)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', sev.dot)} />
                {sev.label}
              </span>
              <span className={cn('rounded border px-2 py-0.5 text-[11px] font-semibold', out.className)}>
                {out.label}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-steel-900">
              <span className="font-mono text-base text-steel-700">{event.action}</span>
              <span className="text-steel-400"> · </span>
              {event.entity_label ?? event.entity_type ?? event.module}
            </h2>
            <p className="mt-0.5 text-xs text-steel-500">
              {event.timestamp ? formatDateTime(event.timestamp) : '—'}
              {event.ip_address && <> · IP <span className="font-mono text-steel-700">{event.ip_address}</span></>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded border border-steel-200 bg-white px-2.5 py-1.5 text-xs text-steel-600 hover:bg-steel-50">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className="inline-flex items-center gap-1.5 rounded border border-steel-200 bg-white px-2.5 py-1.5 text-xs text-steel-600 hover:bg-steel-50">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-steel-200 bg-white px-6">
        <div className="flex h-10 gap-0">
          {tabs.map(t => {
            const TIcon = t.icon
            return (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-3 text-xs transition-colors',
                  tab === t.v
                    ? 'border-steel-900 text-steel-900'
                    : 'border-transparent text-steel-500 hover:text-steel-700',
                )}
              >
                <TIcon className="h-3.5 w-3.5" /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-steel-50">
        <div className="mx-auto max-w-5xl px-6 py-5">
          {tab === 'summary' && <SummaryTab event={event} />}
          {tab === 'actor'   && <ActorTab   event={event} />}
          {tab === 'context' && <ContextTab event={event} />}
          {tab === 'raw'     && <RawTab     event={event} />}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const MODULES = ['auth','people','units','crb','kyc','financials','leases','maintenance','mpesa','notifications','settings']
const ACTIONS = ['created','updated','deleted','sent','approved','rejected','login','logout','exported','assigned','removed','toggled']

export function AuditPageClient() {
  const [search,      setSearch]      = useState('')
  const [moduleFilter,setModuleFilter]= useState('all')
  const [actionFilter,setActionFilter]= useState('all')
  const [range,       setRange]       = useState('24h')
  const [selected,    setSelected]    = useState<AuditEventApi | null>(null)
  const [exporting,   setExporting]   = useState(false)

  const {
    data,
    isPending: loading,
    fetchNextPage,
    hasNextPage,
    dataUpdatedAt,
    refetch,
  } = useAuditEvents({
    module: moduleFilter !== 'all' ? moduleFilter : undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    q:      search || undefined,
  })

  const events     = data?.pages.flatMap(p => p.items) ?? []
  const total      = data?.pages[0]?.total ?? 0
  const lastPoll   = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportAuditCsv({
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        q:      search || undefined,
      })
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = 'audit.csv'
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { /* ignore */ }
    finally { setExporting(false) }
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayCount   = events.filter(e => e.timestamp?.startsWith(today)).length
  const uniqueUsers  = new Set(events.map(e => e.user_name).filter(Boolean)).size
  const uniqueMods   = new Set(events.map(e => e.module)).size

  const kpis = [
    { label: 'Total events',      value: total,       icon: Activity,    tone: 'text-steel-900' },
    { label: 'Today',             value: todayCount,  icon: Clock,       tone: 'text-sky-700' },
    { label: 'Unique actors',     value: uniqueUsers, icon: Users,       tone: 'text-violet-700' },
    { label: 'Modules active',    value: uniqueMods,  icon: Zap,         tone: 'text-amber-700' },
    { label: 'Data exports',      value: events.filter(e => e.action === 'exported').length, icon: Download, tone: 'text-orange-700' },
    { label: 'Chain integrity',   value: '100%',      icon: ShieldCheck, tone: 'text-emerald-700' },
  ]

  const savedViews = SAVED_VIEWS

  return (
    <DashboardLayout>
      <div className="flex flex-col flex-1 overflow-hidden bg-steel-50">
        {/* Page header */}
        <header className="border-b border-steel-200 bg-white flex-shrink-0">
          <div className="flex items-start justify-between gap-6 px-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-steel-400">
                <Shield className="h-3.5 w-3.5" />
                <span>Access &amp; Security</span>
                <ChevronRight className="h-3 w-3" />
                <span>Compliance</span>
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-steel-900">Audit Trail</h1>
              <p className="mt-1 max-w-3xl text-sm text-steel-500">
                Immutable record of every action, access decision and configuration change across the platform.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {[
                  { icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: `Verified · ${total.toLocaleString()} events` },
                  { icon: Clock,       tone: 'bg-slate-50 text-slate-700 border-slate-200',        label: 'Retention · 90 days' },
                  { icon: Globe,       tone: 'bg-sky-50 text-sky-700 border-sky-200',              label: 'Region · AF/KE' },
                ].map(({ icon: Icon, tone, label }) => (
                  <span key={label} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium', tone)}>
                    <Icon className="h-3 w-3" />{label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded border border-steel-200 bg-white px-2.5 py-1.5 text-xs text-steel-600 hover:bg-steel-50">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
                <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5 rounded border border-steel-200 bg-white px-2.5 py-1.5 text-xs text-steel-600 hover:bg-steel-50 disabled:opacity-50">
                  <Download className="h-3.5 w-3.5" /> {exporting ? 'Exporting…' : 'Export CSV'}
                </button>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-steel-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live · {lastPoll ? `refreshed ${lastPoll.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'polling every 30s'}
              </div>
            </div>
          </div>
        </header>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-px bg-steel-200 md:grid-cols-3 lg:grid-cols-6 flex-shrink-0">
          {kpis.map(k => {
            const Icon = k.icon
            return (
              <div key={k.label} className="bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-steel-400">{k.label}</span>
                  <Icon className={cn('h-3.5 w-3.5', k.tone)} />
                </div>
                <div className={cn('mt-1 text-xl font-semibold', k.tone)}>{loading ? '…' : k.value}</div>
              </div>
            )
          })}
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-[380px_1fr] gap-0 border-t border-steel-200 min-h-0">
          {/* Left rail */}
          <aside className="flex min-h-0 flex-col border-r border-steel-200 bg-white">
            {/* Filters */}
            <div className="border-b border-steel-200 p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-steel-400" />
                <input
                  placeholder="Search actor, action, entity, IP…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelected(null) }}
                  className="h-9 w-full rounded-md border border-steel-200 bg-white pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-steel-300"
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={moduleFilter}
                  onChange={e => { setModuleFilter(e.target.value); setSelected(null) }}
                  className="h-8 rounded border border-steel-200 bg-white px-2 text-xs text-steel-700 focus:outline-none"
                >
                  <option value="all">All modules</option>
                  {MODULES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
                <select
                  value={actionFilter}
                  onChange={e => { setActionFilter(e.target.value); setSelected(null) }}
                  className="h-8 rounded border border-steel-200 bg-white px-2 text-xs text-steel-700 focus:outline-none"
                >
                  <option value="all">All actions</option>
                  {ACTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                </select>
                <select
                  value={range}
                  onChange={e => setRange(e.target.value)}
                  className="h-8 rounded border border-steel-200 bg-white px-2 text-xs text-steel-700 focus:outline-none col-span-2"
                >
                  <option value="1h">Last hour</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-steel-400">
                <span className="inline-flex items-center gap-1"><Filter className="h-3 w-3" /> {total.toLocaleString()} events</span>
                {(moduleFilter !== 'all' || actionFilter !== 'all' || search) && (
                  <button onClick={() => { setSearch(''); setModuleFilter('all'); setActionFilter('all') }}
                    className="inline-flex items-center gap-1 font-medium text-steel-500 hover:text-steel-900">
                    <X className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Saved views */}
            <div className="border-b border-steel-200 px-3 py-2">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel-400">Saved views</div>
              <div className="grid grid-cols-2 gap-1.5">
                {savedViews.map(v => {
                  const Icon = v.icon
                  return (
                    <button
                      key={v.label}
                      onClick={() => {
                        if ('module' in v.filter && v.filter.module) setModuleFilter(v.filter.module)
                        if ('action' in v.filter && v.filter.action) setActionFilter(v.filter.action)
                        setSelected(null)
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-steel-200 bg-white px-2 py-1.5 text-left text-xs hover:border-steel-300 hover:bg-steel-50"
                    >
                      <Icon className="h-3 w-3 text-steel-400 shrink-0" />
                      <span className="truncate text-steel-700">{v.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Event list */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y divide-steel-100">
                {loading && events.length === 0 && (
                  <li className="py-8 text-center text-sm text-steel-400">Loading…</li>
                )}
                {!loading && events.length === 0 && (
                  <li className="py-8 text-center text-sm text-steel-400">No events found.</li>
                )}
                {events.map(e => {
                  const cat = CATEGORY_META[getCategory(e)]
                  const sev = SEVERITY_META[getSeverity(e)]
                  const out = OUTCOME_META[getOutcome(e)]
                  const CIcon = cat.icon
                  const active = selected?.id === e.id
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelected(e)}
                        className={cn(
                          'flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors',
                          active ? 'bg-steel-50 ring-1 ring-inset ring-steel-300' : 'hover:bg-steel-50/60',
                        )}
                      >
                        <span className="mt-1 flex flex-col items-center gap-1">
                          <span className={cn('h-1.5 w-1.5 rounded-full', sev.dot)} />
                          <span className="w-px flex-1 bg-steel-200" style={{ minHeight: 16 }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cat.tone)}>
                              <CIcon className="h-2.5 w-2.5" />
                              {e.module}
                            </span>
                            <span className="truncate font-mono text-[11px] font-medium text-steel-700">{e.action}</span>
                            <span className="ml-auto shrink-0 text-[10px] text-steel-400">
                              {e.timestamp ? formatTime(e.timestamp) : ''}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-[13px] font-medium text-steel-900">
                            {e.user_name ?? 'System'}
                          </div>
                          <div className="truncate text-[11px] text-steel-500">
                            {e.user_role ?? '—'} · {e.entity_type ?? '—'}:{' '}
                            <span className="text-steel-700">{e.entity_label ?? e.entity_id ?? '—'}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                            <span className={cn('rounded border px-1.5 py-0 font-medium', out.className)}>{out.label}</span>
                            {e.ip_address && <span className="font-mono text-steel-400">{e.ip_address}</span>}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
                {!loading && hasNextPage && (
                  <li>
                    <button onClick={() => fetchNextPage()} className="w-full py-3 text-sm text-steel-500 hover:bg-steel-50">
                      Load more…
                    </button>
                  </li>
                )}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-steel-200 bg-steel-50 px-3 py-2 text-[11px] text-steel-500 flex-shrink-0">
              <span>Showing <span className="font-semibold text-steel-900">{events.length}</span> of {total.toLocaleString()}</span>
              <span>Retained 90 days</span>
            </div>
          </aside>

          {/* Detail panel */}
          <section className="min-h-0 bg-steel-50">
            {selected ? (
              <EventDetail event={selected} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-steel-400">
                <Shield className="h-10 w-10 opacity-30" />
                <p className="text-sm">Select an event to inspect</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
