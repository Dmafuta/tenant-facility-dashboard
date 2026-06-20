'use client'
import { cn } from '@/lib/cn'
import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { getAllVehicles, verifyVehicle, unverifyVehicle } from '@/lib/api/vehicles'
import type { VehicleData } from '@/lib/api/vehicles'

function vehicleStatusBadge(status: string) {
  const map: Record<string, 'success'|'warning'|'danger'|'default'> = {
    active: 'success', suspended: 'warning', blacklisted: 'danger', deregistered: 'default'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function typeIcon(type: string) {
  const map: Record<string, string> = {
    car: '🚗', suv: '🚙', pickup: '🛻', motorcycle: '🏍', van: '🚐', truck: '🚛', bicycle: '🚲', other: '🚘'
  }
  return map[type] ?? '🚗'
}

const daysUntilExpiry = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

// ── Verification Drive ─────────────────────────────────────────────────────────

function VerificationDrive({ vehicles, onClose, onUpdated }: {
  vehicles: VehicleData[]
  onClose: () => void
  onUpdated: (v: VehicleData) => void
}) {
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | 'unverified' | 'verified'>('unverified')
  const [pending, setPending]     = useState<Set<string>>(new Set())

  const verified   = vehicles.filter(v => v.verified).length
  const total      = vehicles.length
  const pct        = total > 0 ? Math.round((verified / total) * 100) : 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return vehicles.filter(v => {
      const matchSearch = !q
        || v.plate_number.toLowerCase().includes(q)
        || (v.sticker_number ?? '').toLowerCase().includes(q)
        || (v.person_name ?? '').toLowerCase().includes(q)
        || (v.unit_label ?? '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'all' ||
        (filter === 'verified'   &&  v.verified) ||
        (filter === 'unverified' && !v.verified)
      return matchSearch && matchFilter
    })
  }, [vehicles, search, filter])

  async function toggle(v: VehicleData) {
    if (pending.has(v.id)) return
    setPending(p => new Set(p).add(v.id))
    try {
      const updated = v.verified ? await unverifyVehicle(v.id) : await verifyVehicle(v.id)
      onUpdated(updated)
    } catch { /* silently ignore */ }
    finally { setPending(p => { const n = new Set(p); n.delete(v.id); return n }) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-dark-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border shadow-sm flex-shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Verification Drive</p>
          <p className="text-xs text-gray-500">{verified} of {total} verified</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary-600">{pct}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-dark-border flex-shrink-0">
        <div
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Search + filter */}
      <div className="px-4 py-3 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border flex-shrink-0 space-y-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Search plate, sticker, name, unit…" className="w-full" />
        <div className="flex gap-2">
          {(['unverified', 'all', 'verified'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-border'
              )}
            >
              {f === 'unverified' ? `Pending (${vehicles.filter(v => !v.verified).length})`
               : f === 'verified' ? `Verified (${verified})`
               : `All (${total})`}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            {filter === 'unverified' && verified === total
              ? '🎉 All vehicles verified!'
              : 'No vehicles match your search.'}
          </div>
        )}
        {filtered.map(v => {
          const isPending = pending.has(v.id)
          return (
            <div
              key={v.id}
              className={cn(
                'rounded-xl border p-4 flex items-center gap-4 transition-all',
                v.verified
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border'
              )}
            >
              <span className="text-2xl flex-shrink-0">{typeIcon(v.vehicle_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold font-mono text-gray-900 dark:text-white">{v.plate_number}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {v.color} {v.make} {v.model}{v.year ? ` (${v.year})` : ''}
                </p>
                <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-500">
                  {v.person_name && <span>{v.person_name}</span>}
                  {v.unit_label  && <span>· {v.unit_label}</span>}
                  {v.sticker_number && (
                    <span className="font-medium text-blue-600 dark:text-blue-400">Sticker: {v.sticker_number}</span>
                  )}
                </div>
                {v.verified && v.verified_by && (
                  <p className="text-[11px] text-green-600 dark:text-green-400 mt-0.5">
                    ✓ Verified by {v.verified_by}{v.verified_at ? ` · ${new Date(v.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggle(v)}
                disabled={isPending}
                className={cn(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all disabled:opacity-50',
                  v.verified
                    ? 'bg-green-500 text-white hover:bg-red-500'
                    : 'bg-gray-100 dark:bg-dark-hover text-gray-400 hover:bg-green-500 hover:text-white'
                )}
                title={v.verified ? 'Mark as unverified' : 'Mark as verified'}
              >
                {isPending ? (
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : v.verified ? '✓' : '○'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vehicle Registry ───────────────────────────────────────────────────────────

function VehicleRegistry({ vehicles, loading }: { vehicles: VehicleData[]; loading: boolean }) {
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<VehicleData | null>(null)

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    return v.plate_number.toLowerCase().includes(q)
      || (v.person_name ?? '').toLowerCase().includes(q)
      || (v.unit_label ?? '').toLowerCase().includes(q)
      || v.make.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Search plate, name, unit…" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
          {loading && (
            <div className="py-12 flex justify-center">
              <span className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.map(v => {
            const insExpiry = v.insurance_expiry ? daysUntilExpiry(v.insurance_expiry) : null
            return (
              <button key={v.id} onClick={() => setSelected(v)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === v.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-mono font-bold text-text">{v.plate_number}</span>
                  <div className="flex items-center gap-1.5">
                    {v.verified && <span className="text-xs text-green-600 font-medium">✓</span>}
                    {vehicleStatusBadge(v.status)}
                  </div>
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <span>{typeIcon(v.vehicle_type)}</span>
                  <span>{v.color} {v.make} {v.model}{v.year ? ` ${v.year}` : ''}</span>
                </p>
                <p className="text-xs text-text-muted">{v.person_name ?? '—'} · {v.unit_label ?? '—'}</p>
                {insExpiry !== null && insExpiry <= 30 && insExpiry > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">Insurance expires in {insExpiry}d</p>
                )}
              </button>
            )
          })}
          {!loading && filtered.length === 0 && (
            <p className="py-8 text-sm text-text-muted text-center">No vehicles found.</p>
          )}
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
          <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a vehicle to view</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{typeIcon(selected.vehicle_type)}</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-text font-mono">{selected.plate_number}</h2>
                <p className="text-sm text-text-muted">{selected.color} {selected.make} {selected.model}{selected.year ? ` (${selected.year})` : ''}</p>
                <div className="flex gap-1.5 mt-1">{vehicleStatusBadge(selected.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Registered To', value: selected.person_name ?? '—' },
                { label: 'Unit',          value: selected.unit_label ?? '—' },
                { label: 'Vehicle Type',  value: selected.vehicle_type },
                ...(selected.registered_date ? [{ label: 'Registered', value: selected.registered_date }] : []),
                ...(selected.sticker_number  ? [{ label: 'Sticker No.', value: selected.sticker_number }] : []),
                ...(selected.insurance_expiry ? [{ label: 'Insurance Expiry', value: selected.insurance_expiry }] : []),
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text capitalize">{f.value}</p>
                </div>
              ))}
            </div>

            {selected.verified && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">✓ Verified</p>
                {selected.verified_by && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    By {selected.verified_by}{selected.verified_at ? ` on ${new Date(selected.verified_at).toLocaleString()}` : ''}
                  </p>
                )}
              </div>
            )}

            {selected.insurance_expiry && daysUntilExpiry(selected.insurance_expiry) <= 30 && daysUntilExpiry(selected.insurance_expiry) > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">⚠️ Insurance Expiring Soon</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Expires {selected.insurance_expiry} — {daysUntilExpiry(selected.insurance_expiry)} days remaining
                </p>
              </div>
            )}

            {selected.notes && (
              <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                <p className="text-xs text-text-muted">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function VehiclesPageClient() {
  const [vehicles, setVehicles]         = useState<VehicleData[]>([])
  const [loading, setLoading]           = useState(true)
  const [driveMode, setDriveMode]       = useState(false)

  useEffect(() => {
    getAllVehicles()
      .then(setVehicles)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleUpdated(updated: VehicleData) {
    setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v))
  }

  const active   = vehicles.filter(v => v.status === 'active').length
  const verified = vehicles.filter(v => v.verified).length
  const expiring = vehicles.filter(v => v.insurance_expiry && daysUntilExpiry(v.insurance_expiry) <= 30 && daysUntilExpiry(v.insurance_expiry) > 0).length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar
          title="Vehicles"
          subtitle="Vehicle registry, sticker management and verification"
          actions={
            <button
              onClick={() => setDriveMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
            >
              <span>🔍</span> Start Verification Drive
            </button>
          }
        />

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Registered',          value: vehicles.length, color: 'text-text' },
            { label: 'Active',              value: active,           color: 'text-green-600' },
            { label: 'Verified',            value: verified,         color: verified === vehicles.length && vehicles.length > 0 ? 'text-green-600' : 'text-primary-600' },
            { label: 'Ins. Expiring (30d)', value: expiring,         color: expiring > 0 ? 'text-amber-600' : 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="registry" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="registry">Vehicle Registry</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="registry" className="flex flex-1 overflow-hidden min-h-0 mt-0">
            <VehicleRegistry vehicles={vehicles} loading={loading} />
          </TabsContent>
        </Tabs>
      </main>

      {driveMode && (
        <VerificationDrive
          vehicles={vehicles}
          onClose={() => setDriveMode(false)}
          onUpdated={handleUpdated}
        />
      )}
    </DashboardLayout>
  )
}
