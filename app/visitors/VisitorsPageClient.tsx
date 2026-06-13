'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { VISITORS, VISITOR_PASSES, GATE_LOGS } from '@/lib/mock-data'
import type { Visitor } from '@/lib/types'

function visitorStatusBadge(status: Visitor['status']) {
  const map: Record<string, 'default'|'blue'|'success'|'danger'> = {
    expected: 'blue', signed_in: 'success', signed_out: 'default', denied: 'danger'
  }
  return <Badge variant={map[status] ?? 'default'}>{status.replace('_',' ')}</Badge>
}

function purposeIcon(purpose: Visitor['purpose']) {
  const map: Record<string, string> = {
    personal_visit: '👤', delivery: '📦', contractor: '🔧',
    viewing: '👁', event: '🎉', service: '🛠', other: '❓'
  }
  return map[purpose] ?? '❓'
}

function VisitorLog() {
  const [search, setSearch] = useState('')
  const filtered = VISITORS.filter(v =>
    v.full_name.toLowerCase().includes(search.toLowerCase()) ||
    v.host_unit_label.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      <div className="mb-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search visitor or unit…" />
      </div>
      {filtered.map(v => (
        <div key={v.id} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="text-xl mt-0.5">{purposeIcon(v.purpose)}</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{v.full_name}</span>
                  {v.is_pre_registered && <Badge variant="blue">Pre-reg</Badge>}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Host: <span className="font-medium">{v.host_name}</span> · {v.host_unit_label}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                  <span>{v.purpose.replace('_',' ')}</span>
                  {v.vehicle_plate && <span>🚗 {v.vehicle_plate}</span>}
                  {v.time_in && <span>In: {v.time_in}</span>}
                  {v.time_out && <span>Out: {v.time_out}</span>}
                </div>
                {v.denied_reason && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{v.denied_reason}</p>
                )}
                {v.notes && (
                  <p className="text-xs text-text-muted italic mt-1">{v.notes}</p>
                )}
              </div>
            </div>
            {visitorStatusBadge(v.status)}
          </div>
        </div>
      ))}
    </div>
  )
}

function PremiumBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl">⭐</span>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Premium Feature</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Visitor passes and advanced gate controls are available on the Premium plan. Upgrade to enable QR passes, recurring access profiles, and automated gate integration.
          </p>
          <button className="mt-2 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors">
            Upgrade to Premium
          </button>
        </div>
      </div>
      {children}
    </div>
  )
}

function VisitorPasses() {
  return (
    <PremiumBanner>
      <div className="space-y-3">
        {VISITOR_PASSES.map(pass => (
          <div key={pass.id} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-text">{pass.visitor_name}</p>
                <p className="text-xs text-text-muted">{pass.host_unit_label}</p>
                <p className="text-xs text-text-muted mt-1">
                  {pass.pass_type.replace('_',' ')} · Valid {pass.valid_from} → {pass.valid_until}
                </p>
                {pass.access_hours_start && (
                  <p className="text-xs text-text-muted">Access: {pass.access_hours_start}–{pass.access_hours_end}</p>
                )}
                {pass.max_uses && (
                  <p className="text-xs text-text-muted">Uses: {pass.used_count}/{pass.max_uses}</p>
                )}
                {pass.notes && <p className="text-xs text-text-muted italic mt-1">{pass.notes}</p>}
              </div>
              <Badge variant={pass.active ? 'success' : 'default'}>{pass.active ? 'Active' : 'Inactive'}</Badge>
            </div>
          </div>
        ))}
      </div>
    </PremiumBanner>
  )
}

function GateActivity() {
  return (
    <PremiumBanner>
      <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover dark:bg-dark-hover">
            <tr>
              {['Time','Person','Type','Unit','Vehicle','Method','Direction'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {GATE_LOGS.map(log => (
              <tr key={log.id} className="hover:bg-surface-hover dark:hover:bg-dark-hover">
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.timestamp.slice(11,16)}</td>
                <td className="px-4 py-2.5 text-text font-medium">{log.person_name}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={log.person_type === 'resident' ? 'success' : log.person_type === 'visitor' ? 'blue' : 'default'}>
                    {log.person_type}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.unit_label ?? '—'}</td>
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.vehicle_plate ?? '—'}</td>
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.method}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={log.direction === 'entry' ? 'success' : 'default'}>
                    {log.direction === 'entry' ? '→ In' : '← Out'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PremiumBanner>
  )
}

export function VisitorsPageClient() {
  const today = VISITORS.filter(v => v.status === 'signed_in').length
  const expected = VISITORS.filter(v => v.status === 'expected').length
  const denied = VISITORS.filter(v => v.status === 'denied').length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Visitors" subtitle="Gate access, visitor log and pre-registration" />

        {/* KPIs */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Currently Inside', value: today,    color: 'text-green-600' },
            { label: 'Expected Today',   value: expected, color: 'text-blue-600' },
            { label: 'Denied Entry',     value: denied,   color: 'text-red-600' },
            { label: 'Active Passes',    value: VISITOR_PASSES.filter(p => p.active).length, color: 'text-primary-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="log" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="log">Visitor Log</TabsTrigger>
              <TabsTrigger value="passes">Visitor Passes <span className="ml-1 text-[10px] font-bold text-amber-600">PRO</span></TabsTrigger>
              <TabsTrigger value="gate">Gate Activity <span className="ml-1 text-[10px] font-bold text-amber-600">PRO</span></TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="log"   className="flex flex-col flex-1 overflow-hidden min-h-0 mt-0"><VisitorLog /></TabsContent>
          <TabsContent value="passes" className="flex flex-col flex-1 overflow-hidden min-h-0 mt-0"><VisitorPasses /></TabsContent>
          <TabsContent value="gate"  className="flex flex-col flex-1 overflow-hidden min-h-0 mt-0"><GateActivity /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
