'use client'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Drawer } from '@/components/ui/Drawer'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { AddMeterModal } from '@/components/utilities/AddMeterModal'
import { cn } from '@/lib/cn'
import { getAllMeters, getMeterReadings, getMetersPaged, getMeterReadingsPaged, getMeterReadingRun, getUtilityStats, getReadingsForMeter, createMeterReading, updateReadingStatus, assignMeter, getMeterTypeHistory, recordMeterTypeMigration, patchMeter, deleteGlobalMeter, bulkCreateReadings, generateEstimatedReadings, correctReading, parseMeterImport, bulkImportMeters } from '@/lib/api/meters'
import type { MeterData, MeterReadingData, MeterTypeHistoryData, ImportRowPreview, ReadingRunRow as ReadingRunRowData, UtilityStats } from '@/lib/api/meters'
import {
  getWaterSuppliers, createWaterSupplier, updateWaterSupplier, toggleWaterSupplier,
  getReserveTanks, createReserveTank, updateReserveTank, updateTankLevel,
  getWaterZones, createWaterZone, updateWaterZone, deleteWaterZone,
  getWaterBalancePeriods, createWaterBalancePeriod, updateWaterBalancePeriod, deleteWaterBalancePeriod,
} from '@/lib/api/water'
import type { WaterSupplierData, ReserveTankData, WaterZoneData, WaterBalancePeriodData } from '@/lib/api/water'
import { getUnitsFromApi } from '@/lib/api/units'
import type { UnitData } from '@/lib/api/units'
import { getOverdueUtilityCharges, getDisconnectionNotices, sendDisconnectionNotice, reconnectNotice } from '@/lib/api/disconnection'
import { getWaterLossReport, getUnreadMeters, getInvoices, type InvoiceData } from '@/lib/api/invoices'
import type { DisconnectionNoticeData } from '@/lib/api/disconnection'
import type { ChargeData } from '@/lib/api/charges'
import { getSettings } from '@/lib/api/settings'
import type { FacilitySettings } from '@/lib/api/settings'
import { getPersonById } from '@/lib/api/people'

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

// ── Pager ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1 py-3">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-2.5 py-1 rounded text-sm text-text-muted hover:bg-surface-hover disabled:opacity-30"
      >‹</button>
      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
        const p = totalPages <= 7 ? i + 1
          : page <= 4 ? i + 1
          : page >= totalPages - 3 ? totalPages - 6 + i
          : page - 3 + i
        return (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn('min-w-[32px] px-2 py-1 rounded text-sm', p === page ? 'bg-primary-600 text-white font-medium' : 'text-text-muted hover:bg-surface-hover')}
          >{p}</button>
        )
      })}
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-2.5 py-1 rounded text-sm text-text-muted hover:bg-surface-hover disabled:opacity-30"
      >›</button>
    </div>
  )
}

// ── Reading Entry Modal ────────────────────────────────────────────────────

