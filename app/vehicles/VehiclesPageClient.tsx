'use client'
import { cn } from '@/lib/cn'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { getAllVehicles, verifyVehicle, unverifyVehicle, updateVehicleSticker } from '@/lib/api/vehicles'
import type { VehicleData } from '@/lib/api/vehicles'
import { PlateScanner } from '@/components/vehicles/PlateScanner'

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
  const [scanInput, setScanInput]         = useState('')
  const [filter, setFilter]               = useState<'all' | 'unverified' | 'verified'>('unverified')
  const [pending, setPending]             = useState<Set<string>>(new Set())
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null)
  const [stickerValue, setStickerValue]   = useState('')
  const [savingSticker, setSavingSticker] = useState<Set<string>>(new Set())
  const [showScanner, setShowScanner]     = useState(false)

  const scanInputRef = useRef<HTMLInputElement>(null)
  const rowRefs      = useRef<Record<string, HTMLTableRowElement | null>>({})

  const verified = vehicles.filter(v => v.verified).length
  const total    = vehicles.length
  const pct      = total > 0 ? Math.round((verified / total) * 100) : 0

  const filtered = useMemo(() => {
    const q = scanInput.trim().toLowerCase()
    return vehicles.filter(v => {
      const matchSearch = !q
        || v.plate_number.toLowerCase().includes(q)
        || (v.sticker_number ?? '').toLowerCase().includes(q)
        || (v.person_name  ?? '').toLowerCase().includes(q)
        || (v.unit_label   ?? '').toLowerCase().includes(q)
      const matchFilter =
        filter === 'all' ||
        (filter === 'verified'   &&  v.verified) ||
        (filter === 'unverified' && !v.verified)
      return matchSearch && matchFilter
    })
  }, [vehicles, scanInput, filter])

  // Scroll first match into view when typing
  useEffect(() => {
    if (!scanInput.trim() || filtered.length === 0) return
    rowRefs.current[filtered[0].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [scanInput, filtered])

  const toggle = useCallback(async (v: VehicleData) => {
    if (pending.has(v.id)) return
    setPending(p => new Set(p).add(v.id))
    try {
      const updated = v.verified ? await unverifyVehicle(v.id) : await verifyVehicle(v.id)
      onUpdated(updated)
    } catch {}
    finally { setPending(p => { const n = new Set(p); n.delete(v.id); return n }) }
  }, [pending, onUpdated])

  function handleScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && filtered.length > 0) toggle(filtered[0])
  }

  function startEditSticker(v: VehicleData) {
    setEditingStickerId(v.id)
    setStickerValue(v.sticker_number ?? '')
  }

  async function saveSticker(v: VehicleData) {
    if (savingSticker.has(v.id)) return
    const trimmed = stickerValue.trim() || null
    // No change — just close
    if (trimmed === (v.sticker_number ?? null)) { setEditingStickerId(null); return }
    setSavingSticker(s => new Set(s).add(v.id))
    try {
      const updated = await updateVehicleSticker(v.id, trimmed)
      onUpdated(updated)
    } catch {}
    finally {
      setSavingSticker(s => { const n = new Set(s); n.delete(v.id); return n })
      setEditingStickerId(null)
    }
  }

  function handleOcrResult(text: string) {
    setScanInput(text)
    setShowScanner(false)
    setTimeout(() => scanInputRef.current?.focus(), 100)
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
        <p className="text-lg font-bold text-primary-600">{pct}%</p>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 dark:bg-dark-border flex-shrink-0">
        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Quick-scan bar + filters */}
      <div className="px-4 py-3 bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border flex-shrink-0 space-y-2">
        <div className="relative">
          <input
            ref={scanInputRef}
            autoFocus
            value={scanInput}
            onChange={e => setScanInput(e.target.value.toUpperCase())}
            onKeyDown={handleScanKeyDown}
            placeholder="Type or scan plate / sticker / name…  ↵ verifies first match"
            className="w-full pl-4 pr-10 py-2.5 text-sm font-mono rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-text placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowScanner(true)}
            title="Scan plate with camera (OCR)"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-4v3a1 1 0 01-1 1h-3m4-11h-3a1 1 0 00-1 1v3"/>
              <rect x="8" y="8" width="8" height="8" rx="1" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

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
               : f === 'verified'   ? `Done (${verified})`
               : `All (${total})`}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle table */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {filter === 'unverified' && verified === total && total > 0
              ? '🎉 All vehicles verified!'
              : 'No vehicles match.'}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Vehicle</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted hidden sm:table-cell">Owner · Unit</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Sticker</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-text-muted w-16">Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {filtered.map((v, idx) => {
                const isPending       = pending.has(v.id)
                const isFirst         = idx === 0 && scanInput.trim() !== ''
                const isEditSticker   = editingStickerId === v.id
                const isSavingSticker = savingSticker.has(v.id)

                return (
                  <tr
                    key={v.id}
                    ref={el => { rowRefs.current[v.id] = el }}
                    className={cn(
                      'transition-colors',
                      v.verified
                        ? 'bg-green-50 dark:bg-green-900/10'
                        : 'bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-hover',
                      isFirst && 'outline outline-2 outline-primary-400 outline-offset-[-2px]'
                    )}
                  >
                    {/* Vehicle */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg flex-shrink-0 leading-none">{typeIcon(v.vehicle_type)}</span>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-text text-sm leading-tight">{v.plate_number}</p>
                          <p className="text-xs text-text-muted truncate">{[v.color, v.make, v.model, v.year].filter(Boolean).join(' ')}</p>
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <p className="text-xs text-text leading-tight">{v.person_name ?? '—'}</p>
                      <p className="text-xs text-text-muted">{v.unit_label ?? '—'}</p>
                    </td>

                    {/* Sticker (inline edit) */}
                    <td className="px-3 py-2.5">
                      {isEditSticker ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={stickerValue}
                            onChange={e => setStickerValue(e.target.value.toUpperCase())}
                            onKeyDown={e => {
                              if (e.key === 'Enter')  saveSticker(v)
                              if (e.key === 'Escape') setEditingStickerId(null)
                            }}
                            onBlur={() => saveSticker(v)}
                            placeholder="e.g. GWG-042"
                            className="w-24 px-2 py-1 text-xs font-mono border border-primary-400 rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                          {isSavingSticker && (
                            <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditSticker(v)}
                          className="text-xs font-mono hover:text-primary-600 transition-colors"
                          title="Click to assign sticker"
                        >
                          {v.sticker_number
                            ? <span className="text-blue-600 dark:text-blue-400 font-medium">{v.sticker_number}</span>
                            : <span className="text-gray-300 dark:text-gray-600 italic">+ sticker</span>}
                        </button>
                      )}
                    </td>

                    {/* Verify toggle */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col items-end gap-0.5">
                        <button
                          onClick={() => toggle(v)}
                          disabled={isPending}
                          title={v.verified ? 'Mark as unverified' : 'Mark as verified'}
                          className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all disabled:opacity-50',
                            v.verified
                              ? 'bg-green-500 text-white hover:bg-red-500'
                              : 'bg-gray-100 dark:bg-dark-hover text-gray-400 hover:bg-green-500 hover:text-white'
                          )}
                        >
                          {isPending
                            ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : v.verified ? '✓' : '○'}
                        </button>
                        {v.verified && v.verified_by && (
                          <p className="text-[10px] text-green-600 dark:text-green-400 leading-tight max-w-[4rem] text-right truncate">
                            {v.verified_by}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showScanner && <PlateScanner onResult={handleOcrResult} onClose={() => setShowScanner(false)} vehicles={vehicles} />}
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
