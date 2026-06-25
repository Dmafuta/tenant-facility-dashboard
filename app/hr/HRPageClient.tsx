'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { RegisterStaffModal } from '@/components/people/RegisterPersonModal'

import type { FacilityStaffMember, Person } from '@/lib/types'
import { cn } from '@/lib/cn'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { grantPortalAccess, offboardPerson, updatePerson, apiPersonToPerson } from '@/lib/api/people'
import { listRoles, type AppRole } from '@/lib/api/settings'
import {
  createDepartment, updateDepartment, deleteDepartment,
  type DepartmentData,
} from '@/lib/api/departments'
import {
  createVendor, updateVendor, deleteVendor,
  type VendorData,
} from '@/lib/api/vendors'
import {
  listLeave, createLeave, updateLeave, approveLeave, rejectLeave, deleteLeave,
  type LeaveData,
} from '@/lib/api/leave'
import {
  listStaffDocs, uploadStaffDoc, patchStaffDoc, deleteStaffDoc, staffDocDownloadUrl,
  type StaffDocData,
} from '@/lib/api/staffdocs'
import {
  listRoster, createRosterEntry, updateRosterEntry, deleteRosterEntry,
  type RosterEntry,
} from '@/lib/api/roster'
import {
  listOnboarding, createOnboarding, toggleOnboardingItem, deleteOnboarding,
  type OnboardingChecklistData,
} from '@/lib/api/onboarding'
import {
  listDisciplinary, createDisciplinary, updateDisciplinary, deleteDisciplinary,
  type DisciplinaryData,
} from '@/lib/api/disciplinary'
import {
  listTraining, createTraining, updateTraining, deleteTraining,
  type TrainingData,
} from '@/lib/api/training'
import {
  listPayroll, savePayroll, deletePayroll,
  type PayrollData,
} from '@/lib/api/payroll'

// ── Helpers ────────────────────────────────────────────────────────────────

function staffTypeBadge(t: FacilityStaffMember['staff_type']) {
  const map = {
    permanent:  'bg-success/10 text-success',
    casual:     'bg-warning/10 text-warning',
    outsourced: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  }
  return <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize', map[t])}>{t}</span>
}

function contractStatusBadge(s: FacilityStaffMember['contract_status']) {
  const map: Record<string, string> = {
    active:     'bg-success/10 text-success',
    probation:  'bg-warning/10 text-warning',
    expired:    'bg-danger/10 text-danger',
    terminated: 'bg-surface-border text-text-muted',
  }
  return <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize', map[s] ?? '')}>{s}</span>
}

function vendorStatusBadge(s: string) {
  const map: Record<string, string> = {
    active:          'bg-success/10 text-success',
    expired:         'bg-danger/10 text-danger',
    terminated:      'bg-surface-border text-text-muted',
    pending:         'bg-warning/10 text-warning',
    pending_renewal: 'bg-warning/10 text-warning',
  }
  return <span className={cn('text-xs px-2 py-0.5 rounded font-medium', map[s] ?? '')}>{s.replace(/_/g, ' ')}</span>
}

function personTypeToStaffType(t: string): 'permanent' | 'casual' | 'outsourced' {
  if (t === 'permanent_staff') return 'permanent'
  if (t === 'casual_staff')    return 'casual'
  return 'outsourced'
}

function personStatusBadge(s: string) {
  const map: Record<string, string> = {
    active:               'bg-success/10 text-success',
    pending_verification: 'bg-warning/10 text-warning',
    inactive:             'bg-surface-border text-text-muted',
    suspended:            'bg-danger/10 text-danger',
    former:               'bg-surface-border text-text-muted',
  }
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize', map[s] ?? '')}>
      {s.replace(/_/g, ' ')}
    </span>
  )
}

// ── Department Modal (Add / Edit) ───────────────────────────────────────────