function ReadingEntryModal({
  meter, open, onClose, onSaved, defaultPeriod,
}: {
  meter: MeterData | null
  open: boolean
  onClose: () => void
  onSaved?: () => void
  defaultPeriod?: string
}) {
  const [reading, setReading]     = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [billingPeriod, setBp]    = useState(() => {
    if (defaultPeriod) return defaultPeriod
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [unitCost, setUnitCost]   = useState('')
  const [mgmtFee, setMgmtFee]     = useState('')
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [waterRates, setWaterRates] = useState<{ rate: number; mgmtPct: number; seweragePct: number } | null>(null)

  const isWaterMeter = meter ? ['water', 'water_sewer'].includes(meter.utility_type ?? '') : false

  useEffect(() => {
    if (open && meter) {
      setReading('')
      setDate(new Date().toISOString().slice(0, 10))
      setBp(defaultPeriod ?? (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}` })())
      setUnitCost('')
      setMgmtFee(meter.management_fee_pct?.toString() ?? '')
      setNotes('')
      setError(null)
    }
  }, [open, meter, defaultPeriod])

  useEffect(() => {
    if (open && isWaterMeter) {
      getSettings().then(s => setWaterRates({
        rate:        s.water_rate_per_unit    ?? 0,
        mgmtPct:     s.management_fee_percent ?? 0,
        seweragePct: s.sewerage_percent       ?? 0,
      }))
    }
  }, [open, isWaterMeter])

  if (!meter) return null
  const prev = meter.last_reading ?? 0
  const consumed = reading ? Math.max(0, Number(reading) - prev) : 0
  const isPrepaid = meter.meter_type === 'prepaid'
  const isSmart   = meter.meter_type === 'smart'

  // Water meter: use global rates
  const waterOnly    = isWaterMeter && waterRates ? consumed * waterRates.rate : 0
  const waterMgmtFee = isWaterMeter && waterRates ? waterOnly * (waterRates.mgmtPct / 100) : 0
  const sewerage     = isWaterMeter && waterRates ? waterOnly * (waterRates.seweragePct / 100) : 0
  const waterTotal   = waterOnly + waterMgmtFee

  // Non-water meter: manual rate inputs
  const subtotal = consumed * Number(unitCost || 0)
  const fee      = mgmtFee ? subtotal * (Number(mgmtFee) / 100) : 0
  const total    = subtotal + fee

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
          <label className="block text-xs font-medium text-text-muted mb-1">Billing Period</label>
          <input type="month" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={billingPeriod} onChange={e => setBp(e.target.value)} />
        </div>
        {!isPrepaid && !isWaterMeter && (
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
        {consumed > 0 && !isPrepaid && isWaterMeter && waterRates && (
          <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 text-sm space-y-1">
            <div className="flex justify-between text-text-muted">
              <span>Consumed</span>
              <span className="font-medium text-text">{consumed.toLocaleString()} m³</span>
            </div>
            <div className="flex justify-between text-text-muted">
              <span>Water ({consumed} m³ × KES {waterRates.rate})</span>
              <span className="font-medium text-text">KES {waterOnly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {waterMgmtFee > 0 && (
              <div className="flex justify-between text-text-muted">
                <span>Management fee ({waterRates.mgmtPct}%)</span>
                <span className="font-medium text-text">KES {waterMgmtFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-primary-100 dark:border-primary-900/30 pt-1 mt-1">
              <span className="font-semibold text-text">Water charge</span>
              <span className="font-bold text-primary-700 dark:text-primary-400">KES {waterTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {sewerage > 0 && (
              <div className="flex justify-between text-text-muted border-t border-primary-100 dark:border-primary-900/30 pt-1 mt-1">
                <span>Sewerage charge ({waterRates.seweragePct}% of water)</span>
                <span className="font-medium text-text">KES {sewerage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        )}
        {consumed > 0 && !isPrepaid && !isWaterMeter && (
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

const METER_TYPES = ['postpaid', 'prepaid', 'smart'] as const

function MeterDetailDrawer({ meter, open, onClose, onMeterUpdated }: {
  meter: MeterData | null
  open: boolean
  onClose: () => void
  onMeterUpdated?: () => void
}) {
  const [readings, setReadings] = useState<MeterReadingData[]>([])
  const [loadingR, setLoadingR] = useState(false)
  const [history, setHistory] = useState<MeterTypeHistoryData[]>([])
  const [loadingH, setLoadingH] = useState(false)
  const [showMigForm, setShowMigForm] = useState(false)
  const [migForm, setMigForm] = useState({ fromType: '', toType: '', migrationDate: '', finalReading: '', migratedBy: '', notes: '' })
  const [savingMig, setSavingMig] = useState(false)

  // Reading correction
  const [correctTarget, setCorrectTarget] = useState<MeterReadingData | null>(null)
  const [correctCurrent, setCorrectCurrent] = useState('')
  const [correctPrevious, setCorrectPrevious] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [correctError, setCorrectError] = useState<string | null>(null)

  const fetchHistory = useCallback((meterId: string) => {
    setLoadingH(true)
    getMeterTypeHistory(meterId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingH(false))
  }, [])

  useEffect(() => {
    if (open && meter) {
      setLoadingR(true)
      getReadingsForMeter(meter.id)
        .then(setReadings)
        .catch(() => setReadings([]))
        .finally(() => setLoadingR(false))
      fetchHistory(meter.id)
      setShowMigForm(false)
      setMigForm({ fromType: meter.meter_type, toType: '', migrationDate: '', finalReading: '', migratedBy: '', notes: '' })
    }
  }, [open, meter, fetchHistory])

  async function submitMigration() {
    if (!meter || !migForm.fromType || !migForm.toType) return
    setSavingMig(true)
    try {
      await recordMeterTypeMigration(meter.id, {
        fromType: migForm.fromType,
        toType: migForm.toType,
        migrationDate: migForm.migrationDate || null,
        finalReading: migForm.finalReading ? Number(migForm.finalReading) : null,
        migratedBy: migForm.migratedBy || null,
        notes: migForm.notes || null,
      })
      setShowMigForm(false)
      fetchHistory(meter.id)
      onMeterUpdated?.()
    } finally {
      setSavingMig(false)
    }
  }

  function openCorrect(r: MeterReadingData) {
    setCorrectTarget(r)
    setCorrectCurrent(String(r.current_value))
    setCorrectPrevious(String(r.previous_value))
    setCorrectError(null)
  }

  async function handleCorrect() {
    if (!correctTarget) return
    setCorrecting(true)
    setCorrectError(null)
    try {
      const updated = await correctReading(correctTarget.id, {
        current_value:  Number(correctCurrent),
        previous_value: correctPrevious ? Number(correctPrevious) : undefined,
      })
      setReadings(prev => prev.map(r => r.id === updated.id ? updated : r))
      setCorrectTarget(null)
    } catch (e: unknown) {
      setCorrectError(e instanceof Error ? e.message : 'Failed to correct reading.')
    } finally {
      setCorrecting(false)
    }
  }

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
                  <div key={r.id} className={cn('p-3 rounded-lg border text-sm', r.anomaly ? 'border-warning bg-warning/5' : 'border-surface-border dark:border-dark-border')}>
                    <div className="flex justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text">{r.billing_period ?? r.reading_date ?? '—'}</span>
                        {r.anomaly && <span className="text-xs px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium">⚠ Anomaly</span>}
                        {r.source === 'estimated' && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-border text-text-muted">Est.</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                          r.status === 'billed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        )}>{r.status}</span>
                        {r.status === 'pending_bill' && correctTarget?.id !== r.id && (
                          <button
                            onClick={() => openCorrect(r)}
                            className="text-xs text-primary hover:underline"
                          >
                            Correct
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
                      <div><p>Prev → Current</p><p className="text-text font-medium">{r.previous_value} → {r.current_value}</p></div>
                      <div><p>Consumed</p><p className="text-text font-medium">{r.units_consumed} units</p></div>
                      <div><p>Amount</p><p className="text-text font-medium">KES {Number(r.amount_due).toLocaleString()}</p></div>
                    </div>
                    {r.management_fee != null && (
                      <p className="text-[11px] text-text-muted mt-1">+ KES {Number(r.management_fee).toLocaleString()} mgmt fee · {r.source}</p>
                    )}
                    {r.notes && (
                      <p className="text-[11px] text-text-muted mt-1 italic">{r.notes}</p>
                    )}
                    {/* Inline correction form */}
                    {correctTarget?.id === r.id && (
                      <div className="mt-3 pt-3 border-t border-surface-border dark:border-dark-border space-y-2">
                        <p className="text-xs font-medium text-text">Correct Reading</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-text-muted block mb-1">Previous Value</label>
                            <input
                              type="number"
                              value={correctPrevious}
                              onChange={e => setCorrectPrevious(e.target.value)}
                              className="w-full border border-surface-border dark:border-dark-border rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-dark-card text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-text-muted block mb-1">Current Value *</label>
                            <input
                              type="number"
                              value={correctCurrent}
                              onChange={e => setCorrectCurrent(e.target.value)}
                              className="w-full border border-surface-border dark:border-dark-border rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-dark-card text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                        {correctError && <p className="text-xs text-danger">{correctError}</p>}
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setCorrectTarget(null)} disabled={correcting}>Cancel</Button>
                          <Button size="sm" onClick={handleCorrect} disabled={correcting || !correctCurrent}>
                            {correcting ? 'Saving…' : 'Save Correction'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="history">
            <div className="space-y-2">
              {loadingH ? (
                <p className="text-sm text-text-muted py-4 text-center">Loading…</p>
              ) : history.length === 0 && !showMigForm ? (
                <p className="text-sm text-text-muted py-4 text-center">No meter type migrations recorded.</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-surface-border text-text-muted text-xs">{h.from_type}</span>
                      <span className="text-text-muted">→</span>
                      <span className="px-2 py-0.5 rounded bg-success/10 text-success text-xs">{h.to_type}</span>
                      <span className="ml-auto text-xs text-text-muted">{h.migration_date}</span>
                    </div>
                    {h.final_reading != null && (
                      <p className="text-xs text-text-muted">Final reading: <span className="font-medium text-text">{Number(h.final_reading).toLocaleString()}</span></p>
                    )}
                    {h.migrated_by && <p className="text-xs text-text-muted">By: {h.migrated_by}</p>}
                    {h.notes && <p className="text-xs text-text-muted mt-1 italic">{h.notes}</p>}
                  </div>
                ))
              )}

              {showMigForm ? (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3 text-sm">
                  <p className="font-medium text-text">Record Migration</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">From Type</label>
                      <select
                        value={migForm.fromType}
                        onChange={e => setMigForm(f => ({ ...f, fromType: e.target.value }))}
                        className="w-full border border-surface-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-card text-text"
                      >
                        {METER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">To Type</label>
                      <select
                        value={migForm.toType}
                        onChange={e => setMigForm(f => ({ ...f, toType: e.target.value }))}
                        className="w-full border border-surface-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-card text-text"
                      >
                        <option value="">Select…</option>
                        {METER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Migration Date</label>
                      <input
                        type="date"
                        value={migForm.migrationDate}
                        onChange={e => setMigForm(f => ({ ...f, migrationDate: e.target.value }))}
                        className="w-full border border-surface-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-card text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Final Reading</label>
                      <input
                        type="number"
                        value={migForm.finalReading}
                        onChange={e => setMigForm(f => ({ ...f, finalReading: e.target.value }))}
                        placeholder="0"
                        className="w-full border border-surface-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-card text-text"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Migrated By</label>
                    <input
                      type="text"
                      value={migForm.migratedBy}
                      onChange={e => setMigForm(f => ({ ...f, migratedBy: e.target.value }))}
                      placeholder="Name or staff ID"
                      className="w-full border border-surface-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-card text-text"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Notes</label>
                    <textarea
                      value={migForm.notes}
                      onChange={e => setMigForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Optional notes…"
                      className="w-full border border-surface-border rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-dark-card text-text resize-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowMigForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={submitMigration} disabled={savingMig || !migForm.toType}>
                      {savingMig ? 'Saving…' : 'Save Migration'}
                    </Button>
                  </div>
                </div>
              ) : (
                <CanDo action="write" resource={{ type: 'unit' }}>
                  <button
                    onClick={() => setShowMigForm(true)}
                    className="w-full text-sm text-primary border border-dashed border-primary/40 rounded-lg py-2 hover:bg-primary/5 transition-colors"
                  >
                    + Record Migration
                  </button>
                </CanDo>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Drawer>
  )
}

// ── Edit Meter Modal ────────────────────────────────────────────────────────

const BILLING_ARRANGEMENTS = [
  { value: 'billed_to_occupant', label: 'Billed to Occupant' },
  { value: 'billed_to_owner',    label: 'Billed to Owner' },
  { value: 'included_in_rent',   label: 'Included in Rent' },
  { value: 'not_billed',         label: 'Not Billed' },
]
const METER_ROLES_OPTS = [
  { value: 'consumer',     label: 'Consumer (Unit)' },
  { value: 'supplier',     label: 'Supplier' },
  { value: 'tank_inflow',  label: 'Tank Inflow' },
  { value: 'tank_outflow', label: 'Tank Outflow' },
  { value: 'distribution', label: 'Distribution' },
]

function EditMeterModal({ meter, open, onClose, onSaved }: {
  meter: MeterData | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [meterNumber, setMeterNumber]   = useState('')
  const [accountNo, setAccountNo]       = useState('')
  const [meterRole, setMeterRole]       = useState('consumer')
  const [billingArr, setBillingArr]     = useState('billed_to_occupant')
  const [mgmtFee, setMgmtFee]           = useState('')
  const [ratePerUnit, setRatePerUnit]   = useState('')
  const [status, setStatus]             = useState('active')
  const [lastReading, setLastReading]   = useState('')
  const [lastReadingDate, setLastReadingDate] = useState('')
  const [notes, setNotes]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    if (open && meter) {
      setMeterNumber(meter.meter_number)
      setAccountNo(meter.account_number ?? '')
      setMeterRole(meter.meter_role ?? 'consumer')
      setBillingArr(meter.billing_arrangement ?? 'billed_to_occupant')
      setMgmtFee(meter.management_fee_pct?.toString() ?? '')
      setRatePerUnit(meter.rate_per_unit?.toString() ?? '')
      setStatus(meter.status)
      setLastReading(meter.last_reading?.toString() ?? '')
      setLastReadingDate(meter.last_reading_date ?? '')
      setNotes(meter.notes ?? '')
      setError(null)
    }
  }, [open, meter])

  if (!meter) return null

  async function handleSave() {
    if (!meter) return
    if (!meterNumber.trim()) { setError('Meter number is required.'); return }
    setSaving(true); setError(null)
    try {
      await patchMeter(meter.id, {
        meterNumber: meterNumber.trim(),
        accountNumber: accountNo || null,
        meterRole,
        billingArrangement: billingArr,
        managementFeePct: mgmtFee ? Number(mgmtFee) : null,
        ratePerUnit: ratePerUnit ? Number(ratePerUnit) : null,
        status,
        lastReading: lastReading !== '' ? Number(lastReading) : null,
        lastReadingDate: lastReadingDate || null,
        notes: notes || null,
      })
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.')
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit Meter — ${meter.meter_number}`} size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card text-xs text-text-muted flex gap-4 flex-wrap">
          <span>{utilityIcon(meter.utility_type)} <strong className="text-text">{utilityLabel(meter.utility_type)}</strong></span>
          <span>{meterTypeBadge(meter.meter_type)}</span>
          {meter.unit_label && <span>📍 {meter.unit_label}</span>}
          <span className="text-[11px] italic">To change meter type use Migration History in the detail drawer.</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Meter Number *</label>
            <input className={INPUT} value={meterNumber} onChange={e => setMeterNumber(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Account Number</label>
            <input className={INPUT} value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className={LABEL}>Meter Role</label>
            <select className={INPUT} value={meterRole} onChange={e => setMeterRole(e.target.value)}>
              {METER_ROLES_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Status</label>
            <select className={INPUT} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Billing Arrangement</label>
            <select className={INPUT} value={billingArr} onChange={e => setBillingArr(e.target.value)}>
              {BILLING_ARRANGEMENTS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Management Fee %</label>
            <input type="number" className={INPUT} value={mgmtFee} onChange={e => setMgmtFee(e.target.value)} placeholder="e.g. 5" min="0" max="100" />
          </div>
          <div>
            <label className={LABEL}>Rate Per Unit (KES)</label>
            <input type="number" className={INPUT} value={ratePerUnit} onChange={e => setRatePerUnit(e.target.value)} placeholder="e.g. 80" min="0" step="0.01" />
          </div>
          <div>
            <label className={LABEL}>Opening / Last Reading</label>
            <input type="number" className={INPUT} value={lastReading} onChange={e => setLastReading(e.target.value)} placeholder="e.g. 1250.000" min="0" step="0.001" />
          </div>
          <div>
            <label className={LABEL}>Reading Date</label>
            <input type="date" className={INPUT} value={lastReadingDate} onChange={e => setLastReadingDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Notes</label>
            <textarea className={INPUT} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !meterNumber.trim()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
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

// ── Import Meters Modal ────────────────────────────────────────────────────

function ImportMetersModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [file, setFile]           = useState<File | null>(null)
  const [rows, setRows]           = useState<ImportRowPreview[]>([])
  const [parsing, setParsing]     = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ created: number; updated: number; skipped: number } | null>(null)
  const [error, setError]         = useState<string | null>(null)

  function reset() {
    setFile(null); setRows([]); setParsing(false); setImporting(false); setResult(null); setError(null)
  }

  useEffect(() => { if (!open) reset() }, [open])

  async function handleParse(f: File) {
    setFile(f); setRows([]); setResult(null); setError(null); setParsing(true)
    try {
      const preview = await parseMeterImport(f)
      setRows(preview)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to parse file')
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    const toImport = rows.filter(r => r.status !== 'error')
    if (!toImport.length) return
    setImporting(true); setError(null)
    try {
      const res = await bulkImportMeters(toImport)
      setResult(res)
      onImported()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const okCount    = rows.filter(r => r.status === 'ok').length
  const warnCount  = rows.filter(r => r.status === 'warning').length
  const errCount   = rows.filter(r => r.status === 'error').length

  const statusBadge = (s: string) => {
    if (s === 'ok')      return <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-success/10 text-success font-medium">New</span>
    if (s === 'warning') return <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-warning/10 text-warning font-medium">Update</span>
    return <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-danger/10 text-danger font-medium">Error</span>
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Meters" size="lg">
      <div className="space-y-4">
        {/* Step 1: Template + Upload */}
        <div className="flex items-center gap-3">
          <a
            href="/api/backend/meters/import-template"
            download="meter-import-template.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-sm text-text-muted hover:bg-surface-muted transition-colors"
          >
            ↓ Download Template
          </a>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors">
            📂 {file ? file.name : 'Choose Excel File (.xlsx)'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleParse(f) }} />
          </label>
          {parsing && <span className="text-sm text-text-muted">Parsing…</span>}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
        )}

        {/* Step 2: Preview */}
        {rows.length > 0 && !result && (
          <>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-success font-medium">{okCount} new</span>
              {warnCount > 0 && <span className="text-warning font-medium">{warnCount} update</span>}
              {errCount  > 0 && <span className="text-danger  font-medium">{errCount} error{errCount > 1 ? 's' : ''}</span>}
              <span className="text-text-muted ml-auto">Review rows below, then click Import</span>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border border-surface-border">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-surface-muted sticky top-0">
                  <tr>
                    {['#','Status','Meter No.','Unit','Utility','Type','Role','Last Reading','Message'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.rowNum} className={cn('border-t border-surface-border', row.status === 'error' ? 'opacity-50' : '')}>
                      <td className="px-3 py-2 text-text-muted">{row.rowNum}</td>
                      <td className="px-3 py-2">{statusBadge(row.status)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.meterNumber}</td>
                      <td className="px-3 py-2">{row.unitLabel || <span className="text-text-muted">—</span>}</td>
                      <td className="px-3 py-2">{row.utilityType}</td>
                      <td className="px-3 py-2">{row.meterType}</td>
                      <td className="px-3 py-2">{row.meterRole}</td>
                      <td className="px-3 py-2">{row.lastReading ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-text-muted">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" size="sm" onClick={reset}>Clear</Button>
              <Button size="sm" onClick={handleImport} disabled={importing || (okCount + warnCount) === 0}>
                {importing ? 'Importing…' : `Import ${okCount + warnCount} Meter${(okCount + warnCount) !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Result */}
        {result && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20 space-y-1">
            <p className="font-medium text-success">Import complete</p>
            <p className="text-sm text-text">{result.created} meter{result.created !== 1 ? 's' : ''} created, {result.updated} updated{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}.</p>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function MetersTab({
  onRead, onView, onAddMeter, onImportMeters, externalRefreshKey,
}: {
  onRead: (m: MeterData) => void
  onView: (m: MeterData) => void
  onAddMeter: () => void
  onImportMeters: () => void
  externalRefreshKey?: number
}) {
  const [search, setSearch]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [utility, setUtility] = useState('all')
  const [type, setType]       = useState('all')
  const [role, setRole]       = useState('all')
  const [page, setPage]       = useState(1)
  const [meters, setMeters]   = useState<MeterData[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editTarget, setEditTarget]               = useState<MeterData | null>(null)
  const [showEdit, setShowEdit]                   = useState(false)
  const [deleteTarget, setDeleteTarget]           = useState<MeterData | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting]                   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMetersPaged({
      search:      debouncedSearch || undefined,
      utilityType: utility !== 'all' ? utility : undefined,
      meterType:   type    !== 'all' ? type    : undefined,
      meterRole:   role    !== 'all' ? role    : undefined,
      deployed:    true,
      page:        page - 1,
      size:        PAGE_SIZE,
    }).then(r => {
      if (!cancelled) { setMeters(r.content); setTotalPages(r.totalPages); setTotalElements(r.totalElements) }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, utility, type, role, page, refreshKey, externalRefreshKey])

  function refresh() { setRefreshKey(k => k + 1) }

  async function handleDeleteMeter() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteGlobalMeter(deleteTarget.id)
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
      refresh()
    } catch { /* ignore */ }
    finally { setDeleting(false) }
  }

  const filtered = meters  // alias for template compatibility below

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search unit, meter no…" containerClassName="w-60" />
        <Select value={utility} onChange={v => { setUtility(v); setPage(1) }} options={UTILITY_FILTERS} className="w-44" />
        <Select value={type}    onChange={v => { setType(v);    setPage(1) }} options={METER_TYPE_FILTERS} className="w-36" />
        <Select value={role}    onChange={v => { setRole(v);    setPage(1) }} options={ROLE_FILTERS} className="w-44" />
        <div className="ml-auto flex items-center gap-2">
          {!loading && <span className="text-xs text-text-muted">{totalElements.toLocaleString()} meters</span>}
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" variant="ghost" onClick={onImportMeters}>↑ Import</Button>
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
      ) : meters.length === 0 ? (
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
                      ) : m.last_reading === null ? (
                        <CanDo action="write" resource={{ type: 'unit' }}>
                          <button
                            onClick={() => { setEditTarget(m); setShowEdit(true) }}
                            className="text-xs font-medium text-warning hover:underline whitespace-nowrap"
                            title="Set the opening baseline reading — no charge generated"
                          >
                            Set Opening Reading
                          </button>
                        </CanDo>
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
                      <span className="text-text-muted">·</span>
                      <CanDo action="write" resource={{ type: 'unit' }}>
                        <button
                          onClick={() => { setEditTarget(m); setShowEdit(true) }}
                          className="text-xs font-medium text-text-muted hover:text-text whitespace-nowrap"
                        >
                          Edit
                        </button>
                      </CanDo>
                      <span className="text-text-muted">·</span>
                      <CanDo action="write" resource={{ type: 'unit' }}>
                        <button
                          onClick={() => { setDeleteTarget(m); setShowDeleteConfirm(true) }}
                          className="text-xs font-medium text-danger hover:text-red-700 whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </CanDo>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onPage={setPage} />

      <EditMeterModal
        meter={editTarget}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); refresh() }}
      />
      {deleteTarget && (
        <Modal open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }} title="Delete Meter" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-text">
              Delete meter <strong className="font-mono">{deleteTarget.meter_number}</strong>
              {deleteTarget.unit_label ? ` (${deleteTarget.unit_label})` : ''}? This cannot be undone.
            </p>
            <p className="text-xs text-text-muted">All readings and migration history for this meter will also be deleted.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }} disabled={deleting}>Cancel</Button>
              <Button variant="danger" size="sm" onClick={handleDeleteMeter} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Meter'}
              </Button>
            </div>
          </div>
        </Modal>
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
            <PhoneInput value={contactPhone} onChange={setCP} />
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
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
    setSaveError(null)
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
    setSaveError(null)
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
      setSaveError(err instanceof Error ? err.message : 'Failed to save balance period')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!period) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteWaterBalancePeriod(period.id)
      setSelected('')
      setShowDeleteConfirm(false)
      onRefresh()
    } catch {
      setDeleteError('Failed to delete period. Please try again.')
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
              <Button variant="ghost" size="sm" className="text-danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete
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

          {saveError && (
            <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setSaveError(null) }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Update Period' : 'Create Period'}</Button>
          </div>
        </form>
      </Modal>

      {deleteError && (
        <div className="mt-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{deleteError}</div>
      )}

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Balance Period" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text">Delete water balance report for <strong>{period?.period}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete Period'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── ReadingsTab ────────────────────────────────────────────────────────────

function ReadingsTab() {
  const [search, setSearch]         = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [periodFilter, setPeriod]   = useState('')
  const [utilityFilter, setUtility] = useState('all')
  const [statusFilter, setStatus]   = useState('all')
  const [page, setPage]             = useState(1)
  const [readings, setReadings]     = useState<MeterReadingData[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [periods, setPeriods]       = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [photoUrl, setPhotoUrl]     = useState<string | null>(null)

  function onRefresh() { setRefreshKey(k => k + 1) }

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMeterReadingsPaged({
      search:      debouncedSearch || undefined,
      period:      periodFilter   || undefined,
      utilityType: utilityFilter !== 'all' ? utilityFilter : undefined,
      status:      statusFilter  !== 'all' ? statusFilter  : undefined,
      page:        page - 1,
      size:        PAGE_SIZE,
    }).then(r => {
      if (!cancelled) {
        setReadings(r.content)
        setTotalPages(r.totalPages)
        setTotalElements(r.totalElements)
        setPeriods(r.periods)
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, periodFilter, utilityFilter, statusFilter, page, refreshKey])

  // Bulk import
  const [showBulkModal, setShowBulkModal]   = useState(false)
  const [bulkPeriod, setBulkPeriod]         = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [bulkRows, setBulkRows]             = useState<{ meterId: string; meterLabel: string; currentValue: string }[]>([])
  const [bulkLoading, setBulkLoading]       = useState(false)
  const [bulkResult, setBulkResult]         = useState<{ created: number; errors: number; errorDetails: string[] } | null>(null)
  const [bulkError, setBulkError]           = useState<string | null>(null)

  function openBulkModal() {
    setBulkRows([{ meterId: '', meterLabel: '', currentValue: '' }])
    setBulkResult(null); setBulkError(null)
    setShowBulkModal(true)
  }

  async function handleBulkSubmit() {
    const items = bulkRows
      .filter(r => r.meterId && r.currentValue !== '')
      .map(r => ({ meter_id: r.meterId, current_value: parseFloat(r.currentValue), billing_period: bulkPeriod }))
    if (!items.length) { setBulkError('Enter at least one reading.'); return }
    setBulkLoading(true); setBulkError(null)
    try {
      const result = await bulkCreateReadings(items)
      setBulkResult(result)
      onRefresh()
    } catch (e: unknown) {
      setBulkError(e instanceof Error ? e.message : 'Bulk import failed')
    } finally {
      setBulkLoading(false)
    }
  }

  // Estimated readings
  const [showEstModal, setShowEstModal] = useState(false)
  const [estPeriod, setEstPeriod]       = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [generating, setGenerating]     = useState(false)
  const [estResult, setEstResult]       = useState<{ generated: number; skipped: number } | null>(null)
  const [estError, setEstError]         = useState<string | null>(null)

  async function handleGenerateEstimated() {
    setGenerating(true); setEstResult(null); setEstError(null)
    try {
      const result = await generateEstimatedReadings(estPeriod)
      setEstResult(result)
      onRefresh()
    } catch (e: unknown) {
      setEstError(e instanceof Error ? e.message : 'Failed to generate estimated readings')
    } finally {
      setGenerating(false)
    }
  }

  // CSV readings import
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult]       = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [showCsvModal, setShowCsvModal] = useState(false)

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setCsvImporting(true)
    setCsvResult(null)
    setShowCsvModal(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/backend/meter-readings/import-csv', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? 'Import failed')
      setCsvResult(data)
      onRefresh()
    } catch (err: unknown) {
      setCsvResult({ imported: 0, skipped: 0, errors: [err instanceof Error ? err.message : 'Import failed'] })
    } finally {
      setCsvImporting(false)
    }
  }

  const pendingCount = readings.filter(r => r.status === 'pending_bill').length

  async function handleMarkBilled(id: string) {
    setUpdatingId(id)
    try { await updateReadingStatus(id, 'billed'); onRefresh() }
    catch { /* ignore */ }
    finally { setUpdatingId(null) }
  }

  async function handleMarkAllBilled() {
    const pending = readings.filter(r => r.status === 'pending_bill')
    setMarkingAll(true)
    for (const r of pending) {
      await updateReadingStatus(r.id, 'billed').catch(() => {})
    }
    setMarkingAll(false)
    onRefresh()
  }

  function exportCsv() {
    const headers = ['Unit', 'Meter No', 'Utility', 'Period', 'Prev', 'Current', 'Consumed', 'Unit Cost', 'Amount Due', 'Mgmt Fee', 'Source', 'Read By', 'Date', 'Status']
    const rows = readings.map(r => [
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
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Search unit, meter no…" containerClassName="w-56" />
        <select
          value={periodFilter}
          onChange={e => { setPeriod(e.target.value); setPage(1) }}
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
              <Button size="sm" variant="outline" onClick={handleMarkAllBilled} disabled={markingAll}>
                {markingAll ? 'Marking…' : `Mark All Billed (${pendingCount})`}
              </Button>
            </CanDo>
          )}
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" variant="ghost" onClick={openBulkModal}>
              Bulk Import
            </Button>
          </CanDo>
          <CanDo action="write" resource={{ type: 'unit' }}>
            <Button size="sm" variant="ghost" onClick={() => { setShowEstModal(true); setEstResult(null); setEstError(null) }}>
              Generate Estimated
            </Button>
          </CanDo>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={readings.length === 0}>
            ⬇ Export CSV
          </Button>
          <CanDo action="write" resource={{ type: 'unit' }}>
            <>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvImport}
              />
              <Button size="sm" variant="ghost" onClick={() => csvInputRef.current?.click()} disabled={csvImporting}>
                {csvImporting ? 'Importing…' : '⬆ Import Readings CSV'}
              </Button>
            </>
          </CanDo>
        </div>
      </div>

      {/* CSV Import Result Modal */}
      <Modal open={showCsvModal} onClose={() => { setShowCsvModal(false); setCsvResult(null) }} title="Import Readings CSV" size="sm">
        <div className="p-5 space-y-4">
          {csvImporting ? (
            <div className="py-6 text-center text-text-muted text-sm">Importing readings…</div>
          ) : csvResult ? (
            <div className="space-y-3">
              <div className={cn('rounded-lg p-4 text-sm', csvResult.imported > 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                <p className="font-semibold mb-1">{csvResult.imported > 0 ? 'Import Complete' : 'No Rows Imported'}</p>
                <p>{csvResult.imported} reading(s) imported, {csvResult.skipped} skipped.</p>
              </div>
              {csvResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-danger">Errors:</p>
                  <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {csvResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-danger">{e}</p>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="primary" className="w-full" onClick={() => { setShowCsvModal(false); setCsvResult(null) }}>Close</Button>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Estimated Readings Modal */}
      <Modal open={showEstModal} onClose={() => setShowEstModal(false)} title="Generate Estimated Readings" size="sm">
        <div className="p-5 space-y-4">
          {estResult ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Done</p>
                <p>{estResult.generated} estimated reading(s) generated. {estResult.skipped} meter(s) skipped (already have a reading or no history).</p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setShowEstModal(false)}>Close</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                For any active water/sewer meter without a reading for the selected period,
                this will auto-generate an estimated reading based on the meter's rolling average consumption.
              </p>
              {estError && <p className="text-sm text-danger">{estError}</p>}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Billing Period</label>
                <input
                  type="month" value={estPeriod} onChange={e => setEstPeriod(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowEstModal(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" disabled={generating || !estPeriod} onClick={handleGenerateEstimated}>
                  {generating ? 'Generating…' : `Generate for ${estPeriod}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={showBulkModal} onClose={() => setShowBulkModal(false)} title="Bulk Import Readings" size="lg">
        <div className="p-5 space-y-4">
          {bulkResult ? (
            <div className="space-y-3">
              <div className={cn('rounded-lg p-4 text-sm', bulkResult.errors > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success')}>
                <p className="font-semibold mb-1">{bulkResult.created} reading(s) created{bulkResult.errors > 0 ? `, ${bulkResult.errors} error(s)` : ''}</p>
                {bulkResult.errorDetails.map((e, i) => <p key={i} className="text-xs">{e}</p>)}
              </div>
              <Button variant="primary" className="w-full" onClick={() => setShowBulkModal(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-text-muted whitespace-nowrap">Billing Period</label>
                <input type="month" value={bulkPeriod} onChange={e => setBulkPeriod(e.target.value)}
                  className="h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="max-h-96 overflow-y-auto border border-surface-border dark:border-dark-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-muted dark:bg-dark-card">
                    <tr className="border-b border-surface-border dark:border-dark-border">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">Meter</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase w-40">Current Reading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map((row, i) => (
                      <tr key={i} className="border-b border-surface-border dark:border-dark-border last:border-0">
                        <td className="px-4 py-2 text-text-muted">{row.meterLabel || row.meterId}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number" step="0.001" placeholder="—"
                            value={row.currentValue}
                            onChange={e => setBulkRows(rows => rows.map((r, j) => j === i ? { ...r, currentValue: e.target.value } : r))}
                            className="w-full h-8 px-2 text-sm border border-surface-border dark:border-dark-border rounded bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bulkError && <p className="text-sm text-danger">{bulkError}</p>}
              <p className="text-xs text-text-muted">Leave a row blank to skip that meter.</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowBulkModal(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" disabled={bulkLoading} onClick={handleBulkSubmit}>
                  {bulkLoading ? 'Importing…' : `Import ${bulkRows.filter(r => r.currentValue !== '').length} Reading(s)`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Photo lightbox */}
      {photoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPhotoUrl(null)}>
          <img src={photoUrl} alt="Meter photo" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card">
                {['Unit', 'Utility', 'Period', 'Consumed', 'Amount Due', 'Mgmt Fee', 'Source', 'Read By', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-text-muted">Loading readings…</td></tr>
              ) : readings.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-text-muted">No readings match filters.</td></tr>
              ) : readings.map((r, i) => (
                <tr key={r.id} className={cn('border-b border-surface-border dark:border-dark-border hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors', i === readings.length - 1 && 'border-b-0', r.anomaly && 'bg-warning/5')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{r.unit_label ?? '—'}</p>
                    <p className="text-xs text-text-muted font-mono">{r.meter_number}</p>
                    {r.notes && <p className="text-xs text-warning mt-0.5 truncate max-w-[160px]" title={r.notes}>{r.notes}</p>}
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
                      r.source === 'estimated' ? 'bg-surface-border text-text-muted italic' :
                      'bg-surface-border text-text-muted'
                    )}>
                      {r.source === 'smart_iot' ? '⚡ IoT' : r.source === 'vending_issue' ? '🏧 Vending' : r.source === 'estimated' ? '~ Est.' : r.source ?? 'manual'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{r.read_by ?? '—'}</td>
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
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {r.anomaly && (
                        <span title="Consumption is >2× the meter's rolling average" className="text-xs px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium whitespace-nowrap">
                          ⚠ Anomaly
                        </span>
                      )}
                      {r.photo_base64 && (
                        <button
                          onClick={() => setPhotoUrl(r.photo_base64)}
                          title="View meter photo"
                          className="text-text-muted hover:text-primary-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </Card>
    </div>
  )
}

// ── Disconnection Notices Tab ─────────────────────────────────────────────────

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
  settings,
  loading,
  onRefresh,
}: {
  meters: MeterData[]
  overdueCharges: ChargeData[]
  sentNotices: DisconnectionNoticeData[]
  settings: FacilitySettings | null
  loading: boolean
  onRefresh: () => void
}) {
  const reminderDays = settings?.disconnection_reminder_days ?? 7
  const formalDays   = settings?.disconnection_formal_days   ?? 14

  const [sending, setSending] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [candPage, setCandPage] = useState(1)
  const CAND_PAGE_SIZE = 25

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
      if (daysOverdue >= formalDays) stage = 'formal_due'
      else if (daysOverdue >= reminderDays) stage = 'reminder_due'
      else if (daysOverdue > 0) stage = 'overdue'

      return { meter, days_overdue: daysOverdue, outstanding_amount: outstanding, stage }
    }).filter(c => c.stage !== 'clear' || c.outstanding_amount > 0)
  }, [meters, overdueCharges])

  const formalDue    = candidates.filter(c => c.stage === 'formal_due')
  const reminderDue  = candidates.filter(c => c.stage === 'reminder_due')
  const overdueClear = candidates.filter(c => c.stage === 'overdue')
  const candTotalPages = Math.max(1, Math.ceil(candidates.length / CAND_PAGE_SIZE))
  const pagedCandidates = candidates.slice((candPage - 1) * CAND_PAGE_SIZE, candPage * CAND_PAGE_SIZE)

  async function handleReconnect(noticeId: string) {
    setReconnecting(noticeId)
    try {
      await reconnectNotice(noticeId)
      showToast('✅ Reconnection recorded')
      onRefresh()
    } catch {
      showToast('❌ Failed to record reconnection')
    } finally {
      setReconnecting(null)
    }
  }

  function noticeSent(meterId: string, type: 'reminder' | 'formal') {
    return sentNotices.some(n => n.meter_id === meterId && n.notice_type === type)
  }

  async function sendNotice(candidate: DisconnectionCandidate, type: 'reminder' | 'formal') {
    const key = `${candidate.meter.id}_${type}`
    setSending(key)
    try {
      const personId = candidate.meter.current_billing_person?.person_id ?? null
      let personPhone: string | null = null
      let personEmail: string | null = null
      if (personId) {
        try {
          const person = await getPersonById(personId)
          personPhone = person.phone ?? null
          personEmail = person.email ?? null
        } catch { /* proceed without contact details */ }
      }

      await sendDisconnectionNotice({
        meter_id: candidate.meter.id,
        meter_number: candidate.meter.meter_number,
        unit_id: candidate.meter.unit_id,
        unit_label: candidate.meter.unit_label,
        person_id: personId,
        person_name: candidate.meter.current_billing_person?.name ?? null,
        person_phone: personPhone,
        person_email: personEmail,
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
              Day {reminderDays} — Reminder notice
            </span>
            <span className="text-gray-300">→</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Day {formalDays} — Formal disconnection notice
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
          <p className="text-[11px] text-red-500">{formalDays}+ days overdue</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{reminderDue.length}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Reminder Due</p>
          <p className="text-[11px] text-amber-500">{reminderDays}–{formalDays - 1} days overdue</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{overdueClear.length}</p>
          <p className="text-xs text-gray-600 font-medium mt-1">Overdue (grace period)</p>
          <p className="text-[11px] text-gray-500">1–{reminderDays - 1} days overdue</p>
        </div>
      </div>

      {/* Meters table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center">
          <h4 className="text-sm font-semibold text-gray-900 flex-1">Postpaid Meters — Overdue Bills</h4>
          {formalDue.some(c => !noticeSent(c.meter.id, 'formal')) && (
            <CanDo action="write" resource={{ type: 'unit' }}>
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
              {pagedCandidates.map(c => {
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
                      <span className={`font-semibold ${c.days_overdue >= formalDays ? 'text-red-600' : c.days_overdue >= reminderDays ? 'text-amber-600' : 'text-gray-600'}`}>
                        {c.days_overdue} days
                      </span>
                    </td>
                    <td className="px-4 py-3">{stageBadge(c.stage)}</td>
                    <td className="px-4 py-3">
                      <CanDo action="write" resource={{ type: 'unit' }}>
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
        {candidates.length > CAND_PAGE_SIZE && (
          <Pager page={candPage} totalPages={candTotalPages} onPage={setCandPage} />
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
                <th className="px-4 py-3 font-medium">Status</th>
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
                  <td className="px-4 py-3">
                    {n.status === 'reconnected' ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Reconnected</span>
                    ) : (
                      <button
                        disabled={reconnecting === n.id}
                        onClick={() => handleReconnect(n.id)}
                        className="rounded px-2 py-0.5 text-xs font-semibold border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        {reconnecting === n.id ? '…' : 'Reconnect'}
                      </button>
                    )}
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

// ── Assign Meter Modal ─────────────────────────────────────────────────────

function AssignMeterModal({
  meter, open, onClose, onAssigned,
}: {
  meter: MeterData | null
  open: boolean
  onClose: () => void
  onAssigned: () => void
}) {
  const [units, setUnits]           = useState<UnitData[]>([])
  const [search, setSearch]         = useState('')
  const [selectedUnit, setSelected] = useState<UnitData | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setSearch(''); setSelected(null); setError(null)
      getUnitsFromApi().then(setUnits).catch(() => {})
    }
  }, [open])

  const filteredUnits = useMemo(() => {
    const q = search.toLowerCase()
    return units.filter(u =>
      !q || u.unit_label.toLowerCase().includes(q) || (u.block ?? '').toLowerCase().includes(q)
    )
  }, [units, search])

  async function handleAssign() {
    if (!meter || !selectedUnit) return
    setSaving(true); setError(null)
    try {
      await assignMeter(meter.id, selectedUnit.id, selectedUnit.unit_label)
      onAssigned()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign meter.')
    } finally {
      setSaving(false)
    }
  }

  if (!meter) return null

  return (
    <Modal open={open} onClose={onClose} title="Assign Meter to Unit" size="md">
      <div className="space-y-4">
        {/* Meter summary */}
        <div className="rounded-lg bg-surface-muted dark:bg-dark-card p-3 flex gap-4 text-sm">
          <div>
            <p className="text-xs text-text-muted">Meter</p>
            <p className="font-mono font-medium text-text">{meter.meter_number}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Utility</p>
            <p className="font-medium text-text">{utilityIcon(meter.utility_type)} {utilityLabel(meter.utility_type)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Type</p>
            <div className="mt-0.5">{meterTypeBadge(meter.meter_type)}</div>
          </div>
        </div>

        {/* Unit search */}
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Search Unit</label>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Unit label or block…"
            containerClassName="w-full"
          />
        </div>

        {/* Unit list */}
        <div className="max-h-64 overflow-y-auto rounded-lg border border-surface-border dark:border-dark-border divide-y divide-surface-border dark:divide-dark-border">
          {filteredUnits.length === 0 ? (
            <p className="py-6 text-center text-xs text-text-muted">No units found</p>
          ) : (
            filteredUnits.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelected(u)}
                className={cn(
                  'w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between',
                  selectedUnit?.id === u.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-surface-hover dark:hover:bg-dark-hover text-text'
                )}
              >
                <div>
                  <span className="font-medium">{u.unit_label}</span>
                  {u.block && <span className="text-text-muted ml-2 text-xs">Block {u.block}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const effectiveStatus = u.current_occupant ? 'occupied' : u.status
                    const cls =
                      effectiveStatus === 'occupied'    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                      effectiveStatus === 'vacant'      ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
                    return <span className={cn('text-xs px-2 py-0.5 rounded', cls)}>{effectiveStatus}</span>
                  })()}
                  {u.current_occupant && <span className="text-xs text-text-muted truncate max-w-[120px]">{u.current_occupant}</span>}
                  {selectedUnit?.id === u.id && <span className="text-primary-600 font-bold">✓</span>}
                </div>
              </button>
            ))
          )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={saving || !selectedUnit}>
            {saving ? 'Assigning…' : `Assign to ${selectedUnit?.unit_label ?? '—'}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Inventory Tab ──────────────────────────────────────────────────────────

function InventoryTab({
  onAssign, externalRefreshKey,
}: {
  onAssign: (m: MeterData) => void
  externalRefreshKey?: number
}) {
  const [search, setSearch]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setType] = useState<string>('all')
  const [page, setPage]       = useState(1)
  const [meters, setMeters]   = useState<MeterData[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMetersPaged({
      search:      debouncedSearch || undefined,
      utilityType: typeFilter !== 'all' ? typeFilter : undefined,
      inventory:   true,
      page:        page - 1,
      size:        PAGE_SIZE,
    }).then(r => {
      if (!cancelled) { setMeters(r.content); setTotalPages(r.totalPages); setTotalElements(r.totalElements) }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedSearch, typeFilter, page, externalRefreshKey])

  const filtered = meters  // alias

  if (loading) return <p className="py-12 text-center text-text-muted text-sm">Loading…</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={search} onChange={setSearch} placeholder="Meter number, account, utility…" containerClassName="w-full sm:w-64" />
        <Select
          value={typeFilter}
          onChange={setType}
          options={[
            { value: 'all',          label: 'All utilities' },
            { value: 'water',        label: '💧 Water' },
            { value: 'electricity',  label: '⚡ Electricity' },
            { value: 'gas_piped',    label: '🔥 Gas (Piped)' },
            { value: 'gas_cylinder', label: '🔥 Gas (Cylinder)' },
            { value: 'sewerage',     label: '🚰 Sewerage' },
            { value: 'internet',     label: '📶 Internet' },
          ]}
          className="w-44"
        />
        <p className="text-xs text-text-muted ml-auto">{totalElements} meter{totalElements !== 1 ? 's' : ''} in inventory</p>
      </div>

      {meters.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-2xl mb-2">📦</p>
          <p className="text-sm font-medium text-text">No unassigned meters</p>
          <p className="text-xs text-text-muted mt-1">
            {totalElements === 0
              ? 'Meters registered without a unit assignment appear here.'
              : 'All meters have been assigned to units.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-muted dark:bg-dark-hover border-b border-surface-border dark:border-dark-border">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Utility</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Meter Number</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Account No.</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Registered</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-muted">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors">
                  <td className="px-4 py-3 text-sm">
                    <span>{utilityIcon(m.utility_type)}</span>
                    <span className="text-xs text-text-muted ml-1.5">{utilityLabel(m.utility_type)}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text">{m.meter_number}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{m.account_number ?? '—'}</td>
                  <td className="px-4 py-3">{meterTypeBadge(m.meter_type)}</td>
                  <td className="px-4 py-3">
                    {statusDot(m.status)}
                    <span className="text-xs text-text-muted capitalize">{m.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {m.created_at
                      ? new Date(m.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => onAssign(m)}>
                      Assign to Unit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} totalPages={totalPages} onPage={setPage} />

      <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border text-xs text-text-muted">
        <strong>Inventory</strong> holds meters registered without a unit assignment.
        Once assigned to a unit they move to the <strong>Meters</strong> tab and become active.
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────────────

// ── Reading Run Tab ────────────────────────────────────────────────────────

function currentPeriodStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fmtPeriodLabel(period: string) {
  try {
    const [y, m] = period.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  } catch { return period }
}

function fmtReading3(n: number) {
  return n.toLocaleString('en-KE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function ReadingRunTab({ onRefreshMeters }: { onRefreshMeters: () => void }) {
  const [period, setPeriod]             = useState(currentPeriodStr)
  const [utilFilter, setUtilFilter]     = useState('all')
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]                 = useState(1)
  const [runRows, setRunRows]           = useState<ReadingRunRowData[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages]     = useState(1)
  const [readCount, setReadCount]       = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading]           = useState(false)
  const [readTarget, setReadTarget]     = useState<MeterData | null>(null)
  const [showRead, setShowRead]         = useState(false)
  const [estimating, setEstimating]     = useState(false)
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null)
  const [wsInvoices, setWsInvoices]     = useState<InvoiceData[]>([])
  const [refreshKey, setRefreshKey]     = useState(0)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMeterReadingRun({
      period:      period || undefined,
      utilityType: utilFilter !== 'all' ? utilFilter : undefined,
      search:      debouncedSearch || undefined,
      page:        page - 1,
      size:        PAGE_SIZE,
    }).then(r => {
      if (!cancelled) {
        setRunRows(r.content)
        setTotalElements(r.totalElements)
        setTotalPages(r.totalPages)
        setReadCount(r.readCount)
        setPendingCount(r.pendingCount)
      }
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, utilFilter, debouncedSearch, page, refreshKey])

  // Back-billing guard: fetch WS invoices once per period
  const billedLaterUnitIds = useMemo(() => {
    const laterBilled = wsInvoices.filter(inv =>
      ['issued', 'partial', 'paid'].includes(inv.status) &&
      inv.period != null && inv.period > period,
    )
    return new Set(laterBilled.map(inv => inv.unit_id))
  }, [wsInvoices, period])

  const backPeriodCount = useMemo(
    () => runRows.filter(r => r.unitId != null && billedLaterUnitIds.has(r.unitId)).length,
    [runRows, billedLaterUnitIds],
  )

  const pct = totalElements > 0 ? Math.round((readCount / totalElements) * 100) : 0
  const anomalies = runRows.filter(r => r.anomaly && r.readingId).length

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    getInvoices({ categoryCode: 'WS' }).then(setWsInvoices).catch(() => {})
  }, [])

  async function fetchReadings() {
    setRefreshKey(k => k + 1)
  }

  async function handleEstimate() {
    setEstimating(true)
    try {
      const res = await generateEstimatedReadings(period)
      const gen = res.generated ?? 0
      const blocked = res.back_billing_blocked ?? 0
      let msg = `Generated ${gen} estimated reading${gen === 1 ? '' : 's'}.`
      if (blocked > 0) msg += ` ${blocked} skipped — already billed for a later period.`
      showToast(msg, blocked === 0 || gen > 0)
      await fetchReadings()
    } catch {
      showToast('Failed to generate estimates.', false)
    } finally {
      setEstimating(false)
    }
  }

  function shiftPeriod(delta: number) {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + delta)
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const progressColor =
    pct === 100 ? 'bg-green-500' :
    pct >= 75   ? 'bg-primary-500' :
    pct >= 40   ? 'bg-amber-400'  : 'bg-red-400'

  return (
    <div className="space-y-5">

      {/* ── Period selector + actions ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftPeriod(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors text-lg font-light"
          >‹</button>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="h-9 px-3 text-sm font-medium border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
          />
          <button
            onClick={() => shiftPeriod(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors text-lg font-light"
          >›</button>
          <span className="text-sm font-semibold text-text hidden sm:block">{fmtPeriodLabel(period)}</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Button variant="outline" size="sm" disabled={estimating} onClick={handleEstimate}>
              {estimating
                ? <><span className="w-3 h-3 border-2 border-primary-400/40 border-t-primary-500 rounded-full animate-spin mr-1.5 inline-block" />Generating…</>
                : `✦ Estimate ${pendingCount} unread`}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={loading} onClick={fetchReadings}>
            {loading ? '…' : '↺ Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={cn(
          'px-4 py-3 rounded-xl border text-sm font-medium',
          toast.ok
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
        )}>
          {toast.msg}
        </div>
      )}

      {/* ── Back-period warning ───────────────────────────────────────────── */}
      {backPeriodCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
          <span className="text-lg leading-none mt-0.5">⚠</span>
          <div>
            <span className="font-semibold">Back-period warning — </span>
            {backPeriodCount} meter{backPeriodCount !== 1 ? 's' : ''} in this view belong{backPeriodCount === 1 ? 's' : ''} to{' '}
            unit{backPeriodCount !== 1 ? 's' : ''} that already {backPeriodCount === 1 ? 'has' : 'have'} a billed WS invoice for a later period.{' '}
            Readings can still be recorded for audit purposes, but <span className="font-semibold">they cannot be billed</span>.
            If a correction is needed, void the later invoice first.
          </div>
        </div>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Total Meters</p>
          <p className="text-3xl font-bold text-text">{totalElements}</p>
          <p className="text-xs text-text-muted mt-1.5">Active consumer meters</p>
        </Card>
        <Card className="p-5 border-l-[3px] border-green-500">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Read</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{readCount}</p>
          <p className="text-xs text-text-muted mt-1.5">{pct}% complete</p>
        </Card>
        <Card className="p-5 border-l-[3px] border-amber-400">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Pending</p>
          <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="text-xs text-text-muted mt-1.5">{pendingCount === 0 ? 'All meters read' : 'Not yet recorded'}</p>
        </Card>
        <Card className={cn('p-5 border-l-[3px]', anomalies > 0 ? 'border-red-500' : 'border-surface-border dark:border-dark-border')}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Anomalies</p>
          <p className={cn('text-3xl font-bold', anomalies > 0 ? 'text-red-600 dark:text-red-400' : 'text-text-muted')}>{anomalies}</p>
          <p className="text-xs text-text-muted mt-1.5">{anomalies > 0 ? 'Review flagged readings' : 'All readings normal'}</p>
        </Card>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-text">Reading Progress</p>
            <p className="text-xs text-text-muted mt-0.5">{fmtPeriodLabel(period)}</p>
          </div>
          <span className={cn(
            'text-2xl font-bold',
            pct === 100 ? 'text-green-600 dark:text-green-400' :
            pct >= 75   ? 'text-primary-600 dark:text-primary-400' :
            pct >= 40   ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400',
          )}>{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-surface-muted dark:bg-dark-hover overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', progressColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-text-muted">{readCount} of {totalElements} meters read</span>
          {pct === 100
            ? <span className="text-xs font-semibold text-green-600 dark:text-green-400">All readings complete</span>
            : <span className="text-xs text-text-muted">{pendingCount} remaining</span>}
        </div>
      </Card>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search unit or meter number…"
          className="w-64"
        />
        <select
          value={utilFilter}
          onChange={e => { setUtilFilter(e.target.value); setPage(1) }}
          className="h-9 w-44 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        >
          <option value="all">All utilities</option>
          <option value="water">💧 Water</option>
          <option value="water_sewer">💧 Water & Sewer</option>
          <option value="electricity">⚡ Electricity</option>
          <option value="sewerage">🚰 Sewerage</option>
          <option value="gas_piped">🔥 Gas (Piped)</option>
          <option value="internet">📶 Internet</option>
        </select>
        {(search || utilFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setUtilFilter('all'); setPage(1) }}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >✕ Clear filters</button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-text-muted">
            <span className="w-7 h-7 border-2 border-primary-400/30 border-t-primary-500 rounded-full animate-spin" />
            <span className="text-sm">Loading readings for {fmtPeriodLabel(period)}…</span>
          </div>
        ) : runRows.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-semibold text-text">No active consumer meters found</p>
            <p className="text-sm text-text-muted mt-1">Assign meters to units from the Meters tab first</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border dark:border-dark-border bg-slate-50 dark:bg-dark-card">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Unit</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Meter No.</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Utility</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider">Prev Reading</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider">Curr Reading</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider">Consumed</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Date Read</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">Read By</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {runRows.map((r, i) => {
                  const isPending    = r.readingId == null
                  const isBackPeriod = r.unitId != null && billedLaterUnitIds.has(r.unitId)
                  const meterForModal: MeterData = {
                    id: r.meterId, unit_id: r.unitId, unit_label: r.unitLabel,
                    utility_type: r.utilityType, meter_type: r.meterType,
                    meter_number: r.meterNumber, account_number: null,
                    installation_date: null, status: 'active',
                    billing_arrangement: 'billed_to_occupant', management_fee_pct: null,
                    last_reading: r.lastReading, last_reading_date: r.lastReadingDate,
                    current_billing_person: null, meter_role: 'consumer',
                    rate_per_unit: null, notes: null, created_at: null,
                  }
                  return (
                    <tr
                      key={r.meterId}
                      className={cn(
                        'border-b border-surface-border dark:border-dark-border transition-colors',
                        isPending
                          ? i % 2 === 0 ? 'bg-amber-50/70 dark:bg-amber-900/10' : 'bg-amber-50/40 dark:bg-amber-900/5'
                          : r.anomaly
                            ? 'bg-red-50/60 dark:bg-red-900/10'
                            : i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-slate-50/60 dark:bg-dark-card/20',
                      )}
                    >
                      <td className="px-4 py-3 font-semibold text-text">
                        {r.unitLabel ?? <span className="text-text-muted italic">Unassigned</span>}
                        {isBackPeriod && (
                          <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 align-middle">record only</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{r.meterNumber}</td>
                      <td className="px-4 py-3">
                        <span className="text-base mr-1">{utilityIcon(r.utilityType)}</span>
                        <span className="text-xs text-text-muted">{utilityLabel(r.utilityType)}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text-muted">
                        {isPending
                          ? (r.lastReading != null ? fmtReading3(Number(r.lastReading)) : '—')
                          : fmtReading3(Number(r.previousValue ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-text">
                        {isPending ? '—' : fmtReading3(Number(r.currentValue ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-text">
                        {isPending ? '—' : (
                          <>
                            {fmtReading3(Number(r.unitsConsumed ?? 0))} <span className="text-text-muted text-xs">m³</span>
                            {r.anomaly && <span className="ml-1.5 text-red-500" title="Anomaly">⚠</span>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">
                        {r.readingDate ? new Date(r.readingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">{r.readBy ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">⏳ Pending</span>
                        ) : r.anomaly ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">⚠ Anomaly</span>
                        ) : r.source === 'estimated' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">~ Estimated</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">✓ Read</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPending && (
                          <button
                            onClick={() => { setReadTarget(meterForModal); setShowRead(true) }}
                            className={cn(
                              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-sm',
                              isBackPeriod
                                ? 'bg-surface-border dark:bg-dark-border text-text-muted cursor-default'
                                : 'bg-primary-600 hover:bg-primary-700 text-white',
                            )}
                            title={isBackPeriod ? 'Already billed for a later period — for audit only' : undefined}
                          >Record</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Summary footer */}
              {readCount > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-surface-border dark:border-dark-border bg-slate-100 dark:bg-dark-card font-semibold text-sm">
                    <td className="px-4 py-3 text-text-muted" colSpan={5}>
                      {readCount} reading{readCount !== 1 ? 's' : ''} recorded (total)
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text">
                      {fmtReading3(runRows.filter(r => r.unitsConsumed != null).reduce((s, r) => s + Number(r.unitsConsumed ?? 0), 0))} <span className="text-text-muted text-xs">m³ this page</span>
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
            <Pager page={page} totalPages={totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Reading entry modal */}
      <ReadingEntryModal
        meter={readTarget}
        open={showRead}
        defaultPeriod={period}
        onClose={() => { setShowRead(false); setReadTarget(null) }}
        onSaved={() => { fetchReadings(); onRefreshMeters() }}
      />
    </div>
  )
}

export function UtilitiesPageClient() {
  const [readTarget, setReadTarget]       = useState<MeterData | null>(null)
  const [showRead, setShowRead]           = useState(false)
  const [viewTarget, setViewTarget]       = useState<MeterData | null>(null)
  const [showView, setShowView]           = useState(false)
  const [showAddMeter, setShowAddMeter]   = useState(false)
  const [showImportMeters, setShowImportMeters] = useState(false)
  const [assignTarget, setAssignTarget]   = useState<MeterData | null>(null)
  const [showAssign, setShowAssign]       = useState(false)

  // Live data state
  const [utilityStats, setUtilityStats] = useState<UtilityStats | null>(null)
  const [supplyMeters, setSupplyMeters] = useState<MeterData[]>([])
  const [suppliers, setSuppliers] = useState<WaterSupplierData[]>([])
  const [tanks, setTanks]         = useState<ReserveTankData[]>([])
  const [zones, setZones]         = useState<WaterZoneData[]>([])
  const [periods, setPeriods]     = useState<WaterBalancePeriodData[]>([])
  const [overdueCharges, setOverdueCharges]   = useState<ChargeData[]>([])
  const [sentNotices, setSentNotices]         = useState<DisconnectionNoticeData[]>([])
  const [facilitySettings, setFacilitySettings] = useState<FacilitySettings | null>(null)
  const [loadingStats, setLoadingStats]       = useState(true)
  const [loadingSupply, setLoadingSupply]     = useState(false)
  const [loadingWater, setLoadingWater]       = useState(true)
  const [loadingBalance, setLoadingBalance]   = useState(true)
  const [meterTabRefreshKey, setMeterTabRefreshKey] = useState(0)
  const [loadingDisconn, setLoadingDisconn]   = useState(true)

  // Water loss / unread meters reports
  const [reportPeriod, setReportPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [waterLossData, setWaterLossData]   = useState<{
    period: string; supplier_total_m3: number; consumer_total_m3: number
    water_loss_m3: number; loss_pct: number; supplier_count: number; consumer_count: number
    supplier_readings: Record<string, unknown>[]; consumer_readings: Record<string, unknown>[]
  } | null>(null)
  const [unreadMetersData, setUnreadMetersData] = useState<import('@/lib/api/invoices').UnreadMetersPage | null>(null)
  const [reportLoading, setReportLoading]   = useState(false)
  const [reportError, setReportError]       = useState<string | null>(null)
  const [unreadSearch, setUnreadSearch]     = useState('')
  const [unreadPage, setUnreadPage]         = useState(0)
  const UNREAD_PAGE_SIZE = 20

  const loadReports = useCallback(async (period: string, search = '', pg = 0) => {
    setReportLoading(true); setReportError(null)
    try {
      const [wl, um] = await Promise.all([
        getWaterLossReport(period),
        getUnreadMeters(period, { search: search || undefined, page: pg, size: UNREAD_PAGE_SIZE }),
      ])
      setWaterLossData(wl); setUnreadMetersData(um)
    } catch (e: unknown) {
      setReportError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally {
      setReportLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try { setUtilityStats(await getUtilityStats()) }
    catch { /* keep null */ }
    finally { setLoadingStats(false) }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const fetchSupplyMeters = useCallback(async () => {
    setLoadingSupply(true)
    try { setSupplyMeters(await getAllMeters()) }
    catch { /* ignore */ }
    finally { setLoadingSupply(false) }
  }, [])

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
      const [charges, notices, settings] = await Promise.all([
        getOverdueUtilityCharges(),
        getDisconnectionNotices(),
        getSettings(),
      ])
      setOverdueCharges(charges)
      setSentNotices(notices)
      setFacilitySettings(settings)
    } catch { /* ignore */ }
    finally { setLoadingDisconn(false) }
  }, [])

  useEffect(() => { fetchDisconn() }, [fetchDisconn])

  const latestBalance  = periods[periods.length - 1]
  const lossFlag       = latestBalance?.flagged

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Consumer Meters</p>
          <p className="text-2xl font-bold text-text">{loadingStats ? '…' : utilityStats?.consumerMeters ?? 0}</p>
          <p className="text-xs text-text-muted">{loadingStats ? '' : `${utilityStats?.activeConsumerMeters ?? 0} active`}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Smart Meters</p>
          <p className="text-2xl font-bold text-success">{loadingStats ? '…' : utilityStats?.smartMeters ?? 0}</p>
          <p className="text-xs text-text-muted">IoT auto-read</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">Pending Billing</p>
          <p className="text-2xl font-bold text-warning">{loadingStats ? '…' : utilityStats?.pendingBillingReadings ?? 0}</p>
          <p className="text-xs text-text-muted">Readings not billed</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted font-medium mb-1">In Inventory</p>
          <p className="text-2xl font-bold text-text">{loadingStats ? '…' : utilityStats?.inventoryMeters ?? 0}</p>
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
      <Tabs defaultValue="meters" onValueChange={v => {
        if (v === 'supply' || v === 'disconnections') fetchSupplyMeters()
        if (v === 'reports') loadReports(reportPeriod)
      }}>
        <TabsList>
          <TabsTrigger value="meters">Meters</TabsTrigger>
          <TabsTrigger value="inventory">
            Inventory
            {(utilityStats?.inventoryMeters ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-1">
                {utilityStats!.inventoryMeters}
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
          <TabsTrigger value="reading-run">Reading Run</TabsTrigger>
          <TabsTrigger value="disconnections">Disconnections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="meters" className="pt-5">
          <MetersTab
            externalRefreshKey={meterTabRefreshKey}
            onRead={m => { setReadTarget(m); setShowRead(true) }}
            onView={m => { setViewTarget(m); setShowView(true) }}
            onAddMeter={() => setShowAddMeter(true)}
            onImportMeters={() => setShowImportMeters(true)}
          />
        </TabsContent>
        <TabsContent value="inventory" className="pt-5">
          <InventoryTab
            externalRefreshKey={meterTabRefreshKey}
            onAssign={m => { setAssignTarget(m); setShowAssign(true) }}
          />
        </TabsContent>
        <TabsContent value="supply" className="pt-5">
          <WaterSupplyTab
            suppliers={suppliers}
            tanks={tanks}
            zones={zones}
            meters={supplyMeters}
            loading={loadingWater || loadingSupply}
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
          <ReadingsTab />
        </TabsContent>
        <TabsContent value="reading-run" className="pt-5">
          <ReadingRunTab onRefreshMeters={fetchStats} />
        </TabsContent>
        <TabsContent value="disconnections" className="pt-5">
          <DisconnectionTab
            meters={supplyMeters}
            overdueCharges={overdueCharges}
            sentNotices={sentNotices}
            settings={facilitySettings}
            loading={loadingDisconn || loadingSupply}
            onRefresh={fetchDisconn}
          />
        </TabsContent>

        <TabsContent value="reports" className="pt-5">
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-sm font-medium text-text-muted">Period</label>
              <input
                type="month"
                value={reportPeriod}
                onChange={e => {
                  setReportPeriod(e.target.value)
                  setUnreadSearch(''); setUnreadPage(0)
                  loadReports(e.target.value, '', 0)
                }}
                className="h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button variant="outline" size="sm" disabled={reportLoading} onClick={() => { setUnreadPage(0); loadReports(reportPeriod, unreadSearch, 0) }}>
                {reportLoading ? 'Loading…' : 'Refresh'}
              </Button>
              {waterLossData && (
                <Button size="sm" variant="ghost" onClick={() => {
                  const rows = [
                    ['Period', 'Supplier m³', 'Consumer m³', 'Loss m³', 'Loss %'],
                    [waterLossData.period, waterLossData.supplier_total_m3, waterLossData.consumer_total_m3, waterLossData.water_loss_m3, waterLossData.loss_pct],
                  ]
                  const csv = rows.map(r => r.map(v => `"${String(v)}"`).join(',')).join('\n')
                  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                  a.download = `water-loss-${reportPeriod}.csv`; a.click()
                }}>⬇ Water Loss CSV</Button>
              )}
              {unreadMetersData && unreadMetersData.totalElements > 0 && (
                <Button size="sm" variant="ghost" onClick={() => {
                  const headers = ['Unit', 'Meter No', 'Utility', 'Type', 'Last Reading', 'Last Read Date']
                  const rows = unreadMetersData.content.map(m => [m.unit_label ?? '', m.meter_number, m.utility_type, m.meter_type, m.last_reading ?? '', m.last_reading_date ?? ''])
                  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v)}"`).join(',')).join('\n')
                  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
                  a.download = `unread-meters-${reportPeriod}.csv`; a.click()
                }}>⬇ Unread Meters CSV</Button>
              )}
            </div>

            {reportError && (
              <div className="bg-danger/10 text-danger text-sm px-4 py-2 rounded-lg">{reportError}</div>
            )}

            {/* Water Loss (NRW) Report */}
            {waterLossData && (
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text">Water Loss / NRW Report — {waterLossData.period}</h3>
                  <span className={cn(
                    'inline-flex px-3 py-1 rounded-full text-sm font-semibold',
                    waterLossData.loss_pct >= 15 ? 'bg-danger/10 text-danger'
                      : waterLossData.loss_pct >= 10 ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  )}>
                    {waterLossData.loss_pct}% loss
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    ['Supplier Total', `${waterLossData.supplier_total_m3.toFixed(1)} m³`, 'text-text'],
                    ['Consumer Total', `${waterLossData.consumer_total_m3.toFixed(1)} m³`, 'text-text'],
                    ['Water Loss',     `${waterLossData.water_loss_m3.toFixed(1)} m³`,     waterLossData.loss_pct >= 15 ? 'text-danger' : 'text-warning'],
                    ['Loss %',         `${waterLossData.loss_pct}%`,                        waterLossData.loss_pct >= 15 ? 'text-danger' : waterLossData.loss_pct >= 10 ? 'text-warning' : 'text-success'],
                  ].map(([label, value, cls]) => (
                    <div key={label as string} className="bg-surface dark:bg-dark-surface rounded-lg p-3 border border-surface-border dark:border-dark-border">
                      <p className="text-xs text-text-muted mb-1">{label}</p>
                      <p className={cn('text-lg font-semibold', cls as string)}>{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  {waterLossData.supplier_count} supplier reading(s) · {waterLossData.consumer_count} consumer reading(s)
                </p>
              </Card>
            )}

            {/* Unread Meters Report */}
            {unreadMetersData && (
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-surface-border dark:border-dark-border flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-text">Unread Meters — {reportPeriod}</h3>
                    <span className={cn(
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium',
                      unreadMetersData.totalElements > 0 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    )}>
                      {unreadMetersData.totalElements} unread
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Search unit, meter no, utility…"
                    value={unreadSearch}
                    onChange={e => {
                      setUnreadSearch(e.target.value)
                      setUnreadPage(0)
                      loadReports(reportPeriod, e.target.value, 0)
                    }}
                    className="h-8 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 w-56"
                  />
                </div>
                {unreadMetersData.totalElements === 0 ? (
                  <p className="p-5 text-sm text-text-muted text-center">
                    {unreadSearch ? 'No unread meters match your search.' : `All active meters have readings for ${reportPeriod}. ✅`}
                  </p>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide">
                          <th className="px-4 py-3 text-left">Unit</th>
                          <th className="px-4 py-3 text-left">Meter No.</th>
                          <th className="px-4 py-3 text-left">Utility</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-right">Last Reading</th>
                          <th className="px-4 py-3 text-left">Last Read Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unreadMetersData.content.map(m => (
                          <tr key={m.id} className="border-b border-surface-border dark:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-hover">
                            <td className="px-4 py-3 font-medium">{m.unit_label ?? '—'}</td>
                            <td className="px-4 py-3 font-mono text-xs">{m.meter_number}</td>
                            <td className="px-4 py-3">{utilityLabel(m.utility_type)}</td>
                            <td className="px-4 py-3">{meterTypeBadge(m.meter_type)}</td>
                            <td className="px-4 py-3 text-right text-text-muted">{m.last_reading != null ? m.last_reading.toLocaleString() : '—'}</td>
                            <td className="px-4 py-3 text-text-muted text-xs">{m.last_reading_date ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {unreadMetersData.totalPages > 1 && (
                      <div className="px-4 py-3 border-t border-surface-border dark:border-dark-border flex items-center justify-between text-sm text-text-muted">
                        <span>
                          {unreadPage * UNREAD_PAGE_SIZE + 1}–{Math.min((unreadPage + 1) * UNREAD_PAGE_SIZE, unreadMetersData.totalElements)} of {unreadMetersData.totalElements}
                        </span>
                        <div className="flex gap-1">
                          <button
                            disabled={unreadPage === 0 || reportLoading}
                            onClick={() => { const p = unreadPage - 1; setUnreadPage(p); loadReports(reportPeriod, unreadSearch, p) }}
                            className="px-2 py-1 rounded border border-surface-border dark:border-dark-border disabled:opacity-40 hover:bg-surface-hover dark:hover:bg-dark-hover"
                          >‹</button>
                          <span className="px-3 py-1">Page {unreadPage + 1} of {unreadMetersData.totalPages}</span>
                          <button
                            disabled={unreadPage >= unreadMetersData.totalPages - 1 || reportLoading}
                            onClick={() => { const p = unreadPage + 1; setUnreadPage(p); loadReports(reportPeriod, unreadSearch, p) }}
                            className="px-2 py-1 rounded border border-surface-border dark:border-dark-border disabled:opacity-40 hover:bg-surface-hover dark:hover:bg-dark-hover"
                          >›</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}

            {!waterLossData && !unreadMetersData && !reportLoading && !reportError && (
              <p className="text-center text-text-muted text-sm py-8">
                Select a period and click <strong>Refresh</strong> to view the water loss and unread meters reports.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ReadingEntryModal
        meter={readTarget}
        open={showRead}
        onClose={() => setShowRead(false)}
        onSaved={() => { setMeterTabRefreshKey(k => k + 1); fetchStats() }}
      />
      <MeterDetailDrawer meter={viewTarget} open={showView} onClose={() => setShowView(false)} onMeterUpdated={() => { setMeterTabRefreshKey(k => k + 1); fetchStats() }} />
      <AddMeterModal open={showAddMeter} onClose={() => setShowAddMeter(false)} onSaved={() => { setMeterTabRefreshKey(k => k + 1); fetchStats() }} />
      <ImportMetersModal open={showImportMeters} onClose={() => setShowImportMeters(false)} onImported={() => { setMeterTabRefreshKey(k => k + 1); fetchStats() }} />
      <AssignMeterModal
        meter={assignTarget}
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onAssigned={() => { setMeterTabRefreshKey(k => k + 1); fetchStats() }}
      />
    </main>
  )
}
