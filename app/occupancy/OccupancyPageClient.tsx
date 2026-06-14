'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { UNITS, LEASES } from '@/lib/mock-data'
import type { Unit } from '@/lib/types'

const BLOCKS = ['Block A', 'Block B', 'Block C']

function statusBadge(status: Unit['status']) {
  const map: Record<string, 'success'|'default'|'warning'|'blue'> = {
    occupied: 'success', vacant: 'default', maintenance: 'warning', reserved: 'blue'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function useTypeBadge(type: Unit['use_type']) {
  const map: Record<string, 'default'|'primary'|'warning'|'blue'|'purple'> = {
    residential: 'default', bnb: 'warning', commercial: 'blue', office: 'purple', vacant: 'default'
  }
  return <Badge variant={map[type] ?? 'default'}>{type}</Badge>
}

const daysUntilExpiry = (end: string) => Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)

export function OccupancyPageClient() {
  const [search, setSearch] = useState('')
  const [blockFilter, setBlockFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Unit | null>(null)

  const filtered = UNITS.filter(u => {
    const q = search.toLowerCase()
    const matchQ = u.number.toLowerCase().includes(q) || (u.current_occupant ?? '').toLowerCase().includes(q) || u.block.toLowerCase().includes(q)
    const matchB = blockFilter === 'all' || u.block === blockFilter
    const matchS = statusFilter === 'all' || u.status === statusFilter
    return matchQ && matchB && matchS
  })

  const occupied = UNITS.filter(u => u.status === 'occupied').length
  const vacant = UNITS.filter(u => u.status === 'vacant').length
  const maintenance = UNITS.filter(u => u.status === 'maintenance').length
  const occupancyRate = Math.round((occupied / UNITS.length) * 100)

  const selectedLease = selected ? LEASES.find(l => l.unit_id === selected.id && l.status === 'active') : null
  const leaseDays = selectedLease ? daysUntilExpiry(selectedLease.end_date) : null

  // Block breakdown
  const blockStats = BLOCKS.map(block => {
    const blockUnits = UNITS.filter(u => u.block === block)
    const occ = blockUnits.filter(u => u.status === 'occupied').length
    return { block, total: blockUnits.length, occupied: occ, pct: Math.round((occ / blockUnits.length) * 100) }
  })

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Occupancy" subtitle="Unit status, vacancy management and lease overview" />

        {/* KPI strip */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          <div className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-primary-600">{occupancyRate}%</p>
            <p className="text-xs text-text-muted">Occupancy Rate</p>
          </div>
          <div className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-green-600">{occupied}</p>
            <p className="text-xs text-text-muted">Occupied</p>
          </div>
          <div className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-text">{vacant}</p>
            <p className="text-xs text-text-muted">Vacant</p>
          </div>
          <div className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{maintenance}</p>
            <p className="text-xs text-text-muted">Under Maintenance</p>
          </div>
          {/* Block occupancy mini-chart */}
          <div className="flex-[2] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <p className="text-xs font-semibold text-text-muted mb-2">By Block</p>
            <div className="space-y-1.5">
              {blockStats.map(bs => (
                <div key={bs.block} className="flex items-center gap-2 text-xs">
                  <span className="w-14 text-text-muted">{bs.block}</span>
                  <div className="flex-1 h-2 bg-surface-border dark:bg-dark-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${bs.pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-text font-medium">{bs.occupied}/{bs.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* filter + grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 flex gap-3 border-b border-surface-border dark:border-dark-border sticky top-0 bg-surface dark:bg-dark-surface z-10">
              <SearchInput value={search} onChange={setSearch} placeholder="Search unit or occupant…" />
              <select value={blockFilter} onChange={e => setBlockFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="all">All Blocks</option>
                {BLOCKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="all">All Status</option>
                <option value="occupied">Occupied</option>
                <option value="vacant">Vacant</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(unit => (
                <button key={unit.id} onClick={() => setSelected(unit)}
                  className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                    selected?.id === unit.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : unit.status === 'occupied'
                      ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                      : unit.status === 'vacant'
                      ? 'border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface'
                      : unit.status === 'maintenance'
                      ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                      : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-text">{unit.block.replace('Block ','')} · {unit.number}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      unit.status === 'occupied' ? 'bg-green-500' :
                      unit.status === 'vacant' ? 'bg-gray-400' :
                      unit.status === 'maintenance' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  </div>
                  <p className="text-xs text-text-muted">{unit.bedrooms}BR · {unit.size_sqm}m²</p>
                  <p className="text-xs font-medium text-text mt-1">
                    {unit.status === 'occupied' ? unit.current_occupant : unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">KES {unit.monthly_rate.toLocaleString()}/mo</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-4 py-12 text-center text-sm text-text-muted">No units match your filters.</p>
              )}
            </div>
          </div>

          {/* detail panel */}
          {selected && (
            <div className={cn('flex-shrink-0 border-l border-surface-border dark:border-dark-border overflow-y-auto bg-surface dark:bg-dark-surface', selected ? 'w-full lg:w-72' : 'hidden lg:block lg:w-72')}>
              <div className="p-4 border-b border-surface-border dark:border-dark-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">{selected.block} · Unit {selected.number}</h3>
                <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text text-lg">✕</button>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {statusBadge(selected.status)}
                  {useTypeBadge(selected.use_type)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Bedrooms',    value: `${selected.bedrooms} BR` },
                    { label: 'Bathrooms',   value: `${selected.bathrooms} BA` },
                    { label: 'Size',        value: `${selected.size_sqm} m²` },
                    { label: 'Monthly Rate', value: `KES ${selected.monthly_rate.toLocaleString()}` },
                  ].map(f => (
                    <div key={f.label} className="bg-surface-hover dark:bg-dark-hover rounded-lg p-2.5">
                      <p className="text-[10px] text-text-muted">{f.label}</p>
                      <p className="text-sm font-medium text-text">{f.value}</p>
                    </div>
                  ))}
                </div>

                {selected.status === 'occupied' && selectedLease && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-2">Active Lease</p>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1">
                      <p className="text-sm font-medium text-text">{selectedLease.tenant_name}</p>
                      <p className="text-xs text-text-muted">{selectedLease.start_date} → {selectedLease.end_date}</p>
                      {leaseDays !== null && leaseDays < 90 && leaseDays > 0 && (
                        <p className="text-xs text-amber-600 font-medium">Expires in {leaseDays} days</p>
                      )}
                      <p className="text-xs text-text-muted">Rent: KES {selectedLease.monthly_rent.toLocaleString()}/mo</p>
                    </div>
                  </div>
                )}

                {selected.status === 'vacant' && (
                  <div className="bg-surface-hover dark:bg-dark-hover rounded-lg p-3">
                    <p className="text-xs font-semibold text-text-muted mb-1">Vacancy Actions</p>
                    <div className="space-y-1.5">
                      <button className="w-full px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-left">
                        📋 Create Lease Application
                      </button>
                      <button className="w-full px-3 py-1.5 text-xs font-medium bg-surface border border-surface-border dark:border-dark-border text-text-muted rounded-lg hover:bg-surface-hover text-left">
                        📅 Schedule Viewing
                      </button>
                    </div>
                  </div>
                )}

                {selected.owners.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-text-muted mb-2">Owners</p>
                    {selected.owners.map(o => (
                      <div key={o.person_id} className="flex items-center justify-between text-sm py-1">
                        <span className="text-text">{o.name}</span>
                        <span className="text-xs text-text-muted">{o.share_percent}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  )
}
