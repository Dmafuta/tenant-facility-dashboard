'use client'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type {
  MeterCategory, MeterBillingMode,
  WaterMeterSubtype, ElectricityMeterSubtype, GasMeterSubtype,
} from '@/lib/types'
import { createGlobalMeter } from '@/lib/api/meters'
import { getUnitsFromApi } from '@/lib/api/units'
import type { UnitData } from '@/lib/api/units'

type CommunicationProtocol = 'manual' | 'tokenized' | 'iot' | 'pulse' | 'rs485'

const PROTOCOL_OPTIONS: { value: CommunicationProtocol; label: string; desc: string }[] = [
  { value: 'manual',    label: 'Manual read',              desc: 'Staff reads display each billing cycle' },
  { value: 'tokenized', label: 'Tokenized (STS / KPLC LUKU)', desc: 'Keypad token entry — no reading transmitted' },
  { value: 'iot',       label: 'Smart / IoT',              desc: 'Auto-transmit via GPRS, 4G, LoRaWAN, NB-IoT' },
  { value: 'pulse',     label: 'Pulse output',             desc: 'Wired pulse to an external data logger' },
  { value: 'rs485',     label: 'RS485 / Modbus',           desc: 'Wired serial protocol to BMS or logger' },
]

const PROTOCOL_LABEL: Record<CommunicationProtocol, string> = {
  manual: 'Manual read', tokenized: 'Tokenized (STS / KPLC LUKU)',
  iot: 'Smart / IoT', pulse: 'Pulse output', rs485: 'RS485 / Modbus',
}
import { cn } from '@/lib/cn'

// ── Shared primitives (mirror RegisterPersonModal pattern) ─────────────────

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
      <span className="w-32 text-[11px] text-text-muted flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-text font-medium flex-1">{value || '—'}</span>
    </div>
  )
}

// ── Step indicator ─────────────────────────────────────────────────────────

function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 mb-6 -mx-6 px-6 pb-4 border-b border-surface-border dark:border-dark-border">
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

// ── Type maps ──────────────────────────────────────────────────────────────

const WATER_SUBTYPES: { value: WaterMeterSubtype; label: string; desc: string }[] = [
  { value: 'bulk',     label: 'Bulk / Main',       desc: 'Building main supply from utility' },
  { value: 'unit_sub', label: 'Unit Sub-meter',    desc: 'Per-apartment consumption meter' },
  { value: 'borehole', label: 'Borehole',          desc: 'Own borehole or well meter' },
  { value: 'recycled', label: 'Recycled / Grey',   desc: 'Recycled or grey water circuit' },
  { value: 'fire_main',label: 'Fire Main',         desc: 'Fire suppression (non-billing)' },
]

const ELEC_SUBTYPES: { value: ElectricityMeterSubtype; label: string; desc: string }[] = [
  { value: 'bulk',        label: 'Bulk / Main',     desc: 'Building main from utility' },
  { value: 'unit_sub',    label: 'Unit Sub-meter',  desc: 'Per-apartment meter' },
  { value: 'common_area', label: 'Common Area',     desc: 'Lifts, lobby, parking, gym' },
  { value: 'solar_export',label: 'Solar Export',    desc: 'Net metering / solar feed-in' },
]

const GAS_SUBTYPES: { value: GasMeterSubtype; label: string; desc: string }[] = [
  { value: 'bulk',     label: 'Bulk / Main',   desc: 'Building main gas supply' },
  { value: 'unit_sub', label: 'Unit Sub-meter', desc: 'Per-apartment gas meter' },
  { value: 'lpg_tank', label: 'LPG Tank',      desc: 'LPG tank gauge or meter' },
]

const PIPE_DIAMETERS = [15, 20, 25, 32, 40, 50, 80, 100] as const

// ── Main modal ─────────────────────────────────────────────────────────────

interface FormState {
  // Step 1 — Category & Type
  category: MeterCategory | ''
  meter_subtype: string
  billing_mode: MeterBillingMode

