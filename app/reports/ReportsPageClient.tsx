'use client'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/cn'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  ArrowUpRight, BarChart3, Building2, CalendarClock, CheckCircle2, ChevronRight,
  Clock, Copy, Database, Download, Droplets, FileBarChart, FileSpreadsheet,
  FileText, Filter, Gauge, History, Layers, LineChart, Lock, Mail,
  MoreHorizontal, PieChart, Play, Plus, RefreshCw, Search, Share2,
  Shield, ShieldCheck, Sparkles, Star, TrendingUp, Users, Wrench, X, Zap,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Format   = 'PDF' | 'XLSX' | 'CSV' | 'JSON'
type Status   = 'ready' | 'scheduled' | 'draft' | 'pro' | 'beta'
type Category = 'financial' | 'occupancy' | 'utilities' | 'compliance' | 'visitors' | 'hr' | 'operational' | 'custom'

interface ReportDef {
  id: string; name: string; description: string; category: Category
  formats: Format[]; status: Status; lastRun?: string; schedule?: string
  owner?: string; dataSources: string[]; runsThisMonth: number; avgRuntime: string
  favorite?: boolean; pinned?: boolean; compliance?: string[]; file?: string
}

interface RecentExport {
  id: string; report: string; format: Format; generated: string
  by: string; size: string; status: 'ready' | 'expired' | 'processing' | 'failed'; scope: string; file?: string
}

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES: { key: Category | 'all'; label: string; icon: typeof FileText; count: number }[] = [
  { key: 'all',         label: 'All reports',            icon: Layers,      count: 17 },
  { key: 'financial',   label: 'Financial',              icon: TrendingUp,  count: 4 },
  { key: 'occupancy',   label: 'Occupancy & Leases',     icon: Building2,   count: 3 },
  { key: 'utilities',   label: 'Utilities & Maintenance',icon: Droplets,    count: 4 },
  { key: 'compliance',  label: 'Compliance & Notices',   icon: ShieldCheck, count: 3 },
  { key: 'visitors',    label: 'Visitors & Access',      icon: Users,       count: 3 },
]

