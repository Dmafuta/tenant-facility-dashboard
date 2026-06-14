'use client'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { AddUnitModal } from '@/components/property/AddUnitModal'
import { UNITS, LEASES, CHARGES, METERS } from '@/lib/mock-data'
import type { Unit, UnitUseType, UnitStatus, Meter, UtilityType } from '@/lib/types'

const USE_BADGE: Record<UnitUseType, { variant: 'primary'|'purple'|'blue'|'orange'|'default'; label: string }> = {
  residential: { variant: 'primary',  label: 'Residential' },
  bnb:         { variant: 'purple',   label: 'BnB' },
  office:      { variant: 'blue',     label: 'Office' },
  commercial:  { variant: 'orange',   label: 'Commercial' },
  vacant:      { variant: 'default',  label: 'Vacant' },
}
const STATUS_BADGE: Record<UnitStatus, { variant: 'primary'|'warning'|'danger'|'default'; label: string }> = {
  occupied:    { variant: 'primary',  label: 'Occupied' },
  vacant:      { variant: 'warning',  label: 'Vacant' },
  maintenance: { variant: 'danger',   label: 'Maintenance' },
  reserved:    { variant: 'default',  label: 'Reserved' },
}

const TH = 'px-4 py-2.5 text-left text-xs font-medium text-text-muted whitespace-nowrap'
const TD = 'px-4 py-2 text-sm text-text whitespace-nowrap'