  // Step 2 — Identity
  serial_number: string
  make: string
  model: string
  communication_protocol: CommunicationProtocol | ''
  iot_device_id: string
  meter_number: string
  utility_account_number: string
  token_number: string

  // Step 3 — Technical specs
  // Water
  pipe_diameter_mm: string
  meter_class: 'B' | 'C' | 'D' | ''
  connection_type: string
  max_flow_rate_lph: string
  // Electricity
  phase: 'single' | 'three' | ''
  ct_ratio: string
  max_demand_kva: string
  voltage_rating: string
  // Gas
  gas_type: 'natural_gas' | 'lpg' | ''
  capacity_m3_per_hr: string
  working_pressure_mbar: string

  // Step 4 — Assignment & Location
  is_bulk: boolean
  unit_id: string
  location_description: string
  in_inventory: boolean
  installed_at: string

  // Step 5 — Opening reading & billing
  opening_reading: string
  opening_reading_date: string
  unit_of_measure: string
  rate_per_unit: string
  billing_cycle: 'monthly' | 'quarterly'
  auto_generate_charges: boolean

  // Step 6 — Calibration
  cert_number: string
  calibration_date: string
  expiry_date: string
  calibrated_by: string

  // Other
  notes: string
}

const TODAY = new Date().toISOString().slice(0, 10)

const EMPTY: FormState = {
  category: '', meter_subtype: '', billing_mode: 'postpaid',
  serial_number: '', make: '', model: '',
  communication_protocol: '', iot_device_id: '',
  meter_number: '', utility_account_number: '', token_number: '',
  pipe_diameter_mm: '15', meter_class: '', connection_type: '', max_flow_rate_lph: '',
  phase: '', ct_ratio: '', max_demand_kva: '', voltage_rating: '240V',
  gas_type: '', capacity_m3_per_hr: '', working_pressure_mbar: '21',
  is_bulk: false, unit_id: '', location_description: '', in_inventory: false, installed_at: TODAY,
  opening_reading: '0', opening_reading_date: TODAY,
  unit_of_measure: 'm³', rate_per_unit: '', billing_cycle: 'monthly', auto_generate_charges: true,
  cert_number: '', calibration_date: '', expiry_date: '', calibrated_by: '',
  notes: '',
}

