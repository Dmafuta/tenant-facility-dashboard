'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { VEHICLES } from '@/lib/mock-data'
import type { Vehicle } from '@/lib/types'

function vehicleStatusBadge(status: Vehicle['status']) {
  const map: Record<string, 'success'|'warning'|'danger'|'default'> = {
    active: 'success', suspended: 'warning', blacklisted: 'danger', deregistered: 'default'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function typeIcon(type: Vehicle['vehicle_type']) {
  const map: Record<string, string> = {
    car: '🚗', suv: '🚙', pickup: '🛻', motorcycle: '🏍', van: '🚐', truck: '🚛', bicycle: '🚲', other: '🚘'
  }
  return map[type] ?? '🚗'
}

const daysUntilExpiry = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

const FAKE_GATE_LOGS = [
  { id: 'VGL-001', timestamp: '2024-06-13T08:55:00', direction: 'entry', plate: 'KCA 112A', vehicle: 'Toyota Camry — White', unit: 'A-101', owner: 'James Mwangi',  method: 'card', verified: true },
  { id: 'VGL-002', timestamp: '2024-06-13T07:45:00', direction: 'entry', plate: 'KBX 445C', vehicle: 'Honda CR-V — Grey',   unit: 'A-102', owner: 'Grace Njoroge', method: 'sticker_scan', verified: true },
  { id: 'VGL-003', timestamp: '2024-06-12T22:10:00', direction: 'exit',  plate: 'KCA 112A', vehicle: 'Toyota Camry — White', unit: 'A-101', owner: 'James Mwangi', method: 'card', verified: true },
  { id: 'VGL-004', timestamp: '2024-06-12T19:30:00', direction: 'entry', plate: 'KBC 901X', vehicle: 'Unknown',              unit: '—',     owner: 'Visitor',      method: 'manual', verified: false },
]

function VehicleRegistry() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Vehicle | null>(null)

  const filtered = VEHICLES.filter(v => {
    const q = search.toLowerCase()
    return v.plate_number.toLowerCase().includes(q) || v.registered_to_name.toLowerCase().includes(q) ||
           v.unit_label.toLowerCase().includes(q) || v.make.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border flex gap-2 items-center">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search plate, name, unit…" />
          </div>
          <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 whitespace-nowrap">
            + Register
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(v => {
            const insExpiry = v.insurance_expiry ? daysUntilExpiry(v.insurance_expiry) : null
            return (
              <button key={v.id} onClick={() => setSelected(v)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === v.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-mono font-bold text-text">{v.plate_number}</span>
                  {vehicleStatusBadge(v.status)}
                </div>
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <span>{typeIcon(v.vehicle_type)}</span>
                  <span>{v.color} {v.make} {v.model} {v.year}</span>
                </p>
                <p className="text-xs text-text-muted">{v.registered_to_name} · {v.unit_label}</p>
                {insExpiry !== null && insExpiry <= 30 && insExpiry > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">Insurance expires in {insExpiry}d</p>
                )}
              </button>
            )
          })}
          {filtered.length === 0 && <p className="py-8 text-sm text-text-muted text-center">No vehicles found.</p>}
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
                <p className="text-sm text-text-muted">{selected.color} {selected.make} {selected.model} ({selected.year})</p>
                <div className="flex gap-1.5 mt-1">{vehicleStatusBadge(selected.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Registered To', value: selected.registered_to_name },
                { label: 'Unit',          value: selected.unit_label },
                { label: 'Vehicle Type',  value: selected.vehicle_type },
                { label: 'Registered',    value: selected.registered_date },
                ...(selected.sticker_number ? [{ label: 'Sticker No.', value: selected.sticker_number }] : []),
                ...(selected.insurance_expiry ? [{ label: 'Insurance Expiry', value: selected.insurance_expiry }] : []),
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text capitalize">{f.value}</p>
                </div>
              ))}
            </div>

            {selected.insurance_expiry && daysUntilExpiry(selected.insurance_expiry) <= 30 && (
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

            <div className="flex gap-2">
              {selected.status === 'active' && (
                <button className="px-3 py-1.5 text-xs text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50">Suspend</button>
              )}
              {selected.status === 'suspended' && (
                <button className="px-3 py-1.5 text-xs text-green-700 border border-green-300 rounded-lg hover:bg-green-50">Reinstate</button>
              )}
              <button className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Deregister</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GateLogsTab() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover dark:bg-dark-hover">
            <tr>
              {['Time','Plate','Vehicle','Unit / Owner','Method','Direction','Verified'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {FAKE_GATE_LOGS.map(log => (
              <tr key={log.id} className="hover:bg-surface-hover dark:hover:bg-dark-hover">
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.timestamp.slice(11,16)}</td>
                <td className="px-4 py-2.5 text-text font-mono font-bold text-xs">{log.plate}</td>
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.vehicle}</td>
                <td className="px-4 py-2.5 text-text-muted text-xs">{log.unit} · {log.owner}</td>
                <td className="px-4 py-2.5 text-text-muted text-xs capitalize">{log.method.replace('_',' ')}</td>
                <td className="px-4 py-2.5">
                  <Badge variant={log.direction === 'entry' ? 'success' : 'default'}>
                    {log.direction === 'entry' ? '→ In' : '← Out'}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  {log.verified
                    ? <span className="text-green-600 text-xs font-medium">✓ Yes</span>
                    : <span className="text-red-500 text-xs font-medium">✗ No</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function VehiclesPageClient() {
  const active = VEHICLES.filter(v => v.status === 'active').length
  const expiring = VEHICLES.filter(v => v.insurance_expiry && daysUntilExpiry(v.insurance_expiry) <= 30 && daysUntilExpiry(v.insurance_expiry) > 0).length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Vehicles" subtitle="Vehicle registry, sticker management and gate logs" />

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Registered',        value: VEHICLES.length, color: 'text-text' },
            { label: 'Active',            value: active,          color: 'text-green-600' },
            { label: 'Ins. Expiring (30d)',value: expiring,       color: expiring > 0 ? 'text-amber-600' : 'text-green-600' },
            { label: 'Today Entries',     value: FAKE_GATE_LOGS.filter(l => l.direction === 'entry').length, color: 'text-blue-600' },
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
              <TabsTrigger value="logs">Gate Logs</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="registry" className="flex flex-1 overflow-hidden min-h-0 mt-0"><VehicleRegistry /></TabsContent>
          <TabsContent value="logs"     className="flex flex-1 overflow-hidden min-h-0 mt-0"><GateLogsTab /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
