'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { RegisterStaffModal } from '@/components/people/RegisterPersonModal'
import { FACILITY_STAFF, VENDOR_CONTRACTS, PEOPLE, DEPARTMENTS } from '@/lib/mock-data'
import type { FacilityStaffMember, VendorContract, Person, Department } from '@/lib/types'
import { cn } from '@/lib/cn'
import { grantPortalAccess, offboardPerson } from '@/lib/api/people'
import { listRoles, type AppRole } from '@/lib/api/settings'

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

function vendorStatusBadge(s: VendorContract['status']) {
  const map: Record<string, string> = {
    active:          'bg-success/10 text-success',
    expired:         'bg-danger/10 text-danger',
    terminated:      'bg-surface-border text-text-muted',
    pending_renewal: 'bg-warning/10 text-warning',
  }
  return <span className={cn('text-xs px-2 py-0.5 rounded font-medium', map[s] ?? '')}>{s.replace('_', ' ')}</span>
}

// ── StaffCard ──────────────────────────────────────────────────────────────

function StaffCard({
  member, person, deptName,
}: { member: FacilityStaffMember; person: Person | undefined; deptName: string }) {
  const name     = person ? `${person.first_name} ${person.last_name}` : 'Unknown'
  const initials = person ? `${person.first_name[0]}${person.last_name[0]}` : '?'

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{name}</p>
            <p className="text-xs text-text-muted">{member.job_title}</p>
            <p className="text-xs text-text-muted">{deptName}</p>
          </div>
        </div>
        {staffTypeBadge(member.staff_type)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-xs text-text-muted">
        <span>Since: {member.start_date}</span>
        {member.end_date        && <span className="text-warning">Ends: {member.end_date}</span>}
        {member.probation_end_date && <span className="text-warning col-span-2">Probation ends: {member.probation_end_date}</span>}
      </div>

      <div className="flex items-center justify-between border-t border-surface-border dark:border-dark-border pt-2">
        <div className="flex gap-2">
          {contractStatusBadge(member.contract_status)}
          {member.background_check_done
            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">✓ BGC</span>
            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">⚠ BGC Pending</span>}
        </div>
        <CanDo action="write" resource={{ type: 'person' }}>
          <a href="/people" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View in People →</a>
        </CanDo>
      </div>
      {member.notes && (
        <p className="text-xs text-text-muted italic border-t border-surface-border dark:border-dark-border pt-2">{member.notes}</p>
      )}
    </Card>
  )
}

// ── DepartmentCard ─────────────────────────────────────────────────────────

function DepartmentCard({
  dept, staff, vendors, personMap,
}: {
  dept: Department
  staff: FacilityStaffMember[]
  vendors: VendorContract[]
  personMap: Map<string, Person>
}) {
  const head       = dept.head_person_id ? personMap.get(dept.head_person_id) : undefined
  const headName   = head ? `${head.first_name} ${head.last_name}` : 'No head assigned'
  const vendorCost = vendors.reduce((s, v) => s + (v.status === 'active' ? v.monthly_value : 0), 0)
  const totalCost  = (dept.budget_monthly ?? 0)

  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-text">{dept.name}</h3>
          {dept.description && <p className="text-xs text-text-muted mt-0.5 max-w-xs">{dept.description}</p>}
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-text-muted">
            <span>👤</span>
            <span className="font-medium text-text">{headName}</span>
            <span className="text-text-muted">· Head</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <p className="text-lg font-bold text-primary-600">KES {totalCost.toLocaleString()}</p>
          <p className="text-[10px] text-text-muted">Monthly budget</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-surface-border dark:border-dark-border">
        {[
          { label: 'Direct Staff',  value: staff.length },
          { label: 'Vendor Contracts', value: vendors.length },
          { label: 'Vendor Cost',   value: vendorCost > 0 ? `KES ${vendorCost.toLocaleString()}` : '—' },
        ].map(s => (
          <div key={s.label} className="p-3 text-center border-r last:border-r-0 border-surface-border dark:border-dark-border">
            <p className="text-sm font-bold text-text">{s.value}</p>
            <p className="text-[10px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Expandable staff list */}
      {(staff.length > 0 || vendors.length > 0) && (
        <div className="border-t border-surface-border dark:border-dark-border">
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full px-4 py-2 text-xs text-primary-600 dark:text-primary-400 hover:bg-surface-muted dark:hover:bg-dark-hover text-left transition-colors flex items-center justify-between"
          >
            <span>{expanded ? 'Hide details' : 'Show staff & vendors'}</span>
            <span>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div className="px-4 pb-4 space-y-2">
              {staff.map(s => {
                const p = personMap.get(s.person_id)
                const name = p ? `${p.first_name} ${p.last_name}` : 'Unknown'
                return (
                  <div key={s.id} className="flex items-center justify-between text-xs py-1 border-b border-surface-border dark:border-dark-border last:border-0">
                    <div>
                      <span className="font-medium text-text">{name}</span>
                      <span className="text-text-muted ml-2">{s.job_title}</span>
                    </div>
                    {staffTypeBadge(s.staff_type)}
                  </div>
                )
              })}
              {vendors.map(v => (
                <div key={v.id} className="flex items-center justify-between text-xs py-1 border-b border-surface-border dark:border-dark-border last:border-0">
                  <div>
                    <span className="font-medium text-text">{v.vendor_name}</span>
                    <span className="text-text-muted ml-2">{v.service_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">KES {v.monthly_value.toLocaleString()}/mo</span>
                    {vendorStatusBadge(v.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── VendorRow ──────────────────────────────────────────────────────────────

function VendorRow({ vendor, deptName }: { vendor: VendorContract; deptName: string }) {
  const isExpiringSoon = vendor.status === 'active' &&
    new Date(vendor.contract_end) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  return (
    <div className="flex items-start justify-between p-4 border-b border-surface-border dark:border-dark-border last:border-b-0 hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-text">{vendor.vendor_name}</p>
          {vendorStatusBadge(vendor.status)}
          {isExpiringSoon && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Expiring soon</span>}
          {deptName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium">{deptName}</span>}
        </div>
        <p className="text-xs text-text-muted">{vendor.service_type} · {vendor.contact_person} · {vendor.contact_phone}</p>
        <p className="text-xs text-text-muted mt-0.5">{vendor.contract_start} → {vendor.contract_end} · KES {vendor.monthly_value.toLocaleString()}/mo</p>
        {vendor.notes && <p className="text-xs text-text-muted italic mt-1">{vendor.notes}</p>}
      </div>
      <CanDo action="write" resource={{ type: 'system_config' }}>
        <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline ml-4 flex-shrink-0">Edit</button>
      </CanDo>
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

// ── Grant Portal Access Modal ───────────────────────────────────────────────

function GrantAccessModal({
  person,
  onClose,
}: { person: Person; onClose: () => void }) {
  const [roles, setRoles]     = useState<AppRole[]>([])
  const [roleName, setRole]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
            <button onClick={onClose} className="w-full py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
              Done
            </button>
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
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">
                Cancel
              </button>
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
  )
}

// ── Offboard Modal ──────────────────────────────────────────────────────────

function OffboardModal({
  person,
  onClose,
  onDone,
}: { person: Person; onClose: () => void; onDone: (updated: Person) => void }) {
  const [exitDate,   setExitDate]   = useState('')
  const [exitReason, setExitReason] = useState('')
  const [exitNotes,  setExitNotes]  = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const EXIT_REASONS = [
    { value: 'resigned',       label: 'Resigned' },
    { value: 'terminated',     label: 'Terminated' },
    { value: 'contract_end',   label: 'Contract End' },
    { value: 'retired',        label: 'Retired' },
    { value: 'other',          label: 'Other' },
  ]

  async function handle() {
    if (!exitDate || !exitReason) { setError('Exit date and reason are required.'); return }
    setSaving(true); setError('')
    try {
      const updated = await offboardPerson(person.id, { exitDate, exitReason, exitNotes })
      onDone({
        ...person,
        status: 'former',
        exit_date:   updated.exit_date   ?? exitDate,
        exit_reason: updated.exit_reason ?? exitReason,
        exit_notes:  updated.exit_notes  ?? exitNotes,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to offboard.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">
            Cancel
          </button>
          <button onClick={handle} disabled={saving}
            className="flex-1 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
            {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {saving ? 'Processing…' : 'Confirm Offboard'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── LivePersonCard — for backend-registered staff ───────────────────────────

function LivePersonCard({ person, onUpdate }: { person: Person; onUpdate: (p: Person) => void }) {
  const name     = `${person.first_name} ${person.last_name}`
  const initials = `${person.first_name[0]}${person.last_name[0]}`
  const staffType = personTypeToStaffType(person.type)
  const [showGrant,    setShowGrant]    = useState(false)
  const [showOffboard, setShowOffboard] = useState(false)

  const isActive = person.status === 'active' || person.status === 'pending_verification'
  const hasEmail = !!person.email

  return (
    <>
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-text">{name}</p>
              {person.job_title
                ? <p className="text-xs text-text-muted">{person.job_title}{person.department ? ` — ${person.department}` : ''}</p>
                : person.agency_name
                  ? <p className="text-xs text-text-muted">{person.agency_name}</p>
                  : <p className="text-xs text-text-muted italic">No role assigned</p>}
              {person.phone && <p className="text-xs text-text-muted">{person.phone}</p>}
            </div>
          </div>
          {staffTypeBadge(staffType)}
        </div>

        {/* Employment details */}
        <div className="text-xs text-text-muted space-y-0.5">
          {person.start_date && <span className="block">Since: {person.start_date}</span>}
          {person.end_date && <span className="block text-warning">Ends: {person.end_date}</span>}
          {person.probation_end_date && <span className="block text-warning">Probation ends: {person.probation_end_date}</span>}
          {!person.start_date && person.joined_date && <span className="block">Joined: {person.joined_date}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-surface-border dark:border-dark-border pt-2">
          {person.contract_status && contractStatusBadge(person.contract_status as 'active' | 'probation' | 'expired' | 'terminated')}
          {personStatusBadge(person.status)}
          {person.background_check_done
            ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">✓ BGC</span>
            : <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">⚠ BGC Pending</span>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-surface-border dark:border-dark-border pt-2">
          <a href="/people" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View in People →</a>
          <CanDo action="write" resource={{ type: 'person' }}>
            <div className="flex items-center gap-2">
              {isActive && hasEmail && person.status !== 'former' && (
                <button onClick={() => setShowGrant(true)}
                  className="text-xs px-2 py-1 rounded border border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                  Grant Access
                </button>
              )}
              {isActive && (
                <button onClick={() => setShowOffboard(true)}
                  className="text-xs px-2 py-1 rounded border border-danger/30 text-danger hover:bg-danger/5 transition-colors">
                  Offboard
                </button>
              )}
            </div>
          </CanDo>
        </div>
        {person.exit_reason && (
          <p className="text-xs text-text-muted italic border-t border-surface-border dark:border-dark-border pt-2">
            Exited: {person.exit_reason.replace(/_/g, ' ')}{person.exit_date ? ` on ${person.exit_date}` : ''}
          </p>
        )}
      </Card>

      {showGrant && (
        <GrantAccessModal person={person} onClose={() => setShowGrant(false)} />
      )}
      {showOffboard && (
        <OffboardModal
          person={person}
          onClose={() => setShowOffboard(false)}
          onDone={updated => { onUpdate(updated); setShowOffboard(false) }}
        />
      )}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function HRPageClient({ initialStaff }: { initialStaff?: Person[] } = {}) {
  const [search,       setSearch]      = useState('')
  const [typeFilter,   setType]        = useState('all')
  const [deptFilter,   setDeptFilter]  = useState('all')
  const [showRegister, setShowRegister] = useState(false)

  // Live staff: backend records take precedence; fall back to mock if backend unavailable
  const [liveStaff, setLiveStaff] = useState<Person[]>(initialStaff ?? [])
  const hasBackendData = initialStaff !== undefined

  function handleStaffRegistered(p: Person) {
    setLiveStaff(prev => [p, ...prev])
  }

  function handleStaffUpdated(updated: Person) {
    setLiveStaff(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  // Build person map: merge backend staff + mock people (for FacilityStaffMember lookups)
  const personMap = useMemo(() => {
    const m = new Map<string, Person>()
    PEOPLE.forEach(p => m.set(p.id, p))
    liveStaff.forEach(p => m.set(p.id, p))
    return m
  }, [liveStaff])

  const deptMap = useMemo(() => {
    const m = new Map<string, Department>()
    DEPARTMENTS.forEach(d => m.set(d.id, d))
    return m
  }, [])

  const deptFilterOptions = useMemo(() => [
    { value: 'all', label: 'All Departments' },
    ...DEPARTMENTS.map(d => ({ value: d.id, label: d.name })),
  ], [])

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase()
    return FACILITY_STAFF.filter(s => {
      const person   = personMap.get(s.person_id)
      const fullName = person ? `${person.first_name} ${person.last_name}`.toLowerCase() : ''
      const deptName = (deptMap.get(s.department_id)?.name ?? '').toLowerCase()
      const matchSearch = !q || fullName.includes(q) || s.job_title.toLowerCase().includes(q) || deptName.includes(q)
      const matchType   = typeFilter === 'all' || s.staff_type === typeFilter
      const matchDept   = deptFilter === 'all' || s.department_id === deptFilter
      return matchSearch && matchType && matchDept
    })
  }, [search, typeFilter, deptFilter, personMap, deptMap])

  const filteredLiveStaff = useMemo(() => {
    const q = search.toLowerCase()
    return liveStaff.filter(p => {
      const fullName  = `${p.first_name} ${p.last_name}`.toLowerCase()
      const matchSearch = !q || fullName.includes(q) || (p.agency_name ?? '').toLowerCase().includes(q)
      const staffType   = personTypeToStaffType(p.type)
      const matchType   = typeFilter === 'all' || staffType === typeFilter
      return matchSearch && matchType
    })
  }, [search, typeFilter, liveStaff])

  const stats = useMemo(() => ({
    permanent:    FACILITY_STAFF.filter(s => s.staff_type === 'permanent').length
                  + liveStaff.filter(p => p.type === 'permanent_staff').length,
    casual:       FACILITY_STAFF.filter(s => s.staff_type === 'casual').length
                  + liveStaff.filter(p => p.type === 'casual_staff').length,
    outsourced:   PEOPLE.filter(p => p.is_outsourced).length
                  + liveStaff.filter(p => p.is_outsourced).length,
    bgcPending:   FACILITY_STAFF.filter(s => !s.background_check_done).length
                  + liveStaff.filter(p => !p.background_check_done).length,
    probation:    FACILITY_STAFF.filter(s => s.contract_status === 'probation').length
                  + liveStaff.filter(p => p.contract_status === 'probation').length,
    activeVendors: VENDOR_CONTRACTS.filter(v => v.status === 'active').length,
  }), [liveStaff])

  return (
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
        <TabsList>
          <TabsTrigger value="departments">Departments ({DEPARTMENTS.length})</TabsTrigger>
          <TabsTrigger value="facility-staff">Facility Staff ({FACILITY_STAFF.length + liveStaff.length})</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Contracts ({VENDOR_CONTRACTS.length})</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        {/* ── Departments ── */}
        <TabsContent value="departments">
          <div className="space-y-4 mt-4">
            <div className="flex justify-end">
              <CanDo action="settings.modify" resource={{ type: 'system_config' }}>
                <Button size="sm" variant="outline">+ Add Department</Button>
              </CanDo>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {DEPARTMENTS.map(dept => (
                <DepartmentCard
                  key={dept.id}
                  dept={dept}
                  staff={FACILITY_STAFF.filter(s => s.department_id === dept.id)}
                  vendors={VENDOR_CONTRACTS.filter(v => v.department_id === dept.id)}
                  personMap={personMap}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Facility Staff ── */}
        <TabsContent value="facility-staff">
          <div className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search staff…" className="w-56" />
              <Select value={deptFilter} onChange={setDeptFilter} options={deptFilterOptions} className="w-44" />
              <Select value={typeFilter} onChange={setType} options={TYPE_OPTIONS} className="w-36" />
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
                Agency-managed outsourced staff appear in People and Vendor Contracts — not here.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map(s => (
                <StaffCard
                  key={s.id}
                  member={s}
                  person={personMap.get(s.person_id)}
                  deptName={deptMap.get(s.department_id)?.name ?? '—'}
                />
              ))}
              {filteredLiveStaff.map(p => (
                <LivePersonCard key={p.id} person={p} onUpdate={handleStaffUpdated} />
              ))}
              {filteredStaff.length === 0 && filteredLiveStaff.length === 0 && (
                <div className="col-span-3 py-12 text-center text-text-muted text-sm">No staff match the current filters.</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Vendor Contracts ── */}
        <TabsContent value="vendors">
          <div className="mt-4 space-y-3">
            <div className="flex justify-end">
              <CanDo action="write" resource={{ type: 'system_config' }}>
                <Button size="sm">+ Add Vendor</Button>
              </CanDo>
            </div>
            <Card className="overflow-hidden">
              {VENDOR_CONTRACTS.map(v => (
                <VendorRow
                  key={v.id}
                  vendor={v}
                  deptName={v.department_id ? (deptMap.get(v.department_id)?.name ?? '') : ''}
                />
              ))}
            </Card>
          </div>
        </TabsContent>

        {/* ── Onboarding ── */}
        <TabsContent value="onboarding">
          <div className="mt-4">
            <Card className="p-12 text-center max-w-md mx-auto">
              <p className="text-4xl mb-4">📋</p>
              <h3 className="text-base font-semibold text-text mb-2">Staff Onboarding Workflows</h3>
              <p className="text-sm text-text-muted mb-4">
                Guided checklists for new staff: ID verification, background check, access provisioning, equipment issue, and induction sign-off.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                Coming in next release
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <RegisterStaffModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onRegister={handleStaffRegistered}
      />
    </div>
  )
}
