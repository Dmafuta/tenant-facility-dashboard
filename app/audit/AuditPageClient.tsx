'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { AUDIT_EVENTS } from '@/lib/mock-data'
import type { AuditEvent } from '@/lib/types'

function actionBadge(action: AuditEvent['action']) {
  const map: Record<string, 'success'|'warning'|'danger'|'blue'|'default'> = {
    created: 'success', updated: 'blue', deleted: 'danger', approved: 'success',
    rejected: 'danger', sent: 'blue', signed: 'success', exported: 'default',
    login: 'default', logout: 'default'
  }
  return <Badge variant={map[action] ?? 'default'}>{action}</Badge>
}

function moduleBadge(module: AuditEvent['module']) {
  const colors: Record<string, string> = {
    financials: 'text-green-700 bg-green-50 border-green-200',
    leases: 'text-blue-700 bg-blue-50 border-blue-200',
    utilities: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    maintenance: 'text-orange-700 bg-orange-50 border-orange-200',
    people: 'text-purple-700 bg-purple-50 border-purple-200',
    notices: 'text-amber-700 bg-amber-50 border-amber-200',
    rules: 'text-red-700 bg-red-50 border-red-200',
    settings: 'text-gray-700 bg-gray-50 border-gray-200',
  }
  const cls = colors[module] ?? 'text-text-muted bg-surface border-surface-border'
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded px-1.5 py-0.5 ${cls}`}>
      {module}
    </span>
  )
}

export function AuditPageClient() {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [selected, setSelected] = useState<AuditEvent | null>(null)

  const filtered = AUDIT_EVENTS.filter(e => {
    const q = search.toLowerCase()
    const matchQ = e.description.toLowerCase().includes(q) || e.user_name.toLowerCase().includes(q) || e.entity_label.toLowerCase().includes(q)
    const matchM = moduleFilter === 'all' || e.module === moduleFilter
    const matchA = actionFilter === 'all' || e.action === actionFilter
    return matchQ && matchM && matchA
  })

  const uniqueModules = [...new Set(AUDIT_EVENTS.map(e => e.module))]

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Audit Trail" subtitle="Immutable log of all system actions and changes" />

        {/* KPIs */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Total Events',  value: AUDIT_EVENTS.length, color: 'text-text' },
            { label: 'Today',         value: AUDIT_EVENTS.filter(e => e.timestamp.startsWith('2024-06-13')).length, color: 'text-primary-600' },
            { label: 'Unique Users',  value: new Set(AUDIT_EVENTS.map(e => e.user_name)).size, color: 'text-blue-600' },
            { label: 'Modules Active',value: new Set(AUDIT_EVENTS.map(e => e.module)).size, color: 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* list */}
          <div className="w-96 flex-shrink-0 border-r border-surface-border dark:border-dark-border flex flex-col">
            <div className="p-3 space-y-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
              <SearchInput value={search} onChange={setSearch} placeholder="Search events, users, entities…" />
              <div className="flex gap-2">
                <Select value={moduleFilter} onChange={setModuleFilter} options={[
                  { value: 'all', label: 'All modules' },
                  ...uniqueModules.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))
                ]} />
                <Select value={actionFilter} onChange={setActionFilter} options={[
                  { value: 'all', label: 'All actions' },
                  { value: 'created', label: 'Created' },
                  { value: 'updated', label: 'Updated' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'login', label: 'Login' },
                ]} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(e => (
                <button key={e.id} onClick={() => setSelected(e)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === e.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    {moduleBadge(e.module)}
                    {actionBadge(e.action)}
                    <span className="text-xs text-text-muted ml-auto">{e.timestamp.slice(11, 16)}</span>
                  </div>
                  <p className="text-sm text-text mt-1 truncate">{e.entity_label}</p>
                  <p className="text-xs text-text-muted">{e.user_name} · {e.user_role}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="py-8 text-sm text-text-muted text-center">No events found.</p>}
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
                    <h2 className="text-base font-semibold text-text">{selected.entity_label}</h2>
                    <p className="text-sm text-text-muted">{selected.entity_type} · {selected.entity_id}</p>
                  </div>
                </div>

                <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                  <p className="text-xs font-semibold text-text-muted mb-1">Description</p>
                  <p className="text-sm text-text">{selected.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Timestamp', value: selected.timestamp.replace('T',' ') },
                    { label: 'User',      value: `${selected.user_name} (${selected.user_role})` },
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
                              <td className="px-4 py-2.5 text-red-600 dark:text-red-400 font-mono text-xs">{ch.from || '—'}</td>
                              <td className="px-4 py-2.5 text-green-600 dark:text-green-400 font-mono text-xs">{ch.to || '—'}</td>
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
