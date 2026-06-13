'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { KycDocumentType } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Shared primitives ──────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-text-muted/60'
const LABEL = 'block text-xs font-medium text-text-muted mb-1.5'

function Field({
  label, required, optional, children,
}: {
  label: string; required?: boolean; optional?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {optional && <span className="text-text-muted/60 ml-1 font-normal">(optional)</span>}
      </label>
      {children}
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

// ── OTP phone verify ───────────────────────────────────────────────────────

function PhoneVerifyStep({
  phone, onVerified, onSkip,
}: { phone: string; onVerified: () => void; onSkip: () => void }) {
  const [sent, setSent]         = useState(false)
  const [code, setCode]         = useState('')
  const [error, setError]       = useState('')
  const [sending, setSending]   = useState(false)
  const [verifying, setVerifying] = useState(false)

  function sendOtp() {
    setSending(true)
    setTimeout(() => { setSent(true); setSending(false) }, 800)
  }

  function verify() {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return }
    setVerifying(true)
    setTimeout(() => {
      if (code === '000000') { setError('Invalid code — try again'); setVerifying(false); setCode(''); return }
      onVerified()
    }, 700)
  }

  return (
    <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📱</span>
        <div>
          <p className="text-sm font-semibold text-text">Verify Phone Number</p>
          <p className="text-xs text-text-muted">OTP will be sent to <strong>{phone}</strong></p>
        </div>
      </div>
      {!sent ? (
        <Button size="sm" variant="secondary" onClick={sendOtp} disabled={sending} className="w-full">
          {sending ? 'Sending…' : 'Send OTP'}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="6-digit code" autoFocus
              className={cn(INPUT, 'text-center tracking-[0.5em] font-mono text-lg flex-1')}
            />
            <Button size="sm" onClick={verify} disabled={verifying || code.length !== 6}>
              {verifying ? '…' : 'Verify'}
            </Button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button onClick={() => { setSent(false); setCode('') }} className="text-xs text-text-muted hover:text-text">
            Resend code
          </button>
        </div>
      )}
      <button onClick={onSkip} className="text-xs text-text-muted hover:text-text w-full text-center pt-1 border-t border-primary-200 dark:border-primary-800">
        Skip for now — verify later
      </button>
    </div>
  )
}

// ── Document upload row ────────────────────────────────────────────────────

interface DocSlot { type: KycDocumentType; label: string; required: boolean }

function DocUploadRow({ slot, onUpload }: { slot: DocSlot; onUpload: (type: KycDocumentType, file: File) => void }) {
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border dark:border-dark-border last:border-b-0">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
          fileName ? 'bg-success' : slot.required ? 'bg-danger' : 'bg-surface-border'
        )} />
        <div className="min-w-0">
          <p className="text-xs font-medium text-text truncate">{slot.label}</p>
          {fileName
            ? <p className="text-[11px] text-success truncate">{fileName}</p>
            : slot.required
              ? <p className="text-[11px] text-danger">Required</p>
              : <p className="text-[11px] text-text-muted">Optional</p>
          }
        </div>
      </div>
      <label className="cursor-pointer flex-shrink-0 ml-3">
        <span className={cn('text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors',
          fileName
            ? 'border-success/30 bg-success/5 text-success hover:bg-success/10'
            : 'border-surface-border text-text-muted hover:border-primary-300 hover:text-primary-600'
        )}>
          {fileName ? 'Replace' : 'Upload'}
        </span>
        <input type="file" accept="image/*,.pdf" className="sr-only"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) { setFileName(file.name); onUpload(slot.type, file) }
          }} />
      </label>
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
            'text-[11px] mx-1 hidden sm:block truncate flex-1',
            i === current ? 'text-text font-medium' : 'text-text-muted'
          )}>
            {s}
          </span>
          {i < steps.length - 1 && (
            <div className={cn('h-px flex-shrink-0 w-3 sm:w-4', i < current ? 'bg-success' : 'bg-surface-border dark:bg-dark-border')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Confirm row ────────────────────────────────────────────────────────────

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-surface-border dark:border-dark-border last:border-b-0 text-sm">
      <span className="w-28 text-text-muted flex-shrink-0 text-xs pt-0.5">{label}</span>
      <span className="text-text font-medium flex-1 text-xs">{value}</span>
    </div>
  )
}

// ── Vehicle entry ──────────────────────────────────────────────────────────

type VehicleEntry = { plate: string; make_model: string; color: string; vehicle_type: string }

const VEHICLE_TYPES = [
  { value: 'saloon',     label: 'Saloon / Sedan'     },
  { value: 'suv',        label: 'SUV / Crossover'    },
  { value: 'pickup',     label: 'Pickup / Van'        },
  { value: 'minibus',    label: 'Minibus / Matatu'    },
  { value: 'motorcycle', label: 'Motorcycle / Boda'   },
  { value: 'other',      label: 'Other'               },
]
const VEHICLE_TYPE_LABEL: Record<string, string> = {
  saloon: 'Saloon', suv: 'SUV', pickup: 'Pickup', minibus: 'Minibus', motorcycle: 'Motorcycle', other: 'Other',
}

function VehiclesStep({
  vehicles, onChange, onBack, onNext,
}: {
  vehicles: VehicleEntry[]
  onChange: (v: VehicleEntry[]) => void
  onBack: () => void
  onNext: () => void
}) {
  const EMPTY_V: VehicleEntry = { plate: '', make_model: '', color: '', vehicle_type: 'saloon' }
  const [draft, setDraft] = useState<VehicleEntry>(EMPTY_V)
  const setD = (k: keyof VehicleEntry) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft(d => ({ ...d, [k]: e.target.value }))
  const canAdd = draft.plate.trim() && draft.make_model.trim()

  function addVehicle() {
    if (!canAdd) return
    onChange([...vehicles, { ...draft, plate: draft.plate.toUpperCase().trim() }])
    setDraft(EMPTY_V)
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-text-muted">
        Register any vehicles this resident uses — they will be pre-cleared in the gate system.
        This step is optional; vehicles can be added later from the Vehicles module.
      </p>

      {vehicles.length > 0 && (
        <div className="space-y-1.5">
          {vehicles.map((v, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm">
              <span className="font-mono font-semibold text-text min-w-[90px]">{v.plate}</span>
              <span className="text-text flex-1">{v.make_model}</span>
              {v.color && <span className="text-xs text-text-muted">{v.color}</span>}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted dark:bg-dark-hover text-text-muted">
                {VEHICLE_TYPE_LABEL[v.vehicle_type] ?? v.vehicle_type}
              </span>
              <button
                onClick={() => onChange(vehicles.filter((_, idx) => idx !== i))}
                className="text-text-muted hover:text-danger text-xl leading-none ml-1"
              >×</button>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 rounded-xl border border-dashed border-surface-border dark:border-dark-border bg-surface-muted/30 dark:bg-dark-hover/30 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Add a vehicle</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Number Plate" required>
            <input className={INPUT} value={draft.plate} onChange={setD('plate')} placeholder="e.g. KCA 123A" />
          </Field>
          <Field label="Make & Model" required>
            <input className={INPUT} value={draft.make_model} onChange={setD('make_model')} placeholder="e.g. Toyota Fielder" />
          </Field>
          <Field label="Colour" optional>
            <input className={INPUT} value={draft.color} onChange={setD('color')} placeholder="e.g. Silver" />
          </Field>
          <Field label="Vehicle Type">
            <select className={INPUT} value={draft.vehicle_type} onChange={setD('vehicle_type')}>
              {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <Button variant="ghost" onClick={addVehicle} disabled={!canAdd}>+ Add Vehicle</Button>
      </div>

      <FooterNav>
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={onNext}>
          {vehicles.length > 0
            ? `Next: Confirm (${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''}) →`
            : 'Next: Confirm →'}
        </Button>
      </FooterNav>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Register Tenant
// ═══════════════════════════════════════════════════════════════════════════

export function RegisterTenantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep]           = useState(0)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [docs, setDocs]           = useState<Record<string, File>>({})
  const [vehicles, setVehicles]   = useState<VehicleEntry[]>([])
  const [form, setForm]           = useState({
    first_name: '', middle_name: '', last_name: '',
    national_id: '', phone: '', email: '',
    unit_id: '', move_in_date: '', monthly_rent: '',
    employer: '', guarantor_name: '', guarantor_phone: '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const tenantDocs: DocSlot[] = [
    { type: 'national_id',       label: 'National ID / Passport copy',  required: true  },
    { type: 'employment_letter', label: 'Employment letter or payslip', required: true  },
    { type: 'reference_letter',  label: 'Previous landlord reference',  required: false },
    { type: 'bank_statement',    label: 'Bank statement (3 months)',    required: false },
    { type: 'guarantor_form',    label: 'Guarantor form',               required: false },
  ]

  const canProceed0 = form.first_name && form.last_name && form.national_id && form.phone && form.email && form.unit_id

  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')

  function reset() {
    setStep(0); setPhoneVerified(false); setDocs({})
    setForm({ first_name:'', middle_name:'', last_name:'', national_id:'', phone:'', email:'', unit_id:'', move_in_date:'', monthly_rent:'', employer:'', guarantor_name:'', guarantor_phone:'' })
    setVehicles([])
  }

  function handleSubmit() {
    alert('Tenant registered (demo). Portal invite will be sent to ' + form.email)
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Register New Tenant" size="lg">
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <Steps steps={['Profile', 'Verify Phone', 'Documents', 'Vehicles', 'Confirm']} current={step} />

        {/* Step 0 — Profile */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionDivider title="Personal Details" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="First Name" required>
                <input className={INPUT} value={form.first_name} onChange={set('first_name')} placeholder="e.g. James" />
              </Field>
              <Field label="Middle Name" optional>
                <input className={INPUT} value={form.middle_name} onChange={set('middle_name')} placeholder="e.g. Kamau" />
              </Field>
              <Field label="Last Name" required>
                <input className={INPUT} value={form.last_name} onChange={set('last_name')} placeholder="e.g. Mwangi" />
              </Field>
            </div>
            <Field label="National ID / Passport No." required>
              <input className={INPUT} value={form.national_id} onChange={set('national_id')} placeholder="e.g. 12345678" />
            </Field>

            <SectionDivider title="Contact Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number" required>
                <input className={INPUT} value={form.phone} onChange={set('phone')} placeholder="+254 712 345 678" />
              </Field>
              <Field label="Email Address" required>
                <input className={INPUT} type="email" value={form.email} onChange={set('email')} placeholder="james@email.com" />
              </Field>
            </div>

            <SectionDivider title="Tenancy Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unit" required>
                <select className={INPUT} value={form.unit_id} onChange={set('unit_id')}>
                  <option value="">Select unit…</option>
                  <option value="u1">Block A — 101</option>
                  <option value="u2">Block A — 102</option>
                  <option value="u3">Block B — 201</option>
                </select>
              </Field>
              <Field label="Move-in Date" required>
                <input className={INPUT} type="date" value={form.move_in_date} onChange={set('move_in_date')} />
              </Field>
            </div>
            <Field label="Monthly Rent (KES)" optional>
              <input className={INPUT} type="number" value={form.monthly_rent} onChange={set('monthly_rent')} placeholder="e.g. 45 000" />
            </Field>

            <SectionDivider title="Employment & Guarantor" />
            <Field label="Employer / Company" optional>
              <input className={INPUT} value={form.employer} onChange={set('employer')} placeholder="e.g. Safaricom PLC" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Guarantor Name" optional>
                <input className={INPUT} value={form.guarantor_name} onChange={set('guarantor_name')} />
              </Field>
              <Field label="Guarantor Phone" optional>
                <input className={INPUT} value={form.guarantor_phone} onChange={set('guarantor_phone')} placeholder="+254…" />
              </Field>
            </div>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceed0}>Next: Verify Phone →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 1 — Phone OTP */}
        {step === 1 && (
          <div className="space-y-4">
            <PhoneVerifyStep
              phone={form.phone}
              onVerified={() => { setPhoneVerified(true); setStep(2) }}
              onSkip={() => setStep(2)}
            />
            {phoneVerified && (
              <div className="flex items-center gap-2 text-success text-sm">
                <span>✅</span> Phone verified
              </div>
            )}
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              {phoneVerified && <Button onClick={() => setStep(2)}>Next: Documents →</Button>}
            </FooterNav>
          </div>
        )}

        {/* Step 2 — Documents */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Upload is sufficient to advance KYC status. Documents are reviewed separately by management.</p>
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              {tenantDocs.map(slot => (
                <DocUploadRow key={slot.type} slot={slot} onUpload={(type, file) => setDocs(d => ({ ...d, [type]: file }))} />
              ))}
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)}>Next: Vehicles →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 3 — Vehicles */}
        {step === 3 && (
          <VehiclesStep
            vehicles={vehicles}
            onChange={setVehicles}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {/* Step 4 — Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Full Name"    value={fullName} />
              <ConfirmRow label="National ID"  value={form.national_id || '—'} />
              <ConfirmRow label="Phone"        value={form.phone + (phoneVerified ? ' ✅ Verified' : ' ⚠ Unverified')} />
              <ConfirmRow label="Email"        value={form.email} />
              <ConfirmRow label="Unit"         value={form.unit_id || '—'} />
              <ConfirmRow label="Move-in"      value={form.move_in_date || '—'} />
              <ConfirmRow label="Documents"    value={`${Object.keys(docs).length} uploaded`} />
              <ConfirmRow label="Vehicles"     value={vehicles.length ? `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''}` : 'None'} />
            </div>
            <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover text-xs text-text-muted">
              A portal invite will be sent to <strong>{form.email}</strong> once registration is saved.
              {!phoneVerified && <span className="text-warning block mt-1">⚠ Phone unverified — SMS notices will be held until verified.</span>}
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Register Tenant</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Register Individual Owner
// ═══════════════════════════════════════════════════════════════════════════

export function RegisterOwnerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep]           = useState(0)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [docs, setDocs]           = useState<Record<string, File>>({})
  const [vehicles, setVehicles]   = useState<VehicleEntry[]>([])
  const [form, setForm]           = useState({
    first_name: '', middle_name: '', last_name: '',
    national_id: '', phone: '', email: '',
    unit_id: '', share_percent: '100', is_resident: 'true',
  })
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const ownerDocs: DocSlot[] = [
    { type: 'national_id',    label: 'National ID / Passport copy',    required: true  },
    { type: 'title_deed',     label: 'Title deed',                     required: true  },
    { type: 'sale_agreement', label: 'Sale agreement (if new purchase)', required: false },
  ]

  const canProceed0 = form.first_name && form.last_name && form.national_id && form.phone && form.unit_id
  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')

  function reset() {
    setStep(0); setPhoneVerified(false); setDocs({})
    setForm({ first_name:'', middle_name:'', last_name:'', national_id:'', phone:'', email:'', unit_id:'', share_percent:'100', is_resident:'true' })
    setVehicles([])
  }

  function handleSubmit() {
    alert('Owner registered (demo). Portal invite will be sent to ' + (form.email || 'email not provided'))
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Register Individual Owner" size="lg">
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <Steps steps={['Profile', 'Verify Phone', 'Ownership Docs', 'Vehicles', 'Confirm']} current={step} />

        {step === 0 && (
          <div className="space-y-5">
            <SectionDivider title="Personal Details" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="First Name" required>
                <input className={INPUT} value={form.first_name} onChange={set('first_name')} placeholder="e.g. Grace" />
              </Field>
              <Field label="Middle Name" optional>
                <input className={INPUT} value={form.middle_name} onChange={set('middle_name')} />
              </Field>
              <Field label="Last Name" required>
                <input className={INPUT} value={form.last_name} onChange={set('last_name')} placeholder="e.g. Njeri" />
              </Field>
            </div>
            <Field label="National ID / Passport No." required>
              <input className={INPUT} value={form.national_id} onChange={set('national_id')} placeholder="e.g. 12345678" />
            </Field>

            <SectionDivider title="Contact Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number" required>
                <input className={INPUT} value={form.phone} onChange={set('phone')} placeholder="+254 712 345 678" />
              </Field>
              <Field label="Email Address" optional>
                <input className={INPUT} type="email" value={form.email} onChange={set('email')} placeholder="grace@email.com" />
              </Field>
            </div>

            <SectionDivider title="Ownership Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unit" required>
                <select className={INPUT} value={form.unit_id} onChange={set('unit_id')}>
                  <option value="">Select unit…</option>
                  <option value="u1">Block A — 101</option>
                  <option value="u2">Block A — 102</option>
                </select>
              </Field>
              <Field label="Ownership Share %">
                <input className={INPUT} type="number" min="1" max="100" value={form.share_percent} onChange={set('share_percent')} />
              </Field>
            </div>
            <Field label="Owner Type">
              <select className={INPUT} value={form.is_resident} onChange={set('is_resident')}>
                <option value="true">Resident Owner — lives in the unit</option>
                <option value="false">Non-Resident Owner — does not occupy the unit</option>
              </select>
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceed0}>Next: Verify Phone →</Button>
            </FooterNav>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <PhoneVerifyStep
              phone={form.phone}
              onVerified={() => { setPhoneVerified(true); setStep(2) }}
              onSkip={() => setStep(2)}
            />
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              {phoneVerified && <Button onClick={() => setStep(2)}>Next: Documents →</Button>}
            </FooterNav>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Title deed and ID are required. Sale agreement only needed for recent purchases.</p>
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              {ownerDocs.map(slot => (
                <DocUploadRow key={slot.type} slot={slot} onUpload={(type, file) => setDocs(d => ({ ...d, [type]: file }))} />
              ))}
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={() => setStep(3)}>Next: Vehicles →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 3 — Vehicles */}
        {step === 3 && (
          <VehiclesStep
            vehicles={vehicles}
            onChange={setVehicles}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {/* Step 4 — Confirm */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Full Name"   value={fullName} />
              <ConfirmRow label="National ID" value={form.national_id} />
              <ConfirmRow label="Phone"       value={form.phone + (phoneVerified ? ' ✅' : ' ⚠ Unverified')} />
              <ConfirmRow label="Email"       value={form.email || '—'} />
              <ConfirmRow label="Unit"        value={form.unit_id || '—'} />
              <ConfirmRow label="Share"       value={`${form.share_percent}%`} />
              <ConfirmRow label="Type"        value={form.is_resident === 'true' ? 'Resident Owner' : 'Non-Resident Owner'} />
              <ConfirmRow label="Documents"   value={`${Object.keys(docs).length} uploaded`} />
              <ConfirmRow label="Vehicles"    value={vehicles.length ? `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''}` : 'None'} />
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(3)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Register Owner</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Register Corporate Owner
// ═══════════════════════════════════════════════════════════════════════════

export function RegisterCorporateOwnerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep]           = useState(0)
  const [repPhoneVerified, setRepPhoneVerified] = useState(false)
  const [docs, setDocs]           = useState<Record<string, File>>({})
  const [vehicles, setVehicles]   = useState<VehicleEntry[]>([])
  const [company, setCompany]     = useState({
    company_name: '', registration_number: '', kra_pin: '', email: '', phone: '',
    unit_id: '', share_percent: '100',
  })
  const [rep, setRep]             = useState({
    first_name: '', middle_name: '', last_name: '', national_id: '', phone: '', email: '',
  })

  const setC = (k: keyof typeof company) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setCompany(c => ({ ...c, [k]: e.target.value }))
  const setR = (k: keyof typeof rep) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setRep(r => ({ ...r, [k]: e.target.value }))

  const companyDocs: DocSlot[] = [
    { type: 'cert_of_incorporation', label: 'Certificate of Incorporation', required: true  },
    { type: 'cr12',                  label: 'CR12 — List of Directors',     required: true  },
    { type: 'title_deed',            label: 'Title deed',                   required: true  },
    { type: 'national_id',           label: "Authorized representative's ID", required: true },
  ]

  const canProceed0 = company.company_name && company.kra_pin && company.unit_id
  const canProceed1 = rep.first_name && rep.last_name && rep.national_id && rep.phone
  const repFullName = [rep.first_name, rep.middle_name, rep.last_name].filter(Boolean).join(' ')

  function reset() {
    setStep(0); setRepPhoneVerified(false); setDocs({})
    setCompany({ company_name:'', registration_number:'', kra_pin:'', email:'', phone:'', unit_id:'', share_percent:'100' })
    setRep({ first_name:'', middle_name:'', last_name:'', national_id:'', phone:'', email:'' })
    setVehicles([])
  }

  function handleSubmit() {
    alert(`Corporate owner "${company.company_name}" registered (demo).`)
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Register Corporate Owner" size="lg">
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <Steps steps={['Company', 'Rep & Contact', 'Verify Phone', 'Documents', 'Vehicles', 'Confirm']} current={step} />

        {/* Step 0 — Company details */}
        {step === 0 && (
          <div className="space-y-5">
            <SectionDivider title="Company Identity" />
            <Field label="Company / Entity Name" required>
              <input className={INPUT} value={company.company_name} onChange={setC('company_name')} placeholder="e.g. Sunrise Properties Ltd" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Registration No." optional>
                <input className={INPUT} value={company.registration_number} onChange={setC('registration_number')} placeholder="CPR/2019/…" />
              </Field>
              <Field label="KRA PIN" required>
                <input className={INPUT} value={company.kra_pin} onChange={setC('kra_pin')} placeholder="P051234567X" />
              </Field>
            </div>

            <SectionDivider title="Company Contact" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Company Email" optional>
                <input className={INPUT} type="email" value={company.email} onChange={setC('email')} placeholder="info@company.co.ke" />
              </Field>
              <Field label="Company Phone" optional>
                <input className={INPUT} value={company.phone} onChange={setC('phone')} placeholder="+254 20 123 4567" />
              </Field>
            </div>

            <SectionDivider title="Ownership" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unit" required>
                <select className={INPUT} value={company.unit_id} onChange={setC('unit_id')}>
                  <option value="">Select unit…</option>
                  <option value="u1">Block A — 101</option>
                  <option value="u2">Block A — 102</option>
                </select>
              </Field>
              <Field label="Ownership Share %">
                <input className={INPUT} type="number" min="1" max="100" value={company.share_percent} onChange={setC('share_percent')} />
              </Field>
            </div>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceed0}>Next: Authorized Rep →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 1 — Authorized representative */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover text-xs text-text-muted">
              The authorized representative manages this account on behalf of the company. Their personal KYC applies.
            </div>
            <SectionDivider title="Representative Details" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="First Name" required>
                <input className={INPUT} value={rep.first_name} onChange={setR('first_name')} />
              </Field>
              <Field label="Middle Name" optional>
                <input className={INPUT} value={rep.middle_name} onChange={setR('middle_name')} />
              </Field>
              <Field label="Last Name" required>
                <input className={INPUT} value={rep.last_name} onChange={setR('last_name')} />
              </Field>
            </div>
            <Field label="National ID / Passport" required>
              <input className={INPUT} value={rep.national_id} onChange={setR('national_id')} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number" required>
                <input className={INPUT} value={rep.phone} onChange={setR('phone')} placeholder="+254 712 345 678" />
              </Field>
              <Field label="Email Address" optional>
                <input className={INPUT} type="email" value={rep.email} onChange={setR('email')} />
              </Field>
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)} disabled={!canProceed1}>Next: Verify Phone →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 2 — Phone OTP for rep */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">Verifying the authorized representative's phone number.</p>
            <PhoneVerifyStep
              phone={rep.phone}
              onVerified={() => { setRepPhoneVerified(true); setStep(3) }}
              onSkip={() => setStep(3)}
            />
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              {repPhoneVerified && <Button onClick={() => setStep(3)}>Next: Documents →</Button>}
            </FooterNav>
          </div>
        )}

        {/* Step 3 — Documents */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-text-muted">All four documents are required for KYC approval of corporate ownership.</p>
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              {companyDocs.map(slot => (
                <DocUploadRow key={slot.type} slot={slot} onUpload={(type, file) => setDocs(d => ({ ...d, [type]: file }))} />
              ))}
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)}>Next: Vehicles →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 4 — Vehicles */}
        {step === 4 && (
          <VehiclesStep
            vehicles={vehicles}
            onChange={setVehicles}
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
          />
        )}

        {/* Step 5 — Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Company"     value={company.company_name} />
              <ConfirmRow label="KRA PIN"     value={company.kra_pin} />
              <ConfirmRow label="Reg. No."    value={company.registration_number || '—'} />
              <ConfirmRow label="Unit"        value={company.unit_id || '—'} />
              <ConfirmRow label="Share"       value={`${company.share_percent}%`} />
              <ConfirmRow label="Rep"         value={repFullName} />
              <ConfirmRow label="Rep Phone"   value={rep.phone + (repPhoneVerified ? ' ✅' : ' ⚠ Unverified')} />
              <ConfirmRow label="Documents"   value={`${Object.keys(docs).length} uploaded`} />
              <ConfirmRow label="Vehicles"    value={vehicles.length ? `${vehicles.length} vehicle${vehicles.length > 1 ? 's' : ''}` : 'None'} />
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(4)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Register Corporate Owner</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. Register Staff
// ═══════════════════════════════════════════════════════════════════════════

const DEPT_LABELS: Record<string, string> = {
  'DEP-01': 'Security', 'DEP-02': 'Maintenance', 'DEP-03': 'Cleaning', 'DEP-04': 'Admin & Reception',
}

export function RegisterStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep]               = useState(0)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [docs, setDocs]               = useState<Record<string, File>>({})
  const [form, setForm]               = useState({
    first_name: '', middle_name: '', last_name: '',
    national_id: '', phone: '', email: '',
    is_outsourced: 'false',
    agency_name: '', agency_contact: '', agency_clearance_ref: '',
    access_days: 'weekdays', access_hours_start: '07:00', access_hours_end: '18:00',
    department_id: '', job_title: '', reporting_to: '',
    contract_type: 'permanent', start_date: '', end_date: '', probation_end_date: '',
  })
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const isOutsourced  = form.is_outsourced === 'true'
  const stepLabels    = isOutsourced
    ? ['Profile', 'Agency & Access', 'Documents', 'Confirm']
    : ['Profile', 'Verify Phone', 'Access & Docs', 'Employment', 'Confirm']

  const staffDocs: DocSlot[] = isOutsourced
    ? [{ type: 'agency_clearance', label: 'Agency clearance document', required: true }]
    : [
        { type: 'national_id',         label: 'National ID / Passport copy',   required: true  },
        { type: 'police_clearance',    label: 'Police clearance certificate',  required: true  },
        { type: 'employment_contract', label: 'Employment contract',           required: true  },
        { type: 'reference_letter',    label: 'Reference letter',              required: false },
      ]

  const canProceed0 = form.first_name && form.last_name && form.national_id && form.phone && form.job_title
  const fullName    = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')

  function reset() {
    setStep(0); setPhoneVerified(false); setDocs({})
    setForm({
      first_name:'', middle_name:'', last_name:'', national_id:'', phone:'', email:'',
      is_outsourced:'false', agency_name:'', agency_contact:'', agency_clearance_ref:'',
      access_days:'weekdays', access_hours_start:'07:00', access_hours_end:'18:00',
      department_id:'', job_title:'', reporting_to:'', contract_type:'permanent',
      start_date:'', end_date:'', probation_end_date:'',
    })
  }

  function handleSubmit() {
    alert(
      isOutsourced
        ? `${fullName} registered as outsourced staff (demo). Gate access only — no portal.`
        : `${fullName} registered as direct staff (demo). Portal invite will be sent.`
    )
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Register Staff Member" size="lg">
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        <Steps steps={stepLabels} current={step} />

        {/* Step 0 — Profile */}
        {step === 0 && (
          <div className="space-y-5">
            <Field label="Staff Type">
              <select className={INPUT} value={form.is_outsourced} onChange={set('is_outsourced')}>
                <option value="false">Direct employee — permanent or casual (has portal access)</option>
                <option value="true">Outsourced — agency-managed (gate access only, no portal)</option>
              </select>
            </Field>

            <SectionDivider title="Personal Details" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="First Name" required>
                <input className={INPUT} value={form.first_name} onChange={set('first_name')} placeholder="e.g. John" />
              </Field>
              <Field label="Middle Name" optional>
                <input className={INPUT} value={form.middle_name} onChange={set('middle_name')} />
              </Field>
              <Field label="Last Name" required>
                <input className={INPUT} value={form.last_name} onChange={set('last_name')} placeholder="e.g. Omondi" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="National ID / Passport" required>
                <input className={INPUT} value={form.national_id} onChange={set('national_id')} />
              </Field>
              <Field label="Job Title / Role" required>
                <input className={INPUT} value={form.job_title} onChange={set('job_title')} placeholder="e.g. Security Guard" />
              </Field>
            </div>

            <SectionDivider title="Contact Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number" required>
                <input className={INPUT} value={form.phone} onChange={set('phone')} placeholder="+254 712 345 678" />
              </Field>
              {!isOutsourced && (
                <Field label="Email Address" optional>
                  <input className={INPUT} type="email" value={form.email} onChange={set('email')} placeholder="john@email.com" />
                </Field>
              )}
            </div>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceed0}>Next →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 1a — Phone verify (direct staff) */}
        {step === 1 && !isOutsourced && (
          <div className="space-y-4">
            <PhoneVerifyStep
              phone={form.phone}
              onVerified={() => { setPhoneVerified(true); setStep(2) }}
              onSkip={() => setStep(2)}
            />
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              {phoneVerified && <Button onClick={() => setStep(2)}>Next: Access & Docs →</Button>}
            </FooterNav>
          </div>
        )}

        {/* Step 1b — Agency details (outsourced) */}
        {step === 1 && isOutsourced && (
          <div className="space-y-5">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              Outsourced staff will not receive a portal account. Gate access credentials only.
            </div>
            <SectionDivider title="Agency Information" />
            <Field label="Agency Name" required>
              <input className={INPUT} value={form.agency_name} onChange={set('agency_name')} placeholder="e.g. Eagle Eye Security Ltd" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agency Contact" optional>
                <input className={INPUT} value={form.agency_contact} onChange={set('agency_contact')} placeholder="Phone or email" />
              </Field>
              <Field label="Clearance Reference" optional>
                <input className={INPUT} value={form.agency_clearance_ref} onChange={set('agency_clearance_ref')} placeholder="Reference from agency" />
              </Field>
            </div>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={() => setStep(2)}>Next: Access & Docs →</Button>
            </FooterNav>
          </div>
        )}

        {/* Step 2 — Gate access hours + documents */}
        {step === 2 && (
          <div className="space-y-5">
            <SectionDivider title="Gate Access Hours" />
            <div className="grid grid-cols-3 gap-4">
              <Field label="Access Days">
                <select className={INPUT} value={form.access_days} onChange={set('access_days')}>
                  <option value="all">Every day</option>
                  <option value="weekdays">Weekdays only</option>
                  <option value="weekends">Weekends only</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Start Time">
                <input className={INPUT} type="time" value={form.access_hours_start} onChange={set('access_hours_start')} />
              </Field>
              <Field label="End Time">
                <input className={INPUT} type="time" value={form.access_hours_end} onChange={set('access_hours_end')} />
              </Field>
            </div>

            <SectionDivider title="Documents" />
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              {staffDocs.map(slot => (
                <DocUploadRow key={slot.type} slot={slot} onUpload={(type, file) => setDocs(d => ({ ...d, [type]: file }))} />
              ))}
            </div>

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              {isOutsourced
                ? <Button onClick={() => setStep(3)}>Next: Confirm →</Button>
                : <Button onClick={() => setStep(3)}>Next: Employment →</Button>}
            </FooterNav>
          </div>
        )}

        {/* Step 3 — Employment Details (direct staff only) */}
        {step === 3 && !isOutsourced && (
          <div className="space-y-5">
            <p className="text-xs text-text-muted">
              This creates the employment record in HR. The identity record was set in Step 1.
            </p>
            <SectionDivider title="Role & Department" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department" required>
                <select className={INPUT} value={form.department_id} onChange={set('department_id')}>
                  <option value="">Select department…</option>
                  <option value="DEP-01">Security</option>
                  <option value="DEP-02">Maintenance</option>
                  <option value="DEP-03">Cleaning</option>
                  <option value="DEP-04">Admin &amp; Reception</option>
                </select>
              </Field>
              <Field label="Contract Type">
                <select className={INPUT} value={form.contract_type} onChange={set('contract_type')}>
                  <option value="permanent">Permanent</option>
                  <option value="casual">Casual</option>
                </select>
              </Field>
            </div>
            <Field label="Reporting To" optional>
              <input className={INPUT} value={form.reporting_to} onChange={set('reporting_to')} placeholder="e.g. Facility Manager" />
            </Field>

            <SectionDivider title="Contract Dates" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" required>
                <input className={INPUT} type="date" value={form.start_date} onChange={set('start_date')} />
              </Field>
              {form.contract_type === 'casual' ? (
                <Field label="End Date" optional>
                  <input className={INPUT} type="date" value={form.end_date} onChange={set('end_date')} />
                </Field>
              ) : (
                <Field label="Probation Ends" optional>
                  <input className={INPUT} type="date" value={form.probation_end_date} onChange={set('probation_end_date')} />
                </Field>
              )}
            </div>

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button onClick={() => setStep(4)} disabled={!form.department_id || !form.start_date}>
                Next: Confirm →
              </Button>
            </FooterNav>
          </div>
        )}

        {/* Confirm — step 3 (outsourced) or step 4 (direct) */}
        {((step === 3 && isOutsourced) || (step === 4 && !isOutsourced)) && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Full Name"   value={fullName} />
              <ConfirmRow label="Job Title"   value={form.job_title} />
              <ConfirmRow label="National ID" value={form.national_id} />
              <ConfirmRow label="Phone"       value={form.phone + (!isOutsourced ? (phoneVerified ? ' ✅ Verified' : ' ⚠ Unverified') : '')} />
              {!isOutsourced && <>
                <ConfirmRow label="Department"  value={(DEPT_LABELS[form.department_id] ?? form.department_id) || '—'} />
                <ConfirmRow label="Contract"    value={form.contract_type} />
                <ConfirmRow label="Start Date"  value={form.start_date || '—'} />
              </>}
              {isOutsourced && <>
                <ConfirmRow label="Agency"     value={form.agency_name || '—'} />
                <ConfirmRow label="Clearance"  value={form.agency_clearance_ref || '—'} />
              </>}
              <ConfirmRow label="Access"      value={`${form.access_days} · ${form.access_hours_start} – ${form.access_hours_end}`} />
              <ConfirmRow label="Documents"   value={`${Object.keys(docs).length} uploaded`} />
            </div>
            {isOutsourced && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400">
                No portal invite will be sent. Gate access credentials only.
              </div>
            )}
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(isOutsourced ? 2 : 3)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Register Staff Member</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}
