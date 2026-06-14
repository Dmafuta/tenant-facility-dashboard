'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { INSPECTIONS } from '@/lib/mock-data'
import type { Inspection, InspectionDefect } from '@/lib/types'

const CONDITION_LABELS = ['','Poor','Fair','Average','Good','Excellent']
const CONDITION_COLORS = ['','text-red-600','text-orange-600','text-amber-600','text-blue-600','text-green-600']

function statusBadge(status: Inspection['status']) {
  const map: Record<string, 'default'|'blue'|'warning'|'success'> = {
    scheduled: 'blue', in_progress: 'warning', completed: 'success', signed_off: 'success'
  }
  return <Badge variant={map[status] ?? 'default'}>{status.replace('_',' ')}</Badge>
}

function typeBadge(type: Inspection['inspection_type']) {
  const map: Record<string, 'default'|'success'|'warning'|'blue'> = {
    move_in: 'success', move_out: 'warning', periodic: 'blue', defect_check: 'default'
  }
  return <Badge variant={map[type] ?? 'default'}>{type.replace('_',' ')}</Badge>
}

function severityBadge(sev: InspectionDefect['severity']) {
  const map: Record<string, 'default'|'warning'|'danger'|'orange'> = {
    minor: 'default', moderate: 'warning', major: 'orange', critical: 'danger'
  }
  return <Badge variant={map[sev] ?? 'default'}>{sev}</Badge>
}

function ConditionBar({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`h-2 w-6 rounded-sm ${i <= rating ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`} />
        ))}
      </div>
      <span className={`text-xs font-medium ${CONDITION_COLORS[rating]}`}>
        {CONDITION_LABELS[rating]}
      </span>
    </div>
  )
}

export function InspectionsPageClient() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Inspection | null>(null)

  const filtered = INSPECTIONS.filter(ins => {
    const q = search.toLowerCase()
    const matchQ = ins.unit_label.toLowerCase().includes(q) || ins.inspector_name.toLowerCase().includes(q)
    const matchT = typeFilter === 'all' || ins.inspection_type === typeFilter
    const matchS = statusFilter === 'all' || ins.status === statusFilter
    return matchQ && matchT && matchS
  })

  const totalDefects = selected?.rooms.reduce((acc, r) => acc + r.defects.length, 0) ?? 0
  const chargeableAmount = selected?.rooms.flatMap(r => r.defects).filter(d => d.chargeable).reduce((acc, d) => acc + (d.estimated_cost ?? 0), 0) ?? 0

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Inspections" subtitle="Unit condition assessments and defect tracking" />

        {/* KPIs */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Scheduled',   value: INSPECTIONS.filter(i => i.status === 'scheduled').length,   color: 'text-blue-600' },
            { label: 'In Progress', value: INSPECTIONS.filter(i => i.status === 'in_progress').length, color: 'text-amber-600' },
            { label: 'Completed',   value: INSPECTIONS.filter(i => i.status === 'completed').length,   color: 'text-green-600' },
            { label: 'Open Defects',value: INSPECTIONS.flatMap(i => i.rooms).flatMap(r => r.defects).filter(d => d.status === 'open').length, color: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* list */}
          <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
            <div className="p-3 space-y-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
              <SearchInput value={search} onChange={setSearch} placeholder="Search unit or inspector…" />
              <div className="flex gap-2">
                <Select value={typeFilter} onChange={setTypeFilter} options={[
                  { value: 'all', label: 'All types' },
                  { value: 'move_in', label: 'Move-in' },
                  { value: 'move_out', label: 'Move-out' },
                  { value: 'periodic', label: 'Periodic' },
                  { value: 'defect_check', label: 'Defect' },
                ]} />
                <Select value={statusFilter} onChange={setStatusFilter} options={[
                  { value: 'all', label: 'All status' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                ]} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(ins => (
                <button key={ins.id} onClick={() => setSelected(ins)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === ins.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-text">{ins.unit_label}</span>
                    {statusBadge(ins.status)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {typeBadge(ins.inspection_type)}
                    <span className="text-xs text-text-muted">{ins.scheduled_date}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{ins.inspector_name}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-text-muted text-center py-8">No inspections found.</p>}
            </div>
          </div>

          {/* detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">Select an inspection to view</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text">{selected.unit_label}</h2>
                    <p className="text-sm text-text-muted">{selected.id} · {selected.inspection_type.replace('_',' ')} · {selected.scheduled_date}</p>
                  </div>
                  <div className="flex gap-2">{typeBadge(selected.inspection_type)}{statusBadge(selected.status)}</div>
                </div>

                {/* summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-1">Overall Condition</p>
                    <ConditionBar rating={selected.overall_condition} />
                  </div>
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-0.5">Inspector</p>
                    <p className="text-sm font-medium text-text">{selected.inspector_name}</p>
                  </div>
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                    <p className="text-xs text-text-muted mb-0.5">Resident Present</p>
                    <p className="text-sm font-medium text-text">{selected.resident_present ? selected.resident_name ?? 'Yes' : 'No'}</p>
                  </div>
                  {totalDefects > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-0.5">Defects / Chargeable</p>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{totalDefects} defects · KES {chargeableAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* rooms */}
                {selected.rooms.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-text mb-3">Room Assessments</h3>
                    <div className="space-y-3">
                      {selected.rooms.map(room => (
                        <div key={room.name} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-text">{room.name}</span>
                            <ConditionBar rating={room.condition} />
                          </div>
                          {room.notes && <p className="text-xs text-text-muted mb-2">{room.notes}</p>}
                          {room.defects.length > 0 && (
                            <div className="space-y-1.5 mt-2 pt-2 border-t border-surface-border dark:border-dark-border">
                              {room.defects.map(d => (
                                <div key={d.id} className="flex items-start gap-2 text-xs">
                                  {severityBadge(d.severity)}
                                  <span className="text-text flex-1">{d.description}</span>
                                  {d.chargeable && d.estimated_cost && (
                                    <span className="text-red-600 font-medium flex-shrink-0">KES {d.estimated_cost.toLocaleString()}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.general_notes && (
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                    <p className="text-xs font-semibold text-text-muted mb-1">General Notes</p>
                    <p className="text-sm text-text">{selected.general_notes}</p>
                  </div>
                )}

                {selected.signed_off_date && (
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                    <span>✅</span>
                    <span>Signed off by {selected.signed_off_by} on {selected.signed_off_date}</span>
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
