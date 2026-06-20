'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { MaskedField, OtpRevealModal } from '@/components/ui/MaskedField'
import type { MaskableFieldType } from '@/components/ui/MaskedField'
import {
  RegisterTenantModal,
  RegisterOwnerModal,
  RegisterCorporateOwnerModal,
} from '@/components/people/RegisterPersonModal'
import {
  TenantExitModal,
  OwnerExitModal,
} from '@/components/people/ExitModals'
import { getLeases } from '@/lib/api/leases'
import type { LeaseData } from '@/lib/api/leases'
import { getHouseholdMembers, createHouseholdMember, updateHouseholdMember, deleteHouseholdMember, type HouseholdMemberData } from '@/lib/api/household'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, updateVehicleSticker, type VehicleData } from '@/lib/api/vehicles'
import { PlateScanner } from '@/components/vehicles/PlateScanner'
import { getPersonalStaff, createPersonalStaff, updatePersonalStaff, deletePersonalStaff, type PersonalStaffData } from '@/lib/api/staff'
import { getEmergencyContacts, createEmergencyContact, updateEmergencyContact, deleteEmergencyContact, type EmergencyContactData } from '@/lib/api/emergencyContacts'
import {
  updatePerson as apiUpdatePerson,
  updatePersonStatus as apiUpdatePersonStatus,
  updatePersonType as apiUpdatePersonType,
  removeUnitFromPerson,
  apiPersonToPerson,
  type PersonData,
} from '@/lib/api/people'
import type {
  Person, PersonType, KycStatus, Unit,
  Vehicle, HouseholdMember, EmergencyContact, PersonalStaff,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import { getCrbStatus, requestCrbConsent, runCrbCheck, type CrbStatus } from '@/lib/api/crb'
import { getKycStatus, initiateKyc, scanKycDocument, type KycStatus as KycApiStatus } from '@/lib/api/kyc'

// ── KYC status badge ───────────────────────────────────────────────────────

const KYC_BADGE: Record<KycStatus, { label: string; cls: string }> = {
  not_started:   { label: 'KYC: Not Started',   cls: 'bg-surface-border text-text-muted' },
  pending_docs:  { label: 'KYC: Pending Docs',  cls: 'bg-warning/10 text-warning' },
  docs_uploaded: { label: 'KYC: Docs Uploaded', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
  approved:      { label: 'KYC: Approved',      cls: 'bg-success/10 text-success' },
  rejected:      { label: 'KYC: Rejected',      cls: 'bg-danger/10 text-danger' },
}

function KycBadge({ status }: { status: KycStatus }) {
  const { label, cls } = KYC_BADGE[status]
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold', cls)}>{label}</span>
}

// ── Person type display map ────────────────────────────────────────────────

const TYPE_BADGE: Record<PersonType, { label: string; variant: 'primary'|'default'|'warning'|'danger'|'success'|'blue'|'purple' }> = {
  resident_owner:     { label: 'Resident Owner',     variant: 'primary' },
  non_resident_owner: { label: 'Non-Resident Owner', variant: 'blue'    },
  tenant:             { label: 'Tenant',              variant: 'warning' },
  short_stay_guest:   { label: 'Short-Stay Guest',   variant: 'purple'  },
  permanent_staff:    { label: 'Permanent Staff',    variant: 'success' },
  casual_staff:       { label: 'Casual Staff',       variant: 'success' },
  outsourced:         { label: 'Outsourced',          variant: 'default' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function vehicleTypeIcon(t: Vehicle['vehicle_type']): string {
  const m: Record<Vehicle['vehicle_type'], string> = {
    car: '🚗', suv: '🚙', pickup: '🛻', motorcycle: '🏍️',
    van: '🚐', truck: '🚛', bicycle: '🚲', other: '🚘',
  }
  return m[t] ?? '🚘'
}

function staffRoleLabel(r: PersonalStaff['role']): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Shared panel helpers ───────────────────────────────────────────────────

function PanelSpinner() {
  return (
    <div className="py-10 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
}

function PanelEmpty({ text }: { text: string }) {
  return <div className="py-8 text-center text-sm text-text-muted">{text}</div>
}

const INPUT_CLS = [
  'w-full text-sm rounded-lg px-3 py-2.5',
  'bg-surface dark:bg-dark-card text-text placeholder:text-text-muted',
  'border border-surface-border dark:border-dark-border',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400',
  'transition-colors',
].join(' ')

const SELECT_CLS = INPUT_CLS
const LABEL_CLS  = 'block text-xs font-medium text-text-muted mb-1.5'

// ── Shared modal primitives ─────────────────────────────────────────────────

function ModalShell({ title, icon, accent, onClose, footer, children }: {
  title: string; icon: string; accent: string;
  onClose: () => void; footer: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      {/* Sheet / Dialog */}
      <div
        className="relative bg-surface dark:bg-dark-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Color accent strip */}
        <div className={`h-1 flex-shrink-0 ${accent}`} />

        {/* Drag handle — mobile only */}
        <div className="flex sm:hidden justify-center pt-2 pb-0 flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-surface-border dark:bg-dark-border" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0">
          <span className="text-xl leading-none">{icon}</span>
          <h3 className="flex-1 text-base font-semibold text-text">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors text-sm font-medium"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="h-px bg-surface-border dark:bg-dark-border flex-shrink-0" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        <div className="h-px bg-surface-border dark:bg-dark-border flex-shrink-0" />

        {/* Footer */}
        <div className="px-6 py-4 flex-shrink-0">
          {footer}
        </div>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, saving, onSave, saveLabel = 'Save Changes' }: {
  onClose: () => void; saving: boolean; onSave: () => void; saveLabel?: string
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        onClick={onClose}
        disabled={saving}
        className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium rounded-xl border border-surface-border dark:border-dark-border text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/70 pt-1">{title}</p>
      {children}
    </div>
  )
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL_CLS}>
        {label}{required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Household Members Panel ────────────────────────────────────────────────

type HMForm = { first_name: string; last_name: string; relationship: string; phone: string; national_id: string; email: string; is_minor: boolean; can_authorize_visitors: boolean; notes: string }

function HouseholdMemberModal({ personId, item, onClose, onSaved }: {
  personId: string; item: HouseholdMemberData | null; onClose: () => void; onSaved: (m: HouseholdMemberData) => void
}) {
  const [form, setForm] = useState<HMForm>({
    first_name: item?.first_name ?? '',
    last_name: item?.last_name ?? '',
    relationship: item?.relationship ?? 'spouse',
    phone: item?.phone ?? '',
    national_id: item?.national_id ?? '',
    email: item?.email ?? '',
    is_minor: item?.is_minor ?? false,
    can_authorize_visitors: item?.can_authorize_visitors ?? false,
    notes: item?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    if (!form.relationship) { setError('Relationship is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, first_name: form.first_name.trim(), last_name: form.last_name || null, phone: form.phone || null, national_id: form.national_id || null, email: form.email || null, notes: form.notes || null }
      const result = item
        ? await updateHouseholdMember(personId, item.id, payload)
        : await createHouseholdMember(personId, payload)
      onSaved(result); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const f = (k: keyof HMForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <ModalShell
      title={item ? 'Edit Household Member' : 'Add Household Member'}
      icon="👨‍👩‍👧"
      accent="bg-primary-500"
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} saving={saving} onSave={handleSave} saveLabel={item ? 'Save Changes' : 'Add Member'} />}
    >
      <div className="space-y-5">
        <FormSection title="Identity">
          <FormRow>
            <FormField label="First Name" required><input className={INPUT_CLS} value={form.first_name} onChange={f('first_name')} placeholder="Jane" /></FormField>
            <FormField label="Last Name"><input className={INPUT_CLS} value={form.last_name} onChange={f('last_name')} placeholder="Doe" /></FormField>
          </FormRow>
          <FormField label="Relationship" required>
            <select className={SELECT_CLS} value={form.relationship} onChange={f('relationship')}>
              {['spouse','child','parent','sibling','partner','relative','other'].map(r =>
                <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </FormField>
        </FormSection>

        <FormSection title="Contact">
          <FormRow>
            <FormField label="Phone"><input className={INPUT_CLS} value={form.phone} onChange={f('phone')} placeholder="+254 7XX XXX XXX" /></FormField>
            <FormField label="National ID"><input className={INPUT_CLS} value={form.national_id} onChange={f('national_id')} /></FormField>
          </FormRow>
          <FormField label="Email"><input type="email" className={INPUT_CLS} value={form.email} onChange={f('email')} placeholder="jane@example.com" /></FormField>
        </FormSection>

        <FormSection title="Permissions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border cursor-pointer hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
              <input type="checkbox" checked={form.is_minor} onChange={e => setForm(p => ({ ...p, is_minor: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm text-text">Minor (under 18)</span>
            </label>
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border cursor-pointer hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
              <input type="checkbox" checked={form.can_authorize_visitors} onChange={e => setForm(p => ({ ...p, can_authorize_visitors: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm text-text">Can Authorize Visitors</span>
            </label>
          </div>
        </FormSection>

        <FormField label="Notes">
          <textarea className={INPUT_CLS + ' resize-none'} rows={2} value={form.notes} onChange={f('notes')} placeholder="Optional notes…" />
        </FormField>

        {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</p>}
      </div>
    </ModalShell>
  )
}

function HouseholdMembersPanel({ personId }: { personId: string }) {
  const [members, setMembers] = useState<HouseholdMemberData[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<HouseholdMemberData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getHouseholdMembers(personId).then(setMembers).catch(() => {}).finally(() => setLoading(false))
  }, [personId])

  async function handleDelete(m: HouseholdMemberData) {
    if (!window.confirm(`Remove ${m.first_name} from household?`)) return
    setDeletingId(m.id)
    try { await deleteHouseholdMember(personId, m.id); setMembers(prev => prev.filter(x => x.id !== m.id)) }
    catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  function onSaved(m: HouseholdMemberData) {
    setMembers(prev => prev.some(x => x.id === m.id) ? prev.map(x => x.id === m.id ? m : x) : [m, ...prev])
  }

  if (loading) return <PanelSpinner />

  return (
    <div className="space-y-2 p-4">
      {(showForm || editing) && (
        <HouseholdMemberModal
          personId={personId}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={m => { onSaved(m); setShowForm(false); setEditing(null) }}
        />
      )}
      {members.length === 0 && <PanelEmpty text="No household members registered." />}
      {members.map(m => (
        <div key={m.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                {m.first_name[0]}{m.last_name ? m.last_name[0] : ''}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{m.first_name} {m.last_name ?? ''}</p>
                <p className="text-xs text-text-muted capitalize">{m.relationship}{m.is_minor ? ' · Minor' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {m.can_authorize_visitors && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium">Can Authorize</span>
              )}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', m.status === 'active' ? 'bg-success/10 text-success' : 'bg-surface-border text-text-muted')}>{m.status}</span>
              <CanDo action="write" resource={{ type: 'person' }} fallback={null}>
                <button onClick={() => setEditing(m)} className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline ml-1">Edit</button>
                <button onClick={() => handleDelete(m)} disabled={deletingId === m.id} className="text-[11px] text-danger hover:underline ml-1 disabled:opacity-50">
                  {deletingId === m.id ? '…' : 'Remove'}
                </button>
              </CanDo>
            </div>
          </div>
          {(m.phone || m.national_id) && (
            <div className="mt-1.5 grid grid-cols-2 text-xs text-text-muted gap-x-4">
              {m.phone && <span>{m.phone}</span>}
              {m.national_id && <span>ID: {m.national_id}</span>}
            </div>
          )}
        </div>
      ))}
      <CanDo action="write" resource={{ type: 'person' }}>
        <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => setShowForm(true)}>+ Add Family Member</Button>
      </CanDo>
    </div>
  )
}

// ── Vehicles Panel ─────────────────────────────────────────────────────────

type VForm = { make: string; model: string; year: string; color: string; plate_number: string; sticker_number: string; vehicle_type: string; status: string; registered_date: string; insurance_expiry: string; notes: string }

function VehicleModal({ personId, item, onClose, onSaved }: {
  personId: string; item: VehicleData | null; onClose: () => void; onSaved: (v: VehicleData) => void
}) {
  const [form, setForm] = useState<VForm>({
    make: item?.make ?? '', model: item?.model ?? '', year: item?.year?.toString() ?? '',
    color: item?.color ?? '', plate_number: item?.plate_number ?? '', sticker_number: item?.sticker_number ?? '',
    vehicle_type: item?.vehicle_type ?? 'car', status: item?.status ?? 'active',
    registered_date: item?.registered_date ?? '', insurance_expiry: item?.insurance_expiry ?? '',
    notes: item?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPlateScanner, setShowPlateScanner] = useState(false)

  async function handleSave() {
    if (!form.make.trim()) { setError('Make is required.'); return }
    if (!form.model.trim()) { setError('Model is required.'); return }
    if (!form.plate_number.trim()) { setError('Plate number is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        make: form.make.trim(), model: form.model.trim(),
        year: form.year ? parseInt(form.year) : null,
        color: form.color || null, plate_number: form.plate_number.trim(),
        sticker_number: form.sticker_number || null,
        vehicle_type: form.vehicle_type, status: form.status,
        registered_date: form.registered_date || null, insurance_expiry: form.insurance_expiry || null,
        notes: form.notes || null,
      }
      const result = item
        ? await updateVehicle(personId, item.id, payload)
        : await createVehicle(personId, payload)
      onSaved(result); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const f = (k: keyof VForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <>
      <ModalShell
        title={item ? 'Edit Vehicle' : 'Register Vehicle'}
        icon="🚗"
        accent="bg-amber-500"
        onClose={onClose}
        footer={<ModalFooter onClose={onClose} saving={saving} onSave={handleSave} saveLabel={item ? 'Save Changes' : 'Register Vehicle'} />}
      >
        <div className="space-y-5">
          <FormSection title="Vehicle Details">
            <FormRow>
              <FormField label="Make" required><input className={INPUT_CLS} value={form.make} onChange={f('make')} placeholder="Toyota" /></FormField>
              <FormField label="Model" required><input className={INPUT_CLS} value={form.model} onChange={f('model')} placeholder="Prado" /></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Year"><input type="number" className={INPUT_CLS} value={form.year} onChange={f('year')} placeholder="2022" min="1990" max="2030" /></FormField>
              <FormField label="Color"><input className={INPUT_CLS} value={form.color} onChange={f('color')} placeholder="Black" /></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Type">
                <select className={SELECT_CLS} value={form.vehicle_type} onChange={f('vehicle_type')}>
                  {['car','suv','pickup','motorcycle','van','truck','bicycle','other'].map(t =>
                    <option key={t} value={t}>{vehicleTypeIcon(t as never)} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
              </FormField>
              <FormField label="Status">
                <select className={SELECT_CLS} value={form.status} onChange={f('status')}>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="blacklisted">Blacklisted</option>
                  <option value="deregistered">Deregistered</option>
                </select>
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Registration">
            <FormRow>
              <FormField label="Plate Number" required>
                <div className="relative">
                  <input
                    className={INPUT_CLS + ' font-mono uppercase pr-10'}
                    value={form.plate_number}
                    onChange={f('plate_number')}
                    placeholder="KDG 123A"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPlateScanner(true)}
                    title="Scan plate with camera"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V6a1 1 0 011-1h3M3 15v3a1 1 0 001 1h3m11-4v3a1 1 0 01-1 1h-3m4-11h-3a1 1 0 00-1 1v3"/>
                      <rect x="8" y="8" width="8" height="8" rx="1"/>
                    </svg>
                  </button>
                </div>
              </FormField>
              <FormField label="Sticker No."><input className={INPUT_CLS} value={form.sticker_number} onChange={f('sticker_number')} placeholder="STK-001" /></FormField>
            </FormRow>
            <FormRow>
              <FormField label="Registered Date"><input type="date" className={INPUT_CLS} value={form.registered_date} onChange={f('registered_date')} /></FormField>
              <FormField label="Insurance Expiry"><input type="date" className={INPUT_CLS} value={form.insurance_expiry} onChange={f('insurance_expiry')} /></FormField>
            </FormRow>
          </FormSection>

          <FormField label="Notes">
            <textarea className={INPUT_CLS + ' resize-none'} rows={2} value={form.notes} onChange={f('notes')} placeholder="Optional notes…" />
          </FormField>

          {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</p>}
        </div>
      </ModalShell>

      {showPlateScanner && (
        <PlateScanner
          onResult={text => { setForm(p => ({ ...p, plate_number: text })); setShowPlateScanner(false) }}
          onClose={() => setShowPlateScanner(false)}
        />
      )}
    </>
  )
}

function VehiclesPanel({ personId }: { personId: string }) {
  const [vehicles, setVehicles]           = useState<VehicleData[]>([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState<VehicleData | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null)
  const [stickerValue, setStickerValue]   = useState('')
  const [savingSticker, setSavingSticker] = useState<Set<string>>(new Set())

  useEffect(() => {
    getVehicles(personId).then(setVehicles).catch(() => {}).finally(() => setLoading(false))
  }, [personId])

  async function handleDelete(v: VehicleData) {
    if (!window.confirm(`Remove vehicle ${v.plate_number}?`)) return
    setDeletingId(v.id)
    try { await deleteVehicle(personId, v.id); setVehicles(prev => prev.filter(x => x.id !== v.id)) }
    catch {}
    finally { setDeletingId(null) }
  }

  function onSaved(v: VehicleData) {
    setVehicles(prev => prev.some(x => x.id === v.id) ? prev.map(x => x.id === v.id ? v : x) : [v, ...prev])
  }

  async function saveSticker(v: VehicleData) {
    if (savingSticker.has(v.id)) return
    const trimmed = stickerValue.trim() || null
    if (trimmed === (v.sticker_number ?? null)) { setEditingStickerId(null); return }
    setSavingSticker(s => new Set(s).add(v.id))
    try {
      const updated = await updateVehicleSticker(v.id, trimmed)
      setVehicles(prev => prev.map(x => x.id === v.id ? updated : x))
    } catch {}
    finally {
      setSavingSticker(s => { const n = new Set(s); n.delete(v.id); return n })
      setEditingStickerId(null)
    }
  }

  if (loading) return <PanelSpinner />

  return (
    <div className="p-4 space-y-3">
      {(showForm || editing) && (
        <VehicleModal
          personId={personId}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={v => { onSaved(v); setShowForm(false); setEditing(null) }}
        />
      )}

      {vehicles.length === 0
        ? <PanelEmpty text="No vehicles registered for this household." />
        : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-surface-border dark:border-dark-border">
                <th className="pb-2 text-left text-xs font-medium text-text-muted">Vehicle</th>
                <th className="pb-2 text-left text-xs font-medium text-text-muted">Sticker</th>
                <th className="pb-2 text-right text-xs font-medium text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {vehicles.map(v => {
                const insExpiry     = v.insurance_expiry ? Math.ceil((new Date(v.insurance_expiry).getTime() - Date.now()) / 86400000) : null
                const isEditSticker = editingStickerId === v.id
                const isSaving      = savingSticker.has(v.id)

                return (
                  <tr key={v.id} className="group align-top">
                    {/* Vehicle col */}
                    <td className="py-2.5 pr-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg leading-tight flex-shrink-0">{vehicleTypeIcon(v.vehicle_type as never)}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-mono font-bold text-text text-sm leading-tight">{v.plate_number}</p>
                            {v.verified && <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold">✓</span>}
                          </div>
                          <p className="text-xs text-text-muted">{[v.color, v.make, v.model, v.year].filter(Boolean).join(' ')}</p>
                          {insExpiry !== null && insExpiry <= 30 && insExpiry > 0 && (
                            <p className="text-[11px] text-amber-600 font-medium">Ins. expires in {insExpiry}d</p>
                          )}
                          {insExpiry !== null && insExpiry <= 0 && (
                            <p className="text-[11px] text-danger font-medium">Insurance expired</p>
                          )}
                          {v.notes && <p className="text-[11px] text-text-muted italic mt-0.5 truncate max-w-[14rem]">{v.notes}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Sticker col */}
                    <td className="py-2.5 pr-3">
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
                            className="w-24 px-2 py-1 text-xs font-mono border border-primary-400 rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none"
                          />
                          {isSaving && <span className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingStickerId(v.id); setStickerValue(v.sticker_number ?? '') }}
                          title="Click to assign sticker"
                          className="text-xs font-mono hover:text-primary-600 transition-colors"
                        >
                          {v.sticker_number
                            ? <span className="text-blue-600 dark:text-blue-400 font-medium">{v.sticker_number}</span>
                            : <span className="text-gray-300 dark:text-gray-600 italic">+ sticker</span>}
                        </button>
                      )}
                    </td>

                    {/* Status + actions col */}
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                          v.status === 'active'      ? 'bg-success/10 text-success' :
                          v.status === 'suspended'   ? 'bg-warning/10 text-warning' :
                          v.status === 'blacklisted' ? 'bg-danger/10 text-danger' :
                          'bg-surface-border text-text-muted'
                        )}>{v.status}</span>
                        <CanDo action="write" resource={{ type: 'person' }} fallback={null}>
                          <button onClick={() => setEditing(v)} className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(v)} disabled={deletingId === v.id} className="text-[11px] text-danger hover:underline disabled:opacity-50">
                            {deletingId === v.id ? '…' : 'Remove'}
                          </button>
                        </CanDo>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

      <CanDo action="write" resource={{ type: 'person' }}>
        <Button size="sm" variant="outline" className="w-full" onClick={() => setShowForm(true)}>+ Register Vehicle</Button>
      </CanDo>
    </div>
  )
}

// ── Emergency Contacts Panel ───────────────────────────────────────────────

type ECForm = { name: string; relationship: string; phone_primary: string; phone_secondary: string; email: string; address: string; priority: string; notes: string }

function EmergencyContactModal({ personId, item, onClose, onSaved }: {
  personId: string; item: EmergencyContactData | null; onClose: () => void; onSaved: (c: EmergencyContactData) => void
}) {
  const [form, setForm] = useState<ECForm>({
    name: item?.name ?? '', relationship: item?.relationship ?? '',
    phone_primary: item?.phone_primary ?? '', phone_secondary: item?.phone_secondary ?? '',
    email: item?.email ?? '', address: item?.address ?? '',
    priority: item?.priority?.toString() ?? '1', notes: item?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.phone_primary.trim()) { setError('Primary phone is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        name: form.name.trim(), relationship: form.relationship || null,
        phone_primary: form.phone_primary.trim(), phone_secondary: form.phone_secondary || null,
        email: form.email || null, address: form.address || null,
        priority: parseInt(form.priority) || 1, notes: form.notes || null,
      }
      const result = item
        ? await updateEmergencyContact(personId, item.id, payload)
        : await createEmergencyContact(personId, payload)
      onSaved(result); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const f = (k: keyof ECForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <ModalShell
      title={item ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
      icon="🚨"
      accent="bg-danger"
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} saving={saving} onSave={handleSave} saveLabel={item ? 'Save Changes' : 'Add Contact'} />}
    >
      <div className="space-y-5">
        <FormSection title="Contact Info">
          <FormRow>
            <FormField label="Full Name" required><input className={INPUT_CLS} value={form.name} onChange={f('name')} placeholder="John Doe" /></FormField>
            <FormField label="Relationship"><input className={INPUT_CLS} value={form.relationship} onChange={f('relationship')} placeholder="Mother, Brother, Doctor…" /></FormField>
          </FormRow>
          <FormRow>
            <FormField label="Primary Phone" required><input className={INPUT_CLS} value={form.phone_primary} onChange={f('phone_primary')} placeholder="+254 7XX XXX XXX" /></FormField>
            <FormField label="Secondary Phone"><input className={INPUT_CLS} value={form.phone_secondary} onChange={f('phone_secondary')} placeholder="+254 7XX XXX XXX" /></FormField>
          </FormRow>
          <FormRow>
            <FormField label="Email"><input type="email" className={INPUT_CLS} value={form.email} onChange={f('email')} placeholder="john@example.com" /></FormField>
            <FormField label="Call Priority">
              <select className={SELECT_CLS} value={form.priority} onChange={f('priority')}>
                <option value="1">1st — First to call</option>
                <option value="2">2nd — Second to call</option>
                <option value="3">3rd — Last resort</option>
              </select>
            </FormField>
          </FormRow>
        </FormSection>

        <FormSection title="Additional">
          <FormField label="Address"><input className={INPUT_CLS} value={form.address} onChange={f('address')} placeholder="123 Main St, Nairobi" /></FormField>
          <FormField label="Notes"><textarea className={INPUT_CLS + ' resize-none'} rows={2} value={form.notes} onChange={f('notes')} placeholder="Any special instructions…" /></FormField>
        </FormSection>

        {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</p>}
      </div>
    </ModalShell>
  )
}

function EmergencyContactsPanel({ personId }: { personId: string }) {
  const [contacts, setContacts] = useState<EmergencyContactData[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<EmergencyContactData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getEmergencyContacts(personId).then(setContacts).catch(() => {}).finally(() => setLoading(false))
  }, [personId])

  async function handleDelete(c: EmergencyContactData) {
    if (!window.confirm(`Remove ${c.name} from emergency contacts?`)) return
    setDeletingId(c.id)
    try { await deleteEmergencyContact(personId, c.id); setContacts(prev => prev.filter(x => x.id !== c.id)) }
    catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  function onSaved(c: EmergencyContactData) {
    setContacts(prev => prev.some(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [c, ...prev])
  }

  if (loading) return <PanelSpinner />

  return (
    <div className="space-y-2 p-4">
      {(showForm || editing) && (
        <EmergencyContactModal
          personId={personId}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={c => { onSaved(c); setShowForm(false); setEditing(null) }}
        />
      )}
      {contacts.length === 0 && <PanelEmpty text="No emergency contacts on file." />}
      {contacts.map(c => (
        <div key={c.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-danger/10 text-danger text-[10px] font-bold flex items-center justify-center flex-shrink-0">{c.priority}</span>
                <p className="text-sm font-semibold text-text">{c.name}</p>
              </div>
              {c.relationship && <p className="text-xs text-text-muted ml-7">{c.relationship}</p>}
            </div>
            <CanDo action="write" resource={{ type: 'person' }} fallback={null}>
              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(c)} disabled={deletingId === c.id} className="text-[11px] text-danger hover:underline disabled:opacity-50">
                  {deletingId === c.id ? '…' : 'Remove'}
                </button>
              </div>
            </CanDo>
          </div>
          <div className="mt-2 ml-7 space-y-0.5 text-xs text-text-muted">
            <p>{c.phone_primary}{c.phone_secondary ? ` · ${c.phone_secondary}` : ''}</p>
            {c.email && <p>{c.email}</p>}
            {c.address && <p>{c.address}</p>}
            {c.notes && <p className="italic">{c.notes}</p>}
          </div>
        </div>
      ))}
      <CanDo action="write" resource={{ type: 'person' }}>
        <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => setShowForm(true)}>+ Add Emergency Contact</Button>
      </CanDo>
    </div>
  )
}

// ── Personal Staff Panel ───────────────────────────────────────────────────

type PSForm = { first_name: string; last_name: string; national_id: string; phone: string; role: string; status: string; access_days: string; access_hours_start: string; access_hours_end: string; background_check_done: boolean; background_check_date: string; registered_date: string; notes: string }

function PersonalStaffModal({ personId, item, onClose, onSaved }: {
  personId: string; item: PersonalStaffData | null; onClose: () => void; onSaved: (s: PersonalStaffData) => void
}) {
  const [form, setForm] = useState<PSForm>({
    first_name: item?.first_name ?? '', last_name: item?.last_name ?? '',
    national_id: item?.national_id ?? '', phone: item?.phone ?? '',
    role: item?.role ?? 'other', status: item?.status ?? 'active',
    access_days: item?.access_days ?? 'weekdays',
    access_hours_start: item?.access_hours_start ?? '', access_hours_end: item?.access_hours_end ?? '',
    background_check_done: item?.background_check_done ?? false,
    background_check_date: item?.background_check_date ?? '',
    registered_date: item?.registered_date ?? '', notes: item?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    if (!form.last_name.trim()) { setError('Last name is required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        national_id: form.national_id || null, phone: form.phone || null,
        role: form.role, status: form.status, access_days: form.access_days,
        access_hours_start: form.access_hours_start || null, access_hours_end: form.access_hours_end || null,
        background_check_done: form.background_check_done,
        background_check_date: form.background_check_date || null,
        registered_date: form.registered_date || null, notes: form.notes || null,
      }
      const result = item
        ? await updatePersonalStaff(personId, item.id, payload)
        : await createPersonalStaff(personId, payload)
      onSaved(result); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSaving(false) }
  }

  const f = (k: keyof PSForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <ModalShell
      title={item ? 'Edit Personal Staff' : 'Register Personal Staff'}
      icon="🪪"
      accent="bg-success"
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} saving={saving} onSave={handleSave} saveLabel={item ? 'Save Changes' : 'Register Staff'} />}
    >
      <div className="space-y-5">
        <FormSection title="Personal Details">
          <FormRow>
            <FormField label="First Name" required><input className={INPUT_CLS} value={form.first_name} onChange={f('first_name')} placeholder="Mary" /></FormField>
            <FormField label="Last Name" required><input className={INPUT_CLS} value={form.last_name} onChange={f('last_name')} placeholder="Wanjiku" /></FormField>
          </FormRow>
          <FormRow>
            <FormField label="National ID"><input className={INPUT_CLS} value={form.national_id} onChange={f('national_id')} /></FormField>
            <FormField label="Phone"><input className={INPUT_CLS} value={form.phone} onChange={f('phone')} placeholder="+254 7XX XXX XXX" /></FormField>
          </FormRow>
        </FormSection>

        <FormSection title="Employment">
          <FormRow>
            <FormField label="Role">
              <select className={SELECT_CLS} value={form.role} onChange={f('role')}>
                {['nanny','driver','housekeeper','gardener','cook','security_personal','other'].map(r =>
                  <option key={r} value={r}>{staffRoleLabel(r as never)}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select className={SELECT_CLS} value={form.status} onChange={f('status')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
              </select>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Registered Date"><input type="date" className={INPUT_CLS} value={form.registered_date} onChange={f('registered_date')} /></FormField>
          </FormRow>
        </FormSection>

        <FormSection title="Access Schedule">
          <FormField label="Access Days">
            <select className={SELECT_CLS} value={form.access_days} onChange={f('access_days')}>
              <option value="weekdays">Weekdays (Mon–Fri)</option>
              <option value="weekends">Weekends (Sat–Sun)</option>
              <option value="all">All Days</option>
              <option value="custom">Custom</option>
            </select>
          </FormField>
          <FormRow>
            <FormField label="Access From"><input type="time" className={INPUT_CLS} value={form.access_hours_start} onChange={f('access_hours_start')} /></FormField>
            <FormField label="Access To"><input type="time" className={INPUT_CLS} value={form.access_hours_end} onChange={f('access_hours_end')} /></FormField>
          </FormRow>
        </FormSection>

        <FormSection title="Background Check">
          <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border cursor-pointer hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
            <input type="checkbox" checked={form.background_check_done} onChange={e => setForm(p => ({ ...p, background_check_done: e.target.checked }))} className="w-4 h-4 rounded accent-primary-600" />
            <span className="text-sm text-text">Background Check Completed</span>
          </label>
          {form.background_check_done && (
            <FormField label="Check Date">
              <input type="date" className={INPUT_CLS} value={form.background_check_date} onChange={f('background_check_date')} />
            </FormField>
          )}
        </FormSection>

        <FormField label="Notes">
          <textarea className={INPUT_CLS + ' resize-none'} rows={2} value={form.notes} onChange={f('notes')} placeholder="Optional notes…" />
        </FormField>

        {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</p>}
      </div>
    </ModalShell>
  )
}

function PersonalStaffPanel({ personId }: { personId: string }) {
  const [staffList, setStaffList] = useState<PersonalStaffData[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<PersonalStaffData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getPersonalStaff(personId).then(setStaffList).catch(() => {}).finally(() => setLoading(false))
  }, [personId])

  async function handleDelete(s: PersonalStaffData) {
    if (!window.confirm(`Remove ${s.first_name} ${s.last_name} from personal staff?`)) return
    setDeletingId(s.id)
    try { await deletePersonalStaff(personId, s.id); setStaffList(prev => prev.filter(x => x.id !== s.id)) }
    catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  function onSaved(s: PersonalStaffData) {
    setStaffList(prev => prev.some(x => x.id === s.id) ? prev.map(x => x.id === s.id ? s : x) : [s, ...prev])
  }

  if (loading) return <PanelSpinner />

  return (
    <div className="space-y-2 p-4">
      {(showForm || editing) && (
        <PersonalStaffModal
          personId={personId}
          item={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={s => { onSaved(s); setShowForm(false); setEditing(null) }}
        />
      )}
      {staffList.length === 0 && <PanelEmpty text="No personal staff registered." />}
      {staffList.map(s => (
        <div key={s.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-text">{s.first_name} {s.last_name}</p>
              <p className="text-xs text-text-muted">{staffRoleLabel(s.role as never)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                s.status === 'active' ? 'bg-success/10 text-success' :
                s.status === 'suspended' ? 'bg-warning/10 text-warning' :
                'bg-danger/10 text-danger'
              )}>{s.status}</span>
              <CanDo action="write" resource={{ type: 'person' }} fallback={null}>
                <button onClick={() => setEditing(s)} className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(s)} disabled={deletingId === s.id} className="text-[11px] text-danger hover:underline disabled:opacity-50">
                  {deletingId === s.id ? '…' : 'Remove'}
                </button>
              </CanDo>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-text-muted">
            {s.national_id && <span>ID: {s.national_id}</span>}
            {s.phone && <span>{s.phone}</span>}
            <span>Access: {s.access_days.replace('_', ' ')}</span>
            {s.access_hours_start && <span>{s.access_hours_start} – {s.access_hours_end}</span>}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            {s.background_check_done
              ? <span className="text-success">✓ Background check done{s.background_check_date ? ` (${s.background_check_date})` : ''}</span>
              : <span className="text-warning font-medium">⚠ Background check pending</span>}
          </div>
          {s.notes && <p className="mt-1 text-xs text-text-muted italic">{s.notes}</p>}
        </div>
      ))}
      <CanDo action="write" resource={{ type: 'person' }}>
        <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => setShowForm(true)}>+ Register Personal Staff</Button>
      </CanDo>
    </div>
  )
}

// ── CRB Panel ──────────────────────────────────────────────────────────────

function CrbPanel({ personId }: { personId: string }) {
  const [status,   setStatus]   = useState<CrbStatus | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [working,  setWorking]  = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    getCrbStatus(personId)
      .then(s => { setStatus(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [personId])

  async function handleRequestConsent() {
    setWorking(true); setError('')
    try {
      await requestCrbConsent(personId)
      setError('')
      // Refresh status
      const s = await getCrbStatus(personId)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send consent request')
    } finally { setWorking(false) }
  }

  async function handleRunCheck() {
    setWorking(true); setError('')
    try {
      const s = await runCrbCheck(personId)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CRB check failed')
    } finally { setWorking(false) }
  }

  if (loading) return (
    <div className="py-10 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  const crbStatusLabel: Record<string, { label: string; cls: string }> = {
    clear:   { label: 'Clear',   cls: 'bg-success/10 text-success' },
    listed:  { label: 'Listed',  cls: 'bg-danger/10 text-danger'   },
    unknown: { label: 'Unknown', cls: 'bg-warning/10 text-warning'  },
  }

  return (
    <div className="p-5 space-y-4">
      {/* Status card */}
      <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden">
        <div className="bg-surface-muted dark:bg-dark-hover px-4 py-2.5 border-b border-surface-border dark:border-dark-border">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">CRB Status</p>
        </div>
        <div className="p-4 space-y-3">
          {/* Consent */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Consent Given</span>
            {status?.crb_consent_given
              ? <span className="text-success font-medium">✓ Yes — {status.crb_consent_at ? new Date(status.crb_consent_at).toLocaleDateString() : ''}</span>
              : <span className="text-text-muted font-medium">No</span>}
          </div>
          {/* Check date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Last Checked</span>
            <span className="text-text font-medium">
              {status?.crb_checked_at ? new Date(status.crb_checked_at).toLocaleDateString() : '—'}
            </span>
          </div>
          {/* Result */}
          {status?.crb_checked_at && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Result</span>
                {status.crb_status
                  ? <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', crbStatusLabel[status.crb_status]?.cls ?? 'bg-surface-border text-text-muted')}>
                      {crbStatusLabel[status.crb_status]?.label ?? status.crb_status}
                    </span>
                  : <span className="text-text-muted">—</span>}
              </div>
              {status.crb_score != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Credit Score</span>
                  <span className="text-text font-semibold">{status.crb_score}</span>
                </div>
              )}
              {status.crb_listing_reason && (
                <div className="text-sm">
                  <span className="text-text-muted block mb-0.5">Listing Reason</span>
                  <span className="text-danger text-xs">{status.crb_listing_reason}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Actions */}
      <CanDo action="write" resource={{ type: 'person', id: personId }}>
        {!status?.crb_consent_given ? (
          <button
            onClick={handleRequestConsent}
            disabled={working}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {working && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {working ? 'Sending…' : 'Request CRB Consent'}
          </button>
        ) : !status?.crb_checked_at ? (
          <button
            onClick={handleRunCheck}
            disabled={working}
            className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {working && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {working ? 'Running check…' : 'Run CRB Check'}
          </button>
        ) : (
          <button
            onClick={handleRunCheck}
            disabled={working}
            className="w-full py-2.5 rounded-lg border border-surface-border dark:border-dark-border text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {working && <span className="w-4 h-4 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />}
            {working ? 'Running…' : 'Re-run CRB Check'}
          </button>
        )}
      </CanDo>

      <p className="text-[11px] text-text-muted text-center leading-relaxed">
        Consent is obtained via email link. The tenant must agree before a check can be run.
        Results are powered by Prembly IdentityPass.
      </p>
    </div>
  )
}

// ── KYC Panel ──────────────────────────────────────────────────────────────

const KYC_STATUS_MAP: Record<string, { label: string; cls: string; icon: string }> = {
  not_started:  { label: 'Not Started',   cls: 'bg-surface-border text-text-muted',    icon: '○' },
  in_progress:  { label: 'In Progress',   cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', icon: '⟳' },
  pending_docs: { label: 'Pending Docs',  cls: 'bg-warning/10 text-warning',           icon: '⏳' },
  verified:     { label: 'Verified',      cls: 'bg-success/10 text-success',           icon: '✓' },
  failed:       { label: 'Failed',        cls: 'bg-danger/10 text-danger',             icon: '✕' },
  partial:      { label: 'Partial',       cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400', icon: '~' },
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

async function compressImageToBase64(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please choose an image under 10 MB.`)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
      resolve(dataUrl.split(',')[1]) // strip data: prefix
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image file. Please ensure it is a valid JPG, PNG, or WebP.'))
    }
    img.src = url
  })
}

function StepBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-text-muted text-xs">—</span>
  const cls = status === 'passed' ? 'text-success' : 'text-danger'
  return <span className={cn('text-xs font-semibold capitalize', cls)}>{status === 'passed' ? '✓ Passed' : '✕ Failed'}</span>
}

function KycPanel({ personId, personType }: { personId: string; personType: string }) {
  const [status,   setStatus]   = useState<KycApiStatus | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [working,  setWorking]  = useState(false)
  const [error,    setError]    = useState('')

  // Step 1 override fields
  const [idType,   setIdType]   = useState('')
  const [idNumber, setIdNumber] = useState('')

  // Step 2 file upload
  const [docFile,  setDocFile]  = useState<File | null>(null)

  const isPassportType = ['non_resident_owner', 'short_stay_guest'].includes(personType)
  const defaultIdType  = isPassportType ? 'passport' : 'national_id'

  useEffect(() => {
    getKycStatus(personId)
      .then(s => { setStatus(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [personId])

  async function handleStep1() {
    setWorking(true); setError('')
    try {
      const payload: { id_type?: string; id_number?: string } = {}
      if (idType)   payload.id_type   = idType
      if (idNumber) payload.id_number = idNumber
      const s = await initiateKyc(personId, payload)
      setStatus(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ID lookup failed')
    } finally { setWorking(false) }
  }

  async function handleStep2() {
    if (!docFile) { setError('Please select a document image first.'); return }
    setWorking(true); setError('')
    try {
      const base64 = await compressImageToBase64(docFile)
      const s = await scanKycDocument(personId, base64)
      setStatus(s)
      setDocFile(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Document scan failed')
    } finally { setWorking(false) }
  }

  if (loading) return (
    <div className="py-10 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary-600/30 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )

  const overall = status?.kyc_status ?? 'not_started'
  const badge   = KYC_STATUS_MAP[overall] ?? KYC_STATUS_MAP['not_started']

  const canStep1 = !['verified', 'in_progress', 'pending_docs'].includes(overall) || overall === 'failed'
  const canStep2 = overall === 'in_progress' || overall === 'pending_docs' ||
                   (overall === 'failed' && status?.kyc_step1_status === 'passed')

  return (
    <div className="p-5 space-y-4">

      {/* Overall status */}
      <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden">
        <div className="bg-surface-muted dark:bg-dark-hover px-4 py-2.5 border-b border-surface-border dark:border-dark-border flex items-center justify-between">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">KYC Status</p>
          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', badge.cls)}>
            {badge.icon} {badge.label}
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Step 1 — ID Lookup</span>
            <StepBadge status={status?.kyc_step1_status ?? null} />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Step 2 — Document Scan</span>
            <StepBadge status={status?.kyc_step2_status ?? null} />
          </div>
          {status?.kyc_verified_at && (
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Verified At</span>
              <span className="text-text font-medium">{new Date(status.kyc_verified_at).toLocaleDateString()}</span>
            </div>
          )}
          {status?.kyc_failure_reason && (
            <div className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
              {status.kyc_failure_reason}
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <CanDo action="kyc.verify" resource={{ type: 'person', id: personId }}>
        {/* Step 1 */}
        {canStep2 ? null : (
          <div className="space-y-3 rounded-xl border border-surface-border dark:border-dark-border p-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Step 1 — ID Number Lookup</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-text-muted block mb-1">ID Type</label>
                <select
                  value={idType || defaultIdType}
                  onChange={e => setIdType(e.target.value)}
                  className="w-full text-sm border border-surface-border dark:border-dark-border rounded-lg px-2 py-1.5 bg-surface dark:bg-dark-card text-text"
                >
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="kra_pin">KRA PIN</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">ID Number (optional override)</label>
                <input
                  type="text"
                  placeholder="Leave blank to use stored"
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value)}
                  className="w-full text-sm border border-surface-border dark:border-dark-border rounded-lg px-2 py-1.5 bg-surface dark:bg-dark-card text-text placeholder:text-text-muted"
                />
              </div>
            </div>

            <button
              onClick={handleStep1}
              disabled={working}
              className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {working && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {working ? 'Looking up…' : overall === 'failed' ? 'Retry Step 1 — ID Lookup' : 'Run Step 1 — ID Lookup'}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {canStep2 && (
          <div className="space-y-3 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/10 p-4">
            <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wide">Step 2 — Document Scan</p>
            <p className="text-xs text-text-muted">Step 1 passed. Upload a clear photo of the identity document to complete verification.</p>

            <label className="block">
              <span className="text-xs text-text-muted block mb-1">Identity Document Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => { setDocFile(e.target.files?.[0] ?? null); setError('') }}
                className="w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 dark:file:bg-primary-900/30 file:text-primary-700 dark:file:text-primary-400 file:text-xs file:font-medium hover:file:bg-primary-200 dark:hover:file:bg-primary-900/50 transition-colors"
              />
            </label>
            {docFile && (
              <p className="text-xs text-text-muted">Selected: {docFile.name} ({(docFile.size / 1024).toFixed(0)} KB — will be compressed)</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setStatus(s => s ? { ...s, kyc_status: 'not_started', kyc_step1_status: null } : s); setError('') }}
                disabled={working}
                className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
              >
                ← Redo Step 1
              </button>
              <button
                onClick={handleStep2}
                disabled={working || !docFile}
                className="flex-2 flex-grow py-2 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {working && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {working ? 'Scanning…' : 'Upload & Scan Document'}
              </button>
            </div>
          </div>
        )}

        {/* Verified state */}
        {overall === 'verified' && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center space-y-2">
            <div className="text-3xl">✓</div>
            <p className="text-sm font-semibold text-success">Identity Verified</p>
            <p className="text-xs text-text-muted">Both ID lookup and document scan passed successfully.</p>
            <button
              onClick={handleStep1}
              disabled={working}
              className="mt-2 text-xs text-text-muted underline hover:text-text transition-colors"
            >
              Re-verify
            </button>
          </div>
        )}
      </CanDo>

      <p className="text-[11px] text-text-muted text-center leading-relaxed">
        KYC verification is powered by Prembly IdentityPass. Results are stored for audit purposes.
      </p>
    </div>
  )
}

// ── EditPersonModal ────────────────────────────────────────────────────────

function EditPersonModal({ person, onClose, onSaved }: {
  person: Person; onClose: () => void; onSaved: (p: Person) => void
}) {
  const [form, setForm] = useState({
    first_name:  person.first_name,
    last_name:   person.last_name,
    email:       person.email ?? '',
    phone:       person.phone ?? '',
    national_id: person.national_id ?? '',
    notes:       '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }

  async function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.'); return
    }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        first_name:  form.first_name.trim(),
        last_name:   form.last_name.trim(),
        email:       form.email || null,
        national_id: form.national_id || null,
        notes:       form.notes || null,
        is_outsourced: person.is_outsourced ?? false,
        // Only include phone if not verified — verified phone is immutable
        ...(person.phone_verified_at ? {} : { phone: form.phone || null }),
      }
      const data = await apiUpdatePerson(person.id, payload)
      onSaved(apiPersonToPerson(data))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title="Edit Profile"
      icon="✏️"
      accent="bg-primary-500"
      onClose={onClose}
      footer={<ModalFooter onClose={onClose} saving={saving} onSave={handleSave} saveLabel="Save Changes" />}
    >
      <div className="space-y-5">
        <FormSection title="Name">
          <FormRow>
            <FormField label="First Name" required>
              <input value={form.first_name} onChange={field('first_name')} className={INPUT_CLS} placeholder="First name" />
            </FormField>
            <FormField label="Last Name" required>
              <input value={form.last_name} onChange={field('last_name')} className={INPUT_CLS} placeholder="Last name" />
            </FormField>
          </FormRow>
        </FormSection>

        <FormSection title="Contact">
          <FormField label="Email">
            <input type="email" value={form.email} onChange={field('email')} className={INPUT_CLS} placeholder="name@example.com" />
          </FormField>
          <FormField label={person.phone_verified_at ? 'Phone (Verified — locked)' : 'Phone'}>
            <input
              type="tel"
              value={form.phone}
              onChange={field('phone')}
              readOnly={!!person.phone_verified_at}
              className={INPUT_CLS + (person.phone_verified_at ? ' opacity-60 cursor-not-allowed bg-surface-muted dark:bg-dark-hover' : '')}
              placeholder="+254 700 000 000"
              title={person.phone_verified_at ? 'Phone number is verified and cannot be changed here' : undefined}
            />
          </FormField>
          <FormField label="National ID">
            <input value={form.national_id} onChange={field('national_id')} className={INPUT_CLS} />
          </FormField>
        </FormSection>

        <FormField label="Notes">
          <textarea value={form.notes} onChange={field('notes')} rows={2} className={INPUT_CLS + ' resize-none'} placeholder="Optional notes…" />
        </FormField>

        {error && <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">{error}</p>}
      </div>
    </ModalShell>
  )

}

// ── PersonDetail ─────────────────────────────────────────────────────────

function PersonDetail({ person, onExit, onUpdate, allUnits, allPeople }: {
  person: Person; onExit: () => void; onUpdate: (p: Person) => void; allUnits: Unit[]; allPeople: Person[]
}) {
  const initials   = `${person.first_name[0]}${person.last_name[0]}`
  const ownedUnits = allUnits.filter(u => (person.unit_ids ?? []).includes(u.id))
  const isResident = ['resident_owner','tenant'].includes(person.type)
  const isTenant   = person.type === 'tenant'
  const isOwner    = person.type === 'resident_owner' || person.type === 'non_resident_owner'
  const hasCrb     = isTenant || isOwner

  const [revealTarget, setRevealTarget]     = useState<{ field: MaskableFieldType; label: string } | null>(null)
  const [revealedFields, setRevealedFields] = useState<Set<MaskableFieldType>>(new Set())
  const [showEdit, setShowEdit]             = useState(false)
  const [statusWorking, setStatusWorking]   = useState(false)
  const [statusError, setStatusError]       = useState('')
  const [showChangeType, setShowChangeType] = useState(false)
  const [newType, setNewType]               = useState(person.type as string)
  const [typeWorking, setTypeWorking]       = useState(false)
  const [typeError, setTypeError]           = useState('')
  const [removingUnit, setRemovingUnit]     = useState<string | null>(null)
  const [activeLeases, setActiveLeases]     = useState<LeaseData[]>([])

  useEffect(() => {
    const unitIds = person.unit_ids ?? []
    if (!unitIds.length) { setActiveLeases([]); return }
    Promise.all(unitIds.map(uid => getLeases(uid).catch(() => [] as LeaseData[])))
      .then(results => {
        const all = results.flat()
        setActiveLeases(all.filter(l => l.tenant_id === person.id && l.status === 'active'))
      })
  }, [person.id, person.unit_ids])

  const ADMIN_PHONE = '+254700000000'

  function requestReveal(field: MaskableFieldType, label: string) {
    setRevealTarget({ field, label })
  }
  function onRevealVerified() {
    if (revealTarget) {
      const f = revealTarget.field
      setRevealedFields(prev => new Set([...prev, f]))
      setRevealTarget(null)
      setTimeout(() => {
        setRevealedFields(prev => { const n = new Set(prev); n.delete(f); return n })
      }, 30000)
    }
  }

  async function handleStatusChange(status: string) {
    setStatusWorking(true); setStatusError('')
    try {
      const data = await apiUpdatePersonStatus(person.id, status)
      onUpdate(apiPersonToPerson(data))
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to update status')
    } finally {
      setStatusWorking(false)
    }
  }

  async function handleChangeType() {
    if (newType === person.type) { setShowChangeType(false); return }
    setTypeWorking(true); setTypeError('')
    try {
      const data = await apiUpdatePersonType(person.id, newType)
      onUpdate(apiPersonToPerson(data))
      setShowChangeType(false)
    } catch (e) {
      setTypeError(e instanceof Error ? e.message : 'Failed to update type')
    } finally {
      setTypeWorking(false)
    }
  }

  async function handleRemoveUnit(unitId: string) {
    setRemovingUnit(unitId)
    try {
      const data = await removeUnitFromPerson(person.id, unitId)
      onUpdate(apiPersonToPerson(data))
    } catch {
      // silently ignore
    } finally {
      setRemovingUnit(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {showEdit && (
        <EditPersonModal
          person={person}
          onClose={() => setShowEdit(false)}
          onSaved={p => { onUpdate(p); setShowEdit(false) }}
        />
      )}

      {/* Header */}
      <div className="p-6 border-b border-surface-border dark:border-dark-border">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-300">
              {initials}
            </div>
            {person.kyc_status === 'approved' ? (
              <span title="KYC Verified" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center ring-2 ring-surface dark:ring-dark-card">
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <path d="M2 6l2.5 2.5L10 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            ) : person.status === 'pending_verification' || person.kyc_status === 'pending_docs' || person.kyc_status === 'docs_uploaded' ? (
              <span title="Pending Verification" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-warning flex items-center justify-center ring-2 ring-surface dark:ring-dark-card">
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.2"/>
                  <path d="M6 3.5V6l1.5 1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            ) : null}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-text">{person.first_name} {person.last_name}</h2>
            <p className="text-sm text-text-muted">{person.email || '—'}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <MaskedField
                value={person.phone}
                type="phone"
                revealed={revealedFields.has('phone')}
                onReveal={() => requestReveal('phone', 'Phone Number')}
              />
              {person.phone_verified_at
                ? <span className="text-[10px] text-success font-medium">Verified</span>
                : <span className="text-[10px] text-warning font-medium">Unverified</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={TYPE_BADGE[person.type].variant}>{TYPE_BADGE[person.type].label}</Badge>
              <Badge variant={person.status === 'active' ? 'primary' : person.status === 'suspended' ? 'danger' : 'default'}>{person.status.replace('_', ' ')}</Badge>
              <KycBadge status={person.kyc_status ?? 'not_started'} />
            </div>
          </div>
        </div>
      </div>

      {/* OTP Reveal modal */}
      <OtpRevealModal
        open={!!revealTarget}
        onClose={() => setRevealTarget(null)}
        fieldType={revealTarget?.field ?? 'phone'}
        subjectName={`${person.first_name} ${person.last_name}`}
        requesterPhone={ADMIN_PHONE}
        onVerified={onRevealVerified}
      />

      {/* Detail tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="px-4 border-b border-surface-border dark:border-dark-border">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isOwner && <TabsTrigger value="units">Units ({ownedUnits.length})</TabsTrigger>}
          {isResident && <TabsTrigger value="household">Household</TabsTrigger>}
          {isResident && <TabsTrigger value="vehicles">Vehicles</TabsTrigger>}
          {isResident && <TabsTrigger value="staff">Personal Staff</TabsTrigger>}
          {isResident && <TabsTrigger value="emergency">Emergency</TabsTrigger>}
          {hasCrb && <TabsTrigger value="crb">CRB</TabsTrigger>}
          <TabsTrigger value="kyc">KYC</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                <p className="text-xs text-text-muted">Member Since</p>
                <p className="text-sm font-semibold text-text">{person.joined_date}</p>
              </div>
              <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                <p className="text-xs text-text-muted">National ID</p>
                <MaskedField
                  value={person.national_id}
                  type="national_id"
                  revealed={revealedFields.has('national_id')}
                  onReveal={person.national_id ? () => requestReveal('national_id', 'National ID') : undefined}
                />
              </div>
            </div>

            {activeLeases.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Active Lease</p>
                {activeLeases.map(lease => (
                  <div key={lease.id} className="p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-medium text-text">{lease.unit_label}</p>
                      <Badge variant="primary">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-text-muted">
                      <span>Rent: KES {lease.monthly_rent?.toLocaleString() ?? '—'}</span>
                      <span>Deposit: KES {lease.deposit?.toLocaleString() ?? '—'}</span>
                      <span>Start: {lease.start_date}</span>
                      <span>End: {lease.end_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-surface-border dark:border-dark-border space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <CanDo action="write" resource={{ type: 'person', id: person.id }}>
                  <button onClick={() => setShowEdit(true)} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors w-full">
                    Edit Profile
                  </button>
                </CanDo>
                <CanDo action="access.grant" resource={{ type: 'access_credential' }}>
                  <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors w-full">
                    Manage Access
                  </button>
                </CanDo>
              </div>

              {/* Status management */}
              <CanDo action="write" resource={{ type: 'person', id: person.id }} fallback={null}>
                <div className="space-y-1.5">
                  {statusError && (
                    <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{statusError}</p>
                  )}
                  <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg">
                    <p className="text-xs text-text-muted mb-1.5">Account Status</p>
                    <div className="relative">
                      <select
                        value={person.status}
                        disabled={statusWorking}
                        onChange={e => handleStatusChange(e.target.value)}
                        className={[
                          'w-full text-sm font-semibold rounded-lg px-3 py-2 border appearance-none',
                          'bg-surface dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                          'transition-colors disabled:opacity-60 cursor-pointer',
                          person.status === 'active'               ? 'border-success/40 text-success'
                          : person.status === 'suspended'          ? 'border-danger/40 text-danger'
                          : person.status === 'pending_verification' ? 'border-warning/40 text-warning'
                          : 'border-surface-border dark:border-dark-border text-text-muted',
                        ].join(' ')}
                      >
                        <option value="pending_verification">Pending Verification</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                        <option value="former">Former</option>
                      </select>
                      {statusWorking && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin pointer-events-none" />
                      )}
                    </div>
                  </div>
                </div>
              </CanDo>

              {/* Change Person Type */}
              <CanDo action="write" resource={{ type: 'person', id: person.id }} fallback={null}>
                {!showChangeType ? (
                  <button
                    onClick={() => { setNewType(person.type as string); setTypeError(''); setShowChangeType(true) }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm font-medium text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
                  >
                    Change Person Type
                  </button>
                ) : (
                  <div className="bg-surface-muted dark:bg-dark-hover p-3 rounded-lg space-y-2.5">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Change Person Type</p>
                    {person.unit_ids.length > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        This person is linked to {person.unit_ids.length} unit{person.unit_ids.length !== 1 ? 's' : ''}. After changing their type, review those unit assignments to ensure they&apos;re still correct.
                      </p>
                    )}
                    {typeError && (
                      <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{typeError}</p>
                    )}
                    <select
                      value={newType}
                      disabled={typeWorking}
                      onChange={e => setNewType(e.target.value)}
                      className="w-full text-sm rounded-lg px-3 py-2 border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-60"
                    >
                      <option value="tenant">Tenant</option>
                      <option value="resident_owner">Resident Owner</option>
                      <option value="non_resident_owner">Non-Resident Owner</option>
                      <option value="short_stay_guest">Short-Stay Guest</option>
                      <option value="permanent_staff">Permanent Staff</option>
                      <option value="casual_staff">Casual Staff</option>
                      <option value="outsourced">Outsourced</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangeType}
                        disabled={typeWorking || newType === person.type}
                        className="flex-1 px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                      >
                        {typeWorking ? 'Saving…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setShowChangeType(false)}
                        disabled={typeWorking}
                        className="flex-1 px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </CanDo>

              <CanDo action="write" resource={{ type: 'person', id: person.id }} fallback={null}>
                {isTenant && (
                  <button onClick={onExit} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                    Move Out / Transfer Unit
                  </button>
                )}
                {isOwner && (
                  <button onClick={onExit} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                    Sell / Transfer Unit
                  </button>
                )}
              </CanDo>
            </div>
          </div>
        </TabsContent>

        {isOwner && (
          <TabsContent value="units">
            <div className="p-5 space-y-3">
              {ownedUnits.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-2">🏠</p>
                  <p className="text-sm font-medium text-text">No units assigned</p>
                  <p className="text-xs text-text-muted mt-1">Assign units to this owner from the Property page.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {ownedUnits.length} unit{ownedUnits.length !== 1 ? 's' : ''} owned
                  </p>
                  {ownedUnits.map(unit => {
                    const tenant = allPeople.find(
                      p => p.type === 'tenant' && (p.unit_ids ?? []).includes(unit.id)
                    )
                    const livesHere = person.type === 'resident_owner' && person.home_unit_id === unit.id
                    const isRentedOut = !!tenant
                    const statusLabel = livesHere
                      ? 'Lives here'
                      : isRentedOut ? 'Rented out'
                      : unit.status === 'vacant' ? 'Vacant' : unit.status
                    const statusCls = livesHere
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : isRentedOut
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-warning/10 text-warning'
                    return (
                      <div key={unit.id} className="rounded-lg border border-surface-border dark:border-dark-border p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-text">Block {unit.block} · Unit {unit.number}</p>
                            <p className="text-xs text-text-muted capitalize mt-0.5">
                              {unit.use_type} · {unit.bedrooms}bd {unit.bathrooms}ba
                              {unit.size_sqm > 0 && ` · ${unit.size_sqm}m²`}
                            </p>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCls}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {isRentedOut && tenant && (
                          <div className="flex items-center gap-2 pt-1 border-t border-surface-border dark:border-dark-border">
                            <div className="w-6 h-6 rounded-full bg-surface-border dark:bg-dark-border flex items-center justify-center text-[10px] font-bold text-text-muted flex-shrink-0">
                              {tenant.first_name[0]}{tenant.last_name[0]}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-text">{tenant.first_name} {tenant.last_name}</p>
                              <p className="text-[11px] text-text-muted">Tenant</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-surface-border dark:border-dark-border">
                          <span>{unit.monthly_rate > 0 ? `KES ${unit.monthly_rate.toLocaleString()}/mo` : 'Rate not set'}</span>
                          <CanDo action="write" resource={{ type: 'person', id: person.id }} fallback={null}>
                            <button
                              onClick={() => handleRemoveUnit(unit.id)}
                              disabled={removingUnit === unit.id}
                              className="text-danger hover:underline disabled:opacity-50"
                            >
                              {removingUnit === unit.id ? 'Removing…' : 'Remove'}
                            </button>
                          </CanDo>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </TabsContent>
        )}

        {isResident && <TabsContent value="household"><HouseholdMembersPanel personId={person.id} /></TabsContent>}
        {isResident && <TabsContent value="vehicles"><VehiclesPanel personId={person.id} /></TabsContent>}
        {isResident && <TabsContent value="staff"><PersonalStaffPanel personId={person.id} /></TabsContent>}
        {isResident && <TabsContent value="emergency"><EmergencyContactsPanel personId={person.id} /></TabsContent>}
        {hasCrb && <TabsContent value="crb" className="p-4"><CrbPanel personId={person.id} /></TabsContent>}
        <TabsContent value="kyc" className="p-4"><KycPanel personId={person.id} personType={person.type} /></TabsContent>
      </Tabs>
    </div>
  )
}

// ── PersonRow ──────────────────────────────────────────────────────────────

function PersonRow({ person, selected, onClick }: { person: Person; selected: boolean; onClick: () => void }) {
  const initials = `${person.first_name[0]}${person.last_name[0]}`

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-surface-border dark:border-dark-border last:border-b-0',
        selected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-surface-muted dark:hover:bg-dark-hover'
      )}
    >
      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{person.first_name} {person.last_name}</p>
        <p className="text-xs text-text-muted truncate">{person.email || person.phone || '—'}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge variant={TYPE_BADGE[person.type].variant} className="text-[10px]">{TYPE_BADGE[person.type].label}</Badge>
        <span className={cn('text-[10px]',
          person.status === 'active' ? 'text-success' :
          person.status === 'suspended' ? 'text-danger' :
          person.status === 'former' ? 'text-text-muted' : 'text-warning'
        )}>{person.status.replace('_', ' ')}</span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function PeoplePageClient({ initialPeople, allUnits = [] }: { initialPeople?: Person[]; allUnits?: Unit[] } = {}) {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Person | null>(null)
  const [showTenant,    setShowTenant]    = useState(false)
  const [showOwner,     setShowOwner]     = useState(false)
  const [showCorporate, setShowCorporate] = useState(false)
  const [showRegMenu,   setShowRegMenu]   = useState(false)
  const [showExit,      setShowExit]      = useState(false)

  const [people, setPeople] = useState<Person[]>(initialPeople ?? [])
  const addPerson    = (p: Person) => setPeople(prev => [p, ...prev])
  const updatePerson = (p: Person) => {
    setPeople(prev => prev.map(x => x.id === p.id ? p : x))
    setSelected(p)
  }

  const owners  = useMemo(() => people.filter(p => p.type === 'resident_owner' || p.type === 'non_resident_owner'), [people])
  const tenants = useMemo(() => people.filter(p => p.type === 'tenant' || p.type === 'short_stay_guest'), [people])

  const filterPeople = (list: Person[]) => {
    const q = search.toLowerCase()
    const result = q
      ? list.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
          (p.email ?? '').toLowerCase().includes(q) ||
          (p.phone ?? '').includes(q)
        )
      : list
    return [...result].sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    )
  }

  return (
    <>
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left panel */}
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border space-y-2">
          <SearchInput placeholder="Search people..." value={search} onChange={setSearch} />
          <div className="relative">
            <CanDo action="write" resource={{ type: 'person' }}>
              <button
                onClick={() => setShowRegMenu(m => !m)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                + Register Person
              </button>
            </CanDo>
            {showRegMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden">
                {[
                  { label: 'Tenant',           action: () => { setShowTenant(true);    setShowRegMenu(false) } },
                  { label: 'Individual Owner', action: () => { setShowOwner(true);     setShowRegMenu(false) } },
                  { label: 'Corporate Owner',  action: () => { setShowCorporate(true); setShowRegMenu(false) } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors border-b border-surface-border dark:border-dark-border last:border-b-0"
                  >
                    {item.label}
                  </button>
                ))}
                <a
                  href="/hr"
                  onClick={() => setShowRegMenu(false)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
                >
                  Staff — manage via <span className="text-primary-600 font-medium ml-1">HR &amp; Staff</span>
                </a>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="owners" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="px-4 flex-shrink-0">
            <TabsTrigger value="owners">Owners ({owners.length})</TabsTrigger>
            <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="owners" className="flex-1 overflow-y-auto">
            {filterPeople(owners).length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">No owners found.</p>
            ) : filterPeople(owners).map(p => (
              <PersonRow key={p.id} person={p} selected={selected?.id === p.id} onClick={() => setSelected(p)} />
            ))}
          </TabsContent>
          <TabsContent value="tenants" className="flex-1 overflow-y-auto">
            {filterPeople(tenants).length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">No tenants found.</p>
            ) : filterPeople(tenants).map(p => (
              <PersonRow key={p.id} person={p} selected={selected?.id === p.id} onClick={() => setSelected(p)} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right panel */}
      <div className={cn('flex-1 overflow-hidden flex-col', selected ? 'flex' : 'hidden lg:flex')}>
        {selected && (
          <div className="lg:hidden flex items-center px-4 pt-3 pb-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
              Back to list
            </button>
          </div>
        )}
        {selected ? (
          <PersonDetail person={selected} onExit={() => setShowExit(true)} onUpdate={updatePerson} allUnits={allUnits} allPeople={people} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <p className="text-4xl mb-3">👥</p>
              <p className="text-text font-medium mb-1">Select a person</p>
              <p className="text-sm text-text-muted">
                Choose an owner or tenant to view their profile.
              </p>
              <a href="/hr" className="mt-3 inline-block text-xs text-primary-600 hover:underline">
                Looking for staff? Visit HR &amp; Staff
              </a>
            </div>
          </div>
        )}
      </div>
    </div>

    <RegisterTenantModal         open={showTenant}    onClose={() => setShowTenant(false)}    onRegister={addPerson} />
    <RegisterOwnerModal          open={showOwner}     onClose={() => setShowOwner(false)}     onRegister={addPerson} />
    <RegisterCorporateOwnerModal open={showCorporate} onClose={() => setShowCorporate(false)} onRegister={addPerson} />

    {selected?.type === 'tenant' && (
      <TenantExitModal
        open={showExit}
        onClose={() => setShowExit(false)}
        personName={`${selected.first_name} ${selected.last_name}`}
        currentUnit={allUnits.find(u => (selected.unit_ids ?? []).includes(u.id))?.number ?? '—'}
      />
    )}
    {(selected?.type === 'resident_owner' || selected?.type === 'non_resident_owner') && (
      <OwnerExitModal
        open={showExit}
        onClose={() => setShowExit(false)}
        personName={`${selected.first_name} ${selected.last_name}`}
        ownedUnitLabels={allUnits.filter(u => (selected.unit_ids ?? []).includes(u.id)).map(u => `Block ${u.block}-${u.number}`)}
      />
    )}
    </>
  )
}
