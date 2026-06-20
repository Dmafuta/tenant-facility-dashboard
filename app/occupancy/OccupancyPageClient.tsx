'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { cn } from '@/lib/cn'
import { getUnitsFromApi } from '@/lib/api/units'
import { getAllLeases } from '@/lib/api/leases'
import type { UnitData } from '@/lib/api/units'
import type { LeaseData } from '@/lib/api/leases'

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; card: string; badge: 'success' | 'default' | 'warning' | 'blue' }> = {
  occupied:    { label: 'Occupied',    dot: 'bg-green-500',  card: 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10',   badge: 'success' },
  vacant:      { label: 'Vacant',      dot: 'bg-gray-400',   card: 'border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface', badge: 'default' },
  renovation:  { label: 'Renovation',  dot: 'bg-amber-500',  card: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10',   badge: 'warning' },
  reserved:    { label: 'Reserved',    dot: 'bg-blue-500',   card: 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10',       badge: 'blue'    },
  off_market:  { label: 'Off Market',  dot: 'bg-gray-500',   card: 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10',       badge: 'default' },
}

const UNIT_TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartment', studio: 'Studio', penthouse: 'Penthouse',
  commercial: 'Commercial', shop: 'Shop', office: 'Office',
  bnb: 'BnB', parking_bay: 'Parking', storage_room: 'Storage',
  staff_quarter: 'Staff Qtr',
}

function effectiveStatus(u: UnitData): string {
  if (u.current_occupant) return 'occupied'
  return u.status ?? 'vacant'
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function unitSpecs(u: UnitData): string {
  const parts: string[] = []
  if (u.bedrooms)       parts.push(`${u.bedrooms} BR`)
  if (u.bathrooms)      parts.push(`${u.bathrooms} BA`)
  if (u.floor_area_sqm) parts.push(`${u.floor_area_sqm} m²`)
  if (u.parking_bays)   parts.push(`${u.parking_bays} parking`)
  return parts.join(' · ') || UNIT_TYPE_LABELS[u.unit_type] ?? u.unit_type
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-surface-border dark:bg-dark-border rounded', className)} />
}

// ── Main page ────────────────────────────────────────────────────────────────

export function OccupancyPageClient() {
  const [units,   setUnits]   = useState<UnitData[]>([])
  const [leases,  setLeases]  = useState<LeaseData[]>([])
  const [loading, setLoading] = useState(true)

  const [search,       setSearch]       = useState('')
  const [blockFilter,  setBlockFilter]  = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected,     setSelected]     = useState<UnitData | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [u, l] = await Promise.all([getUnitsFromApi(), getAllLeases('active')])
      setUnits(u)
      setLeases(l)
    } catch {
      // silently keep empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Active lease index by unit_id
  const leaseByUnit = useMemo(() => {
    const map = new Map<string, LeaseData>()
    leases.forEach(l => { if (l.unit_id) map.set(l.unit_id, l) })
    return map
  }, [leases])

  // Derived values
  const blocks = useMemo(() => {
    const set = new Set(units.map(u => u.block).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [units])

  const counts = useMemo(() => {
    const occupied   = units.filter(u => effectiveStatus(u) === 'occupied').length
    const vacant     = units.filter(u => effectiveStatus(u) === 'vacant').length
    const renovation = units.filter(u => effectiveStatus(u) === 'renovation').length
    const reserved   = units.filter(u => effectiveStatus(u) === 'reserved').length
    const rate = units.length ? Math.round((occupied / units.length) * 100) : 0
    return { occupied, vacant, renovation, reserved, rate, total: units.length }
  }, [units])

  const blockStats = useMemo(() => blocks.map(block => {
    const bu  = units.filter(u => u.block === block)
    const occ = bu.filter(u => effectiveStatus(u) === 'occupied').length
    return { block, total: bu.length, occupied: occ, pct: bu.length ? Math.round((occ / bu.length) * 100) : 0 }
  }), [units, blocks])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return units.filter(u => {
      const es = effectiveStatus(u)
      const matchQ = !q ||
        u.unit_label.toLowerCase().includes(q) ||
        (u.current_occupant ?? '').toLowerCase().includes(q) ||
        (u.block ?? '').toLowerCase().includes(q)
      const matchB = blockFilter  === 'all' || u.block === blockFilter
      const matchS = statusFilter === 'all' || es === statusFilter
      return matchQ && matchB && matchS
    })
  }, [units, search, blockFilter, statusFilter])

  const selectedLease = selected ? leaseByUnit.get(selected.id) ?? null : null
  const leaseDays     = selectedLease ? daysUntil(selectedLease.end_date) : null

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Occupancy" subtitle="Unit status, vacancy management and lease overview" />

        {/* KPI strip */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0 overflow-x-auto">
          {loading ? (
            <>
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="flex-1 min-w-[120px] h-[72px]" />)}
            </>
          ) : (
            <>
              <div className="flex-1 min-w-[110px] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
                <p className="text-2xl font-bold text-primary-600">{counts.rate}%</p>
                <p className="text-xs text-text-muted">Occupancy Rate</p>
                <p className="text-[11px] text-text-muted mt-0.5">{counts.occupied} of {counts.total} units</p>
              </div>
              <div className="flex-1 min-w-[110px] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
                <p className="text-2xl font-bold text-green-600">{counts.occupied}</p>
                <p className="text-xs text-text-muted">Occupied</p>
              </div>
              <div className="flex-1 min-w-[110px] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
                <p className="text-2xl font-bold text-text">{counts.vacant}</p>
                <p className="text-xs text-text-muted">Vacant</p>
              </div>
              <div className="flex-1 min-w-[110px] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
                <p className="text-2xl font-bold text-amber-600">{counts.renovation}</p>
                <p className="text-xs text-text-muted">Renovation</p>
              </div>
              <div className="flex-1 min-w-[110px] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
                <p className="text-2xl font-bold text-blue-600">{counts.reserved}</p>
                <p className="text-xs text-text-muted">Reserved</p>
              </div>
              {blockStats.length > 0 && (
                <div className="flex-[2] min-w-[180px] bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
                  <p className="text-xs font-semibold text-text-muted mb-2">By Block</p>
                  <div className="space-y-1.5">
                    {blockStats.map(bs => (
                      <div key={bs.block} className="flex items-center gap-2 text-xs">
                        <span className="w-16 truncate text-text-muted">{bs.block}</span>
                        <div className="flex-1 h-2 bg-surface-border dark:bg-dark-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${bs.pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-text font-medium shrink-0">{bs.occupied}/{bs.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Filter + grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 flex flex-wrap gap-3 border-b border-surface-border dark:border-dark-border sticky top-0 bg-surface dark:bg-dark-surface z-10">
              <SearchInput value={search} onChange={setSearch} placeholder="Search unit or occupant…" containerClassName="w-56" />
              <select
                value={blockFilter}
                onChange={e => setBlockFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Blocks</option>
                {blocks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="occupied">Occupied</option>
                <option value="vacant">Vacant</option>
                <option value="renovation">Renovation</option>
                <option value="reserved">Reserved</option>
                <option value="off_market">Off Market</option>
              </select>
              <p className="ml-auto self-center text-xs text-text-muted">{filtered.length} unit{filtered.length !== 1 ? 's' : ''}</p>
            </div>

            {loading ? (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map(unit => {
                  const es  = effectiveStatus(unit)
                  const cfg = STATUS_CONFIG[es] ?? STATUS_CONFIG.vacant
                  return (
                    <button
                      key={unit.id}
                      onClick={() => setSelected(prev => prev?.id === unit.id ? null : unit)}
                      className={cn(
                        'text-left rounded-xl border p-4 transition-all hover:shadow-md',
                        selected?.id === unit.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-400'
                          : cfg.card
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-text truncate pr-1">{unit.unit_label}</span>
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                      </div>
                      {unit.block && (
                        <p className="text-[11px] text-text-muted mb-0.5">{unit.block}</p>
                      )}
                      <p className="text-xs text-text-muted">{unitSpecs(unit)}</p>
                      <p className="text-xs font-medium text-text mt-1 truncate">
                        {es === 'occupied'
                          ? (unit.current_occupant ?? leaseByUnit.get(unit.id)?.tenant_name ?? 'Occupied')
                          : cfg.label}
                      </p>
                      {unit.asking_rent != null && (
                        <p className="text-xs text-text-muted mt-0.5">KES {unit.asking_rent.toLocaleString()}/mo</p>
                      )}
                    </button>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <p className="col-span-4 py-16 text-center text-sm text-text-muted">No units match your filters.</p>
                )}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (() => {
            const es  = effectiveStatus(selected)
            const cfg = STATUS_CONFIG[es] ?? STATUS_CONFIG.vacant
            return (
              <div className="w-72 shrink-0 border-l border-surface-border dark:border-dark-border overflow-y-auto bg-surface dark:bg-dark-surface flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b border-surface-border dark:border-dark-border flex items-center justify-between shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-text">{selected.unit_label}</p>
                    {selected.block && <p className="text-xs text-text-muted">{selected.block}</p>}
                  </div>
                  <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
                </div>

                <div className="p-4 space-y-4 flex-1">
                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    <Badge variant="default">{UNIT_TYPE_LABELS[selected.unit_type] ?? selected.unit_type}</Badge>
                    {selected.floor && <Badge variant="default">Floor {selected.floor}</Badge>}
                  </div>

                  {/* Specs grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      selected.bedrooms       != null && { label: 'Bedrooms',   value: `${selected.bedrooms} BR` },
                      selected.bathrooms      != null && { label: 'Bathrooms',  value: `${selected.bathrooms} BA` },
                      selected.floor_area_sqm != null && { label: 'Size',       value: `${selected.floor_area_sqm} m²` },
                      selected.asking_rent    != null && { label: 'Asking Rent', value: `KES ${selected.asking_rent.toLocaleString()}` },
                      selected.parking_bays   != null && { label: 'Parking',    value: `${selected.parking_bays} bay${selected.parking_bays !== 1 ? 's' : ''}` },
                      selected.furnished      != null && { label: 'Furnished',   value: selected.furnished },
                    ].filter(Boolean).map((f: { label: string; value: string }) => (
                      <div key={f.label} className="bg-surface-hover dark:bg-dark-hover rounded-lg p-2.5">
                        <p className="text-[10px] text-text-muted">{f.label}</p>
                        <p className="text-sm font-medium text-text capitalize">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Active lease */}
                  {selectedLease && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-2">Active Lease</p>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1.5">
                        <p className="text-sm font-semibold text-text">{selectedLease.tenant_name ?? '—'}</p>
                        <p className="text-xs text-text-muted">
                          {selectedLease.start_date} → {selectedLease.end_date ?? 'Open-ended'}
                        </p>
                        {leaseDays !== null && leaseDays <= 90 && leaseDays > 0 && (
                          <p className="text-xs font-medium text-amber-600">Expires in {leaseDays} days</p>
                        )}
                        {leaseDays !== null && leaseDays <= 0 && (
                          <p className="text-xs font-medium text-danger">Lease expired</p>
                        )}
                        {selectedLease.monthly_rent != null && (
                          <p className="text-xs text-text-muted">KES {selectedLease.monthly_rent.toLocaleString()}/mo</p>
                        )}
                        {selectedLease.billing_cycle && (
                          <p className="text-xs text-text-muted capitalize">Billing: {selectedLease.billing_cycle}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Occupant info when occupied but no lease found */}
                  {es === 'occupied' && !selectedLease && selected.current_occupant && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-2">Current Occupant</p>
                      <div className="bg-surface-hover dark:bg-dark-hover rounded-lg p-3">
                        <p className="text-sm font-medium text-text">{selected.current_occupant}</p>
                        <p className="text-xs text-text-muted mt-0.5">No active lease on record</p>
                      </div>
                    </div>
                  )}

                  {/* Vacancy actions */}
                  {es === 'vacant' && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-2">Actions</p>
                      <div className="space-y-2">
                        <a
                          href="/leases"
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <span>📋</span> Create Lease
                        </a>
                        <a
                          href="/people"
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium border border-surface-border dark:border-dark-border text-text rounded-lg hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors"
                        >
                          <span>👤</span> View Prospective Tenants
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selected.notes && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-1">Notes</p>
                      <p className="text-xs text-text leading-relaxed">{selected.notes}</p>
                    </div>
                  )}

                  {/* Features */}
                  {selected.features.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-text-muted mb-2">Features</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.features.map(f => (
                          <span key={f} className="text-[11px] px-2 py-0.5 rounded-full bg-surface-border dark:bg-dark-border text-text-muted capitalize">
                            {f.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Link to property page */}
                  <a
                    href="/property"
                    className="flex items-center justify-center gap-1.5 text-xs text-primary-600 hover:underline pt-1"
                  >
                    View in Property page →
                  </a>
                </div>
              </div>
            )
          })()}
        </div>
      </main>
    </DashboardLayout>
  )
}
