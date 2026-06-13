'use client'
import { useState, useMemo } from 'react'
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
  RegisterStaffModal,
} from '@/components/people/RegisterPersonModal'
import {
  TenantExitModal,
  OwnerExitModal,
  StaffExitModal,
} from '@/components/people/ExitModals'
import {
  PEOPLE, UNITS, LEASES,
  VEHICLES, HOUSEHOLD_MEMBERS, EMERGENCY_CONTACTS, PERSONAL_STAFF,
  FACILITY_STAFF,
} from '@/lib/mock-data'
import type {
  Person, PersonType, KycStatus,
  Vehicle, HouseholdMember, EmergencyContact, PersonalStaff,
} from '@/lib/types'
import { cn } from '@/lib/cn'

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

// ── Household sub-panels ───────────────────────────────────────────────────

function VehiclesPanel({ personId }: { personId: string }) {
  const person = PEOPLE.find(p => p.id === personId)
  const unitIds = person?.unit_ids ?? []
  const vehicles = VEHICLES.filter(v =>
    v.registered_to_person_id === personId || unitIds.includes(v.unit_id)
  )
  if (vehicles.length === 0) return (
    <div className="py-8 text-center text-sm text-text-muted">No vehicles registered for this household.</div>
  )
  return (
    <div className="space-y-2 p-4">
      {vehicles.map(v => (
        <div key={v.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{vehicleTypeIcon(v.vehicle_type)}</span>
              <div>
                <p className="text-sm font-semibold text-text">{v.year} {v.make} {v.model}</p>
                <p className="text-xs text-text-muted">{v.color}</p>
              </div>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
              v.status === 'active' ? 'bg-success/10 text-success' :
              v.status === 'suspended' ? 'bg-warning/10 text-warning' :
              v.status === 'blacklisted' ? 'bg-danger/10 text-danger' :
              'bg-surface-border text-text-muted'
            )}>{v.status}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-text-muted">
            <span>Plate: <span className="font-mono font-medium text-text">{v.plate_number}</span></span>
            {v.sticker_number && <span>Sticker: <span className="font-medium text-text">{v.sticker_number}</span></span>}
            <span>Registered: {v.registered_date}</span>
            {v.insurance_expiry && (
              <span className={cn(new Date(v.insurance_expiry) < new Date() ? 'text-danger font-medium' : '')}>
                Insur. expires: {v.insurance_expiry}
              </span>
            )}
          </div>
          {v.notes && <p className="mt-1 text-xs text-text-muted italic">{v.notes}</p>}
        </div>
      ))}
      <CanDo action="write" resource={{ type: 'unit' }}>
        <Button size="sm" variant="outline" className="w-full mt-1">+ Register Vehicle</Button>
      </CanDo>
    </div>
  )
}