const REPORTS: ReportDef[] = [
  {
    id: 'rpt_rent_collection', name: 'Monthly Rent Collection',
    description: 'Rent collected vs expected by period, block and unit type.',
    category: 'financial', formats: ['PDF', 'XLSX'], status: 'ready',
    lastRun: 'Today, 06:00', schedule: '1st of month · 06:00 EAT', owner: 'Finance',
    dataSources: ['Charges', 'Payments', 'Leases'], runsThisMonth: 14, avgRuntime: '42s',
    favorite: true, pinned: true, compliance: ['SOX', 'IFRS 15'],
    file: '/reports/Rent_Collection_Jun2026.pdf',
  },
  {
    id: 'rpt_arrears', name: 'Outstanding Arrears',
    description: 'Unpaid charges with aging buckets (0–30, 31–60, 61–90, 90+).',
    category: 'financial', formats: ['PDF', 'XLSX'], status: 'ready',
    lastRun: 'Today, 07:12', schedule: 'Daily · 07:00', owner: 'Finance',
    dataSources: ['Charges', 'Payments'], runsThisMonth: 26, avgRuntime: '1m 08s',
    favorite: true, file: '/reports/Arrears_Report_Jun2026.pdf',
  },
  {
    id: 'rpt_charge_type', name: 'Charge Type Breakdown',
    description: 'Revenue segmented by charge type — rent, utilities, penalties, fines.',
    category: 'financial', formats: ['XLSX', 'CSV'], status: 'ready',
    lastRun: 'Yesterday, 22:00', owner: 'Finance',
    dataSources: ['Charges'], runsThisMonth: 6, avgRuntime: '18s',
    file: '/reports/Charges_Ledger_Jun2026.xlsx',
  },
  {
    id: 'rpt_deposit_ledger', name: 'Deposit Ledger Summary',
    description: 'Deposits held, deductions, refunds and reconciliation status.',
    category: 'financial', formats: ['PDF'], status: 'ready',
    lastRun: '3 days ago', owner: 'Finance',
    dataSources: ['Deposits', 'Leases'], runsThisMonth: 2, avgRuntime: '35s', compliance: ['IFRS 9'],
  },
  {
    id: 'rpt_occupancy_rate', name: 'Occupancy Rate',
    description: 'Occupied vs vacant units by block, floor and unit type over time.',
    category: 'occupancy', formats: ['PDF', 'XLSX'], status: 'ready',
    lastRun: 'Today, 08:00', schedule: 'Weekly · Mon 08:00', owner: 'Operations',
    dataSources: ['Units', 'Leases'], runsThisMonth: 4, avgRuntime: '22s', pinned: true,
  },
  {
    id: 'rpt_lease_expiry', name: 'Lease Expiry Schedule',
    description: 'Upcoming renewals, expiries and notice periods over the next 180 days.',
    category: 'occupancy', formats: ['PDF', 'XLSX'], status: 'scheduled',
    lastRun: 'Today, 08:00', schedule: 'Weekly · Mon 08:00', owner: 'Leasing',
    dataSources: ['Leases', 'Tenants'], runsThisMonth: 4, avgRuntime: '14s',
  },
  {
    id: 'rpt_tenant_turnover', name: 'Tenant Turnover',
    description: 'Move-ins and move-outs across a given period with churn drivers.',
    category: 'occupancy', formats: ['XLSX'], status: 'ready',
    lastRun: '5 days ago', owner: 'Leasing',
    dataSources: ['Leases', 'Tenants'], runsThisMonth: 3, avgRuntime: '19s',
  },
  {
    id: 'rpt_water_balance', name: 'Water Balance Report',
    description: 'Supply vs consumption loss analysis by zone with variance flags.',
    category: 'utilities', formats: ['PDF', 'XLSX'], status: 'ready',
    lastRun: 'Yesterday, 20:00', schedule: 'Weekly · Fri 20:00', owner: 'Facilities',
    dataSources: ['Meters', 'Readings', 'Zones'], runsThisMonth: 4, avgRuntime: '1m 42s',
  },
  {
    id: 'rpt_meter_readings', name: 'Meter Readings Summary',
    description: 'All readings in a billing period with anomaly detection.',
    category: 'utilities', formats: ['XLSX', 'CSV'], status: 'ready',
    lastRun: 'Today, 05:30', schedule: 'Daily · 05:30', owner: 'Facilities',
    dataSources: ['Meters', 'Readings'], runsThisMonth: 30, avgRuntime: '58s',
    file: '/reports/Meter_Readings_Jun2026.xlsx',
  },
  {
    id: 'rpt_work_orders', name: 'Work Order Status',
    description: 'Open, in-progress and completed jobs by SLA, technician and category.',
    category: 'utilities', formats: ['PDF', 'XLSX'], status: 'ready',
    lastRun: 'Today, 09:15', owner: 'Maintenance',
    dataSources: ['Work orders', 'Assets'], runsThisMonth: 12, avgRuntime: '31s',
  },
  {
    id: 'rpt_pm_log', name: 'Preventive Maintenance Log',
    description: 'Scheduled preventive tasks due, completed, missed with next dates.',
    category: 'utilities', formats: ['PDF'], status: 'ready',
    lastRun: '2 days ago', owner: 'Maintenance',
    dataSources: ['PM schedules'], runsThisMonth: 2, avgRuntime: '24s',
  },
  {
    id: 'rpt_breaches', name: 'Active Breach Records',
    description: 'Open and warned rule breaches by severity, resident and location.',
    category: 'compliance', formats: ['PDF'], status: 'ready',
    lastRun: 'Today, 09:00', owner: 'Compliance',
    dataSources: ['Breaches', 'Rules'], runsThisMonth: 8, avgRuntime: '16s',
    compliance: ['SOC 2', 'ISO 27001'],
  },
  {
    id: 'rpt_notice_delivery', name: 'Notice Delivery Status',
    description: 'All notices sent, delivered, opened and acknowledged.',
    category: 'compliance', formats: ['PDF', 'XLSX'], status: 'ready',
    lastRun: 'Today, 08:45', owner: 'Compliance',
    dataSources: ['Notices', 'Deliveries'], runsThisMonth: 9, avgRuntime: '27s',
    compliance: ['GDPR'],
  },
  {
    id: 'rpt_doc_expiry', name: 'Document Expiry Report',
    description: 'Certificates, licenses and contracts approaching or past expiry.',
    category: 'compliance', formats: ['PDF'], status: 'ready',
    lastRun: 'Yesterday, 06:00', schedule: 'Weekly · Mon 06:00', owner: 'Compliance',
    dataSources: ['Documents'], runsThisMonth: 4, avgRuntime: '11s',
  },
  {
    id: 'rpt_visitor_log', name: 'Visitor Log Export',
    description: 'All visitor entries by date range with host, purpose and dwell time.',
    category: 'visitors', formats: ['XLSX'], status: 'ready',
    lastRun: 'Today, 10:00', owner: 'Security',
    dataSources: ['Visitors', 'Gate events'], runsThisMonth: 22, avgRuntime: '8s',
    compliance: ['GDPR'],
  },
  {
    id: 'rpt_gate_activity', name: 'Gate Activity Summary',
    description: 'Entry/exit counts by period, gate and vehicle class.',
    category: 'visitors', formats: ['PDF'], status: 'pro',
    owner: 'Security', dataSources: ['Gate events'], runsThisMonth: 0, avgRuntime: '—',
  },
  {
    id: 'rpt_denied_entry', name: 'Denied Entry Report',
    description: 'All denied visitor attempts with reason codes and escalations.',
    category: 'visitors', formats: ['PDF'], status: 'pro',
    owner: 'Security', dataSources: ['Gate events', 'Policies'], runsThisMonth: 0, avgRuntime: '—',
  },
]