function DeptModal({
  dept, staff, onClose, onDone,
}: {
  dept?: DepartmentData
  staff: Person[]
  onClose: () => void
  onDone: (d: DepartmentData) => void
}) {
  const [form, setForm] = useState({
    name:           dept?.name           ?? '',
    description:    dept?.description    ?? '',
    head_person_id: dept?.head_person_id ?? '',
    budget_monthly: dept?.budget_monthly != null ? String(dept.budget_monthly) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        name:           form.name.trim(),
        description:    form.description || null,
        head_person_id: form.head_person_id || null,
        budget_monthly: form.budget_monthly ? Number(form.budget_monthly) : null,
      }
      const result = dept
        ? await updateDepartment(dept.id, payload)
        : await createDepartment(payload)
      onDone(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{dept ? 'Edit Department' : 'Add Department'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Head of Department</label>
            <select value={form.head_person_id} onChange={e => setForm(p => ({ ...p, head_person_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— None —</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.job_title ? ` (${s.job_title})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Monthly Budget (KES)</label>
            <input type="number" value={form.budget_monthly} onChange={e => setForm(p => ({ ...p, budget_monthly: e.target.value }))}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : dept ? 'Save Changes' : 'Add Department'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── DepartmentRow ──────────────────────────────────────────────────────────

function DepartmentRow({
  dept, staffCount, staff, onEdit, onDelete,
}: {
  dept: DepartmentData
  staffCount: number
  staff: Person[]
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [delError,  setDelError]  = useState('')

  async function handleDelete() {
    if (!confirm(`Delete "${dept.name}"? This cannot be undone.`)) return
    setDeleting(true); setDelError('')
    try {
      await deleteDepartment(dept.id)
      onDelete()
    } catch (e) {
      setDelError(e instanceof Error ? e.message : 'Delete failed.')
    } finally { setDeleting(false) }
  }

  return (
    <div className="border-b border-surface-border dark:border-dark-border last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} className="text-text-muted text-xs w-3 flex-shrink-0">
          {expanded ? '▼' : '▶'}
        </button>
        {/* Name + description */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          <p className="text-sm font-semibold text-text">{dept.name}</p>
          {dept.description && <p className="text-xs text-text-muted truncate">{dept.description}</p>}
        </div>
        {/* Head */}
        <div className="hidden sm:block w-36 text-xs text-text-muted truncate flex-shrink-0">
          <span className="text-text-muted/60">Head: </span>
          {dept.head_name ?? '—'}
        </div>
        {/* Staff count */}
        <div className="flex items-center gap-3 text-xs text-text-muted flex-shrink-0">
          <span><span className="font-semibold text-text">{staffCount}</span> staff</span>
          {dept.budget_monthly != null && (
            <span className="hidden md:block font-semibold text-text">KES {Number(dept.budget_monthly).toLocaleString()}/mo</span>
          )}
        </div>
        {/* Actions */}
        <CanDo action="write" resource={{ type: 'person' }}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onEdit} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs text-danger hover:underline disabled:opacity-50">
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        </CanDo>
      </div>
      {delError && (
        <p className="px-10 pb-2 text-xs text-danger">{delError}</p>
      )}
      {expanded && staff.filter(p => p.status !== 'former').length > 0 && (
        <div className="px-10 pb-3 space-y-1 bg-surface-muted/40 dark:bg-dark-hover/30">
          {staff.filter(p => p.status !== 'former').map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-surface-border dark:border-dark-border last:border-0">
              <span className="font-medium text-text">{p.first_name} {p.last_name}</span>
              <span className="text-text-muted">{p.job_title ?? '—'}</span>
              {staffTypeBadge(personTypeToStaffType(p.type))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vendor Modal (Add / Edit) ───────────────────────────────────────────────

const VENDOR_STATUSES = ['active', 'expired', 'terminated', 'pending']

function VendorModal({
  vendor, onClose, onDone,
}: {
  vendor?: VendorData
  onClose: () => void
  onDone: (v: VendorData) => void
}) {
  const [form, setForm] = useState({
    vendor_name:    vendor?.vendor_name    ?? '',
    service_type:   vendor?.service_type   ?? '',
    contact_person: vendor?.contact_person ?? '',
    contact_phone:  vendor?.contact_phone  ?? '',
    contact_email:  vendor?.contact_email  ?? '',
    status:         vendor?.status         ?? 'active',
    start_date:     vendor?.start_date     ?? '',
    end_date:       vendor?.end_date       ?? '',
    monthly_value:  vendor?.monthly_value != null ? String(vendor.monthly_value) : '',
    notes:          vendor?.notes          ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    if (!form.vendor_name.trim()) { setError('Vendor name is required.'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        vendor_name:    form.vendor_name.trim(),
        service_type:   form.service_type   || null,
        contact_person: form.contact_person || null,
        contact_phone:  form.contact_phone  || null,
        contact_email:  form.contact_email  || null,
        status:         form.status,
        start_date:     form.start_date     || null,
        end_date:       form.end_date       || null,
        monthly_value:  form.monthly_value ? Number(form.monthly_value) : null,
        notes:          form.notes          || null,
      }
      const result = vendor
        ? await updateVendor(vendor.id, payload)
        : await createVendor(payload)
      onDone(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  const tf = (label: string, key: keyof typeof form, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <input type={type} value={form[key] as string}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-surface-border dark:border-dark-border">
          <h2 className="text-sm font-semibold text-text">{vendor ? 'Edit Vendor Contract' : 'Add Vendor Contract'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {tf('Vendor / Company Name *', 'vendor_name')}
            {tf('Service Type', 'service_type')}
            {tf('Contact Person', 'contact_person')}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Contact Phone</label>
              <PhoneInput value={form.contact_phone} onChange={v => setForm(p => ({ ...p, contact_phone: v }))} />
            </div>
            {tf('Contact Email', 'contact_email', 'email')}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                {VENDOR_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            {tf('Start Date', 'start_date', 'date')}
            {tf('End Date',   'end_date',   'date')}
            {tf('Monthly Value (KES)', 'monthly_value', 'number')}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
            <button onClick={handle} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving…' : vendor ? 'Save Changes' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── VendorRow ──────────────────────────────────────────────────────────────

function VendorRow({ vendor, onEdit, onDelete }: {
  vendor: VendorData
  onEdit: () => void
  onDelete: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState('')

  async function handleDelete() {
    if (!confirm(`Delete vendor "${vendor.vendor_name}"?`)) return
    setDeleting(true); setDelError('')
    try {
      await deleteVendor(vendor.id)
      onDelete()
    } catch (e) {
      setDelError(e instanceof Error ? e.message : 'Delete failed.')
    } finally { setDeleting(false) }
  }

  const isExpiringSoon = vendor.status === 'active' && vendor.end_date &&
    new Date(vendor.end_date) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  return (
    <div className="p-4 border-b border-surface-border dark:border-dark-border last:border-b-0 hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold text-text">{vendor.vendor_name}</p>
            {vendorStatusBadge(vendor.status)}
            {isExpiringSoon && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Expiring soon</span>}
          </div>
          <p className="text-xs text-text-muted">
            {[vendor.service_type, vendor.contact_person, vendor.contact_phone].filter(Boolean).join(' · ')}
          </p>
          {(vendor.start_date || vendor.end_date || vendor.monthly_value != null) && (
            <p className="text-xs text-text-muted mt-0.5">
              {vendor.start_date && `${vendor.start_date} → `}
              {vendor.end_date ?? '—'}
              {vendor.monthly_value != null && ` · KES ${Number(vendor.monthly_value).toLocaleString()}/mo`}
            </p>
          )}
          {vendor.notes && <p className="text-xs text-text-muted italic mt-1">{vendor.notes}</p>}
          {delError && <p className="text-xs text-danger mt-1">{delError}</p>}
        </div>
        <CanDo action="write" resource={{ type: 'system_config' }}>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button onClick={onEdit} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
            <button onClick={handleDelete} disabled={deleting} className="text-xs text-danger hover:underline disabled:opacity-50">
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        </CanDo>
      </div>
    </div>
  )
}

// ── Filter options ─────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'all',        label: 'All Types'  },
  { value: 'permanent',  label: 'Permanent'  },
  { value: 'casual',     label: 'Casual'     },
  { value: 'outsourced', label: 'Outsourced' },
]

const STATUS_OPTIONS = [
  { value: 'active',  label: 'Active only' },
  { value: 'all',     label: 'All statuses' },
]

const VENDOR_STATUS_OPTIONS = [
  { value: 'all',      label: 'All Statuses'  },
  { value: 'active',   label: 'Active'        },
  { value: 'expired',  label: 'Expired'       },
  { value: 'pending',  label: 'Pending'       },
  { value: 'terminated', label: 'Terminated'  },
]

// ── Edit Staff Modal ────────────────────────────────────────────────────────

function EditStaffModal({ person, departments, onClose, onDone }: {
  person: Person; departments: DepartmentData[]; onClose: () => void; onDone: (p: Person) => void
}) {
  const [form, setForm] = useState({
    first_name:            person.first_name,
    middle_name:           person.middle_name          ?? '',
    last_name:             person.last_name,
    email:                 person.email                ?? '',
    phone:                 person.phone                ?? '',
    staff_number:          person.staff_number         ?? '',
    job_title:             person.job_title            ?? '',
    department:            person.department           ?? '',
    contract_type:         person.contract_type        ?? '',
    contract_status:       person.contract_status      ?? '',
    start_date:            person.start_date           ?? '',
    end_date:              person.end_date             ?? '',
    probation_end_date:    person.probation_end_date   ?? '',
    background_check_done: person.background_check_done ?? false,
    agency_name:           person.agency_name          ?? '',
    agency_contact:        person.agency_contact       ?? '',
    agency_clearance_ref:  person.agency_clearance_ref ?? '',
    notes:                 (person as unknown as Record<string,string>).notes ?? '',
    // Casual payroll
    biometric_id:          (person as unknown as Record<string,string>).biometric_id        ?? '',
    daily_rate:            (person as unknown as Record<string,string>).daily_rate           ?? '',
    bank_account_name:     (person as unknown as Record<string,string>).bank_account_name   ?? '',
    bank_account_number:   (person as unknown as Record<string,string>).bank_account_number ?? '',
    bank_branch_code:      (person as unknown as Record<string,string>).bank_branch_code    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    setSaving(true); setError('')
    try {
      const updated = await updatePerson(person.id, {
        first_name:    form.first_name.trim(),
        middle_name:   form.middle_name  || null,
        last_name:     form.last_name.trim(),
        email:         form.email        || null,
        phone:         form.phone        || null,
        staff_number:  form.staff_number || null,
        job_title:     form.job_title    || null,
        department:    form.department   || null,
        contract_type: form.contract_type    || null,
        contract_status: form.contract_status || null,
        start_date:    form.start_date        || null,
        end_date:      form.end_date          || null,
        probation_end_date: form.probation_end_date || null,
        background_check_done: form.background_check_done,
        agency_name:          form.agency_name         || null,
        agency_contact:       form.agency_contact      || null,
        agency_clearance_ref: form.agency_clearance_ref || null,
        notes:                form.notes               || null,
        biometric_id:         form.biometric_id        || null,
        daily_rate:           form.daily_rate ? Number(form.daily_rate) : null,
        bank_account_name:    form.bank_account_name   || null,
        bank_account_number:  form.bank_account_number || null,
        bank_branch_code:     form.bank_branch_code    || null,
      })
      onDone(apiPersonToPerson(updated))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setSaving(false) }
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <input type={type} value={form[key] as string}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
  )

  const CONTRACT_TYPES    = ['permanent','casual','probation','contract']
  const CONTRACT_STATUSES = ['active','probation','expired','terminated']

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-surface-border dark:border-dark-border">
          <h2 className="text-sm font-semibold text-text">Edit Staff — {person.first_name} {person.last_name}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {field('First Name',   'first_name')}
            {field('Middle Name',  'middle_name')}
            {field('Last Name',    'last_name')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('Email',        'email',        'email')}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Phone</label>
              <PhoneInput value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
            </div>
            {field('Staff Number', 'staff_number')}
            {field('Job Title',    'job_title')}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
              <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Contract Type</label>
              <select value={form.contract_type} onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— select —</option>
                {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Contract Status</label>
              <select value={form.contract_status} onChange={e => setForm(p => ({ ...p, contract_status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— select —</option>
                {CONTRACT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
            {field('Start Date',    'start_date',         'date')}
            {field('End Date',      'end_date',           'date')}
            {field('Probation End', 'probation_end_date', 'date')}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="bgc" checked={form.background_check_done}
              onChange={e => setForm(p => ({ ...p, background_check_done: e.target.checked }))}
              className="rounded border-surface-border text-primary-600 focus:ring-primary-500 cursor-pointer" />
            <label htmlFor="bgc" className="text-sm text-text cursor-pointer">Background check completed</label>
          </div>
          {person.is_outsourced && (
            <>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Agency / Outsourced Details</p>
              <div className="grid grid-cols-2 gap-3">
                {field('Agency Name',        'agency_name')}
                {field('Agency Contact',     'agency_contact')}
                {field('Clearance Reference','agency_clearance_ref')}
              </div>
            </>
          )}
          {/* Payroll & Banking */}
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider pt-1">Payroll &amp; Banking</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Biometric Device ID</label>
              <input type="text" value={form.biometric_id} placeholder="e.g. 4055"
                onChange={e => setForm(p => ({ ...p, biometric_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Daily Rate (KES)</label>
              <input type="number" min={0} step={50} value={form.daily_rate} placeholder="e.g. 800"
                onChange={e => setForm(p => ({ ...p, daily_rate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            {field('Bank Account Name',   'bank_account_name')}
            {field('Bank Account Number', 'bank_account_number')}
            {field('Branch Code',         'bank_branch_code')}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
            <button onClick={handle} disabled={saving}
              className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── Grant Portal Access Modal ───────────────────────────────────────────────

function GrantAccessModal({ person, onClose }: { person: Person; onClose: () => void }) {
  const [roles, setRoles]   = useState<AppRole[]>([])
  const [roleName, setRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState('')

  useMemo(() => { listRoles().then(setRoles) }, [])

  async function handle() {
    if (!roleName) { setError('Please select a role.'); return }
    setSaving(true); setError('')
    try {
      await grantPortalAccess(person.id, roleName)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to grant access.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Grant Portal Access</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        {done ? (
          <div className="text-center space-y-3 py-2">
            <p className="text-4xl">✅</p>
            <p className="text-sm font-medium text-text">Invite sent to {person.email}</p>
            <p className="text-xs text-text-muted">They will receive an email to set up their password.</p>
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">Done</button>
          </div>
        ) : (
          <>
            <p className="text-xs text-text-muted">
              An invite email will be sent to <strong>{person.email}</strong>. Their portal account will be linked to this staff record.
            </p>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Role *</label>
              <select value={roleName} onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select a role…</option>
                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
              <button onClick={handle} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Offboard Modal ──────────────────────────────────────────────────────────

function OffboardModal({ person, onClose, onDone }: {
  person: Person; onClose: () => void; onDone: (updated: Person) => void
}) {
  const [exitDate,   setExitDate]   = useState('')
  const [exitReason, setExitReason] = useState('')
  const [exitNotes,  setExitNotes]  = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const EXIT_REASONS = [
    { value: 'resigned',     label: 'Resigned' },
    { value: 'terminated',   label: 'Terminated' },
    { value: 'contract_end', label: 'Contract End' },
    { value: 'retired',      label: 'Retired' },
    { value: 'other',        label: 'Other' },
  ]

  async function handle() {
    if (!exitDate || !exitReason) { setError('Exit date and reason are required.'); return }
    setSaving(true); setError('')
    try {
      const updated = await offboardPerson(person.id, { exitDate, exitReason, exitNotes })
      onDone({ ...person, status: 'former', exit_date: updated.exit_date ?? exitDate, exit_reason: updated.exit_reason ?? exitReason, exit_notes: updated.exit_notes ?? exitNotes })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to offboard.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Offboard Staff</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <p className="text-xs text-text-muted">
          This will mark <strong>{person.first_name} {person.last_name}</strong> as <em>former</em> and deactivate their portal account.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Exit Date *</label>
            <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reason *</label>
            <select value={exitReason} onChange={e => setExitReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Select reason…</option>
              {EXIT_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <textarea value={exitNotes} onChange={e => setExitNotes(e.target.value)} rows={2}
              placeholder="Any handover notes or remarks…"
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Processing…' : 'Confirm Offboard'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── LivePersonRow ───────────────────────────────────────────────────────────

function LivePersonRow({ person, onEdit, onGrant, onOffboard }: {
  person: Person
  onEdit: () => void
  onGrant: () => void
  onOffboard: () => void
}) {
  const name      = `${person.first_name} ${person.last_name}`
  const initials  = `${person.first_name[0]}${person.last_name[0]}`
  const staffType = personTypeToStaffType(person.type)
  const isActive  = person.status === 'active' || person.status === 'pending_verification'
  const hasEmail  = !!person.email

  return (
    <tr className="hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
      <td className="px-4 py-3 text-xs text-text-muted font-mono">{person.staff_number ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-text">{name}</p>
            {person.job_title
              ? <p className="text-xs text-text-muted">{person.job_title}</p>
              : <p className="text-xs text-text-muted italic">No role</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{person.department ?? '—'}</td>
      <td className="px-4 py-3">{staffTypeBadge(staffType)}</td>
      <td className="px-4 py-3">
        {person.contract_status
          ? contractStatusBadge(person.contract_status as 'active'|'probation'|'expired'|'terminated')
          : <span className="text-xs text-text-muted">—</span>}
      </td>
      <td className="px-4 py-3">
        {person.background_check_done
          ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">✓ Done</span>
          : <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Pending</span>}
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{person.start_date ?? person.joined_date ?? '—'}</td>
      <td className="px-4 py-3">{personStatusBadge(person.status)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Edit</button>
          <CanDo action="write" resource={{ type: 'person' }}>
            <>
              {isActive && hasEmail && person.status !== 'former' && (
                <button onClick={onGrant} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Grant Access</button>
              )}
              {isActive && (
                <button onClick={onOffboard} className="text-xs text-danger hover:underline">Offboard</button>
              )}
            </>
          </CanDo>
        </div>
      </td>
    </tr>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function HRPageClient({
  initialStaff,
  initialDepartments,
  initialVendors,
}: {
  initialStaff?: Person[]
  initialDepartments?: DepartmentData[]
  initialVendors?: VendorData[]
} = {}) {
  const [search,        setSearch]       = useState('')
  const [typeFilter,    setType]         = useState('all')
  const [statusFilter,  setStatusFilter] = useState('active')
  const [deptFilter,    setDeptFilter]   = useState('')
  const [vendorStatus,  setVendorStatus] = useState('all')
  const [showRegister,  setShowRegister] = useState(false)

  // Live staff from backend
  const [liveStaff, setLiveStaff] = useState<Person[]>(initialStaff ?? [])

  // Staff action modals (lifted out of row to avoid stacking-context issues)
  const [editingPerson,     setEditingPerson]     = useState<Person | null>(null)
  const [grantingPerson,    setGrantingPerson]    = useState<Person | null>(null)
  const [offboardingPerson, setOffboardingPerson] = useState<Person | null>(null)

  // Departments state
  const [departments,    setDepartments]   = useState<DepartmentData[]>(initialDepartments ?? [])
  const [deptModal,      setDeptModal]     = useState<{ open: boolean; dept?: DepartmentData }>({ open: false })

  // Vendors state
  const [vendors,        setVendors]       = useState<VendorData[]>(initialVendors ?? [])
  const [vendorModal,    setVendorModal]   = useState<{ open: boolean; vendor?: VendorData }>({ open: false })

  function handleStaffRegistered(p: Person) {
    setLiveStaff(prev => [p, ...prev])
  }

  function handleStaffUpdated(updated: Person) {
    setLiveStaff(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const filteredLiveStaff = useMemo(() => {
    const q = search.toLowerCase()
    return liveStaff.filter(p => {
      const fullName    = `${p.first_name} ${p.last_name}`.toLowerCase()
      const matchSearch = !q || fullName.includes(q) || (p.job_title ?? '').toLowerCase().includes(q) || (p.department ?? '').toLowerCase().includes(q)
      const staffType   = personTypeToStaffType(p.type)
      const matchType   = typeFilter === 'all' || staffType === typeFilter
      const matchStatus = statusFilter === 'all' || p.status !== 'former'
      const matchDept   = !deptFilter || p.department === deptFilter
      return matchSearch && matchType && matchStatus && matchDept
    })
  }, [search, typeFilter, statusFilter, deptFilter, liveStaff])

  const filteredVendors = useMemo(() =>
    vendorStatus === 'all' ? vendors : vendors.filter(v => v.status === vendorStatus),
  [vendors, vendorStatus])

  const stats = useMemo(() => ({
    permanent:    liveStaff.filter(p => p.type === 'permanent_staff').length,
    casual:       liveStaff.filter(p => p.type === 'casual_staff').length,
    outsourced:   liveStaff.filter(p => p.is_outsourced).length,
    bgcPending:   liveStaff.filter(p => !p.background_check_done).length,
    probation:    liveStaff.filter(p => p.contract_status === 'probation').length,
    activeVendors: vendors.filter(v => v.status === 'active').length,
  }), [liveStaff, vendors])

  return (
    <>
    <div className="p-6 space-y-6 animate-fade-in">

      <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20 text-sm">
        <span className="text-xl">⭐</span>
        <div>
          <span className="font-semibold text-warning">Premium Feature — HR & Staff Management</span>
          <span className="text-text-muted ml-2">Full HR features including onboarding workflows, attendance, and payroll exports.</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Direct — Permanent',  value: stats.permanent,     color: 'text-success'    },
          { label: 'Direct — Casual',     value: stats.casual,        color: 'text-warning'    },
          { label: 'Outsourced (Agency)', value: stats.outsourced,    color: 'text-indigo-600' },
          { label: 'BGC Pending',         value: stats.bgcPending,    color: 'text-danger'     },
          { label: 'On Probation',        value: stats.probation,     color: 'text-warning'    },
          { label: 'Active Vendors',      value: stats.activeVendors, color: 'text-primary-600'},
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="departments">
        <TabsList className="flex-wrap">
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="facility-staff">Facility Staff ({filteredLiveStaff.length}/{liveStaff.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Contracts ({vendors.length})</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="roster">Duty Roster</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="orgchart">Org Chart</TabsTrigger>
        </TabsList>

        {/* ── Departments ── */}
        <TabsContent value="departments">
          <div className="space-y-4 mt-4">
            <div className="flex justify-end">
              <CanDo action="write" resource={{ type: 'person' }}>
                <Button size="sm" onClick={() => setDeptModal({ open: true })}>+ Add Department</Button>
              </CanDo>
            </div>
            <Card className="overflow-hidden">
              {departments.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-text-muted">
                  No departments yet. Click "+ Add Department" to create one.
                </p>
              )}
              {departments.map(dept => {
                const deptStaff = liveStaff.filter(p => p.department === dept.name)
                return (
                  <DepartmentRow
                    key={dept.id}
                    dept={dept}
                    staffCount={deptStaff.length}
                    staff={deptStaff}
                    onEdit={() => setDeptModal({ open: true, dept })}
                    onDelete={() => {
                      setDepartments(prev => prev.filter(d => d.id !== dept.id))
                    }}
                  />
                )
              })}
            </Card>
          </div>
        </TabsContent>

        {/* ── Facility Staff ── */}
        <TabsContent value="facility-staff">
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search staff…" className="w-56" />
              <Select value={typeFilter} onChange={setType} options={TYPE_OPTIONS} className="w-36" />
              <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} className="w-36" />
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
              <div className="ml-auto">
                <CanDo action="staff.onboard" resource={{ type: 'person' }}>
                  <Button size="sm" onClick={() => setShowRegister(true)}>+ Onboard Staff</Button>
                </CanDo>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
              <span className="flex-shrink-0 mt-0.5">ℹ</span>
              <span>
                Employment records only. Identity details (phone, national ID, KYC, portal access) are managed from{' '}
                <a href="/people" className="underline font-medium">People → Staff tab</a>.
              </span>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-hover dark:bg-dark-hover">
                    <tr>
                      {['#','Name','Department','Type','Contract','BGC','Start Date','Status',''].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                    {filteredLiveStaff.map(p => (
                      <LivePersonRow
                        key={p.id}
                        person={p}
                        onEdit={() => setEditingPerson(p)}
                        onGrant={() => setGrantingPerson(p)}
                        onOffboard={() => setOffboardingPerson(p)}
                      />
                    ))}
                    {filteredLiveStaff.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-text-muted text-sm">
                          No staff match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Vendor Contracts ── */}
        <TabsContent value="vendors">
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={vendorStatus} onChange={setVendorStatus} options={VENDOR_STATUS_OPTIONS} className="w-40" />
              <div className="ml-auto">
                <CanDo action="write" resource={{ type: 'system_config' }}>
                  <Button size="sm" onClick={() => setVendorModal({ open: true })}>+ Add Vendor</Button>
                </CanDo>
              </div>
            </div>
            <Card className="overflow-hidden">
              {filteredVendors.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-text-muted">
                  {vendors.length === 0
                    ? 'No vendor contracts yet. Click "+ Add Vendor" to add one.'
                    : 'No vendors match the selected filter.'}
                </p>
              )}
              {filteredVendors.map(v => (
                <VendorRow
                  key={v.id}
                  vendor={v}
                  onEdit={() => setVendorModal({ open: true, vendor: v })}
                  onDelete={() => setVendors(prev => prev.filter(x => x.id !== v.id))}
                />
              ))}
            </Card>
          </div>
        </TabsContent>

        {/* ── Onboarding ── */}
        <TabsContent value="onboarding">
          <OnboardingTab staff={liveStaff} />
        </TabsContent>

        {/* ── Leave ── */}
        <TabsContent value="leave">
          <LeaveTab staff={liveStaff} />
        </TabsContent>

        {/* ── Documents ── */}
        <TabsContent value="documents">
          <DocumentsTab staff={liveStaff} />
        </TabsContent>

        {/* ── Duty Roster ── */}
        <TabsContent value="roster">
          <RosterTab staff={liveStaff} departments={departments} />
        </TabsContent>

        {/* ── Disciplinary ── */}
        <TabsContent value="disciplinary">
          <DisciplinaryTab staff={liveStaff} />
        </TabsContent>

        {/* ── Training ── */}
        <TabsContent value="training">
          <TrainingTab staff={liveStaff} />
        </TabsContent>

        {/* ── Payroll ── */}
        <TabsContent value="payroll">
          <PayrollTab staff={liveStaff} />
        </TabsContent>

        {/* ── Org Chart ── */}
        <TabsContent value="orgchart">
          <OrgChartTab departments={departments} staff={liveStaff} />
        </TabsContent>
      </Tabs>

    </div>

    {/* Modals rendered outside the animated wrapper to avoid transform stacking-context issues */}
    <RegisterStaffModal
      open={showRegister}
      onClose={() => setShowRegister(false)}
      onRegister={handleStaffRegistered}
    />

    {editingPerson && (
      <EditStaffModal
        person={editingPerson}
        departments={departments}
        onClose={() => setEditingPerson(null)}
        onDone={updated => { handleStaffUpdated(updated); setEditingPerson(null) }}
      />
    )}
    {grantingPerson && (
      <GrantAccessModal person={grantingPerson} onClose={() => setGrantingPerson(null)} />
    )}
    {offboardingPerson && (
      <OffboardModal
        person={offboardingPerson}
        onClose={() => setOffboardingPerson(null)}
        onDone={updated => { handleStaffUpdated(updated); setOffboardingPerson(null) }}
      />
    )}

    {deptModal.open && (
      <DeptModal
        dept={deptModal.dept}
        staff={liveStaff}
        onClose={() => setDeptModal({ open: false })}
        onDone={saved => {
          setDepartments(prev => {
            const idx = prev.findIndex(d => d.id === saved.id)
            if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
            return [saved, ...prev]
          })
          setDeptModal({ open: false })
        }}
      />
    )}

    {vendorModal.open && (
      <VendorModal
        vendor={vendorModal.vendor}
        onClose={() => setVendorModal({ open: false })}
        onDone={saved => {
          setVendors(prev => {
            const idx = prev.findIndex(v => v.id === saved.id)
            if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next }
            return [saved, ...prev]
          })
          setVendorModal({ open: false })
        }}
      />
    )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Onboarding Tab ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function OnboardingTab({ staff }: { staff: Person[] }) {
  const [checklists, setChecklists] = useState<OnboardingChecklistData[]>([])
  const [loading, setLoading]       = useState(true)
  const [personId, setPersonId]     = useState('')
  const [creating, setCreating]     = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)

  useEffect(() => {
    listOnboarding().then(setChecklists).finally(() => setLoading(false))
  }, [])

  const unstarted = staff.filter(p => !checklists.find(c => c.person_id === p.id) && p.status !== 'former')

  async function handleCreate() {
    if (!personId) return
    setCreating(true)
    try {
      const c = await createOnboarding(personId)
      setChecklists(prev => [c, ...prev])
      setPersonId('')
    } finally { setCreating(false) }
  }

  async function toggle(itemId: string, completed: boolean) {
    const updated = await toggleOnboardingItem(itemId, { completed })
    setChecklists(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  async function handleDelete(personId: string) {
    if (!confirm('Delete this checklist?')) return
    await deleteOnboarding(personId)
    setChecklists(prev => prev.filter(c => c.person_id !== personId))
  }

  if (loading) return <div className="mt-4 p-6 text-sm text-text-muted">Loading…</div>

  return (
    <div className="mt-4 space-y-4">
      {/* Start new checklist */}
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-text-muted mb-1">Start Onboarding Checklist For</label>
          <select value={personId} onChange={e => setPersonId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">Select staff member…</option>
            {unstarted.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={handleCreate} disabled={!personId || creating}>
          {creating ? 'Starting…' : '+ Start Checklist'}
        </Button>
      </Card>

      {checklists.length === 0 && (
        <p className="text-sm text-text-muted text-center py-10">No checklists yet. Select a staff member above to begin.</p>
      )}

      {checklists.map(c => {
        const isOpen = expanded === c.id
        const doneCount = c.items.filter(i => i.completed).length
        return (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-muted dark:hover:bg-dark-hover"
              onClick={() => setExpanded(isOpen ? null : c.id)}>
              <span className="text-xs text-text-muted w-3">{isOpen ? '▼' : '▶'}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{c.person_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 max-w-32 h-1.5 rounded-full bg-surface-border dark:bg-dark-border overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${c.progress}%` }} />
                  </div>
                  <span className="text-xs text-text-muted">{doneCount}/{c.items.length}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                    c.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
                    {c.status === 'completed' ? 'Complete' : 'In progress'}
                  </span>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); handleDelete(c.person_id) }}
                className="text-xs text-danger hover:underline flex-shrink-0">Delete</button>
            </div>
            {isOpen && (
              <div className="border-t border-surface-border dark:border-dark-border divide-y divide-surface-border dark:divide-dark-border">
                {Object.entries(
                  c.items.reduce((acc, i) => {
                    if (!acc[i.category]) acc[i.category] = []
                    acc[i.category].push(i)
                    return acc
                  }, {} as Record<string, typeof c.items>)
                ).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted bg-surface-muted dark:bg-dark-hover">{cat}</p>
                    {items.map(item => (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-muted/50 dark:hover:bg-dark-hover/50">
                        <input type="checkbox" checked={item.completed}
                          onChange={e => toggle(item.id, e.target.checked)}
                          className="mt-0.5 rounded border-surface-border text-primary-600 focus:ring-primary-500 cursor-pointer flex-shrink-0" />
                        <div className="flex-1">
                          <p className={cn('text-sm', item.completed ? 'line-through text-text-muted' : 'text-text')}>{item.task}</p>
                          {item.completed && item.completed_at && (
                            <p className="text-xs text-text-muted mt-0.5">
                              Done {new Date(item.completed_at).toLocaleDateString()}
                              {item.completed_by && ` · by ${item.completed_by}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Leave Tab ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const LEAVE_TYPES = ['annual','sick','emergency','maternity','paternity','compassionate','other']

function LeaveTab({ staff }: { staff: Person[] }) {
  const [leaves,    setLeaves]    = useState<LeaveData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<LeaveData | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPerson, setFilterPerson] = useState('')

  useEffect(() => { listLeave().then(setLeaves).finally(() => setLoading(false)) }, [])

  const filtered = useMemo(() => leaves.filter(l =>
    (filterStatus === 'all' || l.status === filterStatus) &&
    (!filterPerson || l.person_id === filterPerson)
  ), [leaves, filterStatus, filterPerson])

  async function handleApprove(l: LeaveData) {
    const notes = prompt('Approval notes (optional):') ?? ''
    const updated = await approveLeave(l.id, { approval_notes: notes })
    setLeaves(prev => prev.map(x => x.id === updated.id ? updated : x))
  }
  async function handleReject(l: LeaveData) {
    const notes = prompt('Rejection reason:') ?? ''
    const updated = await rejectLeave(l.id, { approval_notes: notes })
    setLeaves(prev => prev.map(x => x.id === updated.id ? updated : x))
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete this leave request?')) return
    await deleteLeave(id)
    setLeaves(prev => prev.filter(x => x.id !== id))
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending:  'bg-warning/10 text-warning',
      approved: 'bg-success/10 text-success',
      rejected: 'bg-danger/10 text-danger',
      cancelled:'bg-surface-border text-text-muted',
    }
    return <span className={cn('text-xs px-2 py-0.5 rounded font-medium capitalize', map[s] ?? '')}>{s}</span>
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
          className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Staff</option>
          {staff.filter(p => p.status !== 'former').map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          {['all','pending','approved','rejected','cancelled'].map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Request Leave</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? <p className="px-4 py-6 text-sm text-text-muted">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>{['Staff','Type','From','To','Days','Status','Notes',''].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-surface-muted dark:hover:bg-dark-hover">
                  <td className="px-4 py-3 font-medium text-text">{l.person_name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-text-muted">{l.leave_type.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3 text-text-muted">{l.start_date}</td>
                  <td className="px-4 py-3 text-text-muted">{l.end_date}</td>
                  <td className="px-4 py-3 text-text-muted">{l.days}</td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-xs truncate">{l.approval_notes ?? l.reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      {l.status === 'pending' && <>
                        <button onClick={() => handleApprove(l)} className="text-xs text-success hover:underline">Approve</button>
                        <button onClick={() => handleReject(l)}  className="text-xs text-danger hover:underline">Reject</button>
                      </>}
                      <button onClick={() => { setEditing(l); setShowModal(true) }} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(l.id)} className="text-xs text-danger hover:underline">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-text-muted text-sm">No leave records found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && (
        <LeaveModal
          staff={staff}
          leave={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onDone={saved => {
            setLeaves(prev => {
              const idx = prev.findIndex(x => x.id === saved.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
              return [saved, ...prev]
            })
            setShowModal(false); setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function LeaveModal({ staff, leave, onClose, onDone }: {
  staff: Person[]; leave: LeaveData | null
  onClose: () => void; onDone: (l: LeaveData) => void
}) {
  const [form, setForm] = useState({
    person_id:  leave?.person_id  ?? '',
    leave_type: leave?.leave_type ?? 'annual',
    start_date: leave?.start_date ?? '',
    end_date:   leave?.end_date   ?? '',
    days:       leave?.days       ?? '',
    reason:     leave?.reason     ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    if (!form.person_id || !form.start_date || !form.end_date) { setError('Person, start and end date are required.'); return }
    setSaving(true); setError('')
    try {
      const payload = { ...form, days: Number(form.days) || undefined }
      const saved = leave
        ? await updateLeave(leave.id, payload)
        : await createLeave(payload)
      onDone(saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{leave ? 'Edit Leave Request' : 'New Leave Request'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Staff Member *</label>
            <select value={form.person_id} onChange={e => setForm(p => ({ ...p, person_id: e.target.value }))} className={inp}>
              <option value="">Select…</option>
              {staff.filter(s => s.status !== 'former').map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))} className={inp}>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-text-muted mb-1">Start Date *</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inp} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-text-muted mb-1">End Date *</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className={inp} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-text-muted mb-1">Days</label>
              <input type="number" value={form.days} onChange={e => setForm(p => ({ ...p, days: e.target.value }))} className={inp} placeholder="Auto" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reason</label>
            <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={2}
              className={inp + ' resize-none'} />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Documents Tab ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  'national_id','contract','nssf','nhif','work_permit',
  'certificate','first_aid','fire_safety','other',
]

function DocumentsTab({ staff }: { staff: Person[] }) {
  const [docs,      setDocs]      = useState<StaffDocData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filterPerson, setFilterPerson] = useState('')

  useEffect(() => { listStaffDocs().then(setDocs).finally(() => setLoading(false)) }, [])

  const filtered = useMemo(() => filterPerson ? docs.filter(d => d.person_id === filterPerson) : docs, [docs, filterPerson])

  const isExpiring = (d: StaffDocData) => d.expiry_date &&
    new Date(d.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return
    await deleteStaffDoc(id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
          className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Staff</option>
          {staff.filter(p => p.status !== 'former').map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowUpload(true)}>+ Upload Document</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? <p className="px-4 py-6 text-sm text-text-muted">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>{['Staff','Document Type','File','Size','Expires',''].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-surface-muted dark:hover:bg-dark-hover">
                  <td className="px-4 py-3 font-medium text-text">{d.person_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted capitalize">{d.document_type.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3">
                    <a href={staffDocDownloadUrl(d.id)} target="_blank" rel="noreferrer"
                      className="text-xs text-primary-600 hover:underline truncate max-w-xs block">{d.filename}</a>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{(d.file_size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3">
                    {d.expiry_date
                      ? <span className={cn('text-xs', isExpiring(d) ? 'text-danger font-semibold' : 'text-text-muted')}>
                          {d.expiry_date}{isExpiring(d) && ' ⚠'}
                        </span>
                      : <span className="text-xs text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(d.id, d.filename)} className="text-xs text-danger hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-text-muted text-sm">No documents uploaded yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showUpload && (
        <UploadDocModal
          staff={staff}
          onClose={() => setShowUpload(false)}
          onDone={doc => { setDocs(prev => [doc, ...prev]); setShowUpload(false) }}
        />
      )}
    </div>
  )
}

function UploadDocModal({ staff, onClose, onDone }: {
  staff: Person[]; onClose: () => void; onDone: (d: StaffDocData) => void
}) {
  const [personId, setPersonId]   = useState('')
  const [docType,  setDocType]    = useState('national_id')
  const [expiry,   setExpiry]     = useState('')
  const [notes,    setNotes]      = useState('')
  const [file,     setFile]       = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error,    setError]      = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handle() {
    if (!personId || !file) { setError('Select a staff member and a file.'); return }
    setUploading(true); setError('')
    try {
      const doc = await uploadStaffDoc({ person_id: personId, document_type: docType, file, expiry_date: expiry || undefined, notes: notes || undefined })
      onDone(doc)
    } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.') }
    finally { setUploading(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Upload Staff Document</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Staff Member *</label>
            <select value={personId} onChange={e => setPersonId(e.target.value)} className={inp}>
              <option value="">Select…</option>
              {staff.filter(p => p.status !== 'former').map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Document Type</label>
            <select value={docType} onChange={e => setDocType(e.target.value)} className={inp}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">File *</label>
            <input type="file" ref={fileRef} onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer" />
            {file && <p className="text-xs text-text-muted mt-1">{file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Expiry Date</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} placeholder="Optional" />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={uploading} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {uploading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Duty Roster Tab ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const SHIFT_TYPES = ['morning','afternoon','night','day','on_call']
const SHIFT_COLORS: Record<string,string> = {
  morning:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  afternoon: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  night:     'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  day:       'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  on_call:   'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

function RosterTab({ staff, departments }: { staff: Person[]; departments: DepartmentData[] }) {
  const todayMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().slice(0, 10)
  }

  const [weekStart, setWeekStart] = useState(todayMonday)
  const [entries,   setEntries]   = useState<RosterEntry[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<RosterEntry | null>(null)
  const [deptFilter, setDeptFilter] = useState('')

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    return d.toISOString().slice(0, 10)
  }, [weekStart])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d.toISOString().slice(0, 10)
    })
  }, [weekStart])

  useEffect(() => {
    setLoading(true)
    listRoster({ from: weekStart, to: weekEnd, department: deptFilter || undefined })
      .then(setEntries).finally(() => setLoading(false))
  }, [weekStart, weekEnd, deptFilter])

  const entriesByDate = useMemo(() => {
    const m: Record<string, RosterEntry[]> = {}
    entries.forEach(e => { if (!m[e.date]) m[e.date] = []; m[e.date].push(e) })
    return m
  }, [entries])

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7)
    setWeekStart(d.toISOString().slice(0, 10))
  }

  async function handleDelete(id: string) {
    await deleteRosterEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={prevWeek} className="px-2 py-1 rounded border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted">←</button>
          <span className="text-sm font-medium text-text">{weekStart} – {weekEnd}</span>
          <button onClick={nextWeek} className="px-2 py-1 rounded border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted">→</button>
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add Shift</Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, i) => (
            <div key={day} className="min-h-32">
              <p className={cn('text-xs font-semibold text-center mb-1 py-1 rounded',
                day === new Date().toISOString().slice(0,10)
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-text-muted')}>
                {DAY_NAMES[i]}<br />
                <span className="font-normal">{day.slice(5)}</span>
              </p>
              <div className="space-y-1">
                {(entriesByDate[day] ?? []).map(e => (
                  <div key={e.id} className={cn('text-xs p-1.5 rounded cursor-pointer group relative', SHIFT_COLORS[e.shift_type] ?? 'bg-surface-border text-text-muted')}>
                    <p className="font-semibold truncate">{e.person_name}</p>
                    <p className="capitalize">{e.shift_type.replace('_',' ')}</p>
                    {e.start_time && <p className="text-[10px] opacity-70">{e.start_time}–{e.end_time}</p>}
                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                      <button onClick={() => { setEditing(e); setShowModal(true) }}
                        className="text-[10px] bg-white/80 dark:bg-black/40 rounded px-1 hover:bg-white dark:hover:bg-black/60">✏</button>
                      <button onClick={() => handleDelete(e.id)}
                        className="text-[10px] bg-white/80 dark:bg-black/40 rounded px-1 hover:bg-white dark:hover:bg-black/60">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RosterModal
          staff={staff}
          departments={departments}
          entry={editing}
          defaultDate={weekStart}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onDone={saved => {
            setEntries(prev => {
              const idx = prev.findIndex(e => e.id === saved.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
              if (saved.date >= weekStart && saved.date <= weekEnd) return [...prev, saved]
              return prev
            })
            setShowModal(false); setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function RosterModal({ staff, departments, entry, defaultDate, onClose, onDone }: {
  staff: Person[]; departments: DepartmentData[]
  entry: RosterEntry | null; defaultDate: string
  onClose: () => void; onDone: (e: RosterEntry) => void
}) {
  const [form, setForm] = useState({
    person_id:  entry?.person_id  ?? '',
    department: entry?.department ?? '',
    date:       entry?.date       ?? defaultDate,
    shift_type: entry?.shift_type ?? 'morning',
    start_time: entry?.start_time ?? '',
    end_time:   entry?.end_time   ?? '',
    notes:      entry?.notes      ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    if (!form.person_id || !form.date) { setError('Staff and date are required.'); return }
    setSaving(true); setError('')
    try {
      const saved = entry
        ? await updateRosterEntry(entry.id, form)
        : await createRosterEntry(form)
      onDone(saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{entry ? 'Edit Shift' : 'Add Shift'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-muted mb-1">Staff Member *</label>
            <select value={form.person_id} onChange={e => setForm(p => ({ ...p, person_id: e.target.value }))} className={inp}>
              <option value="">Select…</option>
              {staff.filter(s => s.status !== 'former').map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Department</label>
            <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className={inp}>
              <option value="">— None —</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Shift</label>
            <select value={form.shift_type} onChange={e => setForm(p => ({ ...p, shift_type: e.target.value }))} className={inp}>
              {SHIFT_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">End Time</label>
            <input type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className={inp} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Disciplinary Tab ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const DISC_TYPES = ['verbal_warning','written_warning','final_warning','suspension','dismissal','other']
const DISC_COLORS: Record<string,string> = {
  verbal_warning:  'bg-warning/10 text-warning',
  written_warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  final_warning:   'bg-danger/10 text-danger',
  suspension:      'bg-danger/20 text-danger',
  dismissal:       'bg-danger/30 text-danger font-bold',
  other:           'bg-surface-border text-text-muted',
}

function DisciplinaryTab({ staff }: { staff: Person[] }) {
  const [records,   setRecords]   = useState<DisciplinaryData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<DisciplinaryData | null>(null)
  const [filterPerson, setFilterPerson] = useState('')

  useEffect(() => { listDisciplinary().then(setRecords).finally(() => setLoading(false)) }, [])

  const filtered = useMemo(() => filterPerson ? records.filter(r => r.person_id === filterPerson) : records, [records, filterPerson])

  async function handleDelete(id: string) {
    if (!confirm('Delete this disciplinary record? This action cannot be undone.')) return
    await deleteDisciplinary(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
          className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Staff</option>
          {staff.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Log Incident</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? <p className="px-4 py-6 text-sm text-text-muted">Loading…</p> : (
          <div className="divide-y divide-surface-border dark:divide-dark-border">
            {filtered.map(r => (
              <div key={r.id} className="px-4 py-4 hover:bg-surface-muted dark:hover:bg-dark-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-text">{r.person_name ?? '—'}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium', DISC_COLORS[r.type] ?? '')}>
                        {r.type.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                      </span>
                      <span className="text-xs text-text-muted">{r.incident_date}</span>
                    </div>
                    <p className="text-sm text-text">{r.description}</p>
                    {r.outcome && <p className="text-xs text-text-muted mt-1">Outcome: {r.outcome}</p>}
                    {r.issued_by_name && <p className="text-xs text-text-muted">Issued by: {r.issued_by_name}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => { setEditing(r); setShowModal(true) }} className="text-xs text-primary-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-danger hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-text-muted text-sm">No disciplinary records found.</p>
            )}
          </div>
        )}
      </Card>

      {showModal && (
        <DisciplinaryModal
          staff={staff}
          record={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onDone={saved => {
            setRecords(prev => {
              const idx = prev.findIndex(r => r.id === saved.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
              return [saved, ...prev]
            })
            setShowModal(false); setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function DisciplinaryModal({ staff, record, onClose, onDone }: {
  staff: Person[]; record: DisciplinaryData | null
  onClose: () => void; onDone: (r: DisciplinaryData) => void
}) {
  const [form, setForm] = useState({
    person_id:     record?.person_id     ?? '',
    incident_date: record?.incident_date ?? new Date().toISOString().slice(0,10),
    type:          record?.type          ?? 'verbal_warning',
    description:   record?.description   ?? '',
    outcome:       record?.outcome       ?? '',
    issued_by:     record?.issued_by     ?? '',
    notes:         record?.notes         ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    if (!form.person_id || !form.description) { setError('Staff and description are required.'); return }
    setSaving(true); setError('')
    try {
      const saved = record
        ? await updateDisciplinary(record.id, form)
        : await createDisciplinary(form)
      onDone(saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{record ? 'Edit Record' : 'Log Disciplinary Incident'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Staff Member *</label>
            <select value={form.person_id} onChange={e => setForm(p => ({ ...p, person_id: e.target.value }))} className={inp}>
              <option value="">Select…</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Incident Date</label>
              <input type="date" value={form.incident_date} onChange={e => setForm(p => ({ ...p, incident_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inp}>
                {DISC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Description *</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              className={inp + ' resize-none'} placeholder="Describe the incident…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Outcome / Action Taken</label>
            <textarea value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))} rows={2}
              className={inp + ' resize-none'} placeholder="Action taken, suspension period, etc." />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Issued By (Person ID)</label>
            <select value={form.issued_by} onChange={e => setForm(p => ({ ...p, issued_by: e.target.value }))} className={inp}>
              <option value="">— Select —</option>
              {staff.filter(s => s.status !== 'former').map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Internal Notes</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Training Tab ──────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function TrainingTab({ staff }: { staff: Person[] }) {
  const [records,   setRecords]   = useState<TrainingData[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<TrainingData | null>(null)
  const [filterPerson, setFilterPerson] = useState('')

  useEffect(() => { listTraining().then(setRecords).finally(() => setLoading(false)) }, [])

  const filtered = useMemo(() => filterPerson ? records.filter(r => r.person_id === filterPerson) : records, [records, filterPerson])

  const isExpiring = (r: TrainingData) => r.expiry_date &&
    new Date(r.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  async function handleDelete(id: string) {
    if (!confirm('Delete this training record?')) return
    await deleteTraining(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)}
          className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Staff</option>
          {staff.filter(p => p.status !== 'former').map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
        </select>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add Training</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? <p className="px-4 py-6 text-sm text-text-muted">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>{['Staff','Training','Provider','Completed','Expires','Certificate',''].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-surface-muted dark:hover:bg-dark-hover">
                  <td className="px-4 py-3 font-medium text-text">{r.person_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text">{r.training_name}</td>
                  <td className="px-4 py-3 text-text-muted">{r.provider ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{r.completion_date ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.expiry_date
                      ? <span className={cn('text-xs', isExpiring(r) ? 'text-danger font-semibold' : 'text-text-muted')}>
                          {r.expiry_date}{isExpiring(r) && ' ⚠'}
                        </span>
                      : <span className="text-xs text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted font-mono">{r.certificate_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(r); setShowModal(true) }} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-danger hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-text-muted text-sm">No training records yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && (
        <TrainingModal
          staff={staff}
          record={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onDone={saved => {
            setRecords(prev => {
              const idx = prev.findIndex(r => r.id === saved.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
              return [saved, ...prev]
            })
            setShowModal(false); setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function TrainingModal({ staff, record, onClose, onDone }: {
  staff: Person[]; record: TrainingData | null
  onClose: () => void; onDone: (r: TrainingData) => void
}) {
  const [form, setForm] = useState({
    person_id:          record?.person_id          ?? '',
    training_name:      record?.training_name      ?? '',
    provider:           record?.provider           ?? '',
    completion_date:    record?.completion_date    ?? '',
    expiry_date:        record?.expiry_date        ?? '',
    certificate_number: record?.certificate_number ?? '',
    notes:              record?.notes              ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handle() {
    if (!form.person_id || !form.training_name) { setError('Staff and training name are required.'); return }
    setSaving(true); setError('')
    try {
      const saved = record
        ? await updateTraining(record.id, form)
        : await createTraining(form)
      onDone(saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{record ? 'Edit Training Record' : 'Add Training Record'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Staff Member *</label>
            <select value={form.person_id} onChange={e => setForm(p => ({ ...p, person_id: e.target.value }))} className={inp}>
              <option value="">Select…</option>
              {staff.filter(s => s.status !== 'former').map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Training / Certification Name *</label>
            <input value={form.training_name} onChange={e => setForm(p => ({ ...p, training_name: e.target.value }))} className={inp} placeholder="e.g. First Aid Certificate" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Provider / Institution</label>
            <input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className={inp} placeholder="e.g. Kenya Red Cross" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Completion Date</label>
              <input type="date" value={form.completion_date} onChange={e => setForm(p => ({ ...p, completion_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => setForm(p => ({ ...p, expiry_date: e.target.value }))} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Certificate Number</label>
            <input value={form.certificate_number} onChange={e => setForm(p => ({ ...p, certificate_number: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Payroll Tab ───────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function PayrollTab({ staff }: { staff: Person[] }) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [records,    setRecords]   = useState<PayrollData[]>([])
  const [loading,    setLoading]   = useState(true)
  const [month,      setMonth]     = useState(currentMonth)
  const [showModal,  setShowModal] = useState(false)
  const [editing,    setEditing]   = useState<PayrollData | null>(null)

  useEffect(() => {
    setLoading(true)
    listPayroll({ month }).then(setRecords).finally(() => setLoading(false))
  }, [month])

  const fmt = (v: number | null) => v != null ? `KES ${Number(v).toLocaleString()}` : '—'

  const totals = useMemo(() => ({
    gross: records.reduce((s, r) => s + (r.gross_salary ?? 0), 0),
    net:   records.reduce((s, r) => s + (r.net_salary   ?? 0), 0),
    paye:  records.reduce((s, r) => s + (r.paye         ?? 0), 0),
  }), [records])

  async function handleDelete(id: string) {
    if (!confirm('Delete this payroll record?')) return
    await deletePayroll(id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add / Edit Record</Button>
        </div>
      </div>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Gross', value: fmt(totals.gross), color: 'text-text' },
            { label: 'Total PAYE',  value: fmt(totals.paye),  color: 'text-danger' },
            { label: 'Total Net',   value: fmt(totals.net),   color: 'text-success' },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-text-muted">{s.label} — {month}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-x-auto">
        {loading ? <p className="px-4 py-6 text-sm text-text-muted">Loading…</p> : (
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>{['Staff','Gross','PAYE','NSSF','NHIF','Other Ded.','Net',''].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-surface-muted dark:hover:bg-dark-hover">
                  <td className="px-4 py-3 font-medium text-text">{r.person_name ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{fmt(r.gross_salary)}</td>
                  <td className="px-4 py-3 text-danger">{fmt(r.paye)}</td>
                  <td className="px-4 py-3 text-text-muted">{fmt(r.nssf)}</td>
                  <td className="px-4 py-3 text-text-muted">{fmt(r.nhif)}</td>
                  <td className="px-4 py-3 text-text-muted">{fmt(r.other_deductions)}</td>
                  <td className="px-4 py-3 font-semibold text-success">{fmt(r.net_salary)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(r); setShowModal(true) }} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-danger hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-text-muted text-sm">No payroll records for {month}.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {showModal && (
        <PayrollModal
          staff={staff}
          record={editing}
          month={month}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onDone={saved => {
            setRecords(prev => {
              const idx = prev.findIndex(r => r.id === saved.id)
              if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
              if (saved.month === month) return [...prev, saved]
              return prev
            })
            setShowModal(false); setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function PayrollModal({ staff, record, month, onClose, onDone }: {
  staff: Person[]; record: PayrollData | null; month: string
  onClose: () => void; onDone: (r: PayrollData) => void
}) {
  const [form, setForm] = useState({
    person_id:        record?.person_id        ?? '',
    month:            record?.month            ?? month,
    gross_salary:     record?.gross_salary     != null ? String(record.gross_salary)     : '',
    paye:             record?.paye             != null ? String(record.paye)             : '',
    nssf:             record?.nssf             != null ? String(record.nssf)             : '',
    nhif:             record?.nhif             != null ? String(record.nhif)             : '',
    other_deductions: record?.other_deductions != null ? String(record.other_deductions) : '',
    net_salary:       record?.net_salary       != null ? String(record.net_salary)       : '',
    notes:            record?.notes            ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const gross = parseFloat(form.gross_salary) || 0
  const deductions = (parseFloat(form.paye)||0) + (parseFloat(form.nssf)||0) +
    (parseFloat(form.nhif)||0) + (parseFloat(form.other_deductions)||0)
  const autoNet = gross - deductions

  async function handle() {
    if (!form.person_id || !form.month) { setError('Staff and month are required.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        person_id:        form.person_id,
        month:            form.month,
        gross_salary:     form.gross_salary     ? Number(form.gross_salary)     : null,
        paye:             form.paye             ? Number(form.paye)             : null,
        nssf:             form.nssf             ? Number(form.nssf)             : null,
        nhif:             form.nhif             ? Number(form.nhif)             : null,
        other_deductions: form.other_deductions ? Number(form.other_deductions) : null,
        net_salary:       form.net_salary       ? Number(form.net_salary)       : (autoNet > 0 ? autoNet : null),
        notes:            form.notes            || null,
      }
      const saved = await savePayroll(payload)
      onDone(saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSaving(false) }
  }

  const inp = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'
  const nf = (label: string, key: keyof typeof form) => (
    <div key={key}>
      <label className="block text-xs font-medium text-text-muted mb-1">{label}</label>
      <input type="number" value={form[key] as string}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className={inp} placeholder="0" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{record ? 'Edit Payroll Record' : 'Add Payroll Record'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Staff Member *</label>
            <select value={form.person_id} onChange={e => setForm(p => ({ ...p, person_id: e.target.value }))} className={inp}>
              <option value="">Select…</option>
              {staff.filter(s => s.status !== 'former').map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Month *</label>
            <input type="month" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {nf('Gross Salary (KES)', 'gross_salary')}
            {nf('PAYE',              'paye')}
            {nf('NSSF',              'nssf')}
            {nf('NHIF / SHA',        'nhif')}
            {nf('Other Deductions',  'other_deductions')}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Net Salary (KES)</label>
              <input type="number" value={form.net_salary}
                onChange={e => setForm(p => ({ ...p, net_salary: e.target.value }))} className={inp}
                placeholder={autoNet > 0 ? String(autoNet) : '0'} />
              {autoNet > 0 && !form.net_salary && (
                <p className="text-xs text-text-muted mt-1">Auto: KES {autoNet.toLocaleString()}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inp} />
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">Cancel</button>
          <button onClick={handle} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Org Chart Tab ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function OrgChartTab({ departments, staff }: { departments: DepartmentData[]; staff: Person[] }) {
  const activeStaff = staff.filter(p => p.status !== 'former')

  if (departments.length === 0) {
    return (
      <div className="mt-4">
        <Card className="p-12 text-center">
          <p className="text-text-muted text-sm">No departments configured. Add departments first to see the org chart.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {departments.map(dept => {
          const deptStaff = activeStaff.filter(p => p.department === dept.name)
          const head = deptStaff.find(p => p.id === dept.head_person_id)

          return (
            <Card key={dept.id} className="overflow-hidden">
              {/* Department header */}
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-b border-surface-border dark:border-dark-border">
                <p className="text-sm font-bold text-primary-700 dark:text-primary-300">{dept.name}</p>
                {dept.description && <p className="text-xs text-text-muted mt-0.5">{dept.description}</p>}
                <p className="text-xs text-text-muted mt-1">{deptStaff.length} staff</p>
              </div>

              {/* Head of Department */}
              {head && (
                <div className="px-4 py-2.5 bg-surface-muted dark:bg-dark-hover border-b border-surface-border dark:border-dark-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                      {head.first_name[0]}{head.last_name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text">{head.first_name} {head.last_name}</p>
                      <p className="text-[10px] text-text-muted">Head of Department</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff list */}
              <div className="divide-y divide-surface-border dark:divide-dark-border">
                {deptStaff.filter(p => p.id !== dept.head_person_id).map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 px-4 py-2">
                    <div className="w-6 h-6 rounded-full bg-surface-border dark:bg-dark-border flex items-center justify-center text-[10px] font-bold text-text-muted flex-shrink-0">
                      {p.first_name[0]}{p.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">{p.first_name} {p.last_name}</p>
                      {p.job_title && <p className="text-[10px] text-text-muted truncate">{p.job_title}</p>}
                    </div>
                    {staffTypeBadge(personTypeToStaffType(p.type))}
                  </div>
                ))}
                {deptStaff.length === 0 && (
                  <p className="px-4 py-3 text-xs text-text-muted italic">No staff assigned</p>
                )}
              </div>
            </Card>
          )
        })}

        {/* Unassigned staff */}
        {(() => {
          const unassigned = activeStaff.filter(p => !p.department)
          if (unassigned.length === 0) return null
          return (
            <Card key="unassigned" className="overflow-hidden">
              <div className="p-4 bg-surface-muted dark:bg-dark-hover border-b border-surface-border dark:border-dark-border">
                <p className="text-sm font-bold text-text-muted">Unassigned</p>
                <p className="text-xs text-text-muted">{unassigned.length} staff</p>
              </div>
              <div className="divide-y divide-surface-border dark:divide-dark-border">
                {unassigned.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 px-4 py-2">
                    <div className="w-6 h-6 rounded-full bg-surface-border dark:bg-dark-border flex items-center justify-center text-[10px] font-bold text-text-muted flex-shrink-0">
                      {p.first_name[0]}{p.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">{p.first_name} {p.last_name}</p>
                      {p.job_title && <p className="text-[10px] text-text-muted truncate">{p.job_title}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )
        })()}
      </div>
    </div>
  )
}