function HouseholdMembersPanel({ personId }: { personId: string }) {
  const person = PEOPLE.find(p => p.id === personId)
  const unitId = person?.unit_ids[0]
  const members = HOUSEHOLD_MEMBERS.filter(m => m.unit_id === unitId)
  if (members.length === 0) return (
    <div className="py-8 text-center text-sm text-text-muted">No household members registered.</div>
  )
  return (
    <div className="space-y-2 p-4">
      {members.map(m => (
        <div key={m.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                {m.first_name[0]}{m.last_name[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-text">{m.first_name} {m.last_name}</p>
                <p className="text-xs text-text-muted capitalize">{m.relationship}{m.is_minor ? ' · Minor' : ''}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {m.can_authorize_visitors && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium">Can Authorize</span>
              )}
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                m.status === 'active' ? 'bg-success/10 text-success' : 'bg-surface-border text-text-muted'
              )}>{m.status}</span>
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
        <Button size="sm" variant="outline" className="w-full mt-1">+ Add Family Member</Button>
      </CanDo>
    </div>
  )
}

function EmergencyContactsPanel({ personId }: { personId: string }) {
  const contacts = EMERGENCY_CONTACTS.filter(c => c.person_id === personId)
  if (contacts.length === 0) return (
    <div className="py-8 text-center text-sm text-text-muted">No emergency contacts on file.</div>
  )
  return (
    <div className="space-y-2 p-4">
      {contacts.sort((a, b) => a.priority - b.priority).map(c => (
        <div key={c.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-danger/10 text-danger text-[10px] font-bold flex items-center justify-center flex-shrink-0">{c.priority}</span>
                <p className="text-sm font-semibold text-text">{c.name}</p>
              </div>
              <p className="text-xs text-text-muted ml-7">{c.relationship}</p>
            </div>
          </div>
          <div className="mt-2 ml-7 space-y-0.5 text-xs text-text-muted">
            <p>📞 {c.phone_primary}{c.phone_secondary ? ` · ${c.phone_secondary}` : ''}</p>
            {c.email && <p>✉️ {c.email}</p>}
            {c.address && <p>📍 {c.address}</p>}
            {c.notes && <p className="italic">{c.notes}</p>}
          </div>
        </div>
      ))}
      <CanDo action="write" resource={{ type: 'person' }}>
        <Button size="sm" variant="outline" className="w-full mt-1">+ Add Emergency Contact</Button>
      </CanDo>
    </div>
  )
}

function PersonalStaffPanel({ personId }: { personId: string }) {
  const staffList = PERSONAL_STAFF.filter(s => s.employer_person_id === personId)
  if (staffList.length === 0) return (
    <div className="py-8 text-center text-sm text-text-muted">No personal staff registered.</div>
  )
  return (
    <div className="space-y-2 p-4">
      {staffList.map(s => (
        <div key={s.id} className="p-3 rounded-lg border border-surface-border dark:border-dark-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-text">{s.first_name} {s.last_name}</p>
              <p className="text-xs text-text-muted">{staffRoleLabel(s.role)}</p>
            </div>
            <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
              s.status === 'active' ? 'bg-success/10 text-success' :
              s.status === 'suspended' ? 'bg-warning/10 text-warning' :
              'bg-danger/10 text-danger'
            )}>{s.status}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 text-xs text-text-muted">
            <span>ID: {s.national_id}</span>
            <span>{s.phone}</span>
            <span>Access: {s.access_days.replace('_', ' ')}</span>
            {s.access_hours_start && <span>{s.access_hours_start} – {s.access_hours_end}</span>}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            {s.background_check_done
              ? <span className="text-success">✓ Background check done ({s.background_check_date})</span>
              : <span className="text-warning font-medium">⚠ Background check pending</span>}
          </div>
          {s.notes && <p className="mt-1 text-xs text-text-muted italic">{s.notes}</p>}
          <div className="mt-2 pt-2 border-t border-surface-border dark:border-dark-border text-[11px] text-text-muted flex items-center gap-1.5">
            <span>🔐</span>
            <span>Gate pass managed via <span className="text-primary-600 dark:text-primary-400 font-medium">Access Control (Pro)</span></span>
          </div>
        </div>
      ))}
      <CanDo action="write" resource={{ type: 'person' }}>
        <Button size="sm" variant="outline" className="w-full mt-1">+ Register Personal Staff</Button>
      </CanDo>
    </div>
  )
}

// ── PersonDetail ───────────────────────────────────────────────────────────

function PersonDetail({ person, onExit }: { person: Person; onExit: () => void }) {
  const initials     = `${person.first_name[0]}${person.last_name[0]}`
  const ownedUnits   = UNITS.filter(u => u.owners.some(o => o.person_id === person.id))
  const activeLeases = LEASES.filter(l => l.tenant_id === person.id && l.status === 'active')
  const isResident   = ['resident_owner','tenant'].includes(person.type)
  const isTenant     = person.type === 'tenant'
  const isOwner      = person.type === 'resident_owner' || person.type === 'non_resident_owner'
  const isStaffType  = person.type === 'permanent_staff' || person.type === 'casual_staff'

  // Reveal state
  const [revealTarget, setRevealTarget] = useState<{ field: MaskableFieldType; label: string } | null>(null)
  const [revealedFields, setRevealedFields] = useState<Set<MaskableFieldType>>(new Set())

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

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-surface-border dark:border-dark-border">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
            {initials}
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
                ? <span className="text-[10px] text-success font-medium">✅ Verified</span>
                : <span className="text-[10px] text-warning font-medium">⚠ Unverified</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant={TYPE_BADGE[person.type].variant}>{TYPE_BADGE[person.type].label}</Badge>
              <Badge variant={person.status === 'active' ? 'primary' : 'danger'}>{person.status}</Badge>
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
          {isResident && <TabsTrigger value="household">Household</TabsTrigger>}
          {isResident && <TabsTrigger value="vehicles">Vehicles</TabsTrigger>}
          {isResident && <TabsTrigger value="staff">Personal Staff</TabsTrigger>}
          {isResident && <TabsTrigger value="emergency">Emergency</TabsTrigger>}
        </TabsList>

        {/* ── Profile tab ── */}
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

            {/* Outsourced staff agency info */}
            {person.is_outsourced && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-1 text-sm">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Agency Details</p>
                <p className="text-text">{person.agency_name ?? '—'}</p>
                {person.agency_contact && <p className="text-text-muted text-xs">{person.agency_contact}</p>}
                {person.agency_clearance_ref && <p className="text-text-muted text-xs">Clearance ref: {person.agency_clearance_ref}</p>}
                <p className="text-[11px] text-amber-600 mt-1 font-medium">Gate access only — no portal account</p>
              </div>
            )}

            {ownedUnits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Owned Units</p>
                <div className="space-y-2">
                  {ownedUnits.map(unit => {
                    const ownerRecord = unit.owners.find(o => o.person_id === person.id)!
                    return (
                      <div key={unit.id} className="flex items-center justify-between p-3 bg-surface-muted dark:bg-dark-hover rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-text">Block {unit.block}-{unit.number}</p>
                            {ownerRecord.is_primary && (
                              <span className="text-[10px] font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-1.5 py-0.5 rounded">Primary</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted capitalize">{unit.use_type} · {unit.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary-600">{ownerRecord.share_percent}%</p>
                          <p className="text-xs text-text-muted">KES {unit.monthly_rate.toLocaleString()}/mo</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
                      <span>Rent: KES {lease.monthly_rent.toLocaleString()}</span>
                      <span>Deposit: KES {lease.deposit.toLocaleString()}</span>
                      <span>Start: {lease.start_date}</span>
                      <span>End: {lease.end_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Action buttons ───────────────────────────────────── */}
            <div className="pt-3 border-t border-surface-border dark:border-dark-border space-y-2">
              {/* Utility row — side by side */}
              <div className="grid grid-cols-2 gap-2">
                <CanDo action="write" resource={{ type: 'person', id: person.id }}>
                  <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors w-full">
                    <span>✏️</span> Edit Profile
                  </button>
                </CanDo>
                <CanDo action="access.grant" resource={{ type: 'access_credential' }}>
                  <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors w-full">
                    <span>🔐</span> Manage Access
                  </button>
                </CanDo>
              </div>

              {/* Context-aware exit action */}
              <CanDo action="write" resource={{ type: 'person', id: person.id }} fallback={null}>
                {isTenant && (
                  <button onClick={onExit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                    <span>↩</span> Move Out / Transfer Unit
                  </button>
                )}
                {isOwner && (
                  <button onClick={onExit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                    <span>💰</span> Sell / Transfer Unit
                  </button>
                )}
                {isStaffType && (
                  <button onClick={onExit}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                    <span>📋</span> End Contract
                  </button>
                )}
              </CanDo>
            </div>
          </div>
        </TabsContent>

        {isResident && (
          <TabsContent value="household">
            <HouseholdMembersPanel personId={person.id} />
          </TabsContent>
        )}
        {isResident && (
          <TabsContent value="vehicles">
            <VehiclesPanel personId={person.id} />
          </TabsContent>
        )}
        {isResident && (
          <TabsContent value="staff">
            <PersonalStaffPanel personId={person.id} />
          </TabsContent>
        )}
        {isResident && (
          <TabsContent value="emergency">
            <EmergencyContactsPanel personId={person.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ── PersonRow ──────────────────────────────────────────────────────────────

function PersonRow({ person, selected, onClick }: { person: Person; selected: boolean; onClick: () => void }) {
  const initials     = `${person.first_name[0]}${person.last_name[0]}`
  const vehicleCount = VEHICLES.filter(v => v.registered_to_person_id === person.id).length
  const staffCount   = PERSONAL_STAFF.filter(s => s.employer_person_id === person.id).length

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-surface-border dark:border-dark-border last:border-b-0',
        selected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-surface-muted dark:hover:bg-dark-hover'
      )}
    >
      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {person.first_name} {person.last_name}
        </p>
        <p className="text-xs text-text-muted truncate">{person.email}</p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge variant={TYPE_BADGE[person.type].variant} className="text-[10px]">
          {TYPE_BADGE[person.type].label}
        </Badge>
        <div className="flex gap-2 text-[10px] text-text-muted">
          {vehicleCount > 0 && <span>🚗 {vehicleCount}</span>}
          {staffCount   > 0 && <span>👤 {staffCount}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function PeoplePageClient() {
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Person | null>(null)

  const [showTenant,    setShowTenant]    = useState(false)
  const [showOwner,     setShowOwner]     = useState(false)
  const [showCorporate, setShowCorporate] = useState(false)
  const [showStaff,     setShowStaff]     = useState(false)
  const [showRegMenu,   setShowRegMenu]   = useState(false)
  const [showExit,      setShowExit]      = useState(false)

  const owners  = useMemo(() => PEOPLE.filter(p => p.type === 'resident_owner' || p.type === 'non_resident_owner'), [])
  const tenants = useMemo(() => PEOPLE.filter(p => p.type === 'tenant' || p.type === 'short_stay_guest'), [])
  const staff   = useMemo(() => PEOPLE.filter(p => ['permanent_staff','casual_staff','outsourced'].includes(p.type)), [])

  const filterPeople = (list: Person[]) => {
    const q = search.toLowerCase()
    if (!q) return list
    return list.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.email ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').includes(q)
    )
  }

  return (
    <>
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 border-r border-surface-border dark:border-dark-border flex flex-col">
        <div className="p-3 border-b border-surface-border dark:border-dark-border space-y-2">
          <SearchInput placeholder="Search people..." value={search} onChange={setSearch} />
          {/* Register dropdown */}
          <div className="relative">
            <CanDo action="write" resource={{ type: 'person' }}>
              <button
                onClick={() => setShowRegMenu(m => !m)}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                + Register Person ▾
              </button>
            </CanDo>
            {showRegMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-xl shadow-lg overflow-hidden">
                {[
                  { label: '🏠 Tenant',           action: () => { setShowTenant(true);    setShowRegMenu(false) } },
                  { label: '👤 Individual Owner', action: () => { setShowOwner(true);     setShowRegMenu(false) } },
                  { label: '🏢 Corporate Owner',  action: () => { setShowCorporate(true); setShowRegMenu(false) } },
                  { label: '👷 Staff Member',     action: () => { setShowStaff(true);     setShowRegMenu(false) } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors border-b border-surface-border dark:border-dark-border last:border-b-0"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="owners" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="px-4 flex-shrink-0">
            <TabsTrigger value="owners">Owners ({owners.length})</TabsTrigger>
            <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="owners" className="flex-1 overflow-y-auto">
            {filterPeople(owners).map(p => (
              <PersonRow key={p.id} person={p} selected={selected?.id === p.id} onClick={() => setSelected(p)} />
            ))}
          </TabsContent>
          <TabsContent value="tenants" className="flex-1 overflow-y-auto">
            {filterPeople(tenants).map(p => (
              <PersonRow key={p.id} person={p} selected={selected?.id === p.id} onClick={() => setSelected(p)} />
            ))}
          </TabsContent>
          <TabsContent value="staff" className="flex-1 overflow-y-auto">
            {filterPeople(staff).map(p => (
              <PersonRow key={p.id} person={p} selected={selected?.id === p.id} onClick={() => setSelected(p)} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selected ? (
          <PersonDetail person={selected} onExit={() => setShowExit(true)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <p className="text-4xl mb-3">👥</p>
              <p className="text-text font-medium mb-1">Select a person</p>
              <p className="text-sm text-text-muted">
                Choose a resident, owner, or staff member to view their profile, household, vehicles, and more.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    <RegisterTenantModal         open={showTenant}    onClose={() => setShowTenant(false)}    />
    <RegisterOwnerModal          open={showOwner}     onClose={() => setShowOwner(false)}     />
    <RegisterCorporateOwnerModal open={showCorporate} onClose={() => setShowCorporate(false)} />
    <RegisterStaffModal          open={showStaff}     onClose={() => setShowStaff(false)}     />

    {/* Exit modals — conditional on selected person type */}
    {selected?.type === 'tenant' && (
      <TenantExitModal
        open={showExit}
        onClose={() => setShowExit(false)}
        personName={`${selected.first_name} ${selected.last_name}`}
        currentUnit={LEASES.find(l => l.tenant_id === selected.id && l.status === 'active')?.unit_label ?? '—'}
      />
    )}
    {(selected?.type === 'resident_owner' || selected?.type === 'non_resident_owner') && (
      <OwnerExitModal
        open={showExit}
        onClose={() => setShowExit(false)}
        personName={`${selected.first_name} ${selected.last_name}`}
        ownedUnitLabels={UNITS.filter(u => u.owners?.some(o => o.person_id === selected.id)).map(u => `Block ${u.block}-${u.number}`)}
      />
    )}
    {(selected?.type === 'permanent_staff' || selected?.type === 'casual_staff') && (
      <StaffExitModal
        open={showExit}
        onClose={() => setShowExit(false)}
        personName={`${selected.first_name} ${selected.last_name}`}
        jobTitle={FACILITY_STAFF.find(s => s.person_id === selected.id)?.job_title ?? ''}
        contractType={selected.type === 'permanent_staff' ? 'Permanent' : 'Casual'}
      />
    )}
    </>
  )
}