export function AddMeterModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved?: () => void }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [units, setUnits] = useState<UnitData[]>([])
  const [certFile, setCertFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (open) getUnitsFromApi().then(setUnits).catch(() => {})
  }, [open])

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const setB = (k: keyof FormState, v: boolean) => setForm(f => ({ ...f, [k]: v }))

  // Derive subtype options from category
  const subtypeOptions =
    form.category === 'water'       ? WATER_SUBTYPES :
    form.category === 'electricity' ? ELEC_SUBTYPES  :
    form.category === 'gas'         ? GAS_SUBTYPES   : []

  // Is this a bulk meter? (no unit assignment needed)
  const isBulk = form.meter_subtype === 'bulk'

  // Unit of measure defaults
  const uomDefault =
    form.category === 'electricity' ? 'kWh' :
    form.category === 'gas'         ? 'm³ (gas)' : 'm³'

  function handleCategoryChange(cat: MeterCategory) {
    setForm(f => ({
      ...f,
      category: cat,
      meter_subtype: '',
      unit_of_measure: cat === 'electricity' ? 'kWh' : cat === 'gas' ? 'm³ (gas)' : 'm³',
    }))
  }

  // Can proceed per step
  const canStep1 = !!form.category && !!form.meter_subtype
  const canStep2 = !!form.serial_number && !!form.communication_protocol
  const canStep3 =
    form.category === 'water'       ? !!form.meter_class && !!form.connection_type :
    form.category === 'electricity' ? !!form.phase :
    form.category === 'gas'         ? !!form.gas_type && !!form.capacity_m3_per_hr : false
  const canStep4 = isBulk || form.in_inventory || !!form.unit_id
  const canStep5 = !!form.rate_per_unit && !!form.opening_reading_date

  const STEP_LABELS = ['Category', 'Identity', 'Specs', 'Assignment', 'Billing', 'Calibration', 'Confirm']

  function reset() { setForm(EMPTY); setStep(0); setSubmitError(null); setCertFile(null) }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Derive utilityType from category + gas subtype
      const utilityType =
        form.category === 'electricity' ? 'electricity' :
        form.category === 'gas' ? (form.gas_type === 'lpg' ? 'gas_cylinder' : 'gas_piped') :
        'water'

      // Derive meterType from communication protocol / billing mode
      const meterType =
        form.communication_protocol === 'iot' ? 'smart' :
        (form.billing_mode === 'prepaid' || form.communication_protocol === 'tokenized') ? 'prepaid' :
        'postpaid'

      // Derive meterRole from subtype
      const meterRole =
        ['bulk', 'borehole', 'solar_export', 'lpg_tank'].includes(form.meter_subtype) ? 'supplier' :
        ['fire_main', 'recycled'].includes(form.meter_subtype) ? 'distribution' :
        'consumer'

      // Resolve unit info
      const selectedUnit = units.find(u => u.id === form.unit_id)
      const hasUnit = !isBulk && !form.in_inventory && !!form.unit_id

      const payload: Record<string, unknown> = {
        unitId:             hasUnit ? form.unit_id : null,
        unitLabel:          hasUnit ? (selectedUnit?.unit_label ?? null) : null,
        utilityType,
        meterType,
        meterNumber:        form.meter_number || form.serial_number,
        accountNumber:      form.utility_account_number || null,
        installationDate:   (!form.in_inventory && form.installed_at) ? form.installed_at : null,
        status:             'active',
        billingArrangement: 'billed_to_occupant',
        lastReading:        form.opening_reading ? Number(form.opening_reading) : 0,
        lastReadingDate:    form.opening_reading_date || null,
        meterRole,
        ratePerUnit:        form.rate_per_unit ? Number(form.rate_per_unit) : null,
        notes:              [form.notes, certFile ? `Cert doc: ${certFile.name}` : ''].filter(Boolean).join(' | ') || null,
      }

      await createGlobalMeter(payload)
      onClose()
      reset()
      onSaved?.()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to register meter. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Confirm summary fields
  const subtypeLabel = subtypeOptions.find(s => s.value === form.meter_subtype)?.label ?? form.meter_subtype
  const BILLING_MODE_LABEL: Record<MeterBillingMode, string> = { postpaid: 'Postpaid', prepaid: 'Prepaid (top-up tracking)' }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Add New Meter" size="lg" noPadding>
      <div className="px-6 py-5">
        <Steps steps={STEP_LABELS} current={step} />

        {/* ── Step 0: Category & Type ── */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionDivider title="Utility Category" />
            <Field label="Category" required>
              <select
                className={INPUT}
                value={form.category}
                onChange={e => handleCategoryChange(e.target.value as MeterCategory)}
              >
                <option value="">Select category…</option>
                <option value="water">💧 Water</option>
                <option value="electricity">⚡ Electricity</option>
                <option value="gas">🔥 Gas</option>
              </select>
            </Field>

            {form.category && (
              <Field label="Meter Type" required>
                <select className={INPUT} value={form.meter_subtype} onChange={set('meter_subtype')}>
                  <option value="">Select meter type…</option>
                  {subtypeOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
                  ))}
                </select>
              </Field>
            )}

            <SectionDivider title="Billing Mode" />
            <Field
              label="Billing Mode"
              required
              hint={form.billing_mode === 'prepaid'
                ? 'Prepaid: rate is still recorded for consumption tracking. Top-up transactions are logged separately — no auto-charges generated.'
                : 'Postpaid: charges are auto-generated each billing cycle based on meter readings.'}
            >
              <select className={INPUT} value={form.billing_mode} onChange={set('billing_mode')}>
                <option value="postpaid">Postpaid — charges generated from readings</option>
                <option value="prepaid">Prepaid — top-up tracking, no auto-charges</option>
              </select>
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canStep1}>Next: Identity →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 1: Identity ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-muted dark:bg-dark-hover rounded-lg px-3 py-2">
              <span>{form.category === 'water' ? '💧' : form.category === 'electricity' ? '⚡' : '🔥'}</span>
              <span className="font-medium text-text">{subtypeLabel}</span>
              <span>·</span>
              <span>{BILLING_MODE_LABEL[form.billing_mode]}</span>
            </div>

            <SectionDivider title="Meter Identity" />
            <Field label="Serial Number" required hint="Printed on the meter body — used as the unique hardware identifier">
              <input className={INPUT} value={form.serial_number} onChange={set('serial_number')} placeholder="e.g. ITRON-WM-2024-0041" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Make / Manufacturer" optional>
                <input className={INPUT} value={form.make} onChange={set('make')} placeholder="e.g. Itron, Landis+Gyr" />
              </Field>
              <Field label="Model" optional>
                <input className={INPUT} value={form.model} onChange={set('model')} placeholder="e.g. SL7000, E110" />
              </Field>
            </div>

            <SectionDivider title="Communication / Reading Method" />
            <Field label="Protocol" required hint="How this meter communicates consumption data">
              <select className={INPUT} value={form.communication_protocol} onChange={set('communication_protocol')}>
                <option value="">Select protocol…</option>
                {PROTOCOL_OPTIONS.map(p => (
                  <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                ))}
              </select>
            </Field>

            {/* Tokenized — show STS token number */}
            {form.communication_protocol === 'tokenized' && (
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  Tokenized meters use STS-standard 20-digit tokens. The tenant purchases tokens via M-Pesa or a utility agent and enters them on the keypad. No reading is transmitted — only top-up transactions are tracked.
                </p>
                <Field label="STS / LUKU Token Number" optional hint="The 11-digit meter number printed on the keypad fascia (not the top-up token itself)">
                  <input className={INPUT} value={form.token_number} onChange={set('token_number')} placeholder="e.g. 34522-88120-44" />
                </Field>
              </div>
            )}

            {/* IoT — show device IMEI */}
            {form.communication_protocol === 'iot' && (
              <Field label="Device ID / IMEI" optional hint="GPRS/4G modem IMEI, LoRa DevEUI, or NB-IoT identifier assigned by the IoT module">
                <input className={INPUT} value={form.iot_device_id} onChange={set('iot_device_id')} placeholder="e.g. 352999109387323" />
              </Field>
            )}

            <SectionDivider title="Utility Account" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Utility Meter Number" optional hint="Number assigned by the utility provider">
                <input className={INPUT} value={form.meter_number} onChange={set('meter_number')} placeholder="e.g. W-A101-01" />
              </Field>
              <Field label="Utility Account Number" optional>
                <input className={INPUT} value={form.utility_account_number} onChange={set('utility_account_number')} placeholder="e.g. ACC-W-0101" />
              </Field>
            </div>

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)} disabled={!canStep2}>Next: Technical Specs →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 2: Technical Specs ── */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionDivider title={
              form.category === 'water'       ? 'Water Meter Specifications' :
              form.category === 'electricity' ? 'Electricity Meter Specifications' :
                                                'Gas Meter Specifications'
            } />

            {/* Water specs */}
            {form.category === 'water' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Pipe Diameter (DN)" required hint="Nominal pipe size in millimetres">
                    <select className={INPUT} value={form.pipe_diameter_mm} onChange={set('pipe_diameter_mm')}>
                      {PIPE_DIAMETERS.map(d => (
                        <option key={d} value={d}>DN{d} — {d}mm</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Meter Class" required hint="Accuracy class: B (standard) · C (high) · D (precision)">
                    <select className={INPUT} value={form.meter_class} onChange={set('meter_class')}>
                      <option value="">Select class…</option>
                      <option value="B">Class B — Standard residential</option>
                      <option value="C">Class C — High accuracy</option>
                      <option value="D">Class D — Precision / bulk</option>
                    </select>
                  </Field>
                </div>
                <Field label="Connection Type" required>
                  <select className={INPUT} value={form.connection_type} onChange={set('connection_type')}>
                    <option value="">Select type…</option>
                    <option value="inline">Inline (mechanical)</option>
                    <option value="turbine">Turbine</option>
                    <option value="ultrasonic">Ultrasonic</option>
                    <option value="electromagnetic">Electromagnetic</option>
                  </select>
                </Field>
                <Field label="Max Flow Rate (L/hr)" optional>
                  <input className={INPUT} type="number" value={form.max_flow_rate_lph} onChange={set('max_flow_rate_lph')} placeholder="e.g. 1500" />
                </Field>
              </>
            )}

            {/* Electricity specs */}
            {form.category === 'electricity' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phase" required>
                    <select className={INPUT} value={form.phase} onChange={set('phase')}>
                      <option value="">Select phase…</option>
                      <option value="single">Single Phase (240V)</option>
                      <option value="three">Three Phase (415V)</option>
                    </select>
                  </Field>
                  <Field label="Voltage Rating" optional>
                    <select className={INPUT} value={form.voltage_rating} onChange={set('voltage_rating')}>
                      <option value="240V">240V</option>
                      <option value="415V">415V</option>
                      <option value="11kV">11kV</option>
                    </select>
                  </Field>
                </div>
                {(form.meter_subtype === 'bulk' || form.meter_subtype === 'common_area') && (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="CT Ratio" optional hint="Current transformer ratio for high-capacity meters (e.g. 100/5)">
                      <input className={INPUT} value={form.ct_ratio} onChange={set('ct_ratio')} placeholder="e.g. 100/5" />
                    </Field>
                    <Field label="Max Demand (kVA)" optional hint="Contracted maximum demand from utility">
                      <input className={INPUT} type="number" value={form.max_demand_kva} onChange={set('max_demand_kva')} placeholder="e.g. 100" />
                    </Field>
                  </div>
                )}
              </>
            )}

            {/* Gas specs */}
            {form.category === 'gas' && (
              <>
                <Field label="Gas Type" required>
                  <select className={INPUT} value={form.gas_type} onChange={set('gas_type')}>
                    <option value="">Select gas type…</option>
                    <option value="natural_gas">Natural Gas (piped)</option>
                    <option value="lpg">LPG (liquefied petroleum gas)</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Capacity (m³/hr)" required hint="Maximum flow rate the meter can handle">
                    <input className={INPUT} type="number" value={form.capacity_m3_per_hr} onChange={set('capacity_m3_per_hr')} placeholder="e.g. 6" />
                  </Field>
                  <Field label="Working Pressure (mbar)" required hint="Normal operating pressure of the gas line">
                    <input className={INPUT} type="number" value={form.working_pressure_mbar} onChange={set('working_pressure_mbar')} placeholder="e.g. 21" />
                  </Field>
                </div>
              </>
            )}

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canStep3}>Next: Assignment →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 3: Assignment & Location ── */}
        {step === 3 && (
          <div className="space-y-5">
            {isBulk ? (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
                <strong>Bulk meter</strong> — no unit assignment required. This meter measures the whole building's supply.
              </div>
            ) : (
              <>
                <SectionDivider title="Unit Assignment" />
                <div className="flex items-center gap-3 mb-1">
                  <input
                    type="checkbox"
                    id="in_inventory"
                    checked={form.in_inventory}
                    onChange={e => setB('in_inventory', e.target.checked)}
                    className="accent-primary-600"
                  />
                  <label htmlFor="in_inventory" className="text-sm text-text">
                    Add to inventory — assign to a unit later
                  </label>
                </div>
                {!form.in_inventory && (
                  <Field label="Assign to Unit" required>
                    <select className={INPUT} value={form.unit_id} onChange={set('unit_id')}>
                      <option value="">Select unit…</option>
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.unit_label}{u.block ? ` — ${u.block}` : ''}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            <SectionDivider title="Physical Location" />
            <Field label="Location Description" optional hint="Where the meter is physically installed">
              <input className={INPUT} value={form.location_description} onChange={set('location_description')} placeholder="e.g. Kitchen riser cupboard, Block A Ground Floor" />
            </Field>

            {!form.in_inventory && (
              <Field label="Installation Date" optional>
                <input className={INPUT} type="date" value={form.installed_at} onChange={set('installed_at')} />
              </Field>
            )}

            <Field label="Notes" optional>
              <textarea className={cn(INPUT, 'h-16 resize-none')} value={form.notes} onChange={set('notes')} placeholder="Any additional information…" />
            </Field>

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)} disabled={!canStep4}>Next: Billing →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 4: Opening Reading & Billing ── */}
        {step === 4 && (
          <div className="space-y-5">
            <SectionDivider title="Opening Reading" />
            <p className="text-xs text-text-muted">
              The opening reading sets the baseline. All future consumption is calculated from this value.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Opening Reading (${uomDefault})`} required>
                <input className={INPUT} type="number" min="0" value={form.opening_reading} onChange={set('opening_reading')} placeholder="0" />
              </Field>
              <Field label="Reading Date" required>
                <input className={INPUT} type="date" value={form.opening_reading_date} onChange={set('opening_reading_date')} />
              </Field>
            </div>
            <Field label="Unit of Measure">
              <select className={INPUT} value={form.unit_of_measure} onChange={set('unit_of_measure')}>
                <option value="m³">m³ (cubic metres — water)</option>
                <option value="kWh">kWh (kilowatt-hours — electricity)</option>
                <option value="m³ (gas)">m³ (gas)</option>
                <option value="L">Litres</option>
              </select>
            </Field>

            <SectionDivider title="Billing Configuration" />
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Rate per ${form.unit_of_measure || 'unit'} (KES)`} required>
                <input className={INPUT} type="number" step="0.01" value={form.rate_per_unit} onChange={set('rate_per_unit')} placeholder="e.g. 85" />
              </Field>
              <Field label="Billing Cycle">
                <select className={INPUT} value={form.billing_cycle} onChange={set('billing_cycle')}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </Field>
            </div>

            {form.billing_mode === 'postpaid' ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border">
                <div>
                  <p className="text-sm font-medium text-text">Auto-generate charges</p>
                  <p className="text-xs text-text-muted">Create a charge record each billing cycle based on readings</p>
                </div>
                <button
                  onClick={() => setB('auto_generate_charges', !form.auto_generate_charges)}
                  className={cn('w-10 h-5 rounded-full relative transition-colors flex-shrink-0',
                    form.auto_generate_charges ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'
                  )}
                >
                  <div className={cn('w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all',
                    form.auto_generate_charges ? 'right-0.5' : 'left-0.5'
                  )} />
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-semibold">Prepaid — top-up tracking mode</p>
                <p>Rate is recorded for consumption cost analysis. Charges are NOT auto-generated. Top-up transactions are logged manually or via integration under Financials → Payments.</p>
              </div>
            )}

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
              <Button onClick={() => setStep(5)} disabled={!canStep5}>Next: Calibration →</Button>
            </FooterNav>
          </div>
        )}

        {/* ── Step 5: Calibration (skippable) ── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover text-xs text-text-muted">
              Calibration certificates are required for water meters under KEBS regulations, and recommended for gas meters.
              This step is optional — you can add or update calibration details later from the meter record.
            </div>

            <SectionDivider title="Calibration Certificate" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Certificate Number" optional>
                <input className={INPUT} value={form.cert_number} onChange={set('cert_number')} placeholder="e.g. KEBS-WM-2025-0041" />
              </Field>
              <Field label="Calibrated By" optional>
                <input className={INPUT} value={form.calibrated_by} onChange={set('calibrated_by')} placeholder="e.g. KEBS Nairobi Laboratory" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Calibration Date" optional>
                <input className={INPUT} type="date" value={form.calibration_date} onChange={set('calibration_date')} />
              </Field>
              <Field label="Expiry Date" optional hint="An alert will trigger 30 days before expiry">
                <input className={INPUT} type="date" value={form.expiry_date} onChange={set('expiry_date')} />
              </Field>
            </div>

            <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-surface-border dark:border-dark-border text-xs text-text-muted cursor-pointer hover:border-primary-400 hover:text-primary-600 transition-colors">
              <span className="text-base">📎</span>
              <span className="flex-1">
                {certFile ? certFile.name : 'Upload certificate document (PDF or image) — optional'}
              </span>
              {certFile && (
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); setCertFile(null) }}
                  className="text-text-muted hover:text-danger ml-auto"
                >✕</button>
              )}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={e => setCertFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(4)}>← Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(6)}>Skip</Button>
                <Button onClick={() => setStep(6)}>Next: Confirm →</Button>
              </div>
            </FooterNav>
          </div>
        )}

        {/* ── Step 6: Confirm ── */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Category"        value={`${form.category === 'water' ? '💧' : form.category === 'electricity' ? '⚡' : '🔥'} ${form.category}`} />
              <ConfirmRow label="Meter Type"      value={subtypeLabel} />
              <ConfirmRow label="Billing Mode"    value={BILLING_MODE_LABEL[form.billing_mode]} />
              <ConfirmRow label="Serial Number"   value={form.serial_number} />
              {form.make && <ConfirmRow label="Make / Model" value={`${form.make} ${form.model}`.trim()} />}
              {form.communication_protocol && (
                <ConfirmRow label="Protocol" value={PROTOCOL_LABEL[form.communication_protocol as CommunicationProtocol]} />
              )}
              {form.communication_protocol === 'iot' && form.iot_device_id && (
                <ConfirmRow label="Device ID / IMEI" value={form.iot_device_id} />
              )}
              {form.meter_number && <ConfirmRow label="Meter Number" value={form.meter_number} />}
              {form.communication_protocol === 'tokenized' && form.token_number && (
                <ConfirmRow label="STS Token Number" value={form.token_number} />
              )}

              {/* Technical specs summary */}
              {form.category === 'water' && (
                <ConfirmRow label="Specs" value={`DN${form.pipe_diameter_mm} · Class ${form.meter_class} · ${form.connection_type}`} />
              )}
              {form.category === 'electricity' && (
                <ConfirmRow label="Specs" value={`${form.phase === 'single' ? 'Single' : 'Three'} phase · ${form.voltage_rating}${form.ct_ratio ? ` · CT ${form.ct_ratio}` : ''}`} />
              )}
              {form.category === 'gas' && (
                <ConfirmRow label="Specs" value={`${form.gas_type === 'natural_gas' ? 'Natural gas' : 'LPG'} · ${form.capacity_m3_per_hr} m³/hr · ${form.working_pressure_mbar} mbar`} />
              )}

              <ConfirmRow label="Status"          value={isBulk || !form.in_inventory ? 'Active (assigned)' : 'Inventory (unassigned)'} />
              {!isBulk && !form.in_inventory && <ConfirmRow label="Unit" value={form.unit_id} />}
              {form.location_description && <ConfirmRow label="Location" value={form.location_description} />}
              {form.installed_at && <ConfirmRow label="Install Date" value={form.installed_at} />}
              <ConfirmRow label="Opening Reading" value={`${form.opening_reading} ${form.unit_of_measure} on ${form.opening_reading_date}`} />
              <ConfirmRow label="Rate"            value={`KES ${form.rate_per_unit} / ${form.unit_of_measure}`} />
              <ConfirmRow label="Billing Cycle"   value={form.billing_cycle} />
              {form.cert_number && <ConfirmRow label="Calibration" value={`${form.cert_number} · expires ${form.expiry_date || 'not set'}`} />}
              {certFile && <ConfirmRow label="Cert Document" value={certFile.name} />}
            </div>

            {form.in_inventory && !isBulk && (
              <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover text-xs text-text-muted">
                This meter will be added to the <strong>Inventory</strong> tab. Assign it to a unit when it is ready to be installed.
              </div>
            )}

            {submitError && (
              <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{submitError}</p>
            )}
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(5)} disabled={submitting}>← Back</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Registering…' : '✓ Register Meter'}
              </Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}
