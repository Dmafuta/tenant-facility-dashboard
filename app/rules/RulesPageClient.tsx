'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { HOUSE_RULES, BREACH_RECORDS } from '@/lib/mock-data'
import type { BreachRecord, HouseRule } from '@/lib/types'

function severityBadge(sev: BreachRecord['severity'] | HouseRule['severity']) {
  const map: Record<string, 'default'|'warning'|'orange'|'danger'> = {
    minor: 'default', moderate: 'warning', serious: 'orange', critical: 'danger'
  }
  return <Badge variant={map[sev] ?? 'default'}>{sev}</Badge>
}

function breachStatusBadge(status: BreachRecord['status']) {
  const map: Record<string, 'default'|'warning'|'danger'|'success'|'blue'> = {
    open: 'danger', warned: 'warning', fined: 'orange' as 'warning', resolved: 'success', disputed: 'blue'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function categoryIcon(cat: string) {
  const map: Record<string, string> = {
    noise: '🔊', parking: '🚗', waste: '🗑', pets: '🐾',
    guests: '👥', common_areas: '🏊', property_damage: '🔨',
    subletting: '🏘', payments: '💵', safety: '⛑', other: '📌'
  }
  return map[cat] ?? '📌'
}

function BreachesTab() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<BreachRecord | null>(null)

  const filtered = BREACH_RECORDS.filter(b =>
    b.person_name.toLowerCase().includes(search.toLowerCase()) ||
    b.unit_label.toLowerCase().includes(search.toLowerCase()) ||
    b.rule_title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Search breach…" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(b => (
            <button key={b.id} onClick={() => setSelected(b)}
              className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === b.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-text">{b.rule_title}</span>
                {breachStatusBadge(b.status)}
              </div>
              <p className="text-xs text-text-muted">{b.unit_label} · {b.person_name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {severityBadge(b.severity)}
                <span className="text-xs text-text-muted">{b.incident_date}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-muted">No breaches found.</p>}
        </div>
      </div>

      <div className={cn('flex-1 flex flex-col', !selected && 'hidden lg:flex')}>
        {selected && (
          <div className="lg:hidden flex items-center px-4 pt-3 pb-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to list
            </button>
          </div>
        )}
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a breach record</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">{selected.rule_title}</h2>
                <p className="text-sm text-text-muted">{selected.unit_label} · {selected.person_name}</p>
              </div>
              <div className="flex gap-2">
                {severityBadge(selected.severity)}
                {breachStatusBadge(selected.status)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Incident Date',  value: selected.incident_date },
                { label: 'Reported By',    value: selected.reported_by },
                { label: 'Reported Date',  value: selected.reported_date },
                ...(selected.warning_issued_date ? [{ label: 'Warning Issued', value: `${selected.warning_issued_date} by ${selected.warning_issued_by}` }] : []),
                ...(selected.fine_amount ? [{ label: 'Fine Amount', value: `KES ${selected.fine_amount.toLocaleString()}` }] : []),
                ...(selected.resolved_date ? [{ label: 'Resolved', value: selected.resolved_date }] : []),
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted mb-1">Incident Description</p>
              <p className="text-sm text-text">{selected.description}</p>
            </div>

            {selected.resolution_notes && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">Resolution</p>
                <p className="text-sm text-green-800 dark:text-green-300">{selected.resolution_notes}</p>
              </div>
            )}

            {selected.notes && (
              <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                <p className="text-xs font-semibold text-text-muted mb-1">Notes</p>
                <p className="text-sm text-text">{selected.notes}</p>
              </div>
            )}

            {selected.status === 'open' || selected.status === 'warned' ? (
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100">Issue Fine</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100">Mark Resolved</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-surface text-text-muted border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-hover">Escalate</button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function RulesTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">House Rules Registry</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">+ Add Rule</button>
      </div>
      <div className="space-y-3">
        {HOUSE_RULES.map(rule => (
          <div key={rule.id} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{categoryIcon(rule.category)}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-text">{rule.title}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {severityBadge(rule.severity)}
                    <Badge variant={rule.active ? 'success' : 'default'}>{rule.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-1">{rule.description}</p>
                {rule.fine_amount && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
                    Default fine: KES {rule.fine_amount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RulesPageClient() {
  const open = BREACH_RECORDS.filter(b => b.status === 'open' || b.status === 'warned').length
  const fined = BREACH_RECORDS.filter(b => b.status === 'fined').length
  const resolved = BREACH_RECORDS.filter(b => b.status === 'resolved').length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Rules & Breaches" subtitle="House rules registry and breach management" />

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'House Rules',   value: HOUSE_RULES.filter(r => r.active).length, color: 'text-text' },
            { label: 'Open Breaches', value: open,    color: 'text-red-600' },
            { label: 'Fined',         value: fined,   color: 'text-amber-600' },
            { label: 'Resolved',      value: resolved, color: 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="breaches" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="breaches">Breach Records</TabsTrigger>
              <TabsTrigger value="rules">House Rules</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="breaches" className="flex flex-1 overflow-hidden min-h-0 mt-0"><BreachesTab /></TabsContent>
          <TabsContent value="rules"    className="flex flex-1 overflow-hidden min-h-0 mt-0"><RulesTab /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
