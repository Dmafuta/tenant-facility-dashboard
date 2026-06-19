'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { createUnit, updateUnit, type UnitData } from '@/lib/api/units'
import type { Unit } from '@/lib/types'

// ── Types ──────────────────────────────────────────────────────────────────

type UnitType = 'apartment' | 'studio' | 'penthouse' | 'commercial' | 'shop' | 'parking_bay' | 'storage_room' | 'staff_quarter'
type UnitStatus = 'vacant' | 'occupied' | 'renovation' | 'reserved' | 'off_market'
type FurnishedStatus = 'unfurnished' | 'semi' | 'fully'
type FloorPosition = 'corner' | 'middle' | 'end' | ''
type ParkingBayType = 'open' | 'covered' | 'basement' | ''

const UNIT_TYPE_OPTIONS: { value: UnitType; label: string; icon: string; residential: boolean }[] = [
  { value: 'apartment',     label: 'Apartment',       icon: '🏠', residential: true  },
  { value: 'studio',        label: 'Studio',          icon: '🛏',  residential: true  },
  { value: 'penthouse',     label: 'Penthouse',       icon: '🏙',  residential: true  },
  { value: 'staff_quarter', label: 'Staff Quarter',   icon: '👤', residential: true  },
  { value: 'commercial',    label: 'Commercial',      icon: '🏢', residential: false },
  { value: 'shop',          label: 'Shop / Retail',   icon: '🏪', residential: false },
  { value: 'parking_bay',   label: 'Parking Bay',     icon: '🚗', residential: false },
  { value: 'storage_room',  label: 'Storage Room',    icon: '📦', residential: false },
]

