'use client'
import { useState, useMemo, useEffect } from 'react'
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
import { UNITS } from '@/lib/mock-data'
import type { Unit, UnitOwner, UnitUseType, UnitStatus, Person } from '@/lib/types'
import { getLeases, createLease, updateLease, deleteLease } from '@/lib/api/leases'
import type { LeaseData } from '@/lib/api/leases'
import { getMeters, createMeter, updateMeter, deleteMeter } from '@/lib/api/meters'
import type { MeterData } from '@/lib/api/meters'
import { getCharges, createCharge, updateCharge, deleteCharge } from '@/lib/api/charges'
import type { ChargeData } from '@/lib/api/charges'
import { deleteUnit, patchUnitStatus, patchUnitType } from '@/lib/api/units'
import type { UnitData } from '@/lib/api/units'
import { addUnitToPerson, removeUnitFromPerson } from '@/lib/api/people'

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

const PAGE_SIZE = 12

// Map a UnitData (from the API) into the frontend Unit shape for the table/drawer
function apiUnitToUnit(u: UnitData): Unit {
  const floor = u.floor ? (isNaN(Number(u.floor)) ? 0 : Number(u.floor)) : 0
  const statusMap: Record<string, UnitStatus> = {
    vacant: 'vacant', occupied: 'occupied',
    renovation: 'maintenance', reserved: 'reserved', off_market: 'vacant',
  }
  return {
    id: u.id,
    block: u.block ?? '',
    floor,
    number: u.unit_label,
    size_sqm: u.floor_area_sqm ?? 0,
    bedrooms: u.bedrooms ?? 0,
    bathrooms: u.bathrooms ?? 0,
    use_type: (u.unit_type === 'commercial' || u.unit_type === 'shop' ? 'commercial'
             : u.unit_type === 'bnb' ? 'bnb'
             : u.unit_type === 'office' ? 'office'
             : 'residential') as UnitUseType,
    status: (statusMap[u.status] ?? 'vacant') as UnitStatus,
    monthly_rate: u.asking_rent ?? 0,
    owners: [],
    current_occupant: u.current_occupant ?? undefined,
  }
}

// ── Shared modal primitives ──────────────────────────────────────────────────
const INPUT_CLS = 'w-full text-sm rounded-lg px-3 py-2.5 bg-surface dark:bg-dark-card text-text placeholder:text-text-muted border border-surface-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 transition-colors'
const LABEL_CLS = 'block text-xs font-medium text-text-muted mb-1.5'

function ModalShell({ open, onClose, title, accent, icon, children }: {
  open: boolean; onClose: () => void; title: string
  accent: string; icon: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-lg bg-surface dark:bg-dark-surface rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className={`h-1 w-full ${accent}`} />
        <div className="sm:hidden flex justify-center pt-2">
          <div className="w-10 h-1 rounded-full bg-surface-border dark:bg-dark-border" />
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-border dark:border-dark-border">
          <span className="text-xl">{icon}</span>
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="ml-auto text-xl leading-none text-text-muted hover:text-text transition-colors">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function LeaseModal({ open, onClose, unitId, unitLabel, tenants, initialData, onSaved }: {
  open: boolean; onClose: () => void; unitId: string; unitLabel: string
  tenants: Person[]; initialData: LeaseData | null
  onSaved: (l: LeaseData) => void
}) {
  const isEdit = !!initialData
  const [tenantId,     setTenantId]     = useState(initialData?.tenant_id ?? '')
  const [monthlyRent,  setMonthlyRent]  = useState(initialData?.monthly_rent?.toString() ?? '')
  const [deposit,      setDeposit]      = useState(initialData?.deposit?.toString() ?? '')
  const [startDate,    setStartDate]    = useState(initialData?.start_date ?? '')
  const [endDate,      setEndDate]      = useState(initialData?.end_date ?? '')
  const [status,       setStatus]       = useState(initialData?.status ?? 'draft')
  const [billingCycle, setBillingCycle] = useState(initialData?.billing_cycle ?? 'monthly')
  const [notes,        setNotes]        = useState(initialData?.notes ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (open) {
      setTenantId(initialData?.tenant_id ?? '')
      setMonthlyRent(initialData?.monthly_rent?.toString() ?? '')
      setDeposit(initialData?.deposit?.toString() ?? '')
      setStartDate(initialData?.start_date ?? '')
      setEndDate(initialData?.end_date ?? '')
      setStatus(initialData?.status ?? 'draft')
      setBillingCycle(initialData?.billing_cycle ?? 'monthly')
      setNotes(initialData?.notes ?? '')
      setError('')
    }
  }, [open, initialData])

  async function handleSave() {
    if (!tenantId || !startDate) { setError('Tenant and start date are required.'); return }
    setSaving(true); setError('')
    try {
      const t = tenants.find(p => p.id === tenantId)
      const payload = {
        tenantId, tenantName: t ? `${t.first_name} ${t.last_name}` : undefined,
        monthlyRent: monthlyRent ? Number(monthlyRent) : null,
        deposit: deposit ? Number(deposit) : null,
        startDate, endDate: endDate || null, status, billingCycle,
        notes: notes || null, unitLabel,
      }
      const saved = isEdit
        ? await updateLease(unitId, initialData!.id, payload)
        : await createLease(unitId, payload)
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'Edit Lease' : 'New Lease'} accent="bg-primary-500" icon="📋">
      <div className="p-5 space-y-4">
        {error && <p className="text-xs text-danger bg-danger/5 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className={LABEL_CLS}>Tenant *</label>
          <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={INPUT_CLS}>
            <option value="">Select tenant…</option>
            {tenants.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Monthly Rent (KES)</label>
            <input type="number" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} className={INPUT_CLS} placeholder="45000" />
          </div>
          <div>
            <label className={LABEL_CLS}>Deposit (KES)</label>
            <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} className={INPUT_CLS} placeholder="90000" />
          </div>
          <div>
            <label className={LABEL_CLS}>Start Date *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT_CLS}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="notice_given">Notice Given</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Billing Cycle</label>
            <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)} className={INPUT_CLS}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi_annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={INPUT_CLS} placeholder="Optional notes…" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 px-5 pb-5">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-surface-border dark:border-dark-border text-sm font-medium text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Lease'}
        </button>
      </div>
    </ModalShell>
  )
}

