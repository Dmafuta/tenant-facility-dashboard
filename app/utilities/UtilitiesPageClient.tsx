'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { AddMeterModal } from '@/components/utilities/AddMeterModal'
import {
  METERS, METER_READINGS, METER_TYPE_HISTORY,
  WATER_SUPPLIERS, RESERVE_TANKS, WATER_ZONES, WATER_BALANCE_PERIODS,
  CHARGES, INVENTORY_METERS,
} from '@/lib/mock-data'
import type {
  Meter, MeterReading, MeterTypeHistory,
  UtilityType, MeterType, MeterRole,
  WaterSupplier, ReserveTank, WaterZone, WaterBalancePeriod,
  MeterExtended, MeterCategory,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ────────────────────────────────────────────────────────────────

function utilityLabel(u: UtilityType): string {
  const MAP: Record<UtilityType, string> = {
    water: 'Water', sewerage: 'Sewerage', water_sewer: 'Water & Sewer',
    electricity: 'Electricity', gas_piped: 'Gas (Piped)', gas_cylinder: 'Gas (Cylinder)',
    internet: 'Internet',
  }
  return MAP[u] ?? u
}
function utilityIcon(u: UtilityType): string {
  const MAP: Record<UtilityType, string> = {
    water: '💧', sewerage: '🚰', water_sewer: '💧',
    electricity: '⚡', gas_piped: '🔥', gas_cylinder: '🔥', internet: '📶',
  }
  return MAP[u] ?? '📊'
}
function meterTypeBadge(t: MeterType) {
  const styles: Record<MeterType, { label: string; cls: string }> = {
    postpaid: { label: 'Postpaid', cls: 'bg-surface-border text-text-muted' },
    prepaid:  { label: 'Prepaid',  cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
    smart:    { label: 'Smart ⚡',  cls: 'bg-success/10 text-success' },
  }
  const { label, cls } = styles[t]
  return <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', cls)}>{label}</span>
}
function meterRoleBadge(role: MeterRole | undefined) {
  if (!role || role === 'consumer') return null
  const MAP: Record<Exclude<MeterRole,'consumer'>, { label: string; cls: string }> = {
    supplier:      { label: '⬆ Supplier',     cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    tank_inflow:   { label: '→ Tank In',       cls: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
    tank_outflow:  { label: '← Tank Out',      cls: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
    distribution:  { label: '⬇ Distribution',  cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
  }
  const { label, cls } = MAP[role]
  return <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', cls)}>{label}</span>
}
function statusDot(s: string) {
  return <span className={cn('inline-block w-2 h-2 rounded-full mr-1.5', s === 'active' ? 'bg-success' : 'bg-text-muted')} />
}
function lossColor(pct: number) {
  if (pct >= 15) return 'text-danger'
  if (pct >= 10) return 'text-warning'
  return 'text-success'
}
function lossBg(pct: number) {
  if (pct >= 15) return 'bg-danger/10 border-danger/20'
  if (pct >= 10) return 'bg-warning/10 border-warning/20'
  return 'bg-success/10 border-success/20'
}

// ── Reading Entry Modal ────────────────────────────────────────────────────

function ReadingEntryModal({ meter, open, onClose }: { meter: Meter | null; open: boolean; onClose: () => void }) {
  const [reading, setReading]   = useState('')
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [unitCost, setUnitCost] = useState('')
  const [mgmtFee, setMgmtFee]   = useState(meter?.management_fee_pct?.toString() ?? '')
  if (!meter) return null
  const prev = meter.last_reading ?? 0
  const consumed = reading ? Math.max(0, Number(reading) - prev) : 0
  const subtotal = consumed * Number(unitCost || 0)
  const fee      = mgmtFee ? subtotal * (Number(mgmtFee) / 100) : 0
  const total    = subtotal + fee
  return (
    <Modal open={open} onClose={onClose} title={`Enter Reading — ${meter.meter_number}`} size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card text-sm flex gap-4">
          <div>
            <p className="text-xs text-text-muted">Location</p>
            <p className="font-medium text-text">{meter.unit_label ?? meter.meter_number}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Utility</p>
            <p className="font-medium text-text">{utilityIcon(meter.utility_type)} {utilityLabel(meter.utility_type)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Previous</p>
            <p className="font-medium text-text">{prev.toLocaleString()}</p>
          </div>
        </div>
        {meter.meter_type === 'prepaid' && (
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            ⚠️ <strong>Prepaid meter</strong> — reading recorded for tracking only, no charge generated.
          </div>
        )}
        {meter.meter_type === 'smart' && (
          <div className="p-3 rounded-lg bg-success/10 text-sm text-success border border-success/20">
            ⚡ <strong>Smart meter</strong> — auto-collected via IoT. Manual entry overrides sensor reading.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Current Reading</label>
            <input type="number" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={`> ${prev}`} value={reading} onChange={e => setReading(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reading Date</label>
            <input type="date" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        {meter.meter_type !== 'prepaid' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Unit Cost (KES)</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 80" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Mgmt Fee %</label>
              <input type="number" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 5" value={mgmtFee} onChange={e => setMgmtFee(e.target.value)} />
            </div>
          </div>
        )}
        {consumed > 0 && meter.meter_type !== 'prepaid' && (
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 text-sm space-y-1">
            <div className="flex justify-between text-text-muted">
              <span>Consumed</span>
              <span className="font-medium text-text">{consumed.toLocaleString()} units</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Subtotal ({consumed} × KES {unitCost})</span>
              <span className="font-medium text-text">KES {subtotal.toLocaleString()}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-text-muted">
                <span>Management fee ({mgmtFee}%)</span>
                <span className="font-medium text-text">KES {fee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-primary-100 dark:border-primary-900/30 pt-1 mt-1">
              <span className="font-semibold text-text">Total charge</span>
              <span className="font-bold text-primary-700 dark:text-primary-400">KES {total.toLocaleString()}</span>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => { alert('Reading saved (demo)'); onClose() }}>Save Reading</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Meter Detail Drawer ────────────────────────────────────────────────────

function MeterDetailDrawer({ meter, open, onClose }: { meter: Meter | null; open: boolean; onClose: () => void }) {
  const readings = useMemo(() => meter ? METER_READINGS.filter(r => r.meter_id === meter.id) : [], [meter])
  const history  = useMemo(() => meter ? METER_TYPE_HISTORY.filter(h => h.meter_id === meter.id) : [], [meter])
  if (!meter) return null
  return (
    <Drawer open={open} onClose={onClose} title={`${utilityLabel(meter.utility_type)} — ${meter.meter_number}`}>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
            <p className="text-xs text-text-muted">Location</p>
            <p className="font-medium text-text">{meter.unit_label ?? '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
            <p className="text-xs text-text-muted">Meter Type</p>
            <div className="mt-0.5 flex gap-1 flex-wrap">
              {meterTypeBadge(meter.meter_type)}
              {meterRoleBadge(meter.meter_role)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
            <p className="text-xs text-text-muted">Account No.</p>
            <p className="font-medium text-text font-mono text-xs">{meter.account_number}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
            <p className="text-xs text-text-muted">Last Reading</p>
            <p className="font-medium text-text">{meter.last_reading?.toLocaleString() ?? '—'}</p>
            <p className="text-[11px] text-text-muted">{meter.last_reading_date}</p>
          </div>
          {meter.current_billing_person && (
            <div className="col-span-2 p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
              <p className="text-xs text-text-muted">Billed To</p>
              <p className="font-medium text-text">{meter.current_billing_person.name}</p>
              <p className="text-[11px] text-text-muted">{meter.billing_arrangement.replace(/_/g, ' ')}</p>
            </div>
          )}
          {meter.management_fee_pct && (
            <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
              <p className="text-xs text-text-muted">Management Fee</p>
              <p className="font-medium text-text">{meter.management_fee_pct}%</p>
            </div>
          )}
        </div>
        <Tabs defaultValue="readings">
          <TabsList className="mb-3">
            <TabsTrigger value="readings">Readings</TabsTrigger>
            <TabsTrigger value="history">Migration History{history.length > 0 ? ` (${history.length})` : ''}</TabsTrigger>
          </TabsList>
          <TabsContent value="readings">
            <div className="space-y-2">
              {readings.length === 0
                ? <p className="text-sm text-text-muted py-4 text-center">No readings recorded yet.</p>
                : readings.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-text">{r.billing_period}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                        r.status === 'billed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      )}>{r.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
                      <div><p>Prev → Current</p><p className="text-text font-medium">{r.previous_value} → {r.current_value}</p></div>
                      <div><p>Consumed</p><p className="text-text font-medium">{r.units_consumed} units</p></div>
                      <div><p>Amount</p><p className="text-text font-medium">KES {r.amount_due.toLocaleString()}</p></div>
                    </div>
                    {r.management_fee && (
                      <p className="text-[11px] text-text-muted mt-1">+ KES {r.management_fee.toLocaleString()} mgmt fee · {r.source}</p>
                    )}
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="history">
            <div className="space-y-2">
              {history.length === 0
                ? <p className="text-sm text-text-muted py-4 text-center">No meter type migrations recorded.</p>
                : history.map(h => (
                  <div key={h.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-surface-border text-text-muted text-xs">{h.from_type}</span>
                      <span className="text-text-muted">→</span>
                      <span className="px-2 py-0.5 rounded bg-success/10 text-success text-xs">{h.to_type}</span>
                      <span className="ml-auto text-xs text-text-muted">{h.migration_date}</span>
                    </div>
                    <p className="text-xs text-text-muted">Final reading: <span className="font-medium text-text">{h.final_reading.toLocaleString()}</span></p>
                    <p className="text-xs text-text-muted">By: {h.migrated_by}</p>
                    {h.notes && <p className="text-xs text-text-muted mt-1 italic">{h.notes}</p>}
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Drawer>
  )
}

// ── MetersTab ──────────────────────────────────────────────────────────────

const UTILITY_FILTERS = [
  { value: 'all',         label: 'All Utilities' },
  { value: 'water',       label: '💧 Water' },
  { value: 'water_sewer', label: '💧 Water & Sewer' },
  { value: 'sewerage',    label: '🚰 Sewerage' },
  { value: 'electricity', label: '⚡ Electricity' },
  { value: 'gas_piped',   label: '🔥 Gas (Piped)' },
  { value: 'internet',    label: '📶 Internet' },
]
const METER_TYPE_FILTERS = [
  { value: 'all',      label: 'All Types' },
  { value: 'postpaid', label: 'Postpaid' },
  { value: 'prepaid',  label: 'Prepaid' },
  { value: 'smart',    label: 'Smart' },
]
const ROLE_FILTERS = [
  { value: 'all',          label: 'All Roles' },
  { value: 'consumer',     label: 'Consumer (Unit)' },
  { value: 'supplier',     label: 'Supplier' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'tank_outflow', label: 'Tank Outflow' },
]

const TH = 'px-4 py-3 text-left text-xs font-medium text-text-muted whitespace-nowrap'
const TD = 'px-4 py-3.5 text-sm text-text whitespace-nowrap'

function MetersTab({ onRead, onView, onAddMeter }: { onRead: (m: Meter) => void; onView: (m: Meter) => void; onAddMeter: () => void }) {
  const [search, setSearch]   = useState('')
  const [utility, setUtility] = useState('all')
  const [type, setType]       = useState('all')
  const [role, setRole]       = useState('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return METERS.filter(m => {
      const matchSearch  = !q || (m.unit_label ?? '').toLowerCase().includes(q) || m.meter_number.toLowerCase().includes(q) || (m.current_billing_person?.name ?? '').toLowerCase().includes(q)
      const matchUtility = utility === 'all' || m.utility_type === utility
      const matchType    = type === 'all' || m.meter_type === type
      const matchRole    = role === 'all' || (role === 'consumer' ? !m.meter_role || m.meter_role === 'consumer' : m.meter_role === role)
      return matchSearch && matchUtility && matchType && matchRole
    })
  }, [search, utility, type, role])

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search unit, meter no…" containerClassName="w-60" />
        <Select value={utility} onChange={setUtility} options={UTILITY_FILTERS} className="w-44" />
        <Select value={type}    onChange={setType}    options={METER_TYPE_FILTERS} className="w-36" />
        <Select value={role}    onChange={setRole}    options={ROLE_FILTERS} className="w-44" />
        <div className="ml-auto">
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" onClick={onAddMeter}>+ Add Meter</Button>
          </CanDo>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-text-muted flex-wrap">
        <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-surface-border text-text-muted font-medium">Postpaid</span> Manual read → billing</span>
        <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">Prepaid</span> Pre-purchase, no billing</span>
        <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-success/10 text-success font-medium">Smart ⚡</span> IoT auto-collect</span>
        <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">⬆ Supplier</span> Supply chain meter</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-text-muted text-sm">No meters match filters.</p>
      ) : (
        <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted dark:bg-dark-card border-b border-surface-border dark:border-dark-border">
              <tr>
                <th className={TH}>Utility</th>
                <th className={TH}>Meter No.</th>
                <th className={TH}>Location</th>
                <th className={TH}>Type</th>
                <th className={TH}>Role</th>
                <th className={TH}>Last Reading</th>
                <th className={TH}>Billed To</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(m => (
                <tr
                  key={m.id}
                  className="hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors cursor-pointer"
                  onClick={() => onView(m)}
                >
                  <td className={TD}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{utilityIcon(m.utility_type)}</span>
                      <span className="font-medium">{utilityLabel(m.utility_type)}</span>
                    </div>
                  </td>
                  <td className={TD}>
                    <span className="font-mono text-xs text-text-muted">{m.meter_number}</span>
                  </td>
                  <td className={TD}>{m.unit_label ?? '—'}</td>
                  <td className={TD}>{meterTypeBadge(m.meter_type)}</td>
                  <td className={TD}>{meterRoleBadge(m.meter_role) ?? <span className="text-text-muted text-xs">Consumer</span>}</td>
                  <td className={TD}>
                    {m.last_reading != null ? (
                      <>
                        <span className="font-semibold">{m.last_reading.toLocaleString()}</span>
                        <span className="block text-[11px] text-text-muted">{m.last_reading_date}</span>
                      </>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className={TD}>
                    {m.current_billing_person ? (
                      <>
                        <span>{m.current_billing_person.name}</span>
                        {m.management_fee_pct && (
                          <span className="block text-[11px] text-text-muted">{m.management_fee_pct}% mgmt fee</span>
                        )}
                      </>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className={TD}>
                    <span className="flex items-center gap-1.5">
                      {statusDot(m.status)}
                      <span className="capitalize text-xs">{m.status}</span>
                    </span>
                  </td>
                  <td className={TD} onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {m.meter_type === 'smart' ? (
                        <span className="text-[11px] text-success whitespace-nowrap">⚡ Auto</span>
                      ) : (
                        <CanDo action="write" resource={{ type: 'unit' }}>
                          <button
                            onClick={() => onRead(m)}
                            className="text-xs font-medium text-primary-600 hover:underline whitespace-nowrap"
                          >
                            Enter Reading
                          </button>
                        </CanDo>
                      )}
                      <span className="text-text-muted">·</span>
                      <button
                        onClick={() => onView(m)}
                        className="text-xs font-medium text-text-muted hover:text-text whitespace-nowrap"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── WaterSupplyTab ─────────────────────────────────────────────────────────

function TankLevelBar({ current, capacity }: { current: number; capacity: number }) {
  const pct = Math.min(100, Math.round((current / capacity) * 100))
  const color = pct < 25 ? 'bg-danger' : pct < 50 ? 'bg-warning' : 'bg-success'
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-text-muted mb-1">
        <span>{current} m³ / {capacity} m³</span>
        <span className={cn('font-medium', pct < 25 ? 'text-danger' : pct < 50 ? 'text-warning' : 'text-success')}>{pct}%</span>
      </div>
      <div className="h-3 bg-surface-border rounded-full overflow-hidden">
        <div className={cn('h-3 rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function WaterSupplyTab() {
  // Enrich with meter data
  const supplierMeters = METERS.filter(m => m.meter_role === 'supplier')
  const distMeters     = METERS.filter(m => m.meter_role === 'distribution')
  const tankOutMeter   = METERS.find(m => m.meter_role === 'tank_outflow')
  const tank           = RESERVE_TANKS[0]

  return (
    <div className="space-y-6">
      {/* Flow diagram legend */}
      <div className="p-4 rounded-xl border border-surface-border bg-surface-muted dark:bg-dark-card text-sm">
        <p className="font-medium text-text mb-2">Supply Chain Flow</p>
        <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
          <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">Suppliers</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-teal-50 text-teal-700 font-medium">Reserve Tank</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-orange-50 text-orange-700 font-medium">Zone Meters</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-surface-border text-text font-medium">Unit Meters</span>
          <span className="ml-4 text-text-muted">Readings at each stage enable loss isolation per segment.</span>
        </div>
      </div>

      {/* Suppliers row */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
          Water Suppliers
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WATER_SUPPLIERS.map(s => {
            const meter = supplierMeters.find(m => m.supplier_id === s.id)
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-text">{s.name}</p>
                    <p className="text-xs text-text-muted capitalize">{s.source_type.replace('_', ' ')}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded font-medium', s.active ? 'bg-success/10 text-success' : 'bg-surface-border text-text-muted')}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-text-muted">Rate</p>
                    <p className="font-medium text-text">KES {s.contracted_rate_per_m3}/m³</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Meter</p>
                    <p className="font-medium text-text font-mono text-xs">{meter?.meter_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Last Reading</p>
                    <p className="font-medium text-text">{meter?.last_reading?.toLocaleString() ?? '—'} m³</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Read Date</p>
                    <p className="font-medium text-text">{meter?.last_reading_date ?? '—'}</p>
                  </div>
                </div>
                {s.notes && <p className="text-xs text-text-muted italic">{s.notes}</p>}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Reserve Tank */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
          Reserve Tank
        </h3>
        {tank && (
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-text">{tank.name}</p>
                <p className="text-xs text-text-muted">{tank.location} · {tank.compartments} compartments</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Outflow Meter</p>
                <p className="font-mono text-xs text-text">{tankOutMeter?.meter_number ?? '—'}</p>
                <p className="text-xs text-text-muted">Last: {tankOutMeter?.last_reading?.toLocaleString() ?? '—'} m³</p>
              </div>
            </div>
            <TankLevelBar current={tank.current_level_m3} capacity={tank.capacity_m3} />
            {tank.current_level_m3 < tank.capacity_m3 * (tank.low_level_threshold_pct / 100) && (
              <div className="mt-3 p-2 rounded bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
                ⚠️ Tank below {tank.low_level_threshold_pct}% threshold — consider activating borehole or ordering tanker.
              </div>
            )}
            {tank.notes && <p className="mt-3 text-xs text-text-muted italic">{tank.notes}</p>}
          </Card>
        )}
      </div>

      {/* Distribution Zones */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">3</span>
          Distribution Zones
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WATER_ZONES.map(z => {
            const distMeter = distMeters.find(m => m.id === z.distribution_meter_id)
            // Latest balance for this zone
            const latest = WATER_BALANCE_PERIODS[WATER_BALANCE_PERIODS.length - 1]
            const zoneBalance = latest?.zone_breakdown.find(b => b.zone_id === z.id)
            return (
              <Card key={z.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-text">{z.name}</p>
                    <p className="text-xs text-text-muted">{z.description}</p>
                  </div>
                  <span className="text-xs text-text-muted">{z.unit_ids.length} units</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-xs text-text-muted">Zone Meter</p>
                    <p className="font-medium text-text font-mono text-xs">{distMeter?.meter_number ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Last Reading</p>
                    <p className="font-medium text-text">{distMeter?.last_reading?.toLocaleString() ?? '—'} m³</p>
                  </div>
                </div>
                {zoneBalance && (
                  <div className={cn('p-2 rounded border text-xs', lossBg(zoneBalance.loss_pct))}>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Zone loss ({latest.period})</span>
                      <span className={cn('font-bold', lossColor(zoneBalance.loss_pct))}>{zoneBalance.loss_pct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-text-muted">Dist: {zoneBalance.distribution_m3} m³ · Consumer: {zoneBalance.consumer_m3} m³</span>
                      <span className={cn('font-medium', lossColor(zoneBalance.loss_pct))}>−{zoneBalance.loss_m3} m³</span>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── WaterBalanceTab ────────────────────────────────────────────────────────

function WaterBalanceTab() {
  const [selected, setSelected] = useState(WATER_BALANCE_PERIODS[WATER_BALANCE_PERIODS.length - 1]?.id ?? '')
  const period = WATER_BALANCE_PERIODS.find(p => p.id === selected)
  const periodOptions = WATER_BALANCE_PERIODS.slice().reverse().map(p => ({
    value: p.id,
    label: `${p.period}${p.flagged ? ' ⚠️' : ''}`,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Period</label>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            {periodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {period?.flagged && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger font-medium">
            ⚠️ Loss exceeds 10% threshold — investigation recommended
          </div>
        )}
        <Button variant="outline" size="sm" className="ml-auto">⬇ Export Report</Button>
      </div>

      {period ? (
        <>
          {/* Balance summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Inflow',  value: `${period.total_inflow_m3} m³`,  sub: 'All suppliers',      icon: '⬆', color: 'text-blue-600' },
              { label: 'Total Outflow', value: `${period.total_outflow_m3} m³`, sub: 'All unit meters',    icon: '⬇', color: 'text-text' },
              { label: 'Tank Change',   value: `${period.tank_change_m3 >= 0 ? '+' : ''}${period.tank_change_m3} m³`, sub: `${period.tank_level_start_m3} → ${period.tank_level_end_m3} m³`, icon: '🛢', color: 'text-teal-600' },
              { label: 'System Loss',   value: `${period.gross_loss_m3} m³`,    sub: `${period.loss_pct.toFixed(1)}% of inflow`, icon: '⚠', color: lossColor(period.loss_pct) },
            ].map(k => (
              <Card key={k.label} className={cn('p-4', k.label === 'System Loss' && period.flagged ? 'border-danger/40 bg-danger/5' : '')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{k.icon}</span>
                  <p className="text-xs text-text-muted font-medium">{k.label}</p>
                </div>
                <p className={cn('text-xl font-bold', k.color)}>{k.value}</p>
                <p className="text-xs text-text-muted">{k.sub}</p>
              </Card>
            ))}
          </div>

          {/* Balance equation visualiser */}
          <Card className="p-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Balance Equation</p>
            <div className="flex items-center gap-3 text-sm flex-wrap">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{period.total_inflow_m3}</p>
                <p className="text-xs text-text-muted">Inflow (m³)</p>
              </div>
              <span className="text-text-muted text-lg">−</span>
              <div className="text-center">
                <p className="text-xl font-bold text-text">{period.total_outflow_m3}</p>
                <p className="text-xs text-text-muted">Outflow (m³)</p>
              </div>
              <span className="text-text-muted text-lg">−</span>
              <div className="text-center">
                <p className="text-xl font-bold text-teal-600">{period.tank_change_m3 >= 0 ? '(+' : '('}{period.tank_change_m3})</p>
                <p className="text-xs text-text-muted">Tank Δ (m³)</p>
              </div>
              <span className="text-text-muted text-lg">=</span>
              <div className="text-center">
                <p className={cn('text-xl font-bold', lossColor(period.loss_pct))}>{period.gross_loss_m3}</p>
                <p className="text-xs text-text-muted">Loss (m³)</p>
              </div>
              <div className={cn('ml-4 px-3 py-2 rounded-lg border text-sm font-semibold', lossBg(period.loss_pct), lossColor(period.loss_pct))}>
                {period.loss_pct.toFixed(1)}% loss rate
              </div>
            </div>
          </Card>

          {/* Zone breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Zone Breakdown</h3>
            <div className="rounded-lg border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    {['Zone', 'Distribution Meter (m³)', 'Consumer Meters (m³)', 'Loss (m³)', 'Loss %', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {period.zone_breakdown.map((z, i) => (
                    <tr key={z.zone_id} className={cn('border-t border-surface-border hover:bg-surface-hover', i % 2 === 0 ? '' : 'bg-surface-muted/30')}>
                      <td className="px-4 py-3 font-medium text-text">{z.zone_name}</td>
                      <td className="px-4 py-3 text-text">{z.distribution_m3.toLocaleString()}</td>
                      <td className="px-4 py-3 text-text">{z.consumer_m3.toLocaleString()}</td>
                      <td className={cn('px-4 py-3 font-medium', lossColor(z.loss_pct))}>−{z.loss_m3.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={cn('font-bold', lossColor(z.loss_pct))}>{z.loss_pct.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded font-medium border', lossBg(z.loss_pct), lossColor(z.loss_pct))}>
                          {z.loss_pct >= 15 ? '🔴 Critical' : z.loss_pct >= 10 ? '🟡 Investigate' : '🟢 Normal'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supplier breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Supplier Contribution</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WATER_SUPPLIERS.filter(s => s.active).map(s => {
                const meter = METERS.find(m => m.supplier_id === s.id)
                // Approximate this period's inflow from this supplier
                const approxM3 = s.source_type === 'municipal'
                  ? Math.round(period.total_inflow_m3 * 0.62)
                  : period.total_inflow_m3 - Math.round(period.total_inflow_m3 * 0.62)
                const cost = approxM3 * s.contracted_rate_per_m3
                return (
                  <Card key={s.id} className="p-4">
                    <p className="font-medium text-text mb-2">{s.name}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-text-muted">Volume</p>
                        <p className="font-bold text-text">{approxM3} m³</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Rate</p>
                        <p className="font-medium text-text">KES {s.contracted_rate_per_m3}/m³</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Est. Cost</p>
                        <p className="font-bold text-text">KES {cost.toLocaleString()}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {period.notes && (
            <div className={cn('p-4 rounded-lg border text-sm', period.flagged ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-surface-muted border-surface-border text-text-muted')}>
              📝 {period.notes}
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-text-muted py-12">No balance report for selected period.</p>
      )}
    </div>
  )
}

// ── ReadingsTab ────────────────────────────────────────────────────────────

function ReadingsTab() {
  return (
    <div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card">
                {['Unit', 'Utility', 'Period', 'Consumed', 'Amount Due', 'Mgmt Fee', 'Source', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METER_READINGS.slice().reverse().map((r, i) => (
                <tr key={r.id} className={cn('border-b border-surface-border dark:border-dark-border hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors', i === METER_READINGS.length - 1 && 'border-b-0')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{r.unit_label}</p>
                    <p className="text-xs text-text-muted font-mono">{r.meter_number}</p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{utilityIcon(r.utility_type)} {utilityLabel(r.utility_type)}</td>
                  <td className="px-4 py-3 text-text-muted">{r.billing_period}</td>
                  <td className="px-4 py-3 font-medium text-text">{r.units_consumed.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-text">KES {r.amount_due.toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-muted">{r.management_fee ? `KES ${r.management_fee.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', r.source === 'smart_iot' ? 'bg-success/10 text-success' : 'bg-surface-border text-text-muted')}>
                      {r.source === 'smart_iot' ? '⚡ IoT' : r.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', r.status === 'billed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                      {r.status === 'billed' ? 'Billed' : 'Pending Bill'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────


// ── Disconnection Notices Tab ─────────────────────────────────────────────────

const DISCONNECTION_CONFIG = {
  reminder_notice_days: 7,
  formal_notice_days: 14,
}

interface DisconnectionCandidate {
  meter: Meter
  days_overdue: number
  outstanding_amount: number
  stage: 'overdue' | 'reminder_due' | 'formal_due' | 'clear'
}

function DisconnectionTab() {
  const [sentNotices, setSentNotices] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Find postpaid meters with overdue charges
  const candidates = useMemo((): DisconnectionCandidate[] => {
    const postpaidMeters = METERS.filter(m =>
      m.meter_type === 'postpaid' && m.status === 'active' && m.unit_id
    )

    return postpaidMeters.map(meter => {
      // Find overdue utility charges for this unit
      const overdueCharges = CHARGES.filter(c =>
        c.unit_id === meter.unit_id &&
        (c.status === 'overdue' || c.status === 'pending') &&
        c.type.startsWith('utility')
      )
      const outstanding = overdueCharges.reduce((s, c) => s + (c.amount - (c.paid_amount ?? 0)), 0)

      // Simulate days overdue from due_date
      const oldestCharge = overdueCharges.sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
      let daysOverdue = 0
      if (oldestCharge) {
        const due = new Date(oldestCharge.due_date)
        const today = new Date('2026-06-13')
        daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      }

      let stage: DisconnectionCandidate['stage'] = 'clear'
      if (daysOverdue >= DISCONNECTION_CONFIG.formal_notice_days) stage = 'formal_due'
      else if (daysOverdue >= DISCONNECTION_CONFIG.reminder_notice_days) stage = 'reminder_due'
      else if (daysOverdue > 0) stage = 'overdue'

      return { meter, days_overdue: daysOverdue, outstanding_amount: outstanding, stage }
    }).filter(c => c.stage !== 'clear' || c.outstanding_amount > 0)
  }, [])

  const formalDue   = candidates.filter(c => c.stage === 'formal_due')
  const reminderDue = candidates.filter(c => c.stage === 'reminder_due')
  const overdueClear= candidates.filter(c => c.stage === 'overdue')

  function sendNotice(candidate: DisconnectionCandidate, type: 'reminder' | 'formal') {
    setSentNotices(prev => new Set([...prev, `${candidate.meter.id}_${type}`]))
    const label = type === 'formal' ? 'Formal disconnection notice' : 'Reminder notice'
    showToast(`✅ ${label} sent to ${candidate.meter.current_billing_person?.name ?? 'tenant'} (${candidate.meter.unit_label})`)
  }

  const stageBadge = (stage: DisconnectionCandidate['stage']) => {
    if (stage === 'formal_due')   return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Formal Notice Due</span>
    if (stage === 'reminder_due') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Reminder Due</span>
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Overdue</span>
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">{toast}</div>
      )}

      {/* Config summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-6">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Disconnection Ladder</p>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Day {DISCONNECTION_CONFIG.reminder_notice_days} — Reminder notice
            </span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Day {DISCONNECTION_CONFIG.formal_notice_days} — Formal disconnection notice
            </span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Physical disconnection (manual)
            </span>
          </div>
        </div>
        <a href="/settings" className="ml-auto text-xs text-teal-600 hover:underline whitespace-nowrap">
          Configure grace periods →
        </a>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{formalDue.length}</p>
          <p className="text-xs text-red-600 font-medium mt-1">Formal Notice Due</p>
          <p className="text-[11px] text-red-500">{DISCONNECTION_CONFIG.formal_notice_days}+ days overdue</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{reminderDue.length}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Reminder Due</p>
          <p className="text-[11px] text-amber-500">{DISCONNECTION_CONFIG.reminder_notice_days}–{DISCONNECTION_CONFIG.formal_notice_days - 1} days overdue</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{overdueClear.length}</p>
          <p className="text-xs text-gray-600 font-medium mt-1">Overdue (grace period)</p>
          <p className="text-[11px] text-gray-500">1–{DISCONNECTION_CONFIG.reminder_notice_days - 1} days overdue</p>
        </div>
      </div>

      {/* Meters table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center">
          <h4 className="text-sm font-semibold text-gray-900 flex-1">Postpaid Meters — Overdue Bills</h4>
          {formalDue.length > 0 && (
            <button
              onClick={() => formalDue.forEach(c => sendNotice(c, 'formal'))}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >
              Send All Formal Notices ({formalDue.length})
            </button>
          )}
        </div>
        {candidates.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            ✅ No postpaid meters with overdue bills.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Unit · Tenant</th>
                <th className="px-4 py-3 font-medium">Meter</th>
                <th className="px-4 py-3 font-medium">Utility</th>
                <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Days Overdue</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => {
                const reminderSent = sentNotices.has(`${c.meter.id}_reminder`)
                const formalSent   = sentNotices.has(`${c.meter.id}_formal`)
                return (
                  <tr key={c.meter.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.meter.unit_label}</p>
                      <p className="text-xs text-gray-500">{c.meter.current_billing_person?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-700">{c.meter.meter_number}</p>
                      <p className="text-[11px] text-gray-400">{c.meter.account_number}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs text-gray-600">{c.meter.utility_type.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {c.outstanding_amount > 0 ? `KES ${c.outstanding_amount.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${c.days_overdue >= DISCONNECTION_CONFIG.formal_notice_days ? 'text-red-600' : c.days_overdue >= DISCONNECTION_CONFIG.reminder_notice_days ? 'text-amber-600' : 'text-gray-600'}`}>
                        {c.days_overdue} days
                      </span>
                    </td>
                    <td className="px-4 py-3">{stageBadge(c.stage)}</td>
                    <td className="px-4 py-3">
                      {c.stage === 'formal_due' && (
                        <button
                          disabled={formalSent}
                          onClick={() => sendNotice(c, 'formal')}
                          className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                        >
                          {formalSent ? '✓ Sent' : 'Send Formal Notice'}
                        </button>
                      )}
                      {c.stage === 'reminder_due' && (
                        <button
                          disabled={reminderSent}
                          onClick={() => sendNotice(c, 'reminder')}
                          className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                        >
                          {reminderSent ? '✓ Sent' : 'Send Reminder'}
                        </button>
                      )}
                      {c.stage === 'overdue' && (
                        <span className="text-xs text-gray-400">In grace period</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Inventory Tab ──────────────────────────────────────────────────────────

const CATEGORY_ICON: Record<MeterCategory, string> = {
  water: '💧', electricity: '⚡', gas: '🔥',
}
const CATEGORY_LABEL: Record<MeterCategory, string> = {
  water: 'Water', electricity: 'Electricity', gas: 'Gas',
}

function InventoryTab({ onAssign }: { onAssign?: (m: MeterExtended) => void }) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<MeterCategory | 'all'>('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return INVENTORY_METERS.filter(m => {
      const matchSearch = !q ||
        m.serial_number.toLowerCase().includes(q) ||
        (m.make ?? '').toLowerCase().includes(q) ||
        (m.model ?? '').toLowerCase().includes(q)
      const matchCat = catFilter === 'all' || m.category === catFilter
      return matchSearch && matchCat
    })
  }, [search, catFilter])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Serial number, make, model…" containerClassName="w-64" />
        <Select
          value={catFilter}
          onChange={v => setCatFilter(v as MeterCategory | 'all')}
          options={[
            { value: 'all',         label: 'All categories' },
            { value: 'water',       label: '💧 Water' },
            { value: 'electricity', label: '⚡ Electricity' },
            { value: 'gas',         label: '🔥 Gas' },
          ]}
          className="w-44"
        />
        <p className="text-xs text-text-muted ml-auto">{filtered.length} meter{filtered.length !== 1 ? 's' : ''} in inventory</p>
      </div>

      {filtered.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-2xl mb-2">📦</p>
          <p className="text-sm font-medium text-text">No meters in inventory</p>
          <p className="text-xs text-text-muted mt-1">Meters registered without a unit assignment appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted dark:bg-dark-hover border-b border-surface-border dark:border-dark-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Serial Number</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Make / Model</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Billing</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Registered</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-base">{CATEGORY_ICON[m.category]}</span>
                    <span className="text-xs text-text-muted ml-1.5">{CATEGORY_LABEL[m.category]}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text">{m.serial_number}</td>
                  <td className="px-4 py-3 text-xs text-text">
                    {[m.make, m.model].filter(Boolean).join(' ') || <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-surface-muted dark:bg-dark-hover px-2 py-0.5 rounded border border-surface-border dark:border-dark-border text-text-muted capitalize">
                      {m.meter_subtype.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.billing_mode === 'prepaid' ? (
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">Prepaid</span>
                    ) : (
                      <span className="text-xs bg-surface-border dark:bg-dark-border text-text-muted px-2 py-0.5 rounded">Postpaid</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => onAssign?.(m)}>
                      Assign to Unit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border text-xs text-text-muted">
        <strong>Inventory</strong> holds meters registered without a unit assignment.
        Once assigned to a unit they move to the <strong>Meters</strong> tab and become active.
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────────────

export function UtilitiesPageClient() {
  const [readTarget, setReadTarget]     = useState<Meter | null>(null)
  const [showRead, setShowRead]         = useState(false)
  const [viewTarget, setViewTarget]     = useState<Meter | null>(null)
  const [showView, setShowView]         = useState(false)
  const [showAddMeter, setShowAddMeter] = useState(false)

  const consumerMeters = METERS.filter(m => !m.meter_role || m.meter_role === 'consumer')
  const latestBalance  = WATER_BALANCE_PERIODS[WATER_BALANCE_PERIODS.length - 1]
  const lossFlag       = latestBalance?.flagged

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Consumer Meters</p>
          <p className="text-2xl font-bold text-text">{consumerMeters.length}</p>
          <p className="text-xs text-text-muted">{consumerMeters.filter(m => m.status === 'active').length} active</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Smart Meters</p>
          <p className="text-2xl font-bold text-success">{METERS.filter(m => m.meter_type === 'smart').length}</p>
          <p className="text-xs text-text-muted">IoT auto-read</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Pending Billing</p>
          <p className="text-2xl font-bold text-warning">{METER_READINGS.filter(r => r.status === 'pending_bill').length}</p>
          <p className="text-xs text-text-muted">Readings not billed</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">In Inventory</p>
          <p className="text-2xl font-bold text-text">{INVENTORY_METERS.length}</p>
          <p className="text-xs text-text-muted">Awaiting assignment</p>
        </Card>
        <Card className={cn('p-4', lossFlag ? 'border-danger/40 bg-danger/5' : '')}>
          <p className="text-xs text-text-muted font-medium mb-1">Water Loss (Latest)</p>
          <p className={cn('text-2xl font-bold', lossColor(latestBalance?.loss_pct ?? 0))}>
            {latestBalance ? `${latestBalance.loss_pct.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-text-muted">{latestBalance?.period ?? 'No report yet'}{lossFlag ? ' Flagged' : ''}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="meters">
        <TabsList>
          <TabsTrigger value="meters">Meters</TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory
            {INVENTORY_METERS.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1">
                {INVENTORY_METERS.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="supply">Water Supply Chain</TabsTrigger>
          <TabsTrigger value="balance">
            Water Balance
            {lossFlag && (
              <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold">!</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="readings">Readings</TabsTrigger>
          <TabsTrigger value="disconnections">Disconnections</TabsTrigger>
        </TabsList>

        <TabsContent value="meters" className="pt-5">
          <MetersTab
            onRead={m => { setReadTarget(m); setShowRead(true) }}
            onView={m => { setViewTarget(m); setShowView(true) }}
            onAddMeter={() => setShowAddMeter(true)}
          />
        </TabsContent>
        <TabsContent value="inventory" className="pt-5">
          <InventoryTab onAssign={m => alert(`Assign ${m.serial_number} to unit — coming soon`)} />
        </TabsContent>
        <TabsContent value="supply" className="pt-5">
          <WaterSupplyTab />
        </TabsContent>
        <TabsContent value="balance" className="pt-5">
          <WaterBalanceTab />
        </TabsContent>
        <TabsContent value="readings" className="pt-5">
          <ReadingsTab />
        </TabsContent>
        <TabsContent value="disconnections" className="pt-5">
          <DisconnectionTab />
        </TabsContent>
      </Tabs>

      <ReadingEntryModal meter={readTarget} open={showRead} onClose={() => setShowRead(false)} />
      <MeterDetailDrawer meter={viewTarget} open={showView} onClose={() => setShowView(false)} />
      <AddMeterModal open={showAddMeter} onClose={() => setShowAddMeter(false)} />
    </main>
  )
}