const STATUS_OPTIONS: { value: UnitStatus; label: string; cls: string }[] = [
  { value: 'vacant',     label: 'Vacant',           cls: 'bg-success/10 text-success border-success/30' },
  { value: 'occupied',   label: 'Occupied',         cls: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-800' },
  { value: 'renovation', label: 'Under Renovation', cls: 'bg-warning/10 text-warning border-warning/30' },
  { value: 'reserved',   label: 'Reserved',         cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300' },
  { value: 'off_market', label: 'Off-market',       cls: 'bg-surface-muted text-text-muted border-surface-border' },
]

const FEATURE_TAGS = [
  'Balcony', 'Terrace', 'Rooftop access', 'Private garden',
  'Air conditioning', 'Fireplace', 'En-suite master', 'Walk-in closet',
  'Open plan kitchen', 'DSQ / staff room', 'Borehole access', 'Solar water heater',
  'Backup generator', 'Swimming pool access', 'Gym access', 'Lift access',
]

const VIEW_OPTIONS = ['Garden / landscaped', 'Pool', 'Street / road', 'Courtyard', 'City skyline', 'None / internal']

// ── Primitives ─────────────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-text-muted/60'
const LABEL = 'block text-xs font-medium text-text-muted mb-1.5'

function Field({ label, required, optional, hint, children }: {
  label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {optional && <span className="text-text-muted/60 ml-1 font-normal">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  )
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-surface-border dark:bg-dark-border" />
    </div>
  )
}

function FooterNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-surface-border dark:border-dark-border">
      {children}
    </div>
  )
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-surface-border dark:border-dark-border last:border-b-0">
      <span className="w-36 text-[11px] text-text-muted flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-text font-medium flex-1">{value || '—'}</span>
    </div>
  )
}

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center mb-6 -mx-6 px-6 pb-4 border-b border-surface-border dark:border-dark-border">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1 min-w-0">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all',
            i < current   ? 'bg-success text-white'     :
            i === current ? 'bg-primary-600 text-white' :
                            'bg-surface-muted dark:bg-dark-hover text-text-muted border border-surface-border dark:border-dark-border'
          )}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={cn(
            'text-[10px] mx-1 hidden sm:block truncate flex-1',
            i === current ? 'text-text font-medium' : 'text-text-muted'
          )}>{s}</span>
          {i < steps.length - 1 && (
            <div className={cn('h-px flex-shrink-0 w-3', i < current ? 'bg-success' : 'bg-surface-border dark:bg-dark-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Form state ─────────────────────────────────────────────────────────────

interface FormState {
  unit_type: UnitType | ''
  unit_label: string
  block: string
  floor: string
  floor_area_sqm: string
  bedrooms: string
  bathrooms: string
  guest_toilets: string
  parking_bays: string
  has_storage: boolean
  furnished: FurnishedStatus
  bay_type: ParkingBayType
  bay_dimensions: string
  storage_area_sqm: string
  storage_height_m: string
  floor_position: FloorPosition
  view: string
  features: string[]
  status: UnitStatus
  handover_date: string
  available_from: string
  asking_rent: string
  deposit_months: string
  service_charge: string
  service_charge_included: boolean
  notes: string
}

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY: FormState = {
  unit_type: 'apartment', unit_label: '', block: '', floor: '',
  floor_area_sqm: '', bedrooms: '1', bathrooms: '1', guest_toilets: '0',
  parking_bays: '0', has_storage: false, furnished: 'unfurnished',
  bay_type: '', bay_dimensions: '',
  storage_area_sqm: '', storage_height_m: '',
  floor_position: '', view: '', features: [],
  status: 'vacant', handover_date: TODAY, available_from: TODAY,
  asking_rent: '', deposit_months: '2', service_charge: '', service_charge_included: false,
  notes: '',
}

const STEP_LABELS = ['Type', 'Physical', 'Location', 'Status & Dates', 'Pricing', 'Confirm']

// ── Component ──────────────────────────────────────────────────────────────

// Map a frontend Unit back into a FormState for the edit modal
function unitToFormState(unit: Unit): FormState {
  const statusMap: Record<string, UnitStatus> = {
    occupied: 'occupied', vacant: 'vacant', maintenance: 'renovation', reserved: 'reserved',
  }
  return {
    ...EMPTY,
    unit_label: unit.number,
    block: unit.block,
    floor: unit.floor ? String(unit.floor) : '',
    floor_area_sqm: unit.size_sqm ? String(unit.size_sqm) : '',
    bedrooms: unit.bedrooms ? String(unit.bedrooms) : '1',
    bathrooms: unit.bathrooms ? String(unit.bathrooms) : '1',
    asking_rent: unit.monthly_rate ? String(unit.monthly_rate) : '',
    status: (statusMap[unit.status] ?? 'vacant') as UnitStatus,
  }
}

export function AddUnitModal({
  open,
  onClose,
  onSuccess,
  unit,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: (unit: UnitData) => void
  unit?: Unit  // when provided, the modal is in edit mode
}) {
  const isEditing = !!unit
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Re-initialize form whenever the modal opens or the unit changes
  useEffect(() => {
    if (open) {
      setForm(unit ? unitToFormState(unit) : EMPTY)
      setStep(0)
      setSubmitError('')
    }
  }, [open, unit])

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const setB = (k: keyof FormState, v: boolean) => setForm(f => ({ ...f, [k]: v }))

  const toggleFeature = (feat: string) =>
    setForm(f => ({
      ...f,
      features: f.features.includes(feat)
        ? f.features.filter(x => x !== feat)
        : [...f.features, feat],
    }))

  const typeInfo       = UNIT_TYPE_OPTIONS.find(t => t.value === form.unit_type)
  const isResidential  = typeInfo?.residential ?? false
  const isParkingBay   = form.unit_type === 'parking_bay'
  const isStorage      = form.unit_type === 'storage_room'
  const statusInfo     = STATUS_OPTIONS.find(s => s.value === form.status)

  const canStep0 = !!form.unit_type && !!form.unit_label
  const canStep3 = !!form.handover_date

  function reset() { setForm(EMPTY); setStep(0); setSubmitError('') }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        unit_type: form.unit_type || null,
        unit_label: form.unit_label,
        block: form.block || null,
        floor: form.floor || null,
        floor_area_sqm: form.floor_area_sqm ? Number(form.floor_area_sqm) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        guest_toilets: form.guest_toilets ? Number(form.guest_toilets) : null,
        parking_bays: form.parking_bays ? Number(form.parking_bays) : null,
        has_storage: form.has_storage,
        furnished: form.furnished || null,
        bay_type: form.bay_type || null,
        bay_dimensions: form.bay_dimensions || null,
        storage_area_sqm: form.storage_area_sqm ? Number(form.storage_area_sqm) : null,
        storage_height_m: form.storage_height_m ? Number(form.storage_height_m) : null,
        floor_position: form.floor_position || null,
        view: form.view || null,
        features: form.features,
        status: form.status,
        handover_date: form.handover_date || null,
        available_from: form.available_from || null,
        asking_rent: form.asking_rent ? Number(form.asking_rent) : null,
        deposit_months: form.deposit_months ? Number(form.deposit_months) : null,
        service_charge: form.service_charge ? Number(form.service_charge) : null,
        service_charge_included: form.service_charge_included,
        notes: form.notes || null,
      }

      if (isEditing && unit) {
        const updated = await updateUnit(unit.id, payload)
        onSuccess?.(updated)
      } else {
        const created = await createUnit(payload)
        onSuccess?.(created)
      }
      onClose()
      reset()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : isEditing ? 'Failed to update unit.' : 'Failed to register unit.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title={isEditing ? `Edit Unit ${unit?.block ? unit.block + '-' : ''}${unit?.number ?? ''}` : 'Add New Unit'} size="lg" noPadding>
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <Steps steps={STEP_LABELS} current={step} />

        {/* ── Step 0: Type & Identity ── */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionDivider title="Unit Type" />
            <Field label="Unit Type" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">
                  {UNIT_TYPE_OPTIONS.find(t => t.value === form.unit_type)?.icon}
                </span>
                <select
                  className={cn(INPUT, 'pl-9')}
                  value={form.unit_type}
                  onChange={e => {
                    const t = UNIT_TYPE_OPTIONS.find(o => o.value === e.target.value)
                    setForm(f => ({ ...f, unit_type: e.target.value as UnitType, furnished: t?.residential ? f.furnished : 'unfurnished' }))
                  }}
                >
                  {UNIT_TYPE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </Field>

            <SectionDivider title="Identity" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Unit Number / Label" required hint="e.g. A-101, Shop 3, Bay P-07">
                <input className={INPUT} value={form.unit_label} onChange={set('unit_label')} placeholder="e.g. A-101" />
              </Field>
              <Field label="Block / Wing" optional>
                <input className={INPUT} value={form.block} onChange={set('block')} placeholder="e.g. Block A" />
              </Field>
              <Field label="Floor" optional hint="G, 1, 2, B1…">
                <input className={INPUT} value={form.floor} onChange={set('floor')} placeholder="e.g. 3" />
              </Field>
            </div>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canStep0}>Next: Physical Details →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 1: Physical Details ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-muted dark:bg-dark-hover rounded-lg px-3 py-2">
              <span>{typeInfo?.icon}</span>
              <span className="font-medium text-text">{typeInfo?.label}</span>
              {form.unit_label && <><span>·</span><span>{form.unit_label}</span></>}
              {form.block && <><span>·</span><span>{form.block}</span></>}
              {form.floor && <><span>·</span><span>Floor {form.floor}</span></>}
            </div>

            {isResidential && (
              <>
                <SectionDivider title="Rooms" />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Bedrooms" required>
                    <select className={INPUT} value={form.bedrooms} onChange={set('bedrooms')}>
                      {['0','1','2','3','4','5','6+'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="Bathrooms" required>
                    <select className={INPUT} value={form.bathrooms} onChange={set('bathrooms')}>
                      {['1','2','3','4','5+'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="Guest Toilets" optional>
                    <select className={INPUT} value={form.guest_toilets} onChange={set('guest_toilets')}>
                      {['0','1','2','3'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                </div>
              </>
            )}

            {isParkingBay && (
              <>
                <SectionDivider title="Bay Details" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Bay Type" required>
                    <select className={INPUT} value={form.bay_type} onChange={set('bay_type')}>
                      <option value="">Select type…</option>
                      <option value="open">Open / Surface</option>
                      <option value="covered">Covered / Shade</option>
                      <option value="basement">Basement</option>
                    </select>
                  </Field>
                  <Field label="Bay Dimensions" optional hint="e.g. 2.5m × 5m">
                    <input className={INPUT} value={form.bay_dimensions} onChange={set('bay_dimensions')} placeholder="e.g. 2.5 × 5m" />
                  </Field>
                </div>
              </>
            )}

            {isStorage && (
              <>
                <SectionDivider title="Storage Details" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Floor Area (m²)" required>
                    <input className={INPUT} type="number" value={form.storage_area_sqm} onChange={set('storage_area_sqm')} placeholder="e.g. 6" />
                  </Field>
                  <Field label="Clear Height (m)" optional>
                    <input className={INPUT} type="number" step="0.1" value={form.storage_height_m} onChange={set('storage_height_m')} placeholder="e.g. 2.4" />
                  </Field>
                </div>
              </>
            )}

            {!isParkingBay && (
              <>
                <SectionDivider title="Size" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Floor Area (m²)" optional hint="Total internal area">
                    <input className={INPUT} type="number" value={form.floor_area_sqm} onChange={set('floor_area_sqm')} placeholder="e.g. 78" />
                  </Field>
                  {isResidential && (
                    <Field label="Dedicated Parking Bays" optional>
                      <select className={INPUT} value={form.parking_bays} onChange={set('parking_bays')}>
                        {['0','1','2','3','4'].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </Field>
                  )}
                </div>
              </>
            )}

            {isResidential && (
              <>
                <SectionDivider title="Furnishing" />
                <div className="grid grid-cols-3 gap-3">
                  {(['unfurnished','semi','fully'] as FurnishedStatus[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setForm(fm => ({ ...fm, furnished: f }))}
                      className={cn(
                        'px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all text-center',
                        form.furnished === f
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-surface-border dark:border-dark-border text-text hover:border-primary-300 hover:bg-surface-hover dark:hover:bg-dark-hover'
                      )}
                    >
                      {f === 'semi' ? 'Semi-furnished' : f === 'fully' ? 'Fully furnished' : 'Unfurnished'}
                    </button>
                  ))}
                </div>
              </>
            )}

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)}>Next: Location →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 2: Location & Features ── */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionDivider title="Position on Floor" />
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: 'corner' as FloorPosition, label: 'Corner',  icon: '↗', hint: 'Two external walls' },
                { v: 'middle' as FloorPosition, label: 'Middle',  icon: '⬛', hint: 'Internal / sandwiched' },
                { v: 'end'    as FloorPosition, label: 'End',     icon: '▶',  hint: 'One external end wall' },
              ].map(p => (
                <button
                  key={p.v}
                  onClick={() => setForm(f => ({ ...f, floor_position: p.v }))}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 transition-all',
                    form.floor_position === p.v
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-border dark:border-dark-border hover:border-primary-300 hover:bg-surface-hover dark:hover:bg-dark-hover'
                  )}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className={cn('text-xs font-medium', form.floor_position === p.v ? 'text-primary-700 dark:text-primary-300' : 'text-text')}>{p.label}</span>
                  <span className="text-[10px] text-text-muted">{p.hint}</span>
                </button>
              ))}
            </div>

            <SectionDivider title="View / Orientation" />
            <Field label="Primary View" optional>
              <select className={INPUT} value={form.view} onChange={set('view')}>
                <option value="">Select view…</option>
                {VIEW_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>

            <SectionDivider title="Notable Features" />
            <p className="text-xs text-text-muted">Select all that apply to this unit.</p>
            <div className="flex flex-wrap gap-2">
              {FEATURE_TAGS.map(feat => (
                <button
                  key={feat}
                  onClick={() => toggleFeature(feat)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                    form.features.includes(feat)
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'border-surface-border dark:border-dark-border text-text-muted hover:border-primary-300 hover:text-text'
                  )}
                >
                  {form.features.includes(feat) ? '✓ ' : ''}{feat}
                </button>
              ))}
            </div>
            {form.features.length > 0 && (
              <p className="text-xs text-primary-600 dark:text-primary-400">{form.features.length} feature{form.features.length !== 1 ? 's' : ''} selected</p>
            )}

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)}>Next: Status & Dates →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 3: Status & Dates ── */}
        {step === 3 && (
          <div className="space-y-5">
            <SectionDivider title="Current Status" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setForm(f => ({ ...f, status: s.value }))}
                  className={cn(
                    'px-3 py-2.5 rounded-lg border-2 text-xs font-medium transition-all text-center',
                    form.status === s.value
                      ? `border-current ${s.cls}`
                      : 'border-surface-border dark:border-dark-border text-text-muted hover:border-primary-300 hover:bg-surface-hover dark:hover:bg-dark-hover'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <SectionDivider title="Key Dates" />
            <Field
              label="Handover Date"
              required
              hint="Date the unit was formally handed over from the developer or contractor to the facility. The defects liability period (typically 12 months) runs from this date."
            >
              <input className={INPUT} type="date" value={form.handover_date} onChange={set('handover_date')} />
            </Field>
            <Field
              label="Available From"
              optional
              hint="When this unit is expected to be available for new occupancy. May differ from handover date if renovation or a notice period applies."
            >
              <input className={INPUT} type="date" value={form.available_from} onChange={set('available_from')} />
            </Field>

            {form.status === 'renovation' && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                Unit is under renovation — set <strong>Available From</strong> to the expected completion date so it appears correctly in vacancy forecasts.
              </div>
            )}
            {form.status === 'occupied' && (
              <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 text-xs text-primary-700 dark:text-primary-300">
                Unit is occupied — link a lease record from the <strong>Leases</strong> module after registration.
              </div>
            )}

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)} disabled={!canStep3}>Next: Pricing →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 4: Pricing ── */}
        {step === 4 && (
          <div className="space-y-5">
            <SectionDivider title="Rental Pricing" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asking Rent (KES / month)" optional hint="Advertised monthly rent — shown in vacancy reports">
                <input className={INPUT} type="number" value={form.asking_rent} onChange={set('asking_rent')} placeholder="e.g. 45000" />
              </Field>
              <Field label="Deposit (months)" optional>
                <select className={INPUT} value={form.deposit_months} onChange={set('deposit_months')}>
                  {['1','2','3','4','6'].map(n => <option key={n} value={n}>{n} month{n !== '1' ? 's' : ''}</option>)}
                </select>
              </Field>
            </div>

            <SectionDivider title="Service Charge" />
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border">
              <div>
                <p className="text-sm font-medium text-text">Included in rent</p>
                <p className="text-xs text-text-muted">Service charge is bundled — no separate line item</p>
              </div>
              <button
                onClick={() => setB('service_charge_included', !form.service_charge_included)}
                className={cn('w-10 h-5 rounded-full relative transition-colors flex-shrink-0',
                  form.service_charge_included ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'
                )}
              >
                <div className={cn('w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all',
                  form.service_charge_included ? 'right-0.5' : 'left-0.5'
                )} />
              </button>
            </div>
            {!form.service_charge_included && (
              <Field label="Service Charge (KES / month)" optional>
                <input className={INPUT} type="number" value={form.service_charge} onChange={set('service_charge')} placeholder="e.g. 5000" />
              </Field>
            )}

            <SectionDivider title="Notes" />
            <Field label="Additional Notes" optional>
              <textarea className={cn(INPUT, 'h-16 resize-none')} value={form.notes} onChange={set('notes')} placeholder="Any additional details about this unit…" />
            </Field>

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
              <Button onClick={() => setStep(5)}>Next: Confirm →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 5: Confirm ── */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Unit"           value={`${typeInfo?.icon ?? ''} ${form.unit_label}`} />
              <ConfirmRow label="Type"           value={typeInfo?.label ?? ''} />
              {form.block && <ConfirmRow label="Block / Wing"   value={form.block} />}
              {form.floor && <ConfirmRow label="Floor"          value={form.floor} />}
              {isResidential && (
                <ConfirmRow
                  label="Rooms"
                  value={[
                    `${form.bedrooms} bed`,
                    `${form.bathrooms} bath`,
                    form.guest_toilets !== '0' ? `${form.guest_toilets} guest WC` : '',
                  ].filter(Boolean).join(' · ')}
                />
              )}
              {form.floor_area_sqm && <ConfirmRow label="Floor Area" value={`${form.floor_area_sqm} m²`} />}
              {isParkingBay && form.bay_type && (
                <ConfirmRow label="Bay Type" value={`${form.bay_type.charAt(0).toUpperCase() + form.bay_type.slice(1)}${form.bay_dimensions ? ` · ${form.bay_dimensions}` : ''}`} />
              )}
              {isStorage && form.storage_area_sqm && (
                <ConfirmRow label="Storage" value={`${form.storage_area_sqm} m²${form.storage_height_m ? ` · ${form.storage_height_m}m high` : ''}`} />
              )}
              {isResidential && form.parking_bays !== '0' && (
                <ConfirmRow label="Parking Bays" value={form.parking_bays} />
              )}
              {isResidential && (
                <ConfirmRow label="Furnishing" value={form.furnished === 'semi' ? 'Semi-furnished' : form.furnished === 'fully' ? 'Fully furnished' : 'Unfurnished'} />
              )}
              {form.floor_position && (
                <ConfirmRow label="Position" value={`${form.floor_position.charAt(0).toUpperCase() + form.floor_position.slice(1)} unit`} />
              )}
              {form.view && <ConfirmRow label="View"           value={form.view} />}
              {form.features.length > 0 && <ConfirmRow label="Features"      value={form.features.join(', ')} />}
              <ConfirmRow label="Status"         value={statusInfo?.label ?? form.status} />
              <ConfirmRow label="Handover Date"  value={form.handover_date} />
              {form.available_from && <ConfirmRow label="Available From" value={form.available_from} />}
              {form.asking_rent && (
                <ConfirmRow label="Asking Rent"  value={`KES ${Number(form.asking_rent).toLocaleString()} / month`} />
              )}
              {form.asking_rent && (
                <ConfirmRow label="Deposit"      value={`${form.deposit_months} month${Number(form.deposit_months) !== 1 ? 's' : ''} = KES ${(Number(form.asking_rent) * Number(form.deposit_months)).toLocaleString()}`} />
              )}
              <ConfirmRow
                label="Service Charge"
                value={form.service_charge_included ? 'Included in rent' : form.service_charge ? `KES ${Number(form.service_charge).toLocaleString()} / month` : '—'}
              />
            </div>

            {form.notes && (
              <div className="px-4 py-3 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border text-xs text-text-muted">
                <span className="font-medium text-text">Notes:</span> {form.notes}
              </div>
            )}

            {submitError && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{submitError}</p>
            )}
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(4)} disabled={submitting}>← Back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> {isEditing ? 'Saving…' : 'Registering…'}</>
                ) : isEditing ? '✓ Save Changes' : '✓ Register Unit'}
              </Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}