function ChargeModal({ open, onClose, unitId, unitLabel, people, initialData, onSaved }: {
  open: boolean; onClose: () => void; unitId: string; unitLabel: string
  people: Person[]; initialData: ChargeData | null
  onSaved: (c: ChargeData) => void
}) {
  const isEdit = !!initialData
  const [chargeType,   setChargeType]   = useState(initialData?.type ?? 'rent')
  const [amount,       setAmount]       = useState(initialData?.amount?.toString() ?? '')
  const [paidAmount,   setPaidAmount]   = useState(initialData?.paid_amount?.toString() ?? '0')
  const [personId,     setPersonId]     = useState(initialData?.person_id ?? '')
  const [dueDate,      setDueDate]      = useState(initialData?.due_date ?? '')
  const [period,       setPeriod]       = useState(initialData?.period ?? '')
  const [status,       setStatus]       = useState(initialData?.status ?? 'pending')
  const [description,  setDescription]  = useState(initialData?.description ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => {
    if (open) {
      setChargeType(initialData?.type ?? 'rent')
      setAmount(initialData?.amount?.toString() ?? '')
      setPaidAmount(initialData?.paid_amount?.toString() ?? '0')
      setPersonId(initialData?.person_id ?? '')
      setDueDate(initialData?.due_date ?? '')
      setPeriod(initialData?.period ?? '')
      setStatus(initialData?.status ?? 'pending')
      setDescription(initialData?.description ?? '')
      setError('')
    }
  }, [open, initialData])

  async function handleSave() {
    if (!chargeType || !amount) { setError('Charge type and amount are required.'); return }
    setSaving(true); setError('')
    try {
      const p = people.find(x => x.id === personId)
      const payload = {
        chargeType, amount: Number(amount), paidAmount: Number(paidAmount),
        personId: personId || null, personName: p ? `${p.first_name} ${p.last_name}` : null,
        dueDate: dueDate || null, period: period || null, status,
        description: description || null, unitLabel,
      }
      const saved = isEdit
        ? await updateCharge(unitId, initialData!.id, payload)
        : await createCharge(unitId, payload)
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'Edit Charge' : 'New Charge'} accent="bg-amber-500" icon="💰">
      <div className="p-5 space-y-4">
        {error && <p className="text-xs text-danger bg-danger/5 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Charge Type *</label>
            <select value={chargeType} onChange={e => setChargeType(e.target.value)} className={INPUT_CLS}>
              <option value="rent">Rent</option>
              <option value="deposit">Deposit</option>
              <option value="service_charge">Service Charge</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="gas">Gas</option>
              <option value="internet">Internet</option>
              <option value="parking">Parking</option>
              <option value="penalty">Penalty</option>
              <option value="maintenance">Maintenance</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT_CLS}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="overdue">Overdue</option>
              <option value="waived">Waived</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Amount (KES) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={INPUT_CLS} placeholder="45000" />
          </div>
          <div>
            <label className={LABEL_CLS}>Paid Amount (KES)</label>
            <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className={INPUT_CLS} placeholder="0" />
          </div>
          <div>
            <label className={LABEL_CLS}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className={LABEL_CLS}>Period (e.g. 2024-06)</label>
            <input type="text" value={period} onChange={e => setPeriod(e.target.value)} className={INPUT_CLS} placeholder="2024-06" />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Person</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)} className={INPUT_CLS}>
            <option value="">No specific person</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={INPUT_CLS} placeholder="e.g. Monthly rent – June 2024" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 px-5 pb-5">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-surface-border dark:border-dark-border text-sm font-medium text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Charge'}
        </button>
      </div>
    </ModalShell>
  )
}

