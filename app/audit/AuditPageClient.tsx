'use client'
import { cn } from '@/lib/cn'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { getAuditEvents, exportAuditCsv, type AuditEventApi } from '@/lib/api/audit'

function actionBadge(action: string) {
  const map: Record<string, 'success'|'warning'|'danger'|'blue'|'default'> = {
    created: 'success', updated: 'blue', deleted: 'danger', approved: 'success',
    rejected: 'danger', sent: 'blue', signed: 'success', exported: 'default',
    login: 'default', logout: 'default', '2fa_challenge': 'warning',
    toggled: 'blue', removed: 'danger', assigned: 'success',
  }
  return <Badge variant={map[action] ?? 'default'}>{action.replace(/_/g, ' ')}</Badge>
}

function moduleBadge(module: string) {
  const colors: Record<string, string> = {
    financials:  'text-green-700 bg-green-50 border-green-200',
    leases:      'text-blue-700 bg-blue-50 border-blue-200',
    utilities:   'text-cyan-700 bg-cyan-50 border-cyan-200',
    maintenance: 'text-orange-700 bg-orange-50 border-orange-200',
    people:      'text-purple-700 bg-purple-50 border-purple-200',
    notices:     'text-amber-700 bg-amber-50 border-amber-200',
    rules:       'text-red-700 bg-red-50 border-red-200',
    settings:    'text-gray-700 bg-gray-50 border-gray-200',
    auth:        'text-indigo-700 bg-indigo-50 border-indigo-200',
    units:       'text-teal-700 bg-teal-50 border-teal-200',
    crb:         'text-rose-700 bg-rose-50 border-rose-200',
    kyc:         'text-violet-700 bg-violet-50 border-violet-200',
    mpesa:       'text-emerald-700 bg-emerald-50 border-emerald-200',
    notifications:'text-sky-700 bg-sky-50 border-sky-200',
  }
  const cls = colors[module] ?? 'text-text-muted bg-surface border-surface-border'
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-1.5 py-0.5 ${cls}`}>
      {module}
    </span>
  )
}

const MODULES = ['auth','people','units','crb','kyc','financials','leases','maintenance','mpesa','notifications','settings']
const ACTIONS = ['created','updated','deleted','sent','approved','rejected','login','logout','exported','assigned','removed','toggled']

export function AuditPageClient() {
  const [search, setSearch]             = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [selected, setSelected]         = useState<AuditEventApi | null>(null)
  const [events, setEvents]             = useState<AuditEventApi[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(0)
  const [totalPages, setTotalPages]     = useState(0)
  const [loading, setLoading]           = useState(true)
  const [exporting, setExporting]       = useState(false)

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const res = await getAuditEvents({
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        q:      search || undefined,
        from:   dateFrom || undefined,
        to:     dateTo   || undefined,
        page:   p,
        size:   50,
      })
      if (p === 0) {
        setEvents(res.items)
      } else {
        setEvents(prev => [...prev, ...res.items])
      }
      setTotal(res.total)
      setPage(res.page)
      setTotalPages(res.total_pages)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [moduleFilter, actionFilter, search, dateFrom, dateTo])

  useEffect(() => { load(0) }, [load])

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = events.filter(e => e.timestamp?.startsWith(today)).length
  const uniqueUsers = new Set(events.map(e => e.user_name)).size
  const uniqueModules = new Set(events.map(e => e.module)).size

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportAuditCsv({
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        q:      search || undefined,
        from:   dateFrom || undefined,
        to:     dateTo   || undefined,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit${dateFrom ? '-' + dateFrom : ''}${dateTo ? '-to-' + dateTo : ''}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // silently ignore
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Audit Trail" subtitle="Immutable log of all system actions and changes" />

        {/* KPIs */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Total Events',   value: total,        color: 'text-text' },
            { label: 'Today',          value: todayCount,   color: 'text-primary-600' },
            { label: 'Unique Users',   value: uniqueUsers,  color: 'text-blue-600' },
            { label: 'Modules Active', value: uniqueModules,color: 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{loading ? '…' : k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* list */}
          <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-96' : 'flex w-full lg:w-96')}>
            <div className="p-3 space-y-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
              <SearchInput value={search} onChange={v => { setSearch(v); setSelected(null) }} placeholder="Search events, users, entities…" />
              <div className="flex gap-2">
                <Select value={moduleFilter} onChange={v => { setModuleFilter(v); setSelected(null) }} options={[
                  { value: 'all', label: 'All modules' },
                  ...MODULES.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))
                ]} />
                <Select value={actionFilter} onChange={v => { setActionFilter(v); setSelected(null) }} options={[
                  { value: 'all', label: 'All actions' },
                  ...ACTIONS.map(a => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))
                ]} />
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setSelected(null) }}
                  max={dateTo || today}
                  className="flex-1 text-xs border border-surface-border dark:border-dark-border rounded-lg px-2 py-1.5 bg-surface dark:bg-dark-card text-text"
                />
                <span className="text-xs text-text-muted flex-shrink-0">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setSelected(null) }}
                  min={dateFrom || undefined}
                  max={today}
                  className="flex-1 text-xs border border-surface-border dark:border-dark-border rounded-lg px-2 py-1.5 bg-surface dark:bg-dark-card text-text"
                />
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => { setDateFrom(''); setDateTo(''); setSelected(null) }}
                    className="text-xs text-text-muted hover:text-danger transition-colors flex-shrink-0"
                    title="Clear dates"
                  >✕</button>
                )}
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-surface-border dark:border-dark-border text-xs font-medium text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
              >
                {exporting
                  ? <><span className="w-3 h-3 border border-text-muted/30 border-t-text-muted rounded-full animate-spin" /> Exporting…</>
                  : '↓ Export CSV'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
              {loading && events.length === 0 && (
                <p className="py-8 text-sm text-text-muted text-center">Loading…</p>
              )}
              {!loading && events.length === 0 && (
                <p className="py-8 text-sm text-text-muted text-center">No events found.</p>
              )}
              {events.map(e => (
                <button key={e.id} onClick={() => setSelected(e)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === e.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {moduleBadge(e.module)}
                    {actionBadge(e.action)}
                    <span className="text-xs text-text-muted ml-auto">{e.timestamp?.slice(11, 16) ?? ''}</span>
                  </div>
                  <p className="text-sm text-text mt-1 truncate">{e.entity_label ?? e.entity_type ?? '—'}</p>
                  <p className="text-xs text-text-muted">{e.user_name ?? 'System'} · {e.user_role ?? '—'}</p>
                </button>
              ))}
              {!loading && page + 1 < totalPages && (
                <button
                  onClick={() => load(page + 1)}
                  className="w-full py-3 text-sm text-primary-600 hover:bg-surface-hover dark:hover:bg-dark-hover">
                  Load more
                </button>
              )}
            </div>
          </div>

          {/* detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-sm text-text-muted">Select an event to view details</div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {moduleBadge(selected.module)}
                      {actionBadge(selected.action)}
                    </div>
                    <h2 className="text-base font-semibold text-text">{selected.entity_label ?? selected.entity_type ?? '—'}</h2>
                    <p className="text-sm text-text-muted">{selected.entity_type} · {selected.entity_id}</p>
                  </div>
                </div>

                {selected.description && (
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                    <p className="text-xs font-semibold text-text-muted mb-1">Description</p>
                    <p className="text-sm text-text">{selected.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Timestamp', value: selected.timestamp?.replace('T', ' ').slice(0, 19) ?? '—' },
                    { label: 'User',      value: `${selected.user_name ?? 'System'} (${selected.user_role ?? '—'})` },
                    ...(selected.ip_address ? [{ label: 'IP Address', value: selected.ip_address }] : []),
                  ].map(f => (
                    <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                      <p className="text-xs text-text-muted">{f.label}</p>
                      <p className="text-sm font-medium text-text font-mono">{f.value}</p>
                    </div>
                  ))}
                </div>

                {selected.changes && selected.changes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-2">Field Changes</p>
                    <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-hover dark:bg-dark-hover">
                          <tr>
                            {['Field','From','To'].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-medium text-text-muted">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                          {selected.changes.map((ch, i) => (
                            <tr key={i}>
                              <td className="px-4 py-2.5 text-text font-medium">{ch.field}</td>
                              <td className="px-4 py-2.5 text-red-600 dark:text-red-400 font-mono text-xs">{ch.from || '\u2014'}</td>
                              <td className="px-4 py-2.5 text-green-600 dark:text-green-400 font-mono text-xs">{ch.to || '\u2014'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
