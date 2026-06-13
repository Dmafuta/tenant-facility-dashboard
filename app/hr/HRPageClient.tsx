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

      <div className="grid grid-cols-2 gap-x-4 text-xs text-text-muted">
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
      <div className="grid grid-cols-3 border-t border-surface-border dark:border-dark-border">
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
  { value: 'all',       label: 'All Types'  },
  { value: 'permanent', label: 'Permanent'  },
  { value: 'casual',    label: 'Casual'     },
]

// ── Main component ─────────────────────────────────────────────────────────

export function HRPageClient() {
  const [search,       setSearch]      = useState('')
  const [typeFilter,   setType]        = useState('all')
  const [deptFilter,   setDeptFilter]  = useState('all')
  const [showRegister, setShowRegister] = useState(false)

  const personMap = useMemo(() => {
    const m = new Map<string, Person>()
    PEOPLE.forEach(p => m.set(p.id, p))
    return m
  }, [])

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

  const stats = useMemo(() => ({
    permanent:    FACILITY_STAFF.filter(s => s.staff_type === 'permanent').length,
    casual:       FACILITY_STAFF.filter(s => s.staff_type === 'casual').length,
    outsourced:   PEOPLE.filter(p => p.is_outsourced).length,
    bgcPending:   FACILITY_STAFF.filter(s => !s.background_check_done).length,
    probation:    FACILITY_STAFF.filter(s => s.contract_status === 'probation').length,
    activeVendors: VENDOR_CONTRACTS.filter(v => v.status === 'active').length,
  }), [])

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
          <TabsTrigger value="facility-staff">Facility Staff ({FACILITY_STAFF.length})</TabsTrigger>
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
              {filteredStaff.length === 0 && (
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

      <RegisterStaffModal open={showRegister} onClose={() => setShowRegister(false)} />
    </div>
  )
}