function MeterModal({ open, onClose, unitId, unitLabel, people, initialData, onSaved }: {
  open: boolean; onClose: () => void; unitId: string; unitLabel: string
  people: Person[]; initialData: MeterData | null
  onSaved: (m: MeterData) => void
}) {
  const isEdit = !!initialData
  const [utilityType,        setUtilityType]        = useState(initialData?.utility_type ?? 'water')
  const [meterType,          setMeterType]          = useState(initialData?.meter_type ?? 'postpaid')
  const [meterNumber,        setMeterNumber]        = useState(initialData?.meter_number ?? '')
  const [accountNumber,      setAccountNumber]      = useState(initialData?.account_number ?? '')
  const [billingArrangement, setBillingArrangement] = useState(initialData?.billing_arrangement ?? 'billed_to_occupant')
  const [status,             setStatus]             = useState(initialData?.status ?? 'active')
  const [installationDate,   setInstallationDate]   = useState(initialData?.installation_date ?? '')
  const [lastReading,        setLastReading]        = useState(initialData?.last_reading?.toString() ?? '')
  const [billingPersonId,    setBillingPersonId]    = useState(initialData?.current_billing_person?.person_id ?? '')
  const [notes,              setNotes]              = useState(initialData?.notes ?? '')
  const [saving,             setSaving]             = useState(false)
  const [error,              setError]              = useState('')

  useEffect(() => {
    if (open) {
      setUtilityType(initialData?.utility_type ?? 'water')
      setMeterType(initialData?.meter_type ?? 'postpaid')
      setMeterNumber(initialData?.meter_number ?? '')
      setAccountNumber(initialData?.account_number ?? '')
      setBillingArrangement(initialData?.billing_arrangement ?? 'billed_to_occupant')
      setStatus(initialData?.status ?? 'active')
      setInstallationDate(initialData?.installation_date ?? '')
      setLastReading(initialData?.last_reading?.toString() ?? '')
      setBillingPersonId(initialData?.current_billing_person?.person_id ?? '')
      setNotes(initialData?.notes ?? '')
      setError('')
    }
  }, [open, initialData])

  async function handleSave() {
    if (!meterNumber.trim()) { setError('Meter number is required.'); return }
    setSaving(true); setError('')
    try {
      const p = people.find(x => x.id === billingPersonId)
      const payload = {
        utilityType, meterType, meterNumber: meterNumber.trim(),
        accountNumber: accountNumber || null,
        billingArrangement, status,
        installationDate: installationDate || null,
        lastReading: lastReading ? Number(lastReading) : null,
        billingPersonId: billingPersonId || null,
        billingPersonName: p ? `${p.first_name} ${p.last_name}` : null,
        notes: notes || null, unitLabel,
      }
      const saved = isEdit
        ? await updateMeter(unitId, initialData!.id, payload)
        : await createMeter(unitId, payload)
      onSaved(saved)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally { setSaving(false) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'Edit Meter' : 'Add Meter'} accent="bg-blue-500" icon="🔌">
      <div className="p-5 space-y-4">
        {error && <p className="text-xs text-danger bg-danger/5 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Utility Type</label>
            <select value={utilityType} onChange={e => setUtilityType(e.target.value)} className={INPUT_CLS}>
              <option value="water">Water</option>
              <option value="sewerage">Sewerage</option>
              <option value="water_sewer">Water + Sewer</option>
              <option value="electricity">Electricity</option>
              <option value="gas_piped">Gas (Piped)</option>
              <option value="gas_cylinder">Gas (Cylinder)</option>
              <option value="internet">Internet</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Meter Type</label>
            <select value={meterType} onChange={e => setMeterType(e.target.value)} className={INPUT_CLS}>
              <option value="postpaid">Postpaid</option>
              <option value="prepaid">Prepaid</option>
              <option value="smart">Smart</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Meter Number *</label>
            <input type="text" value={meterNumber} onChange={e => setMeterNumber(e.target.value)} className={INPUT_CLS} placeholder="W-A101-01" />
          </div>
          <div>
            <label className={LABEL_CLS}>Account Number</label>
            <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className={INPUT_CLS} placeholder="ACC-W-0101" />
          </div>
          <div>
            <label className={LABEL_CLS}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={INPUT_CLS}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="replaced">Replaced</option>
            </select>
          </div>
          <div>
            <label className={LABEL_CLS}>Installation Date</label>
            <input type="date" value={installationDate} onChange={e => setInstallationDate(e.target.value)} className={INPUT_CLS} />
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Billing Arrangement</label>
          <select value={billingArrangement} onChange={e => setBillingArrangement(e.target.value)} className={INPUT_CLS}>
            <option value="billed_to_occupant">Billed to Occupant</option>
            <option value="direct_bill">Direct Bill</option>
            <option value="billed_to_unit">Billed to Unit</option>
            <option value="included_in_rent">Included in Rent</option>
            <option value="management_bill">Management Bill</option>
            <option value="bnb_absorbed">BnB Absorbed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Last Reading</label>
            <input type="number" value={lastReading} onChange={e => setLastReading(e.target.value)} className={INPUT_CLS} placeholder="4820" />
          </div>
          <div>
            <label className={LABEL_CLS}>Billing Person</label>
            <select value={billingPersonId} onChange={e => setBillingPersonId(e.target.value)} className={INPUT_CLS}>
              <option value="">None</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={LABEL_CLS}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={INPUT_CLS} placeholder="Optional notes…" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 px-5 pb-5">
        <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-surface-border dark:border-dark-border text-sm font-medium text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Meter'}
        </button>
      </div>
    </ModalShell>
  )
}

export default function PropertyPageClient({ initialUnits, allPeople = [] }: { initialUnits?: Unit[]; allPeople?: Person[] } = {}) {
  const [search,      setSearch]      = useState('')
  const [block,       setBlock]       = useState('all')
  const [useType,     setUseType]     = useState('all')
  const [status,      setStatus]      = useState('all')
  const [selected,    setSelected]    = useState<Unit | null>(null)
  const [liveUnits,   setLiveUnits]   = useState<Unit[]>(initialUnits ?? UNITS)
  const units = liveUnits
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [editUnit,    setEditUnit]    = useState<Unit | null>(null)
  const [page,        setPage]        = useState(1)
  const [deleteConfirm,  setDeleteConfirm]  = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [deleteError,    setDeleteError]    = useState('')
  const [sortCol, setSortCol] = useState<'unit'|'floor'|'status'|'occupant'|'size'|'rent'>('unit')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [showAssignOwner, setShowAssignOwner] = useState(false)
  const [ownerSearch,     setOwnerSearch]     = useState('')
  const [assignee,        setAssignee]        = useState<Person | null>(null)
  const [assignShare,     setAssignShare]     = useState('')
  const [assignPrimary,   setAssignPrimary]   = useState(false)
  const [assignResident,  setAssignResident]  = useState(false)
  const [assigning,       setAssigning]       = useState(false)
  const [assignError,     setAssignError]     = useState('')

  // ── Quick status change ──────────────────────────────────────────────────────
  const [pendingOccupied,   setPendingOccupied]   = useState(false)
  const [pendingOccupant,   setPendingOccupant]   = useState('')

  // ── Convert use type ─────────────────────────────────────────────────────────
  const [convertingType,    setConvertingType]    = useState(false)

  // ── Remove / mark-resident owner ─────────────────────────────────────────────
  const [removingOwner,     setRemovingOwner]     = useState<string | null>(null)
  const [markingResident,   setMarkingResident]   = useState<string | null>(null)

  // ── Sub-tab data ─────────────────────────────────────────────────────────────
  const [unitLeases,      setUnitLeases]      = useState<LeaseData[]>([])
  const [leasesLoading,   setLeasesLoading]   = useState(false)
  const [showLeaseModal,  setShowLeaseModal]  = useState(false)
  const [editLease,       setEditLease]       = useState<LeaseData | null>(null)

  const [unitCharges,     setUnitCharges]     = useState<ChargeData[]>([])
  const [chargesLoading,  setChargesLoading]  = useState(false)
  const [showChargeModal, setShowChargeModal] = useState(false)
  const [editCharge,      setEditCharge]      = useState<ChargeData | null>(null)

  const [unitMeters,      setUnitMeters]      = useState<MeterData[]>([])
  const [metersLoading,   setMetersLoading]   = useState(false)
  const [showMeterModal,  setShowMeterModal]  = useState(false)
  const [editMeter,       setEditMeter]       = useState<MeterData | null>(null)

  function handleUnitSaved(unit: UnitData) {
    const mapped = apiUnitToUnit(unit)
    setLiveUnits(prev => {
      const idx = prev.findIndex(u => u.id === mapped.id)
      if (idx >= 0) {
        // update in place
        const next = [...prev]
        next[idx] = { ...prev[idx], ...mapped }
        return next
      }
      return [mapped, ...prev]
    })
    if (editUnit) {
      // refresh selected drawer with updated data
      setSelected(prev => prev?.id === mapped.id ? { ...prev, ...mapped } : prev)
    }
    setEditUnit(null)
  }

  async function handleDeleteUnit(unit: Unit) {
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteUnit(unit.id)
      setLiveUnits(prev => prev.filter(u => u.id !== unit.id))
      setSelected(null)
      setDeleteConfirm(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete unit.')
    } finally {
      setDeleting(false)
    }
  }

  const blocks = [...new Set(units.map(u => u.block))].sort()

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = units.filter(u => {
      if (block   !== 'all' && u.block    !== block)   return false
      if (useType !== 'all' && u.use_type !== useType) return false
      if (status  !== 'all' && u.status   !== status)  return false
      if (q && !(`${u.block}-${u.number} ${u.current_occupant ?? ''}`.toLowerCase().includes(q))) return false
      return true
    })
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'unit':     cmp = `${a.block}-${a.number}`.localeCompare(`${b.block}-${b.number}`); break
        case 'floor':    cmp = (a.floor ?? 0) - (b.floor ?? 0); break
        case 'status':   cmp = a.status.localeCompare(b.status); break
        case 'occupant': cmp = (a.current_occupant ?? '').localeCompare(b.current_occupant ?? ''); break
        case 'size':     cmp = a.size_sqm - b.size_sqm; break
        case 'rent':     cmp = a.monthly_rate - b.monthly_rate; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [units, search, block, useType, status, sortCol, sortDir])

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1) }, [search, block, useType, status])

  // Reset assign-owner panel and pending status when drawer unit changes
  useEffect(() => {
    setShowAssignOwner(false)
    setOwnerSearch('')
    setAssignee(null)
    setAssignShare('')
    setAssignPrimary(false)
    setAssignResident(false)
    setAssignError('')
    setPendingOccupied(false)
    setPendingOccupant('')
  }, [selected?.id])

  // Fetch sub-tab data whenever selected unit changes
  useEffect(() => {
    if (!selected?.id) {
      setUnitLeases([])
      setUnitCharges([])
      setUnitMeters([])
      return
    }
    const id = selected.id
    setLeasesLoading(true)
    getLeases(id).then(setUnitLeases).catch(() => {}).finally(() => setLeasesLoading(false))
    setChargesLoading(true)
    getCharges(id).then(setUnitCharges).catch(() => {}).finally(() => setChargesLoading(false))
    setMetersLoading(true)
    getMeters(id).then(setUnitMeters).catch(() => {}).finally(() => setMetersLoading(false))
  }, [selected?.id])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Ownership helpers
  const allocatedShare  = selected ? selected.owners.reduce((s, o) => s + o.share_percent, 0) : 0
  const remainingShare  = Math.max(0, 100 - allocatedShare)
  const assignedIds     = new Set((selected?.owners ?? []).map(o => o.person_id).filter(Boolean) as string[])
  const ownerPeople     = allPeople.filter(p => p.type === 'resident_owner' || p.type === 'non_resident_owner')
  const availableOwners = ownerPeople.filter(p => !assignedIds.has(p.id))
  const filteredOwners  = ownerSearch.trim()
    ? availableOwners.filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(ownerSearch.toLowerCase()))
    : availableOwners

  async function handleAssignOwner() {
    if (!assignee || !selected) return
    const share = Number(assignShare)
    if (!share || share <= 0 || share > remainingShare) return
    setAssigning(true)
    setAssignError('')
    try {
      await addUnitToPerson(assignee.id, selected.id, assignResident || assignee.type === 'tenant')
    } catch {
      // Non-fatal
    }
    // If this owner lives here, update the unit status to occupied in the DB
    if (assignResident) {
      try {
        await patchUnitStatus(selected.id, 'occupied')
      } catch {
        // Non-fatal — local state still reflects occupied
      }
    }
    const newOwner: UnitOwner = {
      person_id:      assignee.id,
      ownership_type: 'individual',
      name:           `${assignee.first_name} ${assignee.last_name}`,
      share_percent:  share,
      is_resident:    assignResident,
      is_primary:     assignPrimary || selected.owners.length === 0,
    }
    const updatedOwners = [...selected.owners, newOwner]
    const updatedUnit: Partial<Unit> = {
      owners: updatedOwners,
      ...(assignResident && {
        status: 'occupied',
        current_occupant: `${assignee.first_name} ${assignee.last_name}`,
      }),
    }
    setLiveUnits(prev => prev.map(u => u.id === selected.id ? { ...u, ...updatedUnit } : u))
    setSelected(prev => prev ? { ...prev, ...updatedUnit } : prev)
    setShowAssignOwner(false)
    setOwnerSearch('')
    setAssignee(null)
    setAssignShare('')
    setAssignPrimary(false)
    setAssignResident(false)
    setAssigning(false)
  }

  async function handleQuickStatusChange(newStatus: string, occupantName?: string) {
    if (!selected) return
    try {
      await patchUnitStatus(selected.id, newStatus, occupantName)
      const frontendStatus = newStatus === 'occupied' ? 'occupied' : newStatus === 'renovation' ? 'maintenance' : newStatus === 'reserved' ? 'reserved' : 'vacant' as UnitStatus
      const occupantUpdate = newStatus === 'occupied' ? { current_occupant: occupantName || undefined } : { current_occupant: undefined }
      setLiveUnits(prev => prev.map(u => u.id === selected.id ? { ...u, status: frontendStatus, ...occupantUpdate } : u))
      setSelected(prev => prev ? { ...prev, status: frontendStatus, ...occupantUpdate } : prev)
    } catch {
      // ignore
    }
    setPendingOccupied(false)
    setPendingOccupant('')
  }

  async function handleConvertType(newUseType: UnitUseType) {
    if (!selected || newUseType === selected.use_type) return
    setConvertingType(true)
    try {
      await patchUnitType(selected.id, newUseType)
      setLiveUnits(prev => prev.map(u => u.id === selected.id ? { ...u, use_type: newUseType } : u))
      setSelected(prev => prev ? { ...prev, use_type: newUseType } : prev)
    } catch {
      // ignore
    }
    setConvertingType(false)
  }

  async function handleMarkResident(owner: UnitOwner) {
    if (!selected || !owner.person_id) return
    setMarkingResident(owner.person_id)
    try {
      await addUnitToPerson(owner.person_id, selected.id, true)
      await patchUnitStatus(selected.id, 'occupied', owner.name)
      const updatedOwners = selected.owners.map(o =>
        o.person_id === owner.person_id ? { ...o, is_resident: true } : o
      )
      const update = { owners: updatedOwners, status: 'occupied' as UnitStatus, current_occupant: owner.name }
      setLiveUnits(prev => prev.map(u => u.id === selected.id ? { ...u, ...update } : u))
      setSelected(prev => prev ? { ...prev, ...update } : prev)
    } catch {
      // ignore
    }
    setMarkingResident(null)
  }

  async function handleRemoveOwner(owner: UnitOwner) {
    if (!selected) return
    setRemovingOwner(owner.person_id ?? null)
    try {
      if (owner.person_id) await removeUnitFromPerson(owner.person_id, selected.id)
      if (owner.is_resident) await patchUnitStatus(selected.id, 'vacant')
      const updatedOwners = selected.owners.filter(o => o.person_id !== owner.person_id)
      const update: Partial<Unit> = {
        owners: updatedOwners,
        ...(owner.is_resident ? { status: 'vacant' as UnitStatus, current_occupant: undefined } : {}),
      }
      setLiveUnits(prev => prev.map(u => u.id === selected.id ? { ...u, ...update } : u))
      setSelected(prev => prev ? { ...prev, ...update } : prev)
    } catch {
      // ignore
    }
    setRemovingOwner(null)
  }

  const isOccupied = selected?.status === 'occupied'

  return (
    <DashboardLayout>
      <Topbar
        title="Property"
        subtitle={`${units.length} units across ${blocks.length} blocks`}
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters + Add Unit */}
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

          {/* Unit counter + Add Unit button — contextually placed here */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-text-muted">{filtered.length} unit{filtered.length !== 1 ? 's' : ''}</span>
            <CanDo action="write" resource={{ type: 'unit' }} fallback={
              <Button variant="primary" size="sm" disabled>+ Add Unit</Button>
            }>
              <Button variant="primary" size="sm" onClick={() => { setEditUnit(null); setShowAddUnit(true) }}>
                + Add Unit
              </Button>
            </CanDo>
          </div>
        </div>

        {/* Compact Table */}
        <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover border-b border-surface-border dark:border-dark-border">
              <tr>
                {([
                  { key: 'unit',     label: 'Unit' },
                  { key: 'floor',    label: 'Floor' },
                  { key: null,       label: 'Use Type' },
                  { key: 'status',   label: 'Status' },
                  { key: 'occupant', label: 'Occupant' },
                  { key: 'size',     label: 'Size' },
                  { key: 'rent',     label: 'Rent / mo' },
                ] as { key: typeof sortCol | null; label: string }[]).map(col => (
                  <th key={col.label} className={TH}>
                    {col.key ? (
                      <button
                        onClick={() => toggleSort(col.key!)}
                        className="flex items-center gap-1 hover:text-text transition-colors group"
                      >
                        {col.label}
                        <span className="text-[10px] leading-none opacity-40 group-hover:opacity-100 transition-opacity">
                          {sortCol === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </button>
                    ) : col.label}
                  </th>
                ))}
                <th className={TH}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {paginated.map(unit => (
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
              {paginated.length === 0 && (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} units
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-xs text-text-muted">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        page === p
                          ? 'bg-primary-600 text-white'
                          : 'border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )
              }

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => { setSelected(null); setDeleteConfirm(false); setDeleteError('') }}
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

              {/* Edit / Delete actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <CanDo action="write" resource={{ type: 'unit', id: selected.id }}>
                  <button
                    onClick={() => { setEditUnit(selected); setShowAddUnit(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border dark:border-dark-border text-text hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors"
                    title="Edit unit details"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Edit
                  </button>
                </CanDo>

                <CanDo action="delete" resource={{ type: 'unit', id: selected.id }}>
                  {isOccupied ? (
                    <button
                      disabled
                      title="Cannot delete an occupied unit"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border dark:border-dark-border text-text-muted opacity-40 cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </CanDo>
              </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirm && (
              <div className="mb-4 p-4 rounded-xl border border-danger/30 bg-danger/5">
                <p className="text-sm font-medium text-text mb-1">Delete Unit {selected.block}-{selected.number}?</p>
                <p className="text-xs text-text-muted mb-3">This action cannot be undone. All associated records will be archived.</p>
                {deleteError && (
                  <p className="text-xs text-danger mb-2">{deleteError}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setDeleteConfirm(false); setDeleteError('') }} disabled={deleting}>Cancel</Button>
                  <button
                    onClick={() => handleDeleteUnit(selected)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger text-white hover:bg-danger/90 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {deleting && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              </div>
            )}

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
                      { label: 'Size',         value: `${selected.size_sqm}m²` },
                    ].map(item => (
                      <div key={item.label} className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                        <p className="text-xs text-text-muted">{item.label}</p>
                        <p className="text-sm font-semibold text-text">{item.value}</p>
                      </div>
                    ))}
                    {/* Status — editable inline */}
                    <CanDo
                      action="write"
                      resource={{ type: 'unit', id: selected.id }}
                      fallback={
                        <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                          <p className="text-xs text-text-muted">Status</p>
                          <p className="text-sm font-semibold text-text">{STATUS_BADGE[selected.status].label}</p>
                        </div>
                      }
                    >
                      <div className={`bg-surface-muted dark:bg-dark-hover p-3 rounded-lg ${pendingOccupied ? 'col-span-2' : ''}`}>
                        <p className="text-xs text-text-muted mb-1.5">Status</p>
                        <select
                          value={pendingOccupied ? 'occupied' : selected.status}
                          onChange={e => {
                            const v = e.target.value
                            if (v === 'occupied') {
                              setPendingOccupied(true)
                              setPendingOccupant(selected.current_occupant ?? '')
                            } else {
                              setPendingOccupied(false)
                              handleQuickStatusChange(v === 'maintenance' ? 'renovation' : v)
                            }
                          }}
                          className="w-full text-xs font-semibold rounded-md px-2 py-1.5 border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          <option value="vacant">Vacant</option>
                          <option value="occupied">Occupied</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="reserved">Reserved</option>
                        </select>
                        {pendingOccupied && (
                          <div className="mt-2 space-y-2">
                            <input
                              autoFocus
                              type="text"
                              value={pendingOccupant}
                              onChange={e => setPendingOccupant(e.target.value)}
                              placeholder="Occupant name (optional)"
                              className="w-full text-xs rounded-md px-2.5 py-2 border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-500"
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleQuickStatusChange('occupied', pendingOccupant || undefined)
                                if (e.key === 'Escape') { setPendingOccupied(false); setPendingOccupant('') }
                              }}
                            />
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => { setPendingOccupied(false); setPendingOccupant('') }}
                                className="flex-1 py-1.5 rounded-md border border-surface-border dark:border-dark-border text-xs text-text-muted hover:bg-surface dark:hover:bg-dark-card transition-colors"
                              >Cancel</button>
                              <button
                                onClick={() => handleQuickStatusChange('occupied', pendingOccupant || undefined)}
                                className="flex-1 py-1.5 rounded-md bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
                              >Mark Occupied</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CanDo>
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
                  <CanDo action="write" resource={{ type: 'unit', id: selected.id }}>
                    <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                      <p className="text-xs text-text-muted mb-1.5">Use Type</p>
                      <select
                        value={selected.use_type}
                        disabled={convertingType}
                        onChange={e => handleConvertType(e.target.value as UnitUseType)}
                        className="w-full text-sm rounded-lg px-3 py-2 bg-surface dark:bg-dark-card text-text border border-surface-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors disabled:opacity-60"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="bnb">BnB / Short-stay</option>
                        <option value="office">Office</option>
                      </select>
                      {convertingType && <p className="text-xs text-text-muted mt-1.5">Saving…</p>}
                    </div>
                  </CanDo>
                </div>
              </TabsContent>

              {/* Ownership */}
              <TabsContent value="ownership">
                <div className="space-y-3">
                  {/* Existing owners */}
                  {selected.owners.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-3xl mb-2">🏠</p>
                      <p className="text-sm font-medium text-text">No owners assigned</p>
                      <p className="text-xs text-text-muted mt-1">Assign an owner to track ownership and share allocation.</p>
                    </div>
                  ) : (
                    <>
                      {selected.owners.map(owner => (
                        <div key={owner.person_id} className="flex items-center gap-3 p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                            {owner.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text">{owner.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-text-muted">{owner.is_resident ? 'Lives here' : 'Non-resident owner'}</p>
                              {owner.is_primary && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">Primary</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-primary-600">{owner.share_percent}%</p>
                            <p className="text-xs text-text-muted">share</p>
                          </div>
                          <CanDo action="write" resource={{ type: 'unit', id: selected.id }}>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!owner.is_resident && (
                                <button
                                  onClick={() => handleMarkResident(owner)}
                                  disabled={markingResident === owner.person_id}
                                  title="Mark as living here"
                                  className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-40 text-xs"
                                >
                                  {markingResident === owner.person_id
                                    ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    : '🏠'}
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveOwner(owner)}
                                disabled={removingOwner === owner.person_id}
                                title="Remove owner"
                                className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-40"
                              >
                                {removingOwner === owner.person_id
                                  ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  : '×'}
                              </button>
                            </div>
                          </CanDo>
                        </div>
                      ))}
                      {selected.owners.length > 1 && (
                        <p className="text-xs text-text-muted text-center pt-1">
                          Joint ownership &middot; {allocatedShare}% accounted
                          {allocatedShare < 100 && (
                            <span className="text-warning ml-1">({remainingShare}% unallocated)</span>
                          )}
                        </p>
                      )}
                    </>
                  )}

                  {/* Assign Owner button */}
                  {!showAssignOwner && remainingShare > 0 && (
                    <CanDo action="write" resource={{ type: 'unit' }}>
                      <button
                        onClick={() => { setShowAssignOwner(true); setAssignShare(String(remainingShare)) }}
                        className="w-full py-2 rounded-lg border border-dashed border-primary-300 dark:border-primary-700 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                      >
                        + Assign Owner
                      </button>
                    </CanDo>
                  )}

                  {/* Inline assign panel */}
                  {showAssignOwner && (
                    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface p-3 space-y-3">
                      <p className="text-xs font-semibold text-text uppercase tracking-wide">Assign Owner</p>

                      <input
                        type="text"
                        placeholder="Search by name…"
                        value={ownerSearch}
                        onChange={e => setOwnerSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />

                      <div className="max-h-44 overflow-y-auto space-y-1">
                        {filteredOwners.length === 0 ? (
                          <p className="text-xs text-text-muted text-center py-3">
                            {availableOwners.length === 0
                              ? 'All registered owners are already assigned to this unit.'
                              : 'No owners match your search.'}
                          </p>
                        ) : (
                          filteredOwners.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setAssignee(p)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                                assignee?.id === p.id
                                  ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                                  : 'hover:bg-surface-muted dark:hover:bg-dark-hover border border-transparent'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                                {p.first_name[0]}{p.last_name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text">{p.first_name} {p.last_name}</p>
                                <p className="text-xs text-text-muted capitalize">{p.type.replace(/_/g, ' ')}</p>
                              </div>
                              {assignee?.id === p.id && <span className="text-primary-600 text-sm">{'\u2713'}</span>}
                            </button>
                          ))
                        )}
                      </div>

                      {assignee && (
                        <div className="pt-2 border-t border-surface-border dark:border-dark-border space-y-2">
                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-text-muted mb-1">Share %</label>
                              <input
                                type="number"
                                min={1}
                                max={remainingShare}
                                value={assignShare}
                                onChange={e => setAssignShare(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                              <p className="text-[11px] text-text-muted mt-0.5">Max {remainingShare}% remaining</p>
                            </div>
                            <div className="flex flex-col gap-1.5 pb-5">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={assignPrimary}
                                  onChange={e => setAssignPrimary(e.target.checked)}
                                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-xs text-text whitespace-nowrap">Primary owner</span>
                              </label>
                              {assignee?.type === 'resident_owner' && (
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={assignResident}
                                    onChange={e => setAssignResident(e.target.checked)}
                                    className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-xs text-text whitespace-nowrap">Lives in this unit</span>
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowAssignOwner(false); setOwnerSearch(''); setAssignee(null); setAssignShare(''); setAssignPrimary(false) }}
                          className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={assigning || !assignee || !assignShare || Number(assignShare) <= 0 || Number(assignShare) > remainingShare}
                          onClick={handleAssignOwner}
                          className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                        >
                          {assigning && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          {assigning ? 'Saving…' : 'Assign'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Leases */}
              <TabsContent value="leases">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      {unitLeases.length} lease{unitLeases.length !== 1 ? 's' : ''}
                    </p>
                    <CanDo action="write" resource={{ type: 'unit' }}>
                      <button
                        onClick={() => { setEditLease(null); setShowLeaseModal(true) }}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >+ Add Lease</button>
                    </CanDo>
                  </div>
                  {leasesLoading ? (
                    <div className="py-8 flex justify-center">
                      <span className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                  ) : unitLeases.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <p className="text-3xl mb-2">📋</p>
                      <p className="text-sm">No leases found</p>
                    </div>
                  ) : (
                    unitLeases.map(lease => (
                      <div key={lease.id} className="p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-text">{lease.tenant_name ?? '—'}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={lease.status === 'active' ? 'primary' : lease.status === 'notice_given' ? 'warning' : 'default'}>
                              {lease.status.replace(/_/g, ' ')}
                            </Badge>
                            <CanDo action="write" resource={{ type: 'unit' }}>
                              <button
                                onClick={() => { setEditLease(lease); setShowLeaseModal(true) }}
                                className="text-xs text-primary-600 hover:underline"
                              >Edit</button>
                            </CanDo>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs text-text-muted">
                          <span>KES {(lease.monthly_rent ?? 0).toLocaleString()}/mo</span>
                          <span>Deposit: KES {(lease.deposit ?? 0).toLocaleString()}</span>
                          <span>From: {lease.start_date}</span>
                          <span>{lease.end_date ? `To: ${lease.end_date}` : 'Open-ended'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Financials */}
              <TabsContent value="financials">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                      {unitCharges.length} charge{unitCharges.length !== 1 ? 's' : ''}
                    </p>
                    <CanDo action="write" resource={{ type: 'unit' }}>
                      <button
                        onClick={() => { setEditCharge(null); setShowChargeModal(true) }}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >+ Add Charge</button>
                    </CanDo>
                  </div>
                  {chargesLoading ? (
                    <div className="py-8 flex justify-center">
                      <span className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                  ) : unitCharges.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <p className="text-3xl mb-2">💰</p>
                      <p className="text-sm">No charges found</p>
                    </div>
                  ) : (
                    unitCharges.map(charge => (
                      <div key={charge.id} className="flex items-start justify-between p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-text capitalize">{charge.type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-text-muted">{charge.period ?? '—'} &middot; {charge.person_name ?? '—'}</p>
                        </div>
                        <div className="text-right flex items-start gap-3">
                          <div>
                            <p className="text-sm font-semibold text-text">KES {charge.amount.toLocaleString()}</p>
                            <Badge variant={charge.status === 'paid' ? 'primary' : charge.status === 'overdue' ? 'danger' : 'warning'}>
                              {charge.status}
                            </Badge>
                          </div>
                          <CanDo action="write" resource={{ type: 'unit' }}>
                            <button
                              onClick={() => { setEditCharge(charge); setShowChargeModal(true) }}
                              className="text-xs text-primary-600 hover:underline mt-0.5"
                            >Edit</button>
                          </CanDo>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Utilities */}
              <TabsContent value="utilities">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {unitMeters.length} meter{unitMeters.length !== 1 ? 's' : ''} allocated
                  </p>
                  {metersLoading ? (
                    <div className="py-8 flex justify-center">
                      <span className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                    </div>
                  ) : unitMeters.length === 0 ? (
                    <div className="py-8 text-center text-sm text-text-muted">
                      <p className="text-2xl mb-2">🔌</p>
                      No meters assigned. Register and assign meters from the Utilities page.
                    </div>
                  ) : (
                    unitMeters.map(m => {
                      const utilityIcons: Record<string, string> = {
                        water: '💧', sewerage: '🚿', water_sewer: '💧',
                        electricity: '⚡', gas_piped: '🔥', gas_cylinder: '🔥', internet: '📶',
                      }
                      return (
                        <div key={m.id} className="rounded-lg border border-surface-border dark:border-dark-border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{utilityIcons[m.utility_type] ?? '🔌'}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text capitalize">
                                {m.utility_type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-text-muted">{m.meter_type} &middot; {m.billing_arrangement.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {m.status}
                              </span>
                              <CanDo action="write" resource={{ type: 'unit' }}>
                                <button
                                  onClick={() => { setEditMeter(m); setShowMeterModal(true) }}
                                  className="text-xs text-primary-600 hover:underline"
                                >Edit</button>
                              </CanDo>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-text-muted">Meter No.</p>
                              <p className="font-mono font-medium text-text">{m.meter_number}</p>
                            </div>
                            {m.account_number && (
                              <div>
                                <p className="text-text-muted">Account No.</p>
                                <p className="font-mono font-medium text-text">{m.account_number}</p>
                              </div>
                            )}
                            {m.last_reading != null && (
                              <div>
                                <p className="text-text-muted">Last Reading</p>
                                <p className="font-medium text-text">
                                  {Number(m.last_reading).toLocaleString()}{' '}
                                  {m.utility_type === 'water' || m.utility_type === 'water_sewer' ? 'm³' : m.utility_type === 'electricity' ? 'kWh' : ''}
                                </p>
                              </div>
                            )}
                            {m.last_reading_date && (
                              <div>
                                <p className="text-text-muted">Reading Date</p>
                                <p className="font-medium text-text">{m.last_reading_date}</p>
                              </div>
                            )}
                            {m.current_billing_person && (
                              <div className="col-span-2">
                                <p className="text-text-muted">Billed To</p>
                                <p className="font-medium text-text">{m.current_billing_person.name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </Drawer>

      <AddUnitModal
        open={showAddUnit}
        onClose={() => { setShowAddUnit(false); setEditUnit(null) }}
        onSuccess={handleUnitSaved}
        unit={editUnit ?? undefined}
      />

      {selected && (
        <>
          <LeaseModal
            open={showLeaseModal}
            onClose={() => { setShowLeaseModal(false); setEditLease(null) }}
            unitId={selected.id}
            unitLabel={`${selected.block}-${selected.number}`}
            tenants={allPeople.filter(p => p.type === 'tenant')}
            initialData={editLease}
            onSaved={lease => setUnitLeases(prev => {
              const idx = prev.findIndex(l => l.id === lease.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = lease; return n }
              return [lease, ...prev]
            })}
          />
          <ChargeModal
            open={showChargeModal}
            onClose={() => { setShowChargeModal(false); setEditCharge(null) }}
            unitId={selected.id}
            unitLabel={`${selected.block}-${selected.number}`}
            people={allPeople}
            initialData={editCharge}
            onSaved={charge => setUnitCharges(prev => {
              const idx = prev.findIndex(c => c.id === charge.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = charge; return n }
              return [charge, ...prev]
            })}
          />
          <MeterModal
            open={showMeterModal}
            onClose={() => { setShowMeterModal(false); setEditMeter(null) }}
            unitId={selected.id}
            unitLabel={`${selected.block}-${selected.number}`}
            people={allPeople}
            initialData={editMeter}
            onSaved={meter => setUnitMeters(prev => {
              const idx = prev.findIndex(m => m.id === meter.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = meter; return n }
              return [meter, ...prev]
            })}
          />
        </>
      )}
    </DashboardLayout>
  )
}
