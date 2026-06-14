'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { WORK_ORDERS } from '@/lib/mock-data'
import type { WorkOrder } from '@/lib/types'

function statusBadge(status: WorkOrder['status']) {
  const map: Record<string, 'danger'|'warning'|'success'|'default'> = {
    open: 'danger', in_progress: 'warning', completed: 'success', cancelled: 'default'
  }
  return <Badge variant={map[status] ?? 'default'}>{status.replace('_',' ')}</Badge>
}

function priorityBadge(priority: WorkOrder['priority']) {
  const map: Record<string, 'danger'|'warning'|'default'|'blue'> = {
    urgent: 'danger', high: 'warning', medium: 'blue', low: 'default'
  }
  return <Badge variant={map[priority] ?? 'default'}>{priority}</Badge>
}

function categoryIcon(cat: string) {
  const map: Record<string, string> = {
    plumbing: '🚿', electrical: '⚡', hvac: '🌡', structural: '🧱',
    appliance: '🫙', pest_control: '🪲', cleaning: '🧹', security: '🔐',
    painting: '🎨', landscaping: '🌿', other: '🔧'
  }
  return map[cat.toLowerCase()] ?? '🔧'
}

const PREVENTIVE_SCHEDULES = [
  { id: 'PVT-001', title: 'Fire Extinguisher Inspection',  category: 'Safety',    frequency: 'bi_annual', next_due: '2024-07-01', assigned_to: 'FireSafe Ltd',     estimated_cost: 15000 },
  { id: 'PVT-002', title: 'Elevator Service & Safety Check', category: 'Elevator', frequency: 'annual',   next_due: '2024-12-01', assigned_to: 'LiftTech Kenya',   estimated_cost: 45000 },
  { id: 'PVT-003', title: 'Water Tank Cleaning & Flush',   category: 'Plumbing',  frequency: 'quarterly',  next_due: '2024-07-15', assigned_to: 'James Mwenye',    estimated_cost: 8000 },
  { id: 'PVT-004', title: 'Generator Servicing',           category: 'Electrical',frequency: 'quarterly',  next_due: '2024-08-01', assigned_to: 'PowerGen Ltd',    estimated_cost: 12000 },
  { id: 'PVT-005', title: 'Roof & Drainage Inspection',   category: 'Structural', frequency: 'bi_annual', next_due: '2024-09-01', assigned_to: 'James Mwenye',    estimated_cost: 5000 },
  { id: 'PVT-006', title: 'Pest Control Treatment',       category: 'Pest',       frequency: 'quarterly',  next_due: '2024-06-30', assigned_to: 'KillerPest Ltd',  estimated_cost: 18000 },
]

