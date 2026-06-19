'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
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
  METER_TYPE_HISTORY,
  INVENTORY_METERS,
} from '@/lib/mock-data'
import type {
  MeterTypeHistory,
  UtilityType, MeterType, MeterRole,
  WaterSupplier, ReserveTank, WaterZone, WaterBalancePeriod,
  MeterExtended, MeterCategory,
  Meter,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import { getAllMeters, getMeterReadings, getReadingsForMeter, createMeterReading, updateReadingStatus } from '@/lib/api/meters'
import type { MeterData, MeterReadingData } from '@/lib/api/meters'
import {
  getWaterSuppliers, createWaterSupplier, updateWaterSupplier, toggleWaterSupplier,
  getReserveTanks, createReserveTank, updateReserveTank, updateTankLevel,
  getWaterZones, createWaterZone, updateWaterZone, deleteWaterZone,
  getWaterBalancePeriods, createWaterBalancePeriod, updateWaterBalancePeriod, deleteWaterBalancePeriod,
} from '@/lib/api/water'
import type { WaterSupplierData, ReserveTankData, WaterZoneData, WaterBalancePeriodData } from '@/lib/api/water'
import { getUnitsFromApi } from '@/lib/api/units'
import type { UnitData } from '@/lib/api/units'
import { getOverdueUtilityCharges, getDisconnectionNotices, sendDisconnectionNotice } from '@/lib/api/disconnection'
import type { DisconnectionNoticeData } from '@/lib/api/disconnection'
import type { ChargeData } from '@/lib/api/charges'

// ── Helpers ────────────────────────────────────────────────────────────────

function utilityLabel(u: string): string {
  const MAP: Record<string, string> = {
    water: 'Water', sewerage: 'Sewerage', water_sewer: 'Water & Sewer',
    electricity: 'Electricity', gas_piped: 'Gas (Piped)', gas_cylinder: 'Gas (Cylinder)',
    internet: 'Internet',
  }
  return MAP[u] ?? u
}
function utilityIcon(u: string): string {
  const MAP: Record<string, string> = {
    water: '💧', sewerage: '🚰', water_sewer: '💧',
    electricity: '⚡', gas_piped: '🔥', gas_cylinder: '🔥', internet: '📶',
  }
  return MAP[u] ?? '📊'
}
function meterTypeBadge(t: string) {
  const styles: Record<string, { label: string; cls: string }> = {
    postpaid: { label: 'Postpaid', cls: 'bg-surface-border text-text-muted' },
    prepaid:  { label: 'Prepaid',  cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
    smart:    { label: 'Smart ⚡',  cls: 'bg-success/10 text-success' },
  }
  const s = styles[t] ?? { label: t, cls: 'bg-surface-border text-text-muted' }
  return <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', s.cls)}>{s.label}</span>
}
function meterRoleBadge(role: string | undefined | null) {
  if (!role || role === 'consumer') return null
  const MAP: Record<string, { label: string; cls: string }> = {
    supplier:      { label: '⬆ Supplier',     cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
    tank_inflow:   { label: '→ Tank In',       cls: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
    tank_outflow:  { label: '← Tank Out',      cls: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300' },
    distribution:  { label: '⬇ Distribution',  cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' },
  }
  const s = MAP[role]
  if (!s) return null
  return <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', s.cls)}>{s.label}</span>
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

function readingActionLabel(meterType: string): string {
  if (meterType === 'prepaid') return 'Log Vending Issue'
  if (meterType === 'smart') return 'Manual Override'
  return 'Enter Reading'
}

// ── Reading Entry Modal ────────────────────────────────────────────────────

function ReadingEntryModal({
  meter, open, onClose, onSaved,
}: {
  meter: MeterData | null
  open: boolean
  onClose: () => void
  onSaved?: () => void
}) {
  const [reading, setReading]     = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [billingPeriod, setBp]    = useState('')
  const [unitCost, setUnitCost]   = useState('')
  const [mgmtFee, setMgmtFee]     = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (open && meter) {
      setReading('')
      setDate(new Date().toISOString().slice(0, 10))
      setBp('')
      setUnitCost('')
      setMgmtFee(meter.management_fee_pct?.toString() ?? '')
      setNotes('')
      setError(null)
    }
  }, [open, meter])

  if (!meter) return null
  const prev = meter.last_reading ?? 0
  const consumed = reading ? Math.max(0, Number(reading) - prev) : 0
  const subtotal = consumed * Number(unitCost || 0)
  const fee      = mgmtFee ? subtotal * (Number(mgmtFee) / 100) : 0
  const total    = subtotal + fee
  const isPrepaid = meter.meter_type === 'prepaid'
  const isSmart   = meter.meter_type === 'smart'

  async function handleSave() {
    if (!reading) { setError('Current reading is required.'); return }
    if (!meter) return
    setSaving(true)
    setError(null)
    try {
      await createMeterReading(meter.id, {
        current_value:       Number(reading),
        reading_date:        date || undefined,
        billing_period:      billingPeriod || undefined,
        unit_cost:           unitCost ? Number(unitCost) : undefined,
        management_fee_pct:  mgmtFee ? Number(mgmtFee) : undefined,
        notes:               notes || undefined,
        source:              isPrepaid ? 'vending_issue' : isSmart ? 'manual' : 'manual',
      })
      onSaved?.()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save reading.')
    } finally {
      setSaving(false)
    }
  }

  const modalTitle = isPrepaid
    ? `Log Vending Issue — ${meter.meter_number}`
    : isSmart
    ? `Manual Override — ${meter.meter_number}`
    : `Enter Reading — ${meter.meter_number}`

  return (
    <Modal open={open} onClose={onClose} title={modalTitle} size="md">
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
            <p className="font-medium text-text">{Number(prev).toLocaleString()}</p>
          </div>
        </div>
        {isPrepaid && (
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            ⚠️ <strong>Prepaid meter</strong> — vending units recorded for tracking only, no charge generated.
          </div>
        )}
        {isSmart && (
          <div className="p-3 rounded-lg bg-success/10 text-sm text-success border border-success/20">
            ⚡ <strong>Smart meter</strong> — auto-collected via IoT. This manual entry overrides the sensor reading.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              {isPrepaid ? 'Units Issued' : 'Current Reading'}
            </label>
            <input type="number" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={isPrepaid ? 'Units from vending' : `> ${prev}`} value={reading} onChange={e => setReading(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reading Date</label>
            <input type="date" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Billing Period (e.g. Jun 2026)</label>
          <input type="text" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Jun 2026" value={billingPeriod} onChange={e => setBp(e.target.value)} />
        </div>
        {!isPrepaid && (
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
        {consumed > 0 && !isPrepaid && (
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
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !reading}>
            {saving ? 'Saving…' : isPrepaid ? 'Log Issue' : isSmart ? 'Save Override' : 'Save Reading'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Meter Detail Drawer ────────────────────────────────────────────────────

function MeterDetailDrawer({ meter, open, onClose }: { meter: MeterData | null; open: boolean; onClose: () => void }) {
  const [readings, setReadings] = useState<MeterReadingData[]>([])
  const [loadingR, setLoadingR] = useState(false)
  const history = useMemo(() => meter ? METER_TYPE_HISTORY.filter((h: MeterTypeHistory) => h.meter_id === meter.id) : [], [meter])

  useEffect(() => {
    if (open && meter) {
      setLoadingR(true)
      getReadingsForMeter(meter.id)
        .then(setReadings)
        .catch(() => setReadings([]))
        .finally(() => setLoadingR(false))
    }
  }, [open, meter])

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
            <p className="font-medium text-text font-mono text-xs">{meter.account_number ?? '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
            <p className="text-xs text-text-muted">Last Reading</p>
            <p className="font-medium text-text">{meter.last_reading != null ? Number(meter.last_reading).toLocaleString() : '—'}</p>
            <p className="text-[11px] text-text-muted">{meter.last_reading_date ?? ''}</p>
          </div>
          {meter.current_billing_person && (
            <div className="col-span-2 p-3 rounded-lg bg-surface-muted dark:bg-dark-card">
              <p className="text-xs text-text-muted">Billed To</p>
              <p className="font-medium text-text">{meter.current_billing_person.name}</p>
              <p className="text-[11px] text-text-muted">{meter.billing_arrangement?.replace(/_/g, ' ')}</p>
            </div>
          )}
          {meter.management_fee_pct != null && (
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
            {loadingR ? (
              <p className="text-sm text-text-muted py-4 text-center">Loading…</p>
            ) : readings.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">No readings recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {readings.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-text">{r.billing_period ?? r.reading_date ?? '—'}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                        r.status === 'billed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      )}>{r.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
                      <div><p>Prev → Current</p><p className="text-text font-medium">{r.previous_value} → {r.current_value}</p></div>
                      <div><p>Consumed</p><p className="text-text font-medium">{r.units_consumed} units</p></div>
                      <div><p>Amount</p><p className="text-text font-medium">KES {Number(r.amount_due).toLocaleString()}</p></div>
                    </div>
                    {r.management_fee != null && (
                      <p className="text-[11px] text-text-muted mt-1">+ KES {Number(r.management_fee).toLocaleString()} mgmt fee · {r.source}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="history">
            <div className="space-y-2">
              {history.length === 0
                ? <p className="text-sm text-text-muted py-4 text-center">No meter type migrations recorded.</p>
                : history.map((h: MeterTypeHistory) => (
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

function MetersTab({
  meters, loading, onRead, onView, onAddMeter,
}: {
  meters: MeterData[]
  loading: boolean
  onRead: (m: MeterData) => void
  onView: (m: MeterData) => void
  onAddMeter: () => void
}) {
  const [search, setSearch]   = useState('')
  const [utility, setUtility] = useState('all')
  const [type, setType]       = useState('all')
  const [role, setRole]       = useState('all')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return meters.filter(m => {
      const matchSearch  = !q || (m.unit_label ?? '').toLowerCase().includes(q) || m.meter_number.toLowerCase().includes(q) || (m.current_billing_person?.name ?? '').toLowerCase().includes(q)
      const matchUtility = utility === 'all' || m.utility_type === utility
      const matchType    = type === 'all' || m.meter_type === type
      const matchRole    = role === 'all' || (role === 'consumer' ? !m.meter_role || m.meter_role === 'consumer' : m.meter_role === role)
      return matchSearch && matchUtility && matchType && matchRole
    })
  }, [meters, search, utility, type, role])

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
      {loading ? (
        <p className="py-12 text-center text-text-muted text-sm">Loading meters…</p>
      ) : filtered.length === 0 ? (
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
                        <span className="font-semibold">{Number(m.last_reading).toLocaleString()}</span>
                        <span className="block text-[11px] text-text-muted">{m.last_reading_date}</span>
                      </>
                    ) : <span className="text-text-muted">—</span>}
                  </td>
                  <td className={TD}>
                    {m.current_billing_person ? (
                      <>
                        <span>{m.current_billing_person.name}</span>
                        {m.management_fee_pct != null && (
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
                        <>
                          <span className="text-[11px] text-success whitespace-nowrap">⚡ Auto</span>
                          <span className="text-text-muted">·</span>
                          <CanDo action="write" resource={{ type: 'unit' }}>
                            <button onClick={() => onRead(m)} className="text-xs font-medium text-text-muted hover:text-text whitespace-nowrap">
                              Override
                            </button>
                          </CanDo>
                        </>
                      ) : (
                        <CanDo action="write" resource={{ type: 'unit' }}>
                          <button
                            onClick={() => onRead(m)}
                            className="text-xs font-medium text-primary-600 hover:underline whitespace-nowrap"
                          >
                            {readingActionLabel(m.meter_type)}
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
  const pct = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0
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

// ── Water Supply Chain Modals ──────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'
const LABEL = 'block text-xs font-medium text-text-muted mb-1'

const SOURCE_TYPES = ['municipal', 'borehole', 'tanker', 'rainwater', 'other']

function SupplierModal({
  open, onClose, onSaved, existing, meters,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing: WaterSupplierData | null
  meters: MeterData[]
}) {
  const [name, setName]       = useState('')
  const [sourceType, setSrc]  = useState('municipal')
  const [contactName, setCN]  = useState('')
  const [contactPhone, setCP] = useState('')
  const [rate, setRate]       = useState('')
  const [meterId, setMId]     = useState('')
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? '')
      setSrc(existing?.sourceType ?? 'municipal')
      setCN(existing?.contactName ?? '')
      setCP(existing?.contactPhone ?? '')
      setRate(existing?.contractedRatePerM3?.toString() ?? '')
      setMId(existing?.meterIds ?? '')
      setNotes(existing?.notes ?? '')
      setError(null)
    }
  }, [open, existing])

  const supplierMeters = meters.filter(m => !m.meter_role || m.meter_role === 'supplier')

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name: name.trim(), sourceType, contactName: contactName || null,
        contactPhone: contactPhone || null, contractedRatePerM3: rate ? Number(rate) : null,
        currency: 'KES', active: existing?.active ?? true,
        meterIds: meterId || null, notes: notes || null,
      }
      if (existing) await updateWaterSupplier(existing.id, payload)
      else await createWaterSupplier(payload)
      onSaved(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Supplier' : 'Add Water Supplier'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL}>Supplier Name *</label>
            <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Nairobi Water" />
          </div>
          <div>
            <label className={LABEL}>Source Type</label>
            <select className={INPUT} value={sourceType} onChange={e => setSrc(e.target.value)}>
              {SOURCE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Rate (KES/m³)</label>
            <input type="number" className={INPUT} value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g. 85" />
          </div>
          <div>
            <label className={LABEL}>Contact Name</label>
            <input className={INPUT} value={contactName} onChange={e => setCN(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={LABEL}>Contact Phone</label>
            <input className={INPUT} value={contactPhone} onChange={e => setCP(e.target.value)} placeholder="Optional" />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Inflow Meter</label>
            <select className={INPUT} value={meterId} onChange={e => setMId(e.target.value)}>
              <option value="">— None —</option>
              {supplierMeters.map(m => (
                <option key={m.id} value={m.id}>{m.meter_number}{m.unit_label ? ` (${m.unit_label})` : ''}</option>
              ))}
              {/* Also show any meter if none are tagged as supplier role yet */}
              {supplierMeters.length === 0 && meters.map(m => (
                <option key={m.id} value={m.id}>{m.meter_number}{m.unit_label ? ` (${m.unit_label})` : ''}</option>
              ))}
            </select>
            <p className="text-[11px] text-text-muted mt-1">Select meter with role "Supplier" — set meter role in the Meters tab first.</p>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Notes</label>
            <textarea className={INPUT} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Supplier'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function TankModal({
  open, onClose, onSaved, existing, meters,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing: ReserveTankData | null
  meters: MeterData[]
}) {
  const [name, setName]           = useState('')
  const [capacity, setCapacity]   = useState('')
  const [location, setLocation]   = useState('')
  const [compartments, setComp]   = useState('1')
  const [threshold, setThresh]    = useState('20')
  const [inflowId, setInflowId]   = useState('')
  const [outflowId, setOutflowId] = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? '')
      setCapacity(existing?.capacityM3?.toString() ?? '')
      setLocation(existing?.location ?? '')
      setComp(existing?.compartments?.toString() ?? '1')
      setThresh(existing?.lowLevelThresholdPct?.toString() ?? '20')
      // Parse first ID from comma-sep for single-select simplicity
      setInflowId((existing?.inflowMeterIds ?? '').split(',')[0]?.trim() ?? '')
      setOutflowId((existing?.outflowMeterIds ?? '').split(',')[0]?.trim() ?? '')
      setNotes(existing?.notes ?? '')
      setError(null)
    }
  }, [open, existing])

  const inflowMeters  = meters.filter(m => m.meter_role === 'tank_inflow')
  const outflowMeters = meters.filter(m => m.meter_role === 'tank_outflow')
  // Fallback: show all meters if none are role-tagged
  const inflowOpts  = inflowMeters.length > 0 ? inflowMeters : meters
  const outflowOpts = outflowMeters.length > 0 ? outflowMeters : meters

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name: name.trim(), capacityM3: capacity ? Number(capacity) : null,
        currentLevelM3: existing?.currentLevelM3 ?? 0,
        location: location || null, compartments: Number(compartments) || 1,
        inflowMeterIds: inflowId || null, outflowMeterIds: outflowId || null,
        lowLevelThresholdPct: Number(threshold) || 20, notes: notes || null,
      }
      if (existing) await updateReserveTank(existing.id, payload)
      else await createReserveTank(payload)
      onSaved(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Reserve Tank' : 'Add Reserve Tank'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL}>Tank Name *</label>
            <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main Rooftop Tank" />
          </div>
          <div>
            <label className={LABEL}>Capacity (m³)</label>
            <input type="number" className={INPUT} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="e.g. 50" />
          </div>
          <div>
            <label className={LABEL}>Location</label>
            <input className={INPUT} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Rooftop Block A" />
          </div>
          <div>
            <label className={LABEL}>Compartments</label>
            <input type="number" className={INPUT} value={compartments} onChange={e => setComp(e.target.value)} min="1" />
          </div>
          <div>
            <label className={LABEL}>Low Level Alert (%)</label>
            <input type="number" className={INPUT} value={threshold} onChange={e => setThresh(e.target.value)} min="1" max="99" />
          </div>
          <div>
            <label className={LABEL}>Inflow Meter</label>
            <select className={INPUT} value={inflowId} onChange={e => setInflowId(e.target.value)}>
              <option value="">— None —</option>
              {inflowOpts.map(m => <option key={m.id} value={m.id}>{m.meter_number}{m.unit_label ? ` (${m.unit_label})` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Outflow Meter</label>
            <select className={INPUT} value={outflowId} onChange={e => setOutflowId(e.target.value)}>
              <option value="">— None —</option>
              {outflowOpts.map(m => <option key={m.id} value={m.id}>{m.meter_number}{m.unit_label ? ` (${m.unit_label})` : ''}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Notes</label>
            <textarea className={INPUT} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Tank'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function TankLevelModal({
  open, onClose, onSaved, tank,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  tank: ReserveTankData | null
}) {
  const [level, setLevel]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (open && tank) { setLevel(tank.currentLevelM3?.toString() ?? '0'); setError(null) }
  }, [open, tank])

  if (!tank) return null

  async function handleSave() {
    if (!tank) return
    const val = parseFloat(level)
    if (isNaN(val) || val < 0) { setError('Enter a valid level.'); return }
    if (tank.capacityM3 != null && val > Number(tank.capacityM3)) { setError(`Cannot exceed capacity of ${tank.capacityM3} m³.`); return }
    setSaving(true); setError(null)
    try {
      await updateTankLevel(tank.id, val)
      onSaved(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update.')
    } finally { setSaving(false) }
  }

  const pct = tank.capacityM3 && Number(tank.capacityM3) > 0
    ? Math.min(100, Math.round((parseFloat(level || '0') / Number(tank.capacityM3)) * 100))
    : null

  return (
    <Modal open={open} onClose={onClose} title={`Update Tank Level — ${tank.name}`} size="sm">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card text-sm flex gap-6">
          <div>
            <p className="text-xs text-text-muted">Capacity</p>
            <p className="font-medium text-text">{tank.capacityM3 != null ? `${tank.capacityM3} m³` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Current (recorded)</p>
            <p className="font-medium text-text">{tank.currentLevelM3} m³</p>
          </div>
        </div>
        <div>
          <label className={LABEL}>New Current Level (m³)</label>
          <input type="number" className={INPUT} value={level} onChange={e => setLevel(e.target.value)}
            placeholder="e.g. 32.5" min="0" step="0.001" />
          {pct !== null && (
            <p className="text-xs text-text-muted mt-1">
              That's <span className={cn('font-semibold', pct < 25 ? 'text-danger' : pct < 50 ? 'text-warning' : 'text-success')}>{pct}%</span> of capacity.
            </p>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Update Level'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ZoneModal({
  open, onClose, onSaved, existing, meters, tanks,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  existing: WaterZoneData | null
  meters: MeterData[]
  tanks: ReserveTankData[]
}) {
  const [name, setName]       = useState('')
  const [description, setDesc]= useState('')
  const [tankId, setTankId]   = useState('')
  const [distMeterId, setDist]= useState('')
  const [selectedUnitIds, setUnits] = useState<string[]>([])
  const [unitSearch, setUSearch]    = useState('')
  const [allUnits, setAllUnits]     = useState<UnitData[]>([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? '')
      setDesc(existing?.description ?? '')
      setTankId(existing?.tankId ?? '')
      setDist(existing?.distributionMeterId ?? '')
      setUnits((existing?.unitIds ?? '').split(',').filter(Boolean))
      setUSearch('')
      setError(null)
      getUnitsFromApi().then(setAllUnits).catch(() => {})
    }
  }, [open, existing])

  const distMeters = meters.filter(m => m.meter_role === 'distribution')
  const distOpts   = distMeters.length > 0 ? distMeters : meters

  const filteredUnits = useMemo(() => {
    const q = unitSearch.toLowerCase()
    return q ? allUnits.filter(u => u.unit_label.toLowerCase().includes(q)) : allUnits
  }, [allUnits, unitSearch])

  function toggleUnit(id: string) {
    setUnits(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name: name.trim(), description: description || null,
        tankId: tankId || null, distributionMeterId: distMeterId || null,
        unitIds: selectedUnitIds.join(',') || null,
      }
      if (existing) await updateWaterZone(existing.id, payload)
      else await createWaterZone(payload)
      onSaved(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit Zone' : 'Add Distribution Zone'} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={LABEL}>Zone Name *</label>
            <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Block A — Upper Floors" />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Description</label>
            <input className={INPUT} value={description} onChange={e => setDesc(e.target.value)} placeholder="Optional description" />
          </div>
          <div>
            <label className={LABEL}>Reserve Tank</label>
            <select className={INPUT} value={tankId} onChange={e => setTankId(e.target.value)}>
              <option value="">— None —</option>
              {tanks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Distribution Meter</label>
            <select className={INPUT} value={distMeterId} onChange={e => setDist(e.target.value)}>
              <option value="">— None —</option>
              {distOpts.map(m => <option key={m.id} value={m.id}>{m.meter_number}{m.unit_label ? ` (${m.unit_label})` : ''}</option>)}
            </select>
          </div>
        </div>

        {/* Unit assignment */}
        <div>
          <label className={LABEL}>Units in this Zone ({selectedUnitIds.length} selected)</label>
          <input className={cn(INPUT, 'mb-2')} placeholder="Search units…" value={unitSearch} onChange={e => setUSearch(e.target.value)} />
          <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-border dark:border-dark-border divide-y divide-surface-border dark:divide-dark-border">
            {filteredUnits.length === 0 ? (
              <p className="px-3 py-4 text-xs text-text-muted text-center">No units found.</p>
            ) : filteredUnits.map(u => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-muted dark:hover:bg-dark-hover cursor-pointer">
                <input type="checkbox" checked={selectedUnitIds.includes(u.id)}
                  onChange={() => toggleUnit(u.id)}
                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500" />
                <span className="text-sm text-text">{u.unit_label}</span>
                <span className="text-xs text-text-muted ml-auto capitalize">{u.unit_type?.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : existing ? 'Save Changes' : 'Add Zone'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── WaterSupplyTab ─────────────────────────────────────────────────────────

function WaterSupplyTab({
  suppliers, tanks, zones, meters, loading, onRefresh,
}: {
  suppliers: WaterSupplierData[]
  tanks: ReserveTankData[]
  zones: WaterZoneData[]
  meters: MeterData[]
  loading: boolean
  onRefresh: () => void
}) {
  const tank = tanks[0] ?? null

  // Modal state
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editSupplier, setEditSupplier]           = useState<WaterSupplierData | null>(null)
  const [showTankModal, setShowTankModal]         = useState(false)
  const [editTank, setEditTank]                   = useState<ReserveTankData | null>(null)
  const [showLevelModal, setShowLevelModal]       = useState(false)
  const [levelTank, setLevelTank]                 = useState<ReserveTankData | null>(null)
  const [showZoneModal, setShowZoneModal]         = useState(false)
  const [editZone, setEditZone]                   = useState<WaterZoneData | null>(null)
  const [togglingId, setTogglingId]               = useState<string | null>(null)
  const [deletingZoneId, setDeletingZoneId]       = useState<string | null>(null)
  const [confirmDeleteZone, setConfirmDeleteZone] = useState<WaterZoneData | null>(null)

  function findMeterById(id: string | null | undefined): MeterData | undefined {
    if (!id) return undefined
    return meters.find(m => m.id === id)
  }

  function supplierMeter(s: WaterSupplierData): MeterData | undefined {
    const ids = (s.meterIds ?? '').split(',').map(x => x.trim()).filter(Boolean)
    return meters.find(m => ids.includes(m.id))
  }

  const tankOutMeter = tank
    ? meters.find(m => (tank.outflowMeterIds ?? '').split(',').map(x => x.trim()).includes(m.id))
    : undefined

  async function handleToggleSupplier(s: WaterSupplierData) {
    setTogglingId(s.id)
    try { await toggleWaterSupplier(s.id); onRefresh() }
    catch { /* ignore */ }
    finally { setTogglingId(null) }
  }

  async function handleDeleteZone(z: WaterZoneData) {
    setDeletingZoneId(z.id)
    try { await deleteWaterZone(z.id); onRefresh() }
    catch { /* ignore */ }
    finally { setDeletingZoneId(null); setConfirmDeleteZone(null) }
  }

  if (loading) return <p className="py-12 text-center text-text-muted text-sm">Loading water supply chain…</p>

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

      {/* ── Suppliers ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
            Water Suppliers
          </h3>
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" variant="outline" onClick={() => { setEditSupplier(null); setShowSupplierModal(true) }}>
              + Add Supplier
            </Button>
          </CanDo>
        </div>
        {suppliers.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No suppliers configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suppliers.map(s => {
              const meter = supplierMeter(s)
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-text">{s.name}</p>
                      <p className="text-xs text-text-muted capitalize">{(s.sourceType ?? '').replace('_', ' ')}</p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium', s.active ? 'bg-success/10 text-success' : 'bg-surface-border text-text-muted')}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-xs text-text-muted">Rate</p>
                      <p className="font-medium text-text">{s.contractedRatePerM3 != null ? `KES ${s.contractedRatePerM3}/m³` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Meter</p>
                      <p className="font-medium text-text font-mono text-xs">{meter?.meter_number ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Last Reading</p>
                      <p className="font-medium text-text">{meter?.last_reading != null ? `${Number(meter.last_reading).toLocaleString()} m³` : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Read Date</p>
                      <p className="font-medium text-text">{meter?.last_reading_date ?? '—'}</p>
                    </div>
                  </div>
                  {s.notes && <p className="text-xs text-text-muted italic mb-3">{s.notes}</p>}
                  <CanDo action="write" resource={{ type: 'unit' }}>
                    <div className="flex items-center gap-2 pt-2 border-t border-surface-border dark:border-dark-border">
                      <button onClick={() => { setEditSupplier(s); setShowSupplierModal(true) }}
                        className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                      <span className="text-text-muted">·</span>
                      <button
                        onClick={() => handleToggleSupplier(s)}
                        disabled={togglingId === s.id}
                        className={cn('text-xs font-medium hover:underline', s.active ? 'text-danger' : 'text-success')}
                      >
                        {togglingId === s.id ? '…' : s.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </CanDo>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Reserve Tank ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
            Reserve Tank
          </h3>
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" variant="outline" onClick={() => { setEditTank(null); setShowTankModal(true) }}>
              + Add Tank
            </Button>
          </CanDo>
        </div>
        {!tank ? (
          <p className="text-sm text-text-muted py-4 text-center">No reserve tanks configured yet.</p>
        ) : (
          <Card className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-text">{tank.name}</p>
                <p className="text-xs text-text-muted">{tank.location ?? '—'} · {tank.compartments} compartment{tank.compartments !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-text-muted">Outflow Meter</p>
                <p className="font-mono text-xs text-text">{tankOutMeter?.meter_number ?? '—'}</p>
                <p className="text-xs text-text-muted">Last: {tankOutMeter?.last_reading != null ? `${Number(tankOutMeter.last_reading).toLocaleString()} m³` : '—'}</p>
              </div>
            </div>
            {tank.capacityM3 != null && tank.capacityM3 > 0 ? (
              <TankLevelBar current={Number(tank.currentLevelM3)} capacity={Number(tank.capacityM3)} />
            ) : (
              <p className="text-xs text-text-muted">Capacity not configured</p>
            )}
            {tank.capacityM3 != null && tank.capacityM3 > 0 && Number(tank.currentLevelM3) < Number(tank.capacityM3) * (tank.lowLevelThresholdPct / 100) && (
              <div className="mt-3 p-2 rounded bg-danger/10 border border-danger/20 text-xs text-danger font-medium">
                ⚠️ Tank below {tank.lowLevelThresholdPct}% threshold — consider activating borehole or ordering tanker.
              </div>
            )}
            {tank.notes && <p className="mt-3 text-xs text-text-muted italic">{tank.notes}</p>}
            <CanDo action="write" resource={{ type: 'unit' }}>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-border dark:border-dark-border">
                <button onClick={() => { setEditTank(tank); setShowTankModal(true) }}
                  className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                <span className="text-text-muted">·</span>
                <button onClick={() => { setLevelTank(tank); setShowLevelModal(true) }}
                  className="text-xs font-medium text-teal-600 hover:underline">Update Level</button>
              </div>
            </CanDo>
          </Card>
        )}
      </div>

      {/* ── Distribution Zones ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">3</span>
            Distribution Zones
          </h3>
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" variant="outline" onClick={() => { setEditZone(null); setShowZoneModal(true) }}>
              + Add Zone
            </Button>
          </CanDo>
        </div>
        {zones.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No distribution zones configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.map(z => {
              const distMeter = findMeterById(z.distributionMeterId)
              const unitCount = (z.unitIds ?? '').split(',').filter(Boolean).length
              return (
                <Card key={z.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-text">{z.name}</p>
                      <p className="text-xs text-text-muted">{z.description}</p>
                    </div>
                    <span className="text-xs text-text-muted">{unitCount} unit{unitCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-xs text-text-muted">Zone Meter</p>
                      <p className="font-medium text-text font-mono text-xs">{distMeter?.meter_number ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Last Reading</p>
                      <p className="font-medium text-text">{distMeter?.last_reading != null ? `${Number(distMeter.last_reading).toLocaleString()} m³` : '—'}</p>
                    </div>
                  </div>
                  <CanDo action="write" resource={{ type: 'unit' }}>
                    <div className="flex items-center gap-2 pt-2 border-t border-surface-border dark:border-dark-border">
                      <button onClick={() => { setEditZone(z); setShowZoneModal(true) }}
                        className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                      <span className="text-text-muted">·</span>
                      <button onClick={() => setConfirmDeleteZone(z)}
                        className="text-xs font-medium text-danger hover:underline">Delete</button>
                    </div>
                  </CanDo>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <SupplierModal
        open={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSaved={() => { setShowSupplierModal(false); onRefresh() }}
        existing={editSupplier}
        meters={meters}
      />
      <TankModal
        open={showTankModal}
        onClose={() => setShowTankModal(false)}
        onSaved={() => { setShowTankModal(false); onRefresh() }}
        existing={editTank}
        meters={meters}
      />
      <TankLevelModal
        open={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        onSaved={() => { setShowLevelModal(false); onRefresh() }}
        tank={levelTank}
      />
      <ZoneModal
        open={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        onSaved={() => { setShowZoneModal(false); onRefresh() }}
        existing={editZone}
        meters={meters}
        tanks={tanks}
      />

      {/* Delete Zone confirmation */}
      {confirmDeleteZone && (
        <Modal open={!!confirmDeleteZone} onClose={() => setConfirmDeleteZone(null)} title="Delete Zone" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-text">Are you sure you want to delete <strong>{confirmDeleteZone.name}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteZone(null)} disabled={!!deletingZoneId}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteZone(confirmDeleteZone)} disabled={!!deletingZoneId}>
                {deletingZoneId ? 'Deleting…' : 'Delete Zone'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── WaterBalanceTab ────────────────────────────────────────────────────────

function WaterBalanceTab({
  periods, suppliers, zones, loading, onRefresh,
}: {
  periods: WaterBalancePeriodData[]
  suppliers: WaterSupplierData[]
  zones: WaterZoneData[]
  loading: boolean
  onRefresh: () => void
}) {
  const [selected, setSelected]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<WaterBalancePeriodData | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    if (periods.length > 0 && !selected) {
      setSelected(periods[periods.length - 1].id)
    }
  }, [periods, selected])

  const period      = periods.find(p => p.id === selected)
  const periodOpts  = [...periods].reverse().map(p => ({
    value: p.id,
    label: `${p.period}${p.flagged ? ' ⚠️' : ''}`,
  }))

  // ── Create / Edit form state ────────────────────────────────────────────
  const blankForm = () => ({
    period: '', totalInflowM3: '', totalOutflowM3: '',
    tankLevelStartM3: '', tankLevelEndM3: '', notes: '',
    zoneRows: zones.map(z => ({ zoneId: z.id, zoneName: z.name, distributionM3: '', consumerM3: '' })),
  })
  const [form, setForm] = useState(blankForm)

  function openCreate() {
    setForm(blankForm())
    setEditTarget(null)
    setShowCreate(true)
  }
  function openEdit(p: WaterBalancePeriodData) {
    setForm({
      period: p.period,
      totalInflowM3: String(p.totalInflowM3),
      totalOutflowM3: String(p.totalOutflowM3),
      tankLevelStartM3: String(p.tankLevelStartM3),
      tankLevelEndM3: String(p.tankLevelEndM3),
      notes: p.notes ?? '',
      zoneRows: p.zoneBreakdown.length > 0
        ? p.zoneBreakdown.map(z => ({
            zoneId: z.zoneId, zoneName: z.zoneName,
            distributionM3: String(z.distributionM3), consumerM3: String(z.consumerM3),
          }))
        : zones.map(z => ({ zoneId: z.id, zoneName: z.name, distributionM3: '', consumerM3: '' })),
    })
    setEditTarget(p)
    setShowCreate(true)
  }

  // Live loss preview
  const inflow   = parseFloat(form.totalInflowM3)  || 0
  const outflow  = parseFloat(form.totalOutflowM3) || 0
  const tankStart = parseFloat(form.tankLevelStartM3) || 0
  const tankEnd   = parseFloat(form.tankLevelEndM3)   || 0
  const tankChg  = tankEnd - tankStart
  const grossLoss = inflow - outflow - tankChg
  const previewLossPct = inflow > 0 ? (grossLoss / inflow) * 100 : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        period: form.period,
        totalInflowM3: parseFloat(form.totalInflowM3),
        totalOutflowM3: parseFloat(form.totalOutflowM3),
        tankLevelStartM3: parseFloat(form.tankLevelStartM3),
        tankLevelEndM3: parseFloat(form.tankLevelEndM3),
        notes: form.notes || undefined,
        zoneBreakdown: form.zoneRows
          .filter(r => r.distributionM3 && r.consumerM3)
          .map(r => ({
            zoneId: r.zoneId, zoneName: r.zoneName,
            distributionM3: parseFloat(r.distributionM3),
            consumerM3: parseFloat(r.consumerM3),
          })),
      }
      const saved = editTarget
        ? await updateWaterBalancePeriod(editTarget.id, payload)
        : await createWaterBalancePeriod(payload)
      setShowCreate(false)
      setSelected(saved.id)
      onRefresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save balance period')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!period || !confirm(`Delete balance report for ${period.period}?`)) return
    setDeleting(true)
    try {
      await deleteWaterBalancePeriod(period.id)
      setSelected('')
      onRefresh()
    } catch {
      alert('Failed to delete period')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <p className="py-12 text-center text-text-muted text-sm">Loading…</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        {periods.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Period</label>
            <select value={selected} onChange={e => setSelected(e.target.value)}
              className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
              {periodOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
        {period?.flagged && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger font-medium">
            ⚠️ Loss exceeds 10% threshold — investigation recommended
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {period && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(period)}>Edit</Button>
              <Button variant="ghost" size="sm" className="text-danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </>
          )}
          <Button size="sm" onClick={openCreate}>+ New Period</Button>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-2xl mb-2">💧</p>
          <p className="text-sm font-medium text-text mb-1">No balance reports yet</p>
          <p className="text-xs text-text-muted mb-4">Create your first monthly water balance report to track system loss.</p>
          <Button size="sm" onClick={openCreate}>+ New Period</Button>
        </div>
      ) : period ? (
        <>
          {/* Balance summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Inflow',  value: `${period.totalInflowM3} m³`,  sub: 'All suppliers',      icon: '⬆', color: 'text-blue-600' },
              { label: 'Total Outflow', value: `${period.totalOutflowM3} m³`, sub: 'All unit meters',    icon: '⬇', color: 'text-text' },
              { label: 'Tank Change',   value: `${period.tankChangeM3 >= 0 ? '+' : ''}${period.tankChangeM3} m³`, sub: `${period.tankLevelStartM3} → ${period.tankLevelEndM3} m³`, icon: '🛢', color: 'text-teal-600' },
              { label: 'System Loss',   value: `${period.grossLossM3} m³`,    sub: `${Number(period.lossPct).toFixed(1)}% of inflow`, icon: '⚠', color: lossColor(Number(period.lossPct)) },
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
                <p className="text-xl font-bold text-blue-600">{period.totalInflowM3}</p>
                <p className="text-xs text-text-muted">Inflow (m³)</p>
              </div>
              <span className="text-text-muted text-lg">−</span>
              <div className="text-center">
                <p className="text-xl font-bold text-text">{period.totalOutflowM3}</p>
                <p className="text-xs text-text-muted">Outflow (m³)</p>
              </div>
              <span className="text-text-muted text-lg">−</span>
              <div className="text-center">
                <p className="text-xl font-bold text-teal-600">{period.tankChangeM3 >= 0 ? '(+' : '('}{period.tankChangeM3})</p>
                <p className="text-xs text-text-muted">Tank Δ (m³)</p>
              </div>
              <span className="text-text-muted text-lg">=</span>
              <div className="text-center">
                <p className={cn('text-xl font-bold', lossColor(Number(period.lossPct)))}>{period.grossLossM3}</p>
                <p className="text-xs text-text-muted">Loss (m³)</p>
              </div>
              <div className={cn('ml-4 px-3 py-2 rounded-lg border text-sm font-semibold', lossBg(Number(period.lossPct)), lossColor(Number(period.lossPct)))}>
                {Number(period.lossPct).toFixed(1)}% loss rate
              </div>
            </div>
          </Card>

          {/* Zone breakdown */}
          {period.zoneBreakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-3">Zone Breakdown</h3>
              <div className="rounded-lg border border-surface-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-text-muted">
                    <tr>
                      {['Zone', 'Distribution (m³)', 'Consumer (m³)', 'Loss (m³)', 'Loss %', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {period.zoneBreakdown.map((z, i) => (
                      <tr key={z.zoneId} className={cn('border-t border-surface-border hover:bg-surface-hover', i % 2 === 0 ? '' : 'bg-surface-muted/30')}>
                        <td className="px-4 py-3 font-medium text-text">{z.zoneName}</td>
                        <td className="px-4 py-3 text-text">{Number(z.distributionM3).toLocaleString()}</td>
                        <td className="px-4 py-3 text-text">{Number(z.consumerM3).toLocaleString()}</td>
                        <td className={cn('px-4 py-3 font-medium', lossColor(Number(z.lossPct)))}>−{Number(z.lossM3).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={cn('font-bold', lossColor(Number(z.lossPct)))}>{Number(z.lossPct).toFixed(1)}%</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded font-medium border', lossBg(Number(z.lossPct)), lossColor(Number(z.lossPct)))}>
                            {Number(z.lossPct) >= 15 ? '🔴 Critical' : Number(z.lossPct) >= 10 ? '🟡 Investigate' : '🟢 Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier contribution (estimated from active suppliers) */}
          {suppliers.filter(s => s.active).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text mb-1">Supplier Contribution</h3>
              <p className="text-xs text-text-muted mb-3">Estimated — proportional split of total inflow across active suppliers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {suppliers.filter(s => s.active).map((s, idx, arr) => {
                  const share   = Math.round(period.totalInflowM3 / arr.length)
                  const rate    = s.contractedRatePerM3 ?? 0
                  const cost    = share * rate
                  return (
                    <Card key={s.id} className="p-4">
                      <p className="font-medium text-text mb-2">{s.name}</p>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-text-muted">Est. Volume</p>
                          <p className="font-bold text-text">{share} m³</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted">Rate</p>
                          <p className="font-medium text-text">KES {rate}/m³</p>
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
          )}

          {period.notes && (
            <div className={cn('p-4 rounded-lg border text-sm', period.flagged ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-surface-muted border-surface-border text-text-muted')}>
              📝 {period.notes}
            </div>
          )}
        </>
      ) : null}

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}
        title={editTarget ? `Edit Balance — ${editTarget.period}` : 'New Water Balance Period'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Period (YYYY-MM) *</label>
            <input
              type="month"
              required
              value={form.period}
              onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Inflow / Outflow */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Total Inflow (m³) *</label>
              <input type="number" step="0.01" min="0" required
                value={form.totalInflowM3}
                onChange={e => setForm(f => ({ ...f, totalInflowM3: e.target.value }))}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 602" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Total Outflow (m³) *</label>
              <input type="number" step="0.01" min="0" required
                value={form.totalOutflowM3}
                onChange={e => setForm(f => ({ ...f, totalOutflowM3: e.target.value }))}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 519" />
            </div>
          </div>

          {/* Tank levels */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Tank Level — Start (m³) *</label>
              <input type="number" step="0.01" min="0" required
                value={form.tankLevelStartM3}
                onChange={e => setForm(f => ({ ...f, tankLevelStartM3: e.target.value }))}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 74" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Tank Level — End (m³) *</label>
              <input type="number" step="0.01" min="0" required
                value={form.tankLevelEndM3}
                onChange={e => setForm(f => ({ ...f, tankLevelEndM3: e.target.value }))}
                className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. 71" />
            </div>
          </div>

          {/* Live loss preview */}
          {inflow > 0 && (
            <div className={cn('p-3 rounded-lg border text-sm', lossBg(previewLossPct))}>
              <span className="font-medium">Preview: </span>
              Loss = {inflow} − {outflow} − ({tankChg >= 0 ? '+' : ''}{tankChg.toFixed(2)}) =&nbsp;
              <span className={cn('font-bold', lossColor(previewLossPct))}>
                {grossLoss.toFixed(2)} m³ ({previewLossPct.toFixed(1)}%)
              </span>
              {previewLossPct > 10 && <span className="ml-2 text-danger font-semibold">⚠ Will be flagged</span>}
            </div>
          )}

          {/* Zone breakdown */}
          {form.zoneRows.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">Zone Readings (optional)</label>
              <div className="space-y-2">
                {form.zoneRows.map((row, i) => (
                  <div key={row.zoneId} className="grid grid-cols-3 gap-2 items-center">
                    <p className="text-xs font-medium text-text truncate">{row.zoneName}</p>
                    <input type="number" step="0.01" min="0"
                      value={row.distributionM3}
                      onChange={e => setForm(f => {
                        const rows = [...f.zoneRows]
                        rows[i] = { ...rows[i], distributionM3: e.target.value }
                        return { ...f, zoneRows: rows }
                      })}
                      className="rounded border border-surface-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Distribution m³" />
                    <input type="number" step="0.01" min="0"
                      value={row.consumerM3}
                      onChange={e => setForm(f => {
                        const rows = [...f.zoneRows]
                        rows[i] = { ...rows[i], consumerM3: e.target.value }
                        return { ...f, zoneRows: rows }
                      })}
                      className="rounded border border-surface-border bg-surface px-2 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Consumer m³" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <textarea rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Any observations for this period…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Update Period' : 'Create Period'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── ReadingsTab ────────────────────────────────────────────────────────────

function ReadingsTab({
  readings, loading, onRefresh,
}: {
  readings: MeterReadingData[]
  loading: boolean
  onRefresh: () => void
}) {
  const [search, setSearch]         = useState('')
  const [periodFilter, setPeriod]   = useState('')
  const [utilityFilter, setUtility] = useState('all')
  const [statusFilter, setStatus]   = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Collect unique billing periods for the dropdown
  const periods = useMemo(() => {
    const set = new Set<string>()
    readings.forEach(r => { if (r.billing_period) set.add(r.billing_period) })
    return Array.from(set).sort().reverse()
  }, [readings])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return readings.filter(r => {
      const matchSearch  = !q || (r.unit_label ?? '').toLowerCase().includes(q) || r.meter_number.toLowerCase().includes(q)
      const matchPeriod  = !periodFilter || r.billing_period === periodFilter
      const matchUtility = utilityFilter === 'all' || r.utility_type === utilityFilter
      const matchStatus  = statusFilter === 'all' || r.status === statusFilter
      return matchSearch && matchPeriod && matchUtility && matchStatus
    })
  }, [readings, search, periodFilter, utilityFilter, statusFilter])

  const pendingCount = filtered.filter(r => r.status === 'pending_bill').length

  async function handleMarkBilled(id: string) {
    setUpdatingId(id)
    try { await updateReadingStatus(id, 'billed'); onRefresh() }
    catch { /* ignore */ }
    finally { setUpdatingId(null) }
  }

  async function handleMarkAllBilled() {
    const pending = filtered.filter(r => r.status === 'pending_bill')
    for (const r of pending) {
      await updateReadingStatus(r.id, 'billed').catch(() => {})
    }
    onRefresh()
  }

  function exportCsv() {
    const headers = ['Unit', 'Meter No', 'Utility', 'Period', 'Prev', 'Current', 'Consumed', 'Unit Cost', 'Amount Due', 'Mgmt Fee', 'Source', 'Read By', 'Date', 'Status']
    const rows = filtered.map(r => [
      r.unit_label ?? '',
      r.meter_number,
      r.utility_type,
      r.billing_period ?? r.reading_date ?? '',
      r.previous_value,
      r.current_value,
      r.units_consumed,
      r.unit_cost ?? '',
      r.amount_due,
      r.management_fee ?? '',
      r.source ?? '',
      r.read_by ?? '',
      r.reading_date ?? '',
      r.status,
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `meter-readings${periodFilter ? `-${periodFilter}` : ''}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search unit, meter no…" containerClassName="w-56" />
        <select
          value={periodFilter}
          onChange={e => setPeriod(e.target.value)}
          className="rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Periods</option>
          {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <Select
          value={utilityFilter}
          onChange={setUtility}
          options={[
            { value: 'all',         label: 'All Utilities' },
            { value: 'water',       label: '💧 Water' },
            { value: 'electricity', label: '⚡ Electricity' },
            { value: 'sewerage',    label: '🚰 Sewerage' },
            { value: 'gas_piped',   label: '🔥 Gas (Piped)' },
            { value: 'internet',    label: '📶 Internet' },
          ]}
          className="w-40"
        />
        <Select
          value={statusFilter}
          onChange={setStatus}
          options={[
            { value: 'all',          label: 'All Statuses' },
            { value: 'pending_bill', label: 'Pending Bill' },
            { value: 'billed',       label: 'Billed' },
          ]}
          className="w-36"
        />
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 && (
            <CanDo action="write" resource={{ type: 'unit' }}>
              <Button size="sm" variant="outline" onClick={handleMarkAllBilled}>
                Mark All Billed ({pendingCount})
              </Button>
            </CanDo>
          )}
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            ⬇ Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
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
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">Loading readings…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">No readings match filters.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className={cn('border-b border-surface-border dark:border-dark-border hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors', i === filtered.length - 1 && 'border-b-0')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{r.unit_label ?? '—'}</p>
                    <p className="text-xs text-text-muted font-mono">{r.meter_number}</p>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{utilityIcon(r.utility_type)} {utilityLabel(r.utility_type)}</td>
                  <td className="px-4 py-3 text-text-muted">{r.billing_period ?? r.reading_date ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-text">{Number(r.units_consumed).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-text">KES {Number(r.amount_due).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-muted">{r.management_fee != null ? `KES ${Number(r.management_fee).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                      r.source === 'smart_iot' ? 'bg-success/10 text-success' :
                      r.source === 'vending_issue' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' :
                      'bg-surface-border text-text-muted'
                    )}>
                      {r.source === 'smart_iot' ? '⚡ IoT' : r.source === 'vending_issue' ? '🏧 Vending' : r.source ?? 'manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', r.status === 'billed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                        {r.status === 'billed' ? 'Billed' : r.status === 'pending_bill' ? 'Pending Bill' : r.status}
                      </span>
                      {r.status === 'pending_bill' && (
                        <CanDo action="write" resource={{ type: 'unit' }}>
                          <button
                            onClick={() => handleMarkBilled(r.id)}
                            disabled={updatingId === r.id}
                            className="text-[11px] font-medium text-primary-600 hover:underline whitespace-nowrap disabled:opacity-50"
                          >
                            {updatingId === r.id ? '…' : 'Mark Billed'}
                          </button>
                        </CanDo>
                      )}
                    </div>
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

// ── Disconnection Notices Tab ─────────────────────────────────────────────────

const DISCONNECTION_CONFIG = {
  reminder_notice_days: 7,
  formal_notice_days: 14,
}

interface DisconnectionCandidate {
  meter: MeterData
  days_overdue: number
  outstanding_amount: number
  stage: 'overdue' | 'reminder_due' | 'formal_due' | 'clear'
}

function DisconnectionTab({
  meters,
  overdueCharges,
  sentNotices,
  loading,
  onRefresh,
}: {
  meters: MeterData[]
  overdueCharges: ChargeData[]
  sentNotices: DisconnectionNoticeData[]
  loading: boolean
  onRefresh: () => void
}) {
  const [sending, setSending] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const candidates = useMemo((): DisconnectionCandidate[] => {
    const postpaidMeters = meters.filter(m =>
      m.meter_type === 'postpaid' && m.status === 'active' && m.unit_id
    )

    return postpaidMeters.map(meter => {
      const meterCharges = overdueCharges.filter(c => c.unit_id === meter.unit_id)
      const outstanding = meterCharges.reduce((s, c) => s + (c.amount - (c.paid_amount ?? 0)), 0)

      const oldestCharge = [...meterCharges].sort((a, b) =>
        (a.due_date ?? '').localeCompare(b.due_date ?? '')
      )[0]
      let daysOverdue = 0
      if (oldestCharge?.due_date) {
        const due = new Date(oldestCharge.due_date)
        const today = new Date()
        daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      }

      let stage: DisconnectionCandidate['stage'] = 'clear'
      if (daysOverdue >= DISCONNECTION_CONFIG.formal_notice_days) stage = 'formal_due'
      else if (daysOverdue >= DISCONNECTION_CONFIG.reminder_notice_days) stage = 'reminder_due'
      else if (daysOverdue > 0) stage = 'overdue'

      return { meter, days_overdue: daysOverdue, outstanding_amount: outstanding, stage }
    }).filter(c => c.stage !== 'clear' || c.outstanding_amount > 0)
  }, [meters, overdueCharges])

  const formalDue    = candidates.filter(c => c.stage === 'formal_due')
  const reminderDue  = candidates.filter(c => c.stage === 'reminder_due')
  const overdueClear = candidates.filter(c => c.stage === 'overdue')

  function noticeSent(meterId: string, type: 'reminder' | 'formal') {
    return sentNotices.some(n => n.meter_id === meterId && n.notice_type === type)
  }

  async function sendNotice(candidate: DisconnectionCandidate, type: 'reminder' | 'formal') {
    const key = `${candidate.meter.id}_${type}`
    setSending(key)
    try {
      await sendDisconnectionNotice({
        meter_id: candidate.meter.id,
        meter_number: candidate.meter.meter_number,
        unit_id: candidate.meter.unit_id,
        unit_label: candidate.meter.unit_label,
        person_id: candidate.meter.current_billing_person?.person_id ?? null,
        person_name: candidate.meter.current_billing_person?.name ?? null,
        person_phone: null,
        person_email: null,
        notice_type: type,
        outstanding_amount_kes: candidate.outstanding_amount,
        utility_type: candidate.meter.utility_type,
      })
      const label = type === 'formal' ? 'Formal disconnection notice' : 'Reminder notice'
      showToast(`✅ ${label} sent for ${candidate.meter.unit_label ?? candidate.meter.meter_number}`)
      onRefresh()
    } catch {
      showToast('❌ Failed to send notice. Please try again.')
    } finally {
      setSending(null)
    }
  }

  async function sendAllFormal() {
    for (const c of formalDue) {
      if (!noticeSent(c.meter.id, 'formal')) {
        await sendNotice(c, 'formal')
      }
    }
  }

  const stageBadge = (stage: DisconnectionCandidate['stage']) => {
    if (stage === 'formal_due')   return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Formal Notice Due</span>
    if (stage === 'reminder_due') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Reminder Due</span>
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Overdue</span>
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-gray-400">Loading disconnection data…</div>
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
          {formalDue.some(c => !noticeSent(c.meter.id, 'formal')) && (
            <CanDo action="write" resource={{ type: 'utility' }}>
              <button
                onClick={sendAllFormal}
                disabled={sending !== null}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Send All Formal Notices ({formalDue.filter(c => !noticeSent(c.meter.id, 'formal')).length})
              </button>
            </CanDo>
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
                const reminderSent = noticeSent(c.meter.id, 'reminder')
                const formalSent   = noticeSent(c.meter.id, 'formal')
                const isSending    = sending === `${c.meter.id}_reminder` || sending === `${c.meter.id}_formal`
                return (
                  <tr key={c.meter.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.meter.unit_label ?? '—'}</p>
                      <p className="text-xs text-gray-500">{c.meter.current_billing_person?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-700">{c.meter.meter_number}</p>
                      <p className="text-[11px] text-gray-400">{c.meter.account_number}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs text-gray-600">{c.meter.utility_type.replace(/_/g, ' ')}</td>
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
                      <CanDo action="write" resource={{ type: 'utility' }}>
                        {c.stage === 'formal_due' && (
                          <button
                            disabled={formalSent || isSending}
                            onClick={() => sendNotice(c, 'formal')}
                            className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-40"
                          >
                            {formalSent ? '✓ Sent' : isSending ? 'Sending…' : 'Send Formal Notice'}
                          </button>
                        )}
                        {c.stage === 'reminder_due' && (
                          <button
                            disabled={reminderSent || isSending}
                            onClick={() => sendNotice(c, 'reminder')}
                            className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                          >
                            {reminderSent ? '✓ Sent' : isSending ? 'Sending…' : 'Send Reminder'}
                          </button>
                        )}
                        {c.stage === 'overdue' && (
                          <span className="text-xs text-gray-400">In grace period</span>
                        )}
                      </CanDo>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sent notices log */}
      {sentNotices.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-900">Recently Sent Notices</h4>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Unit · Tenant</th>
                <th className="px-4 py-3 font-medium">Meter</th>
                <th className="px-4 py-3 font-medium">Utility</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                <th className="px-4 py-3 font-medium">Sent By</th>
                <th className="px-4 py-3 font-medium">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {sentNotices.slice(0, 20).map(n => (
                <tr key={n.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{n.unit_label ?? '—'}</p>
                    <p className="text-xs text-gray-500">{n.person_name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{n.meter_number}</td>
                  <td className="px-4 py-3 capitalize text-xs text-gray-600">{(n.utility_type ?? '').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    {n.notice_type === 'formal'
                      ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Formal</span>
                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Reminder</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {n.outstanding_amount_kes != null ? `KES ${Number(n.outstanding_amount_kes).toLocaleString()}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{n.sent_by ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {n.sent_at ? new Date(n.sent_at).toLocaleString() : '—'}
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
        <SearchInput value={search} onChange={setSearch} placeholder="Serial number, make, model…" containerClassName="w-full sm:w-64" />
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
  const [readTarget, setReadTarget]     = useState<MeterData | null>(null)
  const [showRead, setShowRead]         = useState(false)
  const [viewTarget, setViewTarget]     = useState<MeterData | null>(null)
  const [showView, setShowView]         = useState(false)
  const [showAddMeter, setShowAddMeter] = useState(false)

  // Live data state
  const [meters, setMeters]       = useState<MeterData[]>([])
  const [readings, setReadings]   = useState<MeterReadingData[]>([])
  const [suppliers, setSuppliers] = useState<WaterSupplierData[]>([])
  const [tanks, setTanks]         = useState<ReserveTankData[]>([])
  const [zones, setZones]         = useState<WaterZoneData[]>([])
  const [periods, setPeriods]     = useState<WaterBalancePeriodData[]>([])
  const [overdueCharges, setOverdueCharges]   = useState<ChargeData[]>([])
  const [sentNotices, setSentNotices]         = useState<DisconnectionNoticeData[]>([])
  const [loadingMeters, setLoadingMeters]     = useState(true)
  const [loadingReadings, setLoadingReadings] = useState(true)
  const [loadingWater, setLoadingWater]       = useState(true)
  const [loadingBalance, setLoadingBalance]   = useState(true)
  const [loadingDisconn, setLoadingDisconn]   = useState(true)

  const fetchMeters = useCallback(async () => {
    try {
      const data = await getAllMeters()
      setMeters(data)
    } catch {
      // keep empty
    } finally {
      setLoadingMeters(false)
    }
  }, [])

  useEffect(() => { fetchMeters() }, [fetchMeters])

  const fetchReadings = useCallback(async () => {
    try { const data = await getMeterReadings(); setReadings(data) }
    catch { /* ignore */ }
    finally { setLoadingReadings(false) }
  }, [])

  useEffect(() => { fetchReadings() }, [fetchReadings])

  const fetchWater = useCallback(async () => {
    try {
      const [s, t, z] = await Promise.all([getWaterSuppliers(), getReserveTanks(), getWaterZones()])
      setSuppliers(s); setTanks(t); setZones(z)
    } catch { /* ignore */ }
    finally { setLoadingWater(false) }
  }, [])

  useEffect(() => { fetchWater() }, [fetchWater])

  const fetchBalance = useCallback(async () => {
    try { const data = await getWaterBalancePeriods(); setPeriods(data) }
    catch { /* ignore */ }
    finally { setLoadingBalance(false) }
  }, [])

  useEffect(() => { fetchBalance() }, [fetchBalance])

  const fetchDisconn = useCallback(async () => {
    try {
      const [charges, notices] = await Promise.all([getOverdueUtilityCharges(), getDisconnectionNotices()])
      setOverdueCharges(charges)
      setSentNotices(notices)
    } catch { /* ignore */ }
    finally { setLoadingDisconn(false) }
  }, [])

  useEffect(() => { fetchDisconn() }, [fetchDisconn])

  const consumerMeters = meters.filter(m => !m.meter_role || m.meter_role === 'consumer')
  const latestBalance  = periods[periods.length - 1]
  const lossFlag       = latestBalance?.flagged

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Consumer Meters</p>
          <p className="text-2xl font-bold text-text">{loadingMeters ? '…' : consumerMeters.length}</p>
          <p className="text-xs text-text-muted">{loadingMeters ? '' : `${consumerMeters.filter(m => m.status === 'active').length} active`}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Smart Meters</p>
          <p className="text-2xl font-bold text-success">{loadingMeters ? '…' : meters.filter(m => m.meter_type === 'smart').length}</p>
          <p className="text-xs text-text-muted">IoT auto-read</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Pending Billing</p>
          <p className="text-2xl font-bold text-warning">{loadingReadings ? '…' : readings.filter(r => r.status === 'pending_bill').length}</p>
          <p className="text-xs text-text-muted">Readings not billed</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">In Inventory</p>
          <p className="text-2xl font-bold text-text">{INVENTORY_METERS.length}</p>
          <p className="text-xs text-text-muted">Awaiting assignment</p>
        </Card>
        <Card className={cn('p-4', lossFlag ? 'border-danger/40 bg-danger/5' : '')}>
          <p className="text-xs text-text-muted font-medium mb-1">Water Loss (Latest)</p>
          <p className={cn('text-2xl font-bold', lossColor(Number(latestBalance?.lossPct ?? 0)))}>
            {latestBalance ? `${Number(latestBalance.lossPct).toFixed(1)}%` : '—'}
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
            meters={meters}
            loading={loadingMeters}
            onRead={m => { setReadTarget(m); setShowRead(true) }}
            onView={m => { setViewTarget(m); setShowView(true) }}
            onAddMeter={() => setShowAddMeter(true)}
          />
        </TabsContent>
        <TabsContent value="inventory" className="pt-5">
          <InventoryTab onAssign={m => alert(`Assign ${m.serial_number} to unit — coming soon`)} />
        </TabsContent>
        <TabsContent value="supply" className="pt-5">
          <WaterSupplyTab
            suppliers={suppliers}
            tanks={tanks}
            zones={zones}
            meters={meters}
            loading={loadingWater}
            onRefresh={fetchWater}
          />
        </TabsContent>
        <TabsContent value="balance" className="pt-5">
          <WaterBalanceTab
            periods={periods}
            suppliers={suppliers}
            zones={zones}
            loading={loadingBalance}
            onRefresh={fetchBalance}
          />
        </TabsContent>
        <TabsContent value="readings" className="pt-5">
          <ReadingsTab readings={readings} loading={loadingReadings} onRefresh={fetchReadings} />
        </TabsContent>
        <TabsContent value="disconnections" className="pt-5">
          <DisconnectionTab
            meters={meters}
            overdueCharges={overdueCharges}
            sentNotices={sentNotices}
            loading={loadingDisconn || loadingMeters}
            onRefresh={fetchDisconn}
          />
        </TabsContent>
      </Tabs>

      <ReadingEntryModal
        meter={readTarget}
        open={showRead}
        onClose={() => setShowRead(false)}
        onSaved={() => { fetchMeters(); fetchReadings() }}
      />
      <MeterDetailDrawer meter={viewTarget} open={showView} onClose={() => setShowView(false)} />
      <AddMeterModal open={showAddMeter} onClose={() => setShowAddMeter(false)} />
    </main>
  )
}