const RECENT_EXPORTS: RecentExport[] = [
  { id: 'exp_1', report: 'June 2026 Rent Collection',  format: 'PDF',  generated: '2026-07-01 06:02', by: 'Finance', size: '1.8 MB', status: 'ready', scope: 'All properties · June 2026', file: '/reports/Rent_Collection_Jun2026.pdf' },
  { id: 'exp_2', report: 'Arrears Report — July 2026', format: 'PDF',  generated: '2026-07-12 07:12', by: 'Finance', size: '742 KB', status: 'ready', scope: 'Aging: 30/60/90+',             file: '/reports/Arrears_Report_Jun2026.pdf' },
  { id: 'exp_3', report: 'Meter Readings — July 2026', format: 'XLSX', generated: '2026-07-12 05:31', by: 'System',  size: '4.2 MB', status: 'ready', scope: 'All meters',                  file: '/reports/Meter_Readings_Jun2026.xlsx' },
  { id: 'exp_4', report: 'Charges Ledger — June 2026', format: 'XLSX', generated: '2026-06-30 22:04', by: 'System',  size: '6.1 MB', status: 'ready', scope: 'All charge types',             file: '/reports/Charges_Ledger_Jun2026.xlsx' },
  { id: 'exp_5', report: 'May 2026 Rent Collection',   format: 'PDF',  generated: '2026-06-01 06:00', by: 'Finance', size: '1.6 MB', status: 'expired', scope: 'Retention 30d' },
  { id: 'exp_6', report: 'Occupancy Snapshot',         format: 'CSV',  generated: '2026-07-12 08:00', by: 'System',  size: '312 KB', status: 'processing', scope: 'All blocks' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatColor: Record<Format, string> = {
  PDF:  'text-rose-600',
  XLSX: 'text-emerald-600',
  CSV:  'text-sky-600',
  JSON: 'text-violet-600',
}

function statusBadge(s: Status) {
  switch (s) {
    case 'ready':     return { label: 'READY',     cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
    case 'scheduled': return { label: 'SCHEDULED', cls: 'bg-sky-500/10 text-sky-600 border-sky-500/20' }
    case 'draft':     return { label: 'DRAFT',     cls: 'bg-gray-100 text-gray-500 border-gray-200' }
    case 'pro':       return { label: 'PRO',       cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    case 'beta':      return { label: 'BETA',      cls: 'bg-violet-500/10 text-violet-600 border-violet-500/20' }
  }
}

const categoryIcon: Record<Category, typeof FileText> = {
  financial: TrendingUp, occupancy: Building2, utilities: Droplets,
  compliance: ShieldCheck, visitors: Users, hr: Users, operational: Gauge, custom: Star,
}

function openReport(report: ReportDef) {
  if (report.file) window.open(report.file, '_blank')
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: RecentExport['status'] }) {
  const map = {
    ready:      { label: 'Ready',      cls: 'bg-emerald-500/10 text-emerald-600', icon: CheckCircle2 },
    processing: { label: 'Processing', cls: 'bg-sky-500/10 text-sky-600',         icon: RefreshCw },
    expired:    { label: 'Expired',    cls: 'bg-gray-100 text-gray-500',           icon: Clock },
    failed:     { label: 'Failed',     cls: 'bg-rose-500/10 text-rose-600',        icon: X },
  }[status]
  const Icon = map.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', map.cls)}>
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {map.label}
    </span>
  )
}

// ── Pinned card ───────────────────────────────────────────────────────────────

function PinnedCard({ report, onOpen }: { report: ReportDef; onOpen: () => void }) {
  const Icon = categoryIcon[report.category]
  return (
    <button onClick={onOpen}
      className="text-left group rounded-lg border border-border bg-gradient-to-br from-white via-white to-primary-50 hover:border-primary-300 hover:shadow-md transition-all p-4 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-full blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="h-9 w-9 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1">
            {report.formats.map(f => (
              <span key={f} className={cn('text-[10px] font-bold tracking-wider', formatColor[f])}>{f}</span>
            ))}
          </div>
        </div>
        <div className="font-semibold text-sm mb-1 text-gray-900">{report.name}</div>
        <div className="text-xs text-gray-500 line-clamp-2 mb-3">{report.description}</div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{report.lastRun}</div>
          <ArrowUpRight className="h-3.5 w-3.5 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  )
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({ report, onOpen }: { report: ReportDef; onOpen: () => void }) {
  const Icon = categoryIcon[report.category]
  const sb   = statusBadge(report.status)
  const runnable = report.status === 'ready' || report.status === 'scheduled'
  return (
    <div onClick={onOpen}
      className="group rounded-lg border border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm transition-all p-4 cursor-pointer">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-sm truncate text-gray-900">{report.name}</h3>
              {report.favorite && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
            </div>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', sb.cls)}>{sb.label}</span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{report.description}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 mb-3">
            {report.schedule && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{report.schedule}</span>}
            {report.lastRun  && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{report.lastRun}</span>}
            {report.owner    && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{report.owner}</span>}
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{report.avgRuntime}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {report.formats.map(f => (
                <span key={f} className={cn('text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border border-gray-200', formatColor[f])}>{f}</span>
              ))}
              {report.compliance?.map(c => (
                <span key={c} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{c}</span>
              ))}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button size-sm className="h-7 px-2.5 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600"
                onClick={e => { e.stopPropagation() }}>
                <Copy className="h-3 w-3 inline" />
              </button>
              {runnable && (
                <button className="h-7 px-2.5 rounded text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-1"
                  onClick={e => { e.stopPropagation(); onOpen() }}>
                  <Play className="h-3 w-3" /> Run
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Report drawer ─────────────────────────────────────────────────────────────

function ReportDrawer({ report, onClose }: { report: ReportDef; onClose: () => void }) {
  const [drawerTab, setDrawerTab] = useState('run')
  const Icon = categoryIcon[report.category]
  const sb   = statusBadge(report.status)
  const runnable = report.status === 'ready' || report.status === 'scheduled'

  function handleRun() {
    if (report.file) window.open(report.file, '_blank')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-md bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-base truncate text-gray-900">{report.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-md border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {report.formats.map(f => (
              <span key={f} className={cn('text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border border-gray-200', formatColor[f])}>{f}</span>
            ))}
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', sb.cls)}>{sb.label}</span>
            {report.compliance?.map(c => (
              <span key={c} className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">{c}</span>
            ))}
          </div>
        </div>

        {/* Drawer tabs */}
        <div className="flex border-b border-gray-200 px-5 pt-2">
          {[
            { v: 'run', label: 'Run' }, { v: 'schedule', label: 'Schedule' },
            { v: 'history', label: 'History' }, { v: 'details', label: 'Details' },
          ].map(t => (
            <button key={t.v} onClick={() => setDrawerTab(t.v)}
              className={cn('px-3 py-2 text-xs border-b-2 transition-colors',
                drawerTab === t.v ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {drawerTab === 'run' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Period</label>
                <select className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option>Month to date</option>
                  <option>Last month</option>
                  <option>Quarter to date</option>
                  <option>Custom range…</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Scope</label>
                <select className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option>All properties</option>
                  <option>Block A</option>
                  <option>Block B</option>
                  <option>Block C</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Format</label>
                <div className="flex items-center gap-2 mt-1.5">
                  {report.formats.map(f => (
                    <button key={f} className={cn('px-3 py-1.5 rounded border border-gray-200 text-xs font-medium hover:bg-gray-50', formatColor[f])}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Est. runtime</span>
                  <span className="font-mono">{report.avgRuntime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Policy check</span>
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Allowed
                  </span>
                </div>
              </div>
              <button
                onClick={handleRun}
                disabled={!runnable}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                {report.file ? 'Open report' : 'Generate report'}
              </button>
            </div>
          )}

          {drawerTab === 'schedule' && (
            <div className="p-5 space-y-3 text-sm">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Current schedule</div>
                <div className="font-medium mt-1 text-gray-900">{report.schedule ?? 'Not scheduled'}</div>
              </div>
              <p className="text-xs text-gray-500">Configure cadence, recipients and delivery channels. Failures alert the owning team and are logged to the audit trail.</p>
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600">
                <CalendarClock className="h-3.5 w-3.5" /> Edit schedule
              </button>
            </div>
          )}

          {drawerTab === 'history' && (
            <div className="p-5 space-y-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Run #{4821 - i}</div>
                    <div className="text-xs text-gray-500 font-mono">2026-07-{12 - i} · {report.avgRuntime}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status="ready" />
                    <button className="h-7 w-7 rounded border border-gray-200 hover:bg-gray-100 flex items-center justify-center">
                      <Download className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {drawerTab === 'details' && (
            <div className="p-5 space-y-4 text-sm">
              {[
                { label: 'Owner',        value: report.owner ?? '—' },
                { label: 'Data sources', value: report.dataSources.join(', ') },
                { label: 'Runs this month', value: String(report.runsThisMonth) },
                { label: 'Avg runtime',  value: report.avgRuntime },
                { label: 'Compliance',   value: report.compliance?.join(' · ') ?? 'None' },
                { label: 'Retention',    value: '90 days · WORM storage' },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{row.label}</div>
                  <div className="text-sm text-right text-gray-900">{row.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

// ── Tab panes ─────────────────────────────────────────────────────────────────

function RecentExportsTable() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Recent exports</h3>
          <p className="text-xs text-gray-500">Every generated file is retained per your policy.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-600">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-xs text-gray-600">
            <Download className="h-3.5 w-3.5" /> Bulk download
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              {['Report', 'Scope', 'Format', 'Generated', 'By', 'Size', 'Status', ''].map(h => (
                <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_EXPORTS.map(e => (
              <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{e.report}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{e.scope}</td>
                <td className={cn('px-4 py-3 text-xs font-bold tracking-wider', formatColor[e.format])}>{e.format}</td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{e.generated}</td>
                <td className="px-4 py-3 text-xs text-gray-700">{e.by}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{e.size}</td>
                <td className="px-4 py-3"><StatusPill status={e.status} /></td>
                <td className="px-4 py-3 text-right">
                  {e.status === 'ready' && (
                    <div className="flex items-center justify-end gap-1">
                      {e.file && (
                        <button onClick={() => window.open(e.file, '_blank')}
                          className="h-7 px-2 rounded border border-gray-200 hover:bg-gray-100 text-gray-500">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button className="h-7 px-2 rounded border border-gray-200 hover:bg-gray-100 text-gray-500">
                        <Share2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {e.status === 'processing' && <span className="text-xs text-gray-500">In progress…</span>}
                  {e.status === 'expired' && <span className="text-xs text-gray-400">Unavailable</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ScheduledPane() {
  const schedules = REPORTS.filter(r => r.schedule)
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-primary-50 via-white to-white p-5 flex items-start justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-gray-900">
            <CalendarClock className="h-4 w-4 text-primary-600" /> Automated report schedules
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Reports run on cron-style schedules. Failures alert the owning team and are captured in the audit trail.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium">
          <Plus className="h-4 w-4" /> New schedule
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              {['Report', 'Cadence', 'Next run', 'Delivery', 'Owner', 'Health', ''].map(h => (
                <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((r, i) => (
              <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.schedule}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-700">
                  {['in 42m', 'tomorrow 06:00', 'Mon 08:00', 'Fri 20:00', 'in 3h 12m'][i % 5]}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Mail className="h-3 w-3" /> 4 recipients · S3
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-700">{r.owner}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Healthy
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-xs text-gray-500 hover:text-gray-900 px-2">Edit</button>
                  <button className="text-xs text-gray-500 hover:text-gray-900 px-2">Pause</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BuilderPane() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Custom report builder</h3>
            <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded border border-violet-200 text-violet-600 bg-violet-50">BETA</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Compose ad-hoc reports over the governed data warehouse. All queries are policy-checked and row-level filtered per your scope.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'Dataset',    value: 'rent_collection_v3' },
              { label: 'Grain',      value: 'Unit × Month' },
              { label: 'Filters',    value: 'property IN (Blocks A, B, C)' },
              { label: 'Metrics',    value: 'expected, collected, arrears' },
              { label: 'Dimensions', value: 'charge_type, unit_type' },
              { label: 'Format',     value: 'XLSX + PDF summary' },
            ].map(f => (
              <div key={f.label} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">{f.label}</div>
                <div className="text-sm font-mono truncate text-gray-900">{f.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Policy pre-check: <span className="text-emerald-600 font-medium">Allowed</span>
              <span>· Est. runtime: 12s</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600">Save as report</button>
              <button className="px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Preview
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Preview</h3>
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 h-64 flex flex-col items-center justify-center text-gray-400">
            <LineChart className="h-8 w-8 mb-2" />
            <p className="text-sm">Run preview to see the first 100 rows and summary charts.</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm mb-3 text-gray-900">Templates</h3>
          <div className="space-y-2">
            {[
              { name: 'Board pack — Monthly', icon: FileBarChart },
              { name: 'Regulatory submission', icon: Shield },
              { name: 'Investor summary', icon: PieChart },
              { name: 'Ops daily briefing', icon: Zap },
            ].map(t => {
              const Icon = t.icon
              return (
                <button key={t.name}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-400" />{t.name}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )
            })}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900">
            <Sparkles className="h-3.5 w-3.5 text-primary-600" /> Ask AI
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Describe the report in plain English. The builder will draft dataset, metrics and filters — always subject to policy checks.
          </p>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5 text-xs italic text-gray-500">
            "Show me arrears older than 60 days by block for units with active penalties, exported as XLSX."
          </div>
        </div>
      </div>
    </div>
  )
}

function DeliveryPane() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900">
          <Share2 className="h-4 w-4 text-primary-600" /> Delivery channels
        </h3>
        {[
          { name: 'Email',   detail: 'SMTP · signed PDF + link',         status: 'Connected' },
          { name: 'Slack',   detail: '#finance-reports, #ops-daily',      status: 'Connected' },
          { name: 'AWS S3',  detail: 's3://reports-prod/ (SSE-KMS)',      status: 'Connected' },
          { name: 'SFTP',    detail: 'sftp.regulator.gov.ke',             status: 'Rotate key' },
          { name: 'Webhook', detail: 'https://hooks.gwg.estate/reports',  status: 'Connected' },
        ].map(c => (
          <div key={c.name} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <div>
              <div className="text-sm font-medium text-gray-900">{c.name}</div>
              <div className="text-xs text-gray-500">{c.detail}</div>
            </div>
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded border',
              c.status === 'Connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200')}>
              {c.status}
            </span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900">
          <ShieldCheck className="h-4 w-4 text-primary-600" /> Access &amp; governance
        </h3>
        <div className="space-y-3 text-sm">
          {[
            { l: 'Row-level policies',  v: 'Enforced · ABAC' },
            { l: 'PII masking',         v: 'Emails, IDs, phone numbers' },
            { l: 'Export approvals',    v: 'Required for > 10k rows' },
            { l: 'Retention',           v: 'PDF 90d · XLSX 30d · CSV 30d' },
            { l: 'Watermarking',        v: 'Recipient email + timestamp' },
            { l: 'Audit trail',         v: 'Every export logged & signed' },
          ].map(row => (
            <div key={row.l} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
              <div className="text-sm text-gray-700">{row.l}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{row.v}</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900">
          <BarChart3 className="h-4 w-4 text-primary-600" /> Usage &amp; adoption (last 30 days)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: 'Total exports',   v: '1,284' }, { l: 'Unique users', v: '38' },
            { l: 'Scheduled runs',  v: '612' },   { l: 'Ad-hoc runs',  v: '672' },
            { l: 'PDF share',       v: '48%' },   { l: 'XLSX share',   v: '39%' },
            { l: 'Failed runs',     v: '3 (0.2%)' }, { l: 'P95 runtime', v: '2m 14s' },
          ].map(k => (
            <div key={k.l} className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500">{k.l}</div>
              <div className="text-lg font-semibold mt-1 text-gray-900">{k.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReportsPageClient() {
  const [activeCat, setActiveCat] = useState<Category | 'all'>('all')
  const [query,     setQuery]     = useState('')
  const [selected,  setSelected]  = useState<ReportDef | null>(null)
  const [period,    setPeriod]    = useState('mtd')
  const [mainTab,   setMainTab]   = useState('library')

  const filtered = useMemo(() => REPORTS.filter(r => {
    if (activeCat !== 'all' && r.category !== activeCat) return false
    if (query && !`${r.name} ${r.description}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [activeCat, query])

  const kpis = [
    { label: 'Reports available', value: '17',          delta: 'in 5 categories', icon: FileBarChart, tone: 'text-primary-600' },
    { label: 'Scheduled runs',    value: String(REPORTS.filter(r => r.schedule).length), delta: 'next in 42m', icon: CalendarClock, tone: 'text-sky-600' },
    { label: 'Exports this month',value: '1,284',        delta: '+12% vs last month', icon: Download, tone: 'text-emerald-600' },
    { label: 'Avg runtime',       value: '38s',          delta: 'P95 · 2m 14s', icon: Gauge, tone: 'text-amber-600' },
    { label: 'Data freshness',    value: '< 5 min',      delta: 'warehouse healthy', icon: Database, tone: 'text-violet-600' },
    { label: 'Governance',        value: 'Compliant',    delta: 'row-level policies on', icon: ShieldCheck, tone: 'text-rose-600' },
  ]

  const mainTabs = [
    { v: 'library',   l: 'Report Library',   i: FileBarChart },
    { v: 'recent',    l: 'Recent Exports',    i: History },
    { v: 'scheduled', l: 'Scheduled',         i: CalendarClock },
    { v: 'builder',   l: 'Custom Builder',    i: Sparkles },
    { v: 'delivery',  l: 'Delivery & Access', i: Share2 },
  ]

  return (
    <DashboardLayout>
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white flex-shrink-0">
          <div className="px-6 py-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
                <span>Analytics</span><ChevronRight className="h-3 w-3" /><span className="text-gray-700">Reports</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
                Reports &amp; Analytics
                <span className="text-[10px] font-medium tracking-wider px-1.5 py-0.5 rounded border border-gray-300 text-gray-500">ENTERPRISE</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                Generate, schedule and distribute governed reports across finance, operations, compliance and security.
                Every export is versioned, access-controlled and audit-logged.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={period} onChange={e => setPeriod(e.target.value)}
                className="w-[180px] h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                <option value="today">Today</option>
                <option value="wtd">Week to date</option>
                <option value="mtd">Month to date</option>
                <option value="qtd">Quarter to date</option>
                <option value="ytd">Year to date</option>
              </select>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium">
                <Plus className="h-4 w-4" /> New report
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-gray-100">
            {kpis.map(k => {
              const Icon = k.icon
              return (
                <div key={k.label} className="px-5 py-4 border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider">
                    <Icon className={cn('h-3.5 w-3.5', k.tone)} />{k.label}
                  </div>
                  <div className="text-xl font-semibold mt-1.5 text-gray-900">{k.value}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{k.delta}</div>
                </div>
              )
            })}
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar */}
          <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col">
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search reports…"
                  className="pl-8 h-9 w-full rounded-md border border-gray-200 bg-white pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 py-2">Categories</div>
                {CATEGORIES.map(c => {
                  const Icon = c.icon
                  const active = activeCat === c.key
                  return (
                    <button key={c.key} onClick={() => setActiveCat(c.key)}
                      className={cn('w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-sm transition-colors',
                        active ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-100 text-gray-600')}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{c.label}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">{c.count}</span>
                    </button>
                  )
                })}

                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 pt-4 pb-2">Saved views</div>
                {[
                  { label: 'My starred',       icon: Star,         count: 4 },
                  { label: 'Board pack',        icon: FileBarChart, count: 6 },
                  { label: 'Regulatory pack',   icon: Shield,       count: 5 },
                  { label: 'Ops daily',         icon: Zap,          count: 7 },
                ].map(v => {
                  const Icon = v.icon
                  return (
                    <button key={v.label}
                      className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md text-sm hover:bg-gray-100 text-gray-600">
                      <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{v.label}</span></div>
                      <span className="text-[10px] text-gray-400 font-mono">{v.count}</span>
                    </button>
                  )
                })}

                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 px-2 pt-4 pb-2">Governance</div>
                <div className="px-2 space-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-emerald-600" />Row-level policies active</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />All exports audit-logged</div>
                  <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5 text-sky-600" />Warehouse: healthy</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Tab bar */}
            <div className="px-6 pt-4 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex gap-1">
                {mainTabs.map(t => {
                  const Icon = t.i
                  return (
                    <button key={t.v} onClick={() => setMainTab(t.v)}
                      className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border transition-colors',
                        mainTab === t.v
                          ? 'bg-white border-gray-200 border-b-white text-gray-900 font-medium shadow-sm'
                          : 'border-transparent text-gray-500 hover:text-gray-700')}>
                      <Icon className="h-3.5 w-3.5" />{t.l}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6">
              {mainTab === 'library' && (
                <>
                  {/* Filters row */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 text-xs text-gray-500">
                      <Filter className="h-3 w-3" /> {filtered.length} of {REPORTS.length} reports
                    </span>
                    {['All formats', 'All owners', 'Most run'].map(p => (
                      <select key={p} className="h-8 rounded border border-gray-200 bg-white px-2 text-xs focus:outline-none">
                        <option>{p}</option>
                      </select>
                    ))}
                  </div>

                  {/* Pinned */}
                  {activeCat === 'all' && !query && (
                    <section className="mb-6">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Pinned by your team
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        {REPORTS.filter(r => r.pinned).map(r => (
                          <PinnedCard key={r.id} report={r} onOpen={() => setSelected(r)} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* All reports */}
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      {activeCat === 'all' ? 'All reports' : CATEGORIES.find(c => c.key === activeCat)?.label}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {filtered.map(r => <ReportCard key={r.id} report={r} onOpen={() => setSelected(r)} />)}
                      {filtered.length === 0 && (
                        <div className="col-span-full text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg py-16">
                          No reports match your filters.
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {mainTab === 'recent'    && <RecentExportsTable />}
              {mainTab === 'scheduled' && <ScheduledPane />}
              {mainTab === 'builder'   && <BuilderPane />}
              {mainTab === 'delivery'  && <DeliveryPane />}
            </div>
          </main>

          {/* Detail drawer */}
          {selected && <ReportDrawer report={selected} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </DashboardLayout>
  )
}