function WorkOrdersTab() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selected, setSelected] = useState<WorkOrder | null>(null)

  const filtered = WORK_ORDERS.filter(wo => {
    const q = search.toLowerCase()
    const matchQ = wo.title.toLowerCase().includes(q) || wo.unit_label.toLowerCase().includes(q)
    const matchS = statusFilter === 'all' || wo.status === statusFilter
    const matchP = priorityFilter === 'all' || wo.priority === priorityFilter
    return matchQ && matchS && matchP
  })

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* list */}
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 space-y-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search work orders…" />
            </div>
            <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 whitespace-nowrap">
              + New
            </button>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onChange={setStatusFilter} options={[
              { value: 'all', label: 'All status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} />
            <Select value={priorityFilter} onChange={setPriorityFilter} options={[
              { value: 'all', label: 'All priority' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(wo => (
            <button key={wo.id} onClick={() => setSelected(wo)}
              className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === wo.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-text flex items-center gap-1.5">
                  <span>{categoryIcon(wo.category)}</span>
                  <span className="truncate">{wo.title}</span>
                </span>
                {statusBadge(wo.status)}
              </div>
              <p className="text-xs text-text-muted">{wo.unit_label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {priorityBadge(wo.priority)}
                <span className="text-xs text-text-muted">{wo.created_at.slice(0,10)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="py-8 text-sm text-text-muted text-center">No work orders found.</p>}
        </div>
      </div>

      {/* detail */}
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
          <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a work order to view</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{categoryIcon(selected.category)}</span>
                  <h2 className="text-lg font-semibold text-text">{selected.title}</h2>
                </div>
                <p className="text-sm text-text-muted">{selected.unit_label} · {selected.id}</p>
              </div>
              <div className="flex gap-1.5">
                {priorityBadge(selected.priority)}
                {statusBadge(selected.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Category',    value: selected.category },
                { label: 'Reported By', value: selected.reported_by },
                { label: 'Created',     value: selected.created_at.slice(0,10) },
                { label: 'Assigned To', value: selected.assigned_to ?? 'Unassigned' },
                ...(selected.resolved_at ? [{ label: 'Resolved', value: selected.resolved_at.slice(0,10) }] : []),
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text capitalize">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted mb-1">Description</p>
              <p className="text-sm text-text">{selected.description}</p>
            </div>

            {/* status flow */}
            <div>
              <p className="text-xs font-semibold text-text-muted mb-3">Status Timeline</p>
              <div className="flex items-center gap-2">
                {(['open','in_progress','completed'] as const).map((s, i) => {
                  const statusOrder = ['open','in_progress','completed','cancelled']
                  const currentIdx = statusOrder.indexOf(selected.status)
                  const stepIdx = statusOrder.indexOf(s)
                  const isPast = stepIdx < currentIdx
                  const isCurrent = s === selected.status
                  return (
                    <>
                      {i > 0 && <div className={`flex-1 h-0.5 ${isPast || isCurrent ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        isCurrent ? 'bg-primary-500 border-primary-500 text-white' :
                        isPast ? 'bg-primary-100 border-primary-300 text-primary-700' :
                        'bg-surface border-surface-border dark:border-dark-border text-text-muted dark:bg-dark-surface'
                      }`} title={s.replace('_',' ')}>
                        {i + 1}
                      </div>
                    </>
                  )
                })}
              </div>
              <div className="flex justify-between mt-1 text-xs text-text-muted px-1">
                <span>Open</span><span className="ml-8">In Progress</span><span>Completed</span>
              </div>
            </div>

            {selected.status !== 'completed' && selected.status !== 'cancelled' && (
              <div className="flex gap-2">
                {selected.status === 'open' && (
                  <button className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Assign & Start</button>
                )}
                {selected.status === 'in_progress' && (
                  <button className="px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">Mark Complete</button>
                )}
                <button className="px-4 py-1.5 text-sm font-medium text-text-muted border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-hover">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PreventiveTab() {
  const freqColor: Record<string, string> = {
    weekly: 'text-red-600', monthly: 'text-orange-600', quarterly: 'text-amber-600',
    bi_annual: 'text-blue-600', annual: 'text-primary-600'
  }

  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Preventive Maintenance Schedules</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">+ Add Schedule</button>
      </div>
      <div className="space-y-3">
        {PREVENTIVE_SCHEDULES.map(s => {
          const days = daysUntil(s.next_due)
          return (
            <div key={s.id} className={`bg-surface border rounded-xl p-4 dark:bg-dark-surface ${days <= 14 ? 'border-amber-300 dark:border-amber-700' : 'border-surface-border dark:border-dark-border'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text">{s.title}</p>
                    {days <= 14 && days > 0 && <Badge variant="warning">Due Soon</Badge>}
                    {days <= 0 && <Badge variant="danger">Overdue</Badge>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{s.category} · {s.assigned_to}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs">
                    <span className={`font-medium ${freqColor[s.frequency] ?? 'text-text-muted'}`}>{s.frequency.replace('_',' ')}</span>
                    <span className="text-text-muted">Next due: <span className="font-medium text-text">{s.next_due}</span></span>
                    <span className="text-text-muted">Est: <span className="font-medium text-text">KES {s.estimated_cost.toLocaleString()}</span></span>
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs font-medium bg-surface-hover dark:bg-dark-hover border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-border text-text-muted">
                  Log Done
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MaintenancePageClient() {
  const open = WORK_ORDERS.filter(wo => wo.status === 'open').length
  const inProgress = WORK_ORDERS.filter(wo => wo.status === 'in_progress').length
  const urgent = WORK_ORDERS.filter(wo => wo.priority === 'urgent' && wo.status !== 'completed').length
  const completed = WORK_ORDERS.filter(wo => wo.status === 'completed').length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Maintenance" subtitle="Work orders, repairs and preventive maintenance" />

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Open',        value: open,       color: 'text-red-600' },
            { label: 'In Progress', value: inProgress, color: 'text-amber-600' },
            { label: 'Urgent',      value: urgent,     color: 'text-red-600' },
            { label: 'Completed',   value: completed,  color: 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="work-orders" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
              <TabsTrigger value="preventive">Preventive Schedule</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="work-orders" className="flex flex-1 overflow-hidden min-h-0 mt-0"><WorkOrdersTab /></TabsContent>
          <TabsContent value="preventive"  className="flex flex-1 overflow-hidden min-h-0 mt-0"><PreventiveTab /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