export default function PropertyPageClient() {
  const [search,      setSearch]      = useState('')
  const [block,       setBlock]       = useState('all')
  const [useType,     setUseType]     = useState('all')
  const [status,      setStatus]      = useState('all')
  const [selected,    setSelected]    = useState<Unit | null>(null)
  const [showAddUnit, setShowAddUnit] = useState(false)

  const blocks = [...new Set(UNITS.map(u => u.block))].sort()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return UNITS.filter(u => {
      if (block   !== 'all' && u.block    !== block)   return false
      if (useType !== 'all' && u.use_type !== useType) return false
      if (status  !== 'all' && u.status   !== status)  return false
      if (q && !(`${u.block}-${u.number} ${u.current_occupant ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [search, block, useType, status])

  const unitLeases  = selected ? LEASES.filter(l => l.unit_id === selected.id)  : []
  const unitCharges = selected ? CHARGES.filter(c => c.unit_id === selected.id) : []

  return (
    <DashboardLayout>
      <Topbar
        title="Property"
        subtitle={`${UNITS.length} units across ${blocks.length} blocks`}
        actions={
          <CanDo action="write" resource={{ type: 'unit' }} fallback={
            <Button variant="primary" size="sm" disabled>+ Add Unit</Button>
          }>
            <Button variant="primary" size="sm" onClick={() => setShowAddUnit(true)}>+ Add Unit</Button>
          </CanDo>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search unit or occupant..."
            value={search}
            onChange={setSearch}
            containerClassName="flex-1 min-w-[200px] max-w-xs"
          />
          <Select
            value={block}
            onChange={setBlock}
            options={[{ value: 'all', label: 'All Blocks' }, ...blocks.map(b => ({ value: b, label: `Block ${b}` }))]}
          />
          <Select
            value={useType}
            onChange={setUseType}
            options={[
              { value: 'all',         label: 'All Use Types' },
              { value: 'residential', label: 'Residential' },
              { value: 'bnb',         label: 'BnB' },
              { value: 'office',      label: 'Office' },
              { value: 'commercial',  label: 'Commercial' },
              { value: 'vacant',      label: 'Vacant' },
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all',         label: 'All Statuses' },
              { value: 'occupied',    label: 'Occupied' },
              { value: 'vacant',      label: 'Vacant' },
              { value: 'maintenance', label: 'Maintenance' },
            ]}
          />
          <span className="text-xs text-text-muted ml-auto">{filtered.length} units</span>
        </div>

        {/* Compact Table */}
        <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover border-b border-surface-border dark:border-dark-border">
              <tr>
                <th className={TH}>Unit</th>
                <th className={TH}>Floor</th>
                <th className={TH}>Use Type</th>
                <th className={TH}>Status</th>
                <th className={TH}>Occupant</th>
                <th className={TH}>Size</th>
                <th className={TH}>Rent / mo</th>
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(unit => (
                <tr
                  key={unit.id}
                  className="hover:bg-surface-hover dark:hover:bg-dark-hover cursor-pointer transition-colors"
                  onClick={() => setSelected(unit)}
                >
                  <td className={TD}>
                    <span className="font-semibold text-text">{unit.block}-{unit.number}</span>
                  </td>
                  <td className={TD + ' text-text-muted'}>Floor {unit.floor}</td>
                  <td className={TD}>
                    <Badge variant={USE_BADGE[unit.use_type].variant}>{USE_BADGE[unit.use_type].label}</Badge>
                  </td>
                  <td className={TD}>
                    <Badge variant={STATUS_BADGE[unit.status].variant}>{STATUS_BADGE[unit.status].label}</Badge>
                  </td>
                  <td className={TD}>
                    {unit.current_occupant ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                          {unit.current_occupant[0]}
                        </div>
                        <span className="text-text">{unit.current_occupant}</span>
                      </div>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className={TD + ' text-text-muted'}>{unit.size_sqm} m&sup2;</td>
                  <td className={TD}>
                    <span className="font-medium text-text">KES {unit.monthly_rate.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(unit) }}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                    <p className="text-3xl mb-2">🏢</p>
                    No units match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detail Drawer — unchanged */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Unit ${selected.block}-${selected.number}` : ''}
        width="w-full sm:w-[520px]"
      >
        {selected && (
          <div className="p-5">
            {/* Header info */}
            <div className="flex items-start gap-4 mb-5 pb-5 border-b border-surface-border dark:border-dark-border">
              <div className="w-14 h-14 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-2xl flex-shrink-0">
                {selected.use_type === 'bnb' ? '\u{1F6CE}\u{FE0F}' : selected.use_type === 'office' ? '\u{1F4BC}' : selected.use_type === 'commercial' ? '\u{1F3EA}' : '\u{1F3E0}'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text">Block {selected.block}, Unit {selected.number}</p>
                <p className="text-sm text-text-muted">Floor {selected.floor} &middot; {selected.size_sqm}m&sup2; &middot; {selected.bedrooms} bed &middot; {selected.bathrooms} bath</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={USE_BADGE[selected.use_type].variant}>{USE_BADGE[selected.use_type].label}</Badge>
                  <Badge variant={STATUS_BADGE[selected.status].variant}>{STATUS_BADGE[selected.status].label}</Badge>
                </div>
              </div>
            </div>

            <Tabs defaultValue="overview">
              <TabsList className="mb-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="ownership">Ownership</TabsTrigger>
                <TabsTrigger value="leases">Leases</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
                <TabsTrigger value="utilities">Utilities</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Monthly Rate', value: `KES ${selected.monthly_rate.toLocaleString()}` },
                      { label: 'Current Use',  value: USE_BADGE[selected.use_type].label },
                      { label: 'Status',       value: STATUS_BADGE[selected.status].label },
                      { label: 'Size',         value: `${selected.size_sqm}m²` },
                    ].map(item => (
                      <div key={item.label} className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                        <p className="text-xs text-text-muted">{item.label}</p>
                        <p className="text-sm font-semibold text-text">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {selected.current_occupant && (
                    <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                      <p className="text-xs text-text-muted mb-1">Current Occupant</p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700">{selected.current_occupant[0]}</div>
                        <p className="text-sm font-medium text-text">{selected.current_occupant}</p>
                      </div>
                      {selected.lease_end && <p className="text-xs text-text-muted mt-1">Lease ends: {selected.lease_end}</p>}
                    </div>
                  )}
                  <CanDo action="unit.convert_type" resource={{ type: 'unit', id: selected.id }}>
                    <Button variant="outline" size="sm" className="w-full">Convert Use Type</Button>
                  </CanDo>
                </div>
              </TabsContent>

              {/* Ownership */}
              <TabsContent value="ownership">
                <div className="space-y-3">
                  {selected.owners.map(owner => (
                    <div key={owner.person_id} className="flex items-center gap-3 p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                        {owner.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text">{owner.name}</p>
                        <p className="text-xs text-text-muted">{owner.is_resident ? 'Resident owner' : 'Non-resident owner'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-primary-600">{owner.share_percent}%</p>
                        <p className="text-xs text-text-muted">share</p>
                      </div>
                    </div>
                  ))}
                  {selected.owners.length > 1 && (
                    <p className="text-xs text-text-muted text-center pt-1">
                      Joint ownership &middot; {selected.owners.reduce((s: number, o: { share_percent: number }) => s + o.share_percent, 0)}% accounted
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Leases */}
              <TabsContent value="leases">
                {unitLeases.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">No leases found</p>
                    <CanDo action="lease.create" resource={{ type: 'lease' }}>
                      <Button variant="primary" size="sm" className="mt-3">Create Lease</Button>
                    </CanDo>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unitLeases.map(lease => (
                      <div key={lease.id} className="p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-text">{lease.tenant_name}</p>
                          <Badge variant={lease.status === 'active' ? 'primary' : lease.status === 'notice_given' ? 'warning' : 'default'}>
                            {lease.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-text-muted">
                          <span>KES {lease.monthly_rent.toLocaleString()}/mo</span>
                          <span>Deposit: KES {lease.deposit.toLocaleString()}</span>
                          <span>From: {lease.start_date}</span>
                          <span>To: {lease.end_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Financials */}
              <TabsContent value="financials">
                {unitCharges.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <p className="text-3xl mb-2">💰</p>
                    <p className="text-sm">No charges found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {unitCharges.map(charge => (
                      <div key={charge.id} className="flex items-start justify-between p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-text capitalize">{charge.type.replace('_', ' ')}</p>
                          <p className="text-xs text-text-muted">{charge.period} &middot; {charge.person_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text">KES {charge.amount.toLocaleString()}</p>
                          <Badge variant={charge.status === 'paid' ? 'primary' : charge.status === 'overdue' ? 'danger' : 'warning'}>
                            {charge.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Utilities */}
              <TabsContent value="utilities">
                {(() => {
                  const unitMeters = METERS.filter((m: Meter) => m.unit_id === selected.id)
                  const utilityIcons: Record<UtilityType, string> = {
                    water: '💧', sewerage: '🚿', water_sewer: '💧', electricity: '⚡',
                    gas_piped: '🔥', gas_cylinder: '🔥', internet: '📶',
                  }
                  if (unitMeters.length === 0) {
                    return (
                      <div className="py-8 text-center text-sm text-text-muted">
                        <p className="text-2xl mb-2">🔌</p>
                        No meters allocated to this unit.
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                        {unitMeters.length} meter{unitMeters.length !== 1 ? 's' : ''} allocated
                      </p>
                      {unitMeters.map((m: Meter) => (
                        <div key={m.id} className="rounded-lg border border-surface-border dark:border-dark-border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{utilityIcons[m.utility_type]}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text capitalize">
                                {m.utility_type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-text-muted">{m.meter_type} &middot; {m.billing_arrangement.replace(/_/g, ' ')}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {m.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-text-muted">Meter No.</p>
                              <p className="font-mono font-medium text-text">{m.meter_number}</p>
                            </div>
                            <div>
                              <p className="text-text-muted">Account No.</p>
                              <p className="font-mono font-medium text-text">{m.account_number}</p>
                            </div>
                            <div>
                              <p className="text-text-muted">Last Reading</p>
                              <p className="font-medium text-text">
                                {m.last_reading?.toLocaleString() ?? '—'}{' '}
                                {m.utility_type === 'water' || m.utility_type === 'water_sewer' ? 'm³' : m.utility_type === 'electricity' ? 'kWh' : ''}
                              </p>
                            </div>
                            <div>
                              <p className="text-text-muted">Reading Date</p>
                              <p className="font-medium text-text">{m.last_reading_date ?? '—'}</p>
                            </div>
                            {m.current_billing_person && (
                              <div className="col-span-2">
                                <p className="text-text-muted">Billed To</p>
                                <p className="font-medium text-text">{m.current_billing_person.name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Drawer>

      <AddUnitModal open={showAddUnit} onClose={() => setShowAddUnit(false)} />
    </DashboardLayout>
  )
}
