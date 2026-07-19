'use client'
import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import {
  Settings as SettingsIcon, Building2, CreditCard, Bell, Palette,
  Plug, FileText, Database, ShieldCheck, AlertTriangle, Users as UsersIcon, Shield,
} from 'lucide-react'
import { IntegrationsPageClient } from '@/app/integrations/IntegrationsPageClient'
import { cn } from '@/lib/cn'
import { PhoneInput } from '@/components/ui/PhoneInput'
import {
  getOpeningBalances, createOpeningBalance, updateOpeningBalance, voidOpeningBalance,
  parseOpeningBalanceExcel, bulkImportOpeningBalances,
  type OpeningBalance, type ExcelPreviewRow,
} from '@/lib/api/opening-balances'
import { getUnitsFromApi, type UnitData } from '@/lib/api/units'
import {
  getSettings, updateSettings, listSystemUsers, listSystemUsersPaged, inviteUser, updateSystemUser, deactivateSystemUser, resendInvite,
  listRoles, createRole, updateRole, deleteRole,
  type FacilitySettings, type SystemUser, type AppRole, type RolePermission,
} from '@/lib/api/settings'
import { DangerSection } from '@/app/settings/sections/DangerSection'
import { FacilitySection } from '@/app/settings/sections/FacilitySection'
import { NotificationsSection } from '@/app/settings/sections/NotificationsSection'
import { BillingSection } from '@/app/settings/sections/BillingSection'
import { BrandingSection } from '@/app/settings/sections/BrandingSection'
import { DocumentsSection } from '@/app/settings/sections/DocumentsSection'
import { GeneralSection } from '@/app/settings/sections/GeneralSection'
import { DataSection } from '@/app/settings/sections/DataSection'
import { IntegrationsSection } from '@/app/settings/sections/IntegrationsSection'
import { SecuritySection } from '@/app/settings/sections/SecuritySection'

// ── Shared design components ───────────────────────────────────────────────────
function SectionHeader({ title, subtitle, badge }: { title: string; subtitle: string; badge?: React.ReactNode }) {
  return (
    <div className="border-b border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface">
      <div className="mx-auto max-w-3xl px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">{title}</h2>
            <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
          </div>
          {badge}
        </div>
      </div>
    </div>
  )
}

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
      <header className="border-b border-surface-border dark:border-dark-border px-6 py-4">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
      </header>
      <div className="space-y-4 px-6 py-5">{children}</div>
    </section>
  )
}

function SectionField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-muted">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  )
}

function StickySaveBar({ dirty, saving, onSave, onDiscard }: {
  dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void
}) {
  if (!dirty) return null
  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-surface-border dark:border-dark-border bg-white/95 dark:bg-dark-card/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 pl-2 pr-1 text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          <span className="text-text-muted">Unsaved changes</span>
        </div>
        <button onClick={onDiscard} disabled={saving}
          className="px-3 py-1.5 text-sm rounded-md text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors disabled:opacity-50">
          Discard
        </button>
        <button onClick={onSave} disabled={saving}
          className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

// ── General Settings ──────────────────────────────────────────────────────────
function GeneralSettings() {
  const [form, setForm] = useState({
    property_name:    '',
    management_email: '',
    contact_phone:    '',
    currency:         'KES',
    timezone:         'Africa/Nairobi',
  })
  const [savedForm, setSavedForm] = useState(form)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      const initial = {
        property_name:    s.property_name    ?? '',
        management_email: s.management_email ?? '',
        contact_phone:    s.contact_phone    ?? '',
        currency:         s.currency         ?? 'KES',
        timezone:         s.timezone         ?? 'Africa/Nairobi',
      }
      setForm(initial)
      setSavedForm(initial)
    }).finally(() => setLoading(false))
  }, [])

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(savedForm), [form, savedForm])

  const onSave = async () => {
    setSaving(true)
    await updateSettings(form)
    setSavedForm(form)
    setSaving(false)
  }

  const inp = 'w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading…</div>

  return (
    <div className="relative">
      <SectionHeader title="General" subtitle="Workspace identity, regional defaults, and contact details." />
      <div className="mx-auto max-w-3xl px-8 py-8 pb-32 space-y-6">
        <SettingsCard title="Workspace profile" description="Shown on invoices, notices, and the tenant portal.">
          <SectionField label="Property name" hint="Displayed in the sidebar and tenant portal.">
            <input type="text" value={form.property_name}
              onChange={e => setForm(p => ({ ...p, property_name: e.target.value }))}
              className={inp} />
          </SectionField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SectionField label="Management email">
              <input type="email" value={form.management_email}
                onChange={e => setForm(p => ({ ...p, management_email: e.target.value }))}
                className={inp} />
            </SectionField>
            <SectionField label="Contact phone">
              <PhoneInput value={form.contact_phone} onChange={v => setForm(p => ({ ...p, contact_phone: v }))} />
            </SectionField>
          </div>
        </SettingsCard>

        <SettingsCard title="Regional defaults" description="Currency and timezone used across the workspace.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SectionField label="Currency">
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className={inp}>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="UGX">UGX — Ugandan Shilling</option>
                <option value="TZS">TZS — Tanzanian Shilling</option>
              </select>
            </SectionField>
            <SectionField label="Timezone">
              <select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
                className={inp}>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT +3)</option>
                <option value="Africa/Lagos">Africa/Lagos (WAT +1)</option>
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST +2)</option>
                <option value="UTC">UTC</option>
              </select>
            </SectionField>
          </div>
        </SettingsCard>
      </div>
      <StickySaveBar dirty={dirty} saving={saving} onSave={onSave} onDiscard={() => setForm(savedForm)} />
    </div>
  )
}

// ── All available actions + resources for the permission matrix ───────────────
const ALL_ACTIONS = [
  'read','write','delete','export',
  'unit.convert_type','lease.create','lease.terminate','lease.renew',
  'charge.create','charge.waive','booking.confirm','booking.cancel',
  'access.grant','access.revoke','document.upload',
  'staff.onboard','staff.offboard','kyc.verify','settings.modify',
]
const ALL_RESOURCES = [
  // Utilities (most common for custom roles — kept first for visibility)
  'utility','meter','disconnection',
  // Core
  'unit','person','lease','charge','work_order','document','system_config',
  // Financial
  'payment','mpesa','report',
  // Access & Security
  'booking','access_event','access_credential','visitor','vehicle',
  // Operations
  'inspection','consumable','notice','communication','issue',
  // HR
  'staff','leave','roster','training','payroll','onboarding','disciplinary','staff_document',
]

// ── Roles & Permissions ───────────────────────────────────────────────────────
function RolesSettings() {
  const [roles, setRoles]         = useState<AppRole[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<AppRole | null>(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Form state
  const [roleName, setRoleName]   = useState('')
  const [roleDesc, setRoleDesc]   = useState('')
  const [selected, setSelected]   = useState<Set<string>>(new Set())

  useEffect(() => { listRoles().then(setRoles).finally(() => setLoading(false)) }, [])

  function openCreate() {
    setEditing(null); setRoleName(''); setRoleDesc(''); setSelected(new Set()); setError(''); setShowModal(true)
  }
  function openEdit(role: AppRole) {
    setEditing(role)
    setRoleName(role.name)
    setRoleDesc(role.description ?? '')
    setSelected(new Set((role.permissions ?? []).map(p => `${p.action}:${p.resource}`)))
    setError('')
    setShowModal(true)
  }
  function togglePerm(action: string, resource: string) {
    const key = `${action}:${resource}`
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleSave() {
    if (!roleName.trim()) { setError('Role name is required.'); return }
    setSaving(true); setError('')
    const permissions: RolePermission[] = [...selected].map(k => {
      const [action, resource] = k.split(':')
      return { action, resource }
    })
    try {
      if (editing) {
        const updated = await updateRole(editing.id, { name: roleName.trim(), description: roleDesc, permissions })
        setRoles(prev => prev.map(r => r.id === updated.id ? updated : r))
      } else {
        const created = await createRole({ name: roleName.trim(), description: roleDesc, permissions })
        setRoles(prev => [...prev, created])
      }
      setShowModal(false)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save role.') }
    finally { setSaving(false) }
  }

  async function handleDelete(role: AppRole) {
    if (!confirm(`Delete role "${role.name}"? Users with this role will lose access.`)) return
    try { await deleteRole(role.id); setRoles(prev => prev.filter(r => r.id !== role.id)) }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed to delete role.') }
  }

  return (
    <div className="relative">
      <SectionHeader title="Roles" subtitle="Define custom roles and their permission sets." />
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Roles</h3>
        <button onClick={openCreate} className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          + New Role
        </button>
      </div>

      {loading ? <p className="text-sm text-text-muted">Loading…</p> : (
        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id} className="flex items-start justify-between p-4 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text">{role.name}</p>
                {role.description && <p className="text-xs text-text-muted mt-0.5">{role.description}</p>}
                <p className="text-xs text-text-muted mt-1">{(role.permissions ?? []).length} permission{(role.permissions ?? []).length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                <button onClick={() => openEdit(role)} className="text-xs text-primary-600 hover:underline">Edit</button>
                <button onClick={() => handleDelete(role)} className="text-xs text-danger hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col my-auto">
            <div className="flex items-center justify-between p-5 border-b border-surface-border dark:border-dark-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-text">{editing ? 'Edit Role' : 'New Role'}</h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Role Name *</label>
                  <input value={roleName} onChange={e => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Leasing Agent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                  <input value={roleDesc} onChange={e => setRoleDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Optional description" />
                </div>
              </div>

              {/* Permission matrix */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Permissions</p>
                <div className="overflow-x-auto rounded-xl border border-surface-border dark:border-dark-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-hover dark:bg-dark-hover">
                        <th className="text-left px-3 py-2 font-medium text-text-muted w-36">Action</th>
                        {ALL_RESOURCES.map(r => (
                          <th key={r} className="px-2 py-2 font-medium text-text-muted capitalize text-center"
                            style={{minWidth:'60px'}}>{r.replace('_', ' ')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                      {ALL_ACTIONS.map(action => (
                        <tr key={action} className="hover:bg-surface-muted dark:hover:bg-dark-hover">
                          <td className="px-3 py-1.5 font-mono text-text-muted">{action}</td>
                          {ALL_RESOURCES.map(resource => {
                            const key = `${action}:${resource}`
                            return (
                              <td key={resource} className="px-2 py-1.5 text-center">
                                <input type="checkbox" checked={selected.has(key)}
                                  onChange={() => togglePerm(action, resource)}
                                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500 cursor-pointer" />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-text-muted mt-1">{selected.size} permission{selected.size !== 1 ? 's' : ''} selected</p>
              </div>

              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
            <div className="flex gap-2 p-5 border-t border-surface-border dark:border-dark-border flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

// ── Users & Permissions ───────────────────────────────────────────────────────
type UserSortKey = 'fullName' | 'email' | 'role' | 'status'

const USER_PAGE_SIZE = 20

function UsersSettings() {
  const [users, setUsers]           = useState<SystemUser[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage]             = useState(0)
  const [roles, setRoles]           = useState<AppRole[]>([])
  const [loading, setLoading]       = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser]     = useState<SystemUser | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Search + sort + status filter
  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey]         = useState<UserSortKey>('fullName')
  const [sortAsc, setSortAsc]         = useState(true)

  // Invite form
  const [invEmail,      setInvEmail]      = useState('')
  const [invName,       setInvName]       = useState('')
  const [invRole,       setInvRole]       = useState('')
  const [invPersonType, setInvPersonType] = useState('permanent_staff')

  // Edit form
  const [editRole,   setEditRole]   = useState('')
  const [editStatus, setEditStatus] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 350)
    return () => clearTimeout(t)
  }, [search])

  // Fetch users (server-side)
  useEffect(() => {
    setLoading(true)
    listSystemUsersPaged({
      search:  debouncedSearch || undefined,
      status:  statusFilter    || undefined,
      sortBy:  sortKey,
      sortDir: sortAsc ? 'asc' : 'desc',
      page,
      size: USER_PAGE_SIZE,
    })
      .then(d => { setUsers(d.content); setTotalPages(d.totalPages); setTotalElements(d.totalElements) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedSearch, statusFilter, sortKey, sortAsc, page, refreshKey])

  // Fetch roles once
  useEffect(() => {
    listRoles().then(setRoles).catch(() => {})
  }, [])

  async function handleInvite() {
    if (!invEmail.trim() || !invRole) { setError('Email and role are required.'); return }
    setSaving(true); setError('')
    try {
      await inviteUser({ email: invEmail.trim(), full_name: invName.trim(), role_id: invRole, person_type: invPersonType })
      setShowInvite(false); setInvEmail(''); setInvName(''); setInvRole(''); setInvPersonType('permanent_staff')
      setRefreshKey(k => k + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to invite user.') }
    finally { setSaving(false) }
  }

  async function handleUpdate() {
    if (!editUser) return
    setSaving(true); setError('')
    try {
      await updateSystemUser(editUser.id, {
        ...(editRole   ? { role_id: editRole }                  : {}),
        ...(editStatus ? { status:  editStatus.toLowerCase() }  : {}),
      })
      setEditUser(null)
      setRefreshKey(k => k + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update user.') }
    finally { setSaving(false) }
  }

  async function handleDeactivate(user: SystemUser) {
    if (!confirm(`Deactivate ${user.fullName}? They will lose portal access.`)) return
    try {
      await deactivateSystemUser(user.id)
      setRefreshKey(k => k + 1)
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to deactivate user.') }
  }

  async function handleResend(user: SystemUser) {
    try {
      await resendInvite(user.id)
      alert(`Invitation resent to ${user.email}.`)
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed to resend invitation.') }
  }

  function toggleSort(key: UserSortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true); setPage(0) }
  }

  const SortIcon = ({ col }: { col: UserSortKey }) => (
    <span className="ml-1 text-[10px] text-text-muted">
      {sortKey === col ? (sortAsc ? '▲' : '▼') : '⇅'}
    </span>
  )

  return (
    <div className="relative">
      <SectionHeader title="Users" subtitle="Manage staff portal access and invitations." />
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-text shrink-0">
          Portal Users{!loading && totalElements > 0 && <span className="ml-1.5 text-xs font-normal text-text-muted">({totalElements})</span>}
        </h3>
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="flex-1 min-w-[160px] max-w-xs px-3 py-1.5 text-xs rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(0) }}
            className="px-2 py-1.5 text-xs rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button onClick={() => { setShowInvite(true); setError('') }}
          className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shrink-0">
          + Invite User
        </button>
      </div>

      <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
        {loading ? <p className="px-4 py-6 text-sm text-text-muted">Loading…</p> : (
          <>
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>
                <th onClick={() => toggleSort('fullName')} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none">
                  Name<SortIcon col="fullName" />
                </th>
                <th onClick={() => toggleSort('email')} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none">
                  Email<SortIcon col="email" />
                </th>
                <th onClick={() => toggleSort('role')} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none">
                  Role<SortIcon col="role" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Linked Person</th>
                <th onClick={() => toggleSort('status')} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none">
                  Status<SortIcon col="status" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">Invite</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-sm text-text-muted text-center">No users match your search.</td></tr>
              )}
              {users.map(u => (
                <tr key={u.id} className="hover:bg-surface-hover dark:hover:bg-dark-hover">
                  <td className="px-4 py-3 text-text font-medium">{u.fullName}</td>
                  <td className="px-4 py-3 text-text-muted">{u.email}</td>
                  <td className="px-4 py-3"><Badge variant="blue">{u.role}</Badge></td>
                  <td className="px-4 py-3">
                    {u.person_name
                      ? <span className="text-xs text-text-muted flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                          {u.person_name}
                        </span>
                      : <span className="text-xs text-text-muted italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.status === 'active' ? 'primary' : 'default'}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {u.email_verified
                      ? <Badge variant="success">Completed</Badge>
                      : <Badge variant="warning">Pending</Badge>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 items-center">
                      <button onClick={() => { setEditUser(u); setEditRole(u.role_id ?? ''); setEditStatus(u.status); setError('') }}
                        className="text-xs text-primary-600 hover:underline">Edit</button>
                      {!u.email_verified && (
                        <button onClick={() => handleResend(u)} className="text-xs text-amber-600 hover:underline">Resend</button>
                      )}
                      {u.status === 'active' && (
                        <button onClick={() => handleDeactivate(u)} className="text-xs text-danger hover:underline">Deactivate</button>
                      )}
                      {u.status !== 'active' && (
                        <button onClick={async () => {
                          try {
                            await updateSystemUser(u.id, { status: 'active' })
                            setRefreshKey(k => k + 1)
                          } catch (e) { alert(e instanceof Error ? e.message : 'Failed to reactivate.') }
                        }} className="text-xs text-success hover:underline">Reactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border dark:border-dark-border text-xs text-text-muted">
              <span>{page * USER_PAGE_SIZE + 1}–{Math.min((page + 1) * USER_PAGE_SIZE, totalElements)} of {totalElements}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-2 py-1 rounded hover:bg-surface-hover dark:hover:bg-dark-hover disabled:opacity-40">‹</button>
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  const p = totalPages <= 7 ? i
                    : page <= 3 ? i
                    : page >= totalPages - 4 ? totalPages - 7 + i
                    : page - 3 + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={cn('px-2 py-1 rounded', p === page ? 'bg-primary-600 text-white font-medium' : 'hover:bg-surface-hover dark:hover:bg-dark-hover')}>
                      {p + 1}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="px-2 py-1 rounded hover:bg-surface-hover dark:hover:bg-dark-hover disabled:opacity-40">›</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Invite Portal User</h2>
              <button onClick={() => setShowInvite(false)} className="text-text-muted hover:text-text">✕</button>
            </div>
            <p className="text-xs text-text-muted">
              An invite link will be sent by email. A people record is created automatically and can be enriched later in HR &amp; Staff.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Email *</label>
                <input type="email" value={invEmail} onChange={e => setInvEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Full Name</label>
                <input value={invName} onChange={e => setInvName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Role *</label>
                <select value={invRole} onChange={e => setInvRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Select a role…</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Person Type</label>
                <select value={invPersonType} onChange={e => setInvPersonType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="permanent_staff">Permanent Staff</option>
                  <option value="casual_staff">Casual Staff</option>
                  <option value="outsourced">Outsourced / Agency</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleInvite} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Inviting…' : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text">Edit User — {editUser.fullName}</h2>
              <button onClick={() => setEditUser(null)} className="text-text-muted hover:text-text">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">Keep current</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text-muted hover:bg-surface-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}



// ── Data Setup (Opening Balances) ─────────────────────────────────────────────

const CATEGORIES = ['WS', 'SC', 'OT'] as const
const CAT_LABELS: Record<string, string> = { WS: 'Water & Sewerage', SC: 'Service Charge', OT: 'Other' }

function DataSetupSettings() {
  const [activeCategory, setActiveCategory] = useState<string>('WS')
  const [records, setRecords]               = useState<OpeningBalance[]>([])
  const [units, setUnits]                   = useState<UnitData[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  // Add modal
  const [showAdd, setShowAdd]         = useState(false)
  const [addUnitId, setAddUnitId]     = useState('')
  const [addAmount, setAddAmount]     = useState('')
  const [addDate, setAddDate]         = useState('')
  const [addNotes, setAddNotes]       = useState('')
  const [addSaving, setAddSaving]     = useState(false)
  const [addError, setAddError]       = useState<string | null>(null)

  // Edit modal
  const [editRecord, setEditRecord]   = useState<OpeningBalance | null>(null)
  const [editAmount, setEditAmount]   = useState('')
  const [editDate, setEditDate]       = useState('')
  const [editNotes, setEditNotes]     = useState('')
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState<string | null>(null)

  // Excel import
  const [showImport, setShowImport]   = useState(false)
  const [importFile, setImportFile]   = useState<File | null>(null)
  const [importParsing, setImportParsing] = useState(false)
  const [importPreview, setImportPreview] = useState<ExcelPreviewRow[] | null>(null)
  const [importSaving, setImportSaving]   = useState(false)
  const [importResult, setImportResult]   = useState<{saved:number,skipped:number} | null>(null)
  const [importError, setImportError]     = useState<string | null>(null)

  useEffect(() => {
    getUnitsFromApi().then(setUnits).catch(() => {})
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
    getOpeningBalances(activeCategory)
      .then(setRecords)
      .catch(() => setError('Failed to load opening balances'))
      .finally(() => setLoading(false))
  }, [activeCategory])

  useEffect(() => { reload() }, [reload])

  const handleAdd = async () => {
    if (!addUnitId) { setAddError('Select a unit'); return }
    const amount = parseFloat(addAmount)
    if (isNaN(amount) || amount < 0) { setAddError('Enter a valid amount'); return }
    setAddSaving(true); setAddError(null)
    try {
      await createOpeningBalance({
        unitId: addUnitId,
        categoryCode: activeCategory,
        amount,
        asOfDate: addDate || undefined,
        notes: addNotes || undefined,
      })
      setShowAdd(false); setAddUnitId(''); setAddAmount(''); setAddDate(''); setAddNotes('')
      reload()
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to save')
    } finally { setAddSaving(false) }
  }

  const openEdit = (ob: OpeningBalance) => {
    setEditRecord(ob)
    setEditAmount(String(ob.amount))
    setEditDate(ob.as_of_date ?? '')
    setEditNotes(ob.notes ?? '')
    setEditError(null)
  }

  const handleEdit = async () => {
    if (!editRecord) return
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount < 0) { setEditError('Enter a valid amount'); return }
    setEditSaving(true); setEditError(null)
    try {
      await updateOpeningBalance(editRecord.id, {
        amount,
        asOfDate: editDate || undefined,
        notes: editNotes || undefined,
      })
      setEditRecord(null)
      reload()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to update')
    } finally { setEditSaving(false) }
  }

  const handleVoid = async (ob: OpeningBalance) => {
    if (!confirm(`Void opening balance for ${ob.unit_label}? This cannot be undone.`)) return
    try {
      await voidOpeningBalance(ob.id)
      reload()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to void')
    }
  }

  const handleParseExcel = async () => {
    if (!importFile) return
    setImportParsing(true); setImportError(null); setImportPreview(null); setImportResult(null)
    try {
      const preview = await parseOpeningBalanceExcel(importFile, activeCategory)
      setImportPreview(preview)
    } catch {
      setImportError('Failed to parse file. Ensure it is a valid .xlsx file.')
    } finally { setImportParsing(false) }
  }

  const handleBulkImport = async () => {
    if (!importPreview) return
    const validRows = importPreview.filter(r => r.valid)
    if (validRows.length === 0) { setImportError('No valid rows to import'); return }
    setImportSaving(true); setImportError(null)
    try {
      const result = await bulkImportOpeningBalances(
        activeCategory,
        validRows.map(r => ({
          unitId: r.unitId!,
          unitLabel: r.unitLabel,
          amount: r.amount,
          asOfDate: r.asOfDate,
          notes: r.notes,
        }))
      )
      setImportResult(result)
      reload()
    } catch {
      setImportError('Import failed')
    } finally { setImportSaving(false) }
  }

  const fmt = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-KE') : '—'

  const inputCls = 'w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="relative">
      <SectionHeader title="Data & Imports" subtitle="Set opening balances and import historical data." />
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">Opening Balances</h3>
          <p className="text-xs text-text-muted mt-0.5">One-time lump-sum per unit representing pre-system arrears. Applied automatically when the first invoice is issued.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowImport(true); setImportFile(null); setImportPreview(null); setImportResult(null); setImportError(null) }}
            className="px-3 py-1.5 text-xs font-medium border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-hover dark:hover:bg-dark-hover text-text">
            Import Excel
          </button>
          <button onClick={() => { setShowAdd(true); setAddError(null) }}
            className="px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            + Add Opening Balance
          </button>
        </div>
      </div>

      {/* Category sub-tabs */}
      <div className="flex gap-1 border-b border-surface-border dark:border-dark-border">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeCategory === cat ? 'border-primary-600 text-primary-600' : 'border-transparent text-text-muted hover:text-text'}`}>
            {CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">No opening balances for {CAT_LABELS[activeCategory]}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border dark:border-dark-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">Unit</th>
                <th className="text-right py-2 px-3 text-xs font-medium text-text-muted">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">As Of</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">Notes</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-text-muted">Status</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {records.map(ob => (
                <tr key={ob.id} className="border-b border-surface-border dark:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-hover">
                  <td className="py-2 px-3 font-medium">{ob.unit_label ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono">{fmt(ob.amount)}</td>
                  <td className="py-2 px-3 text-text-muted">{fmtDate(ob.as_of_date)}</td>
                  <td className="py-2 px-3 text-text-muted truncate max-w-[200px]">{ob.notes || '—'}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      ob.status === 'active'  ? 'bg-success/10 text-success' :
                      ob.status === 'applied' ? 'bg-primary-100 text-primary-700' :
                      'bg-surface-border text-text-muted'}`}>
                      {ob.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2 justify-end">
                      {ob.status === 'active' && (
                        <>
                          <button onClick={() => openEdit(ob)} className="text-xs text-primary-600 hover:underline">Edit</button>
                          <button onClick={() => handleVoid(ob)} className="text-xs text-danger hover:underline">Void</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-text">Add Opening Balance — {CAT_LABELS[activeCategory]}</h3>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Unit *</label>
              <select value={addUnitId} onChange={e => setAddUnitId(e.target.value)} className={inputCls}>
                <option value="">Select unit…</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.unit_label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES) *</label>
              <input type="number" min="0" step="0.01" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0.00" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">As Of Date</label>
              <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
              <textarea rows={2} value={addNotes} onChange={e => setAddNotes(e.target.value)} className={inputCls} />
            </div>
            {addError && <p className="text-xs text-danger">{addError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg text-text hover:bg-surface-hover dark:hover:bg-dark-hover">Cancel</button>
              <button onClick={handleAdd} disabled={addSaving} className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
                {addSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-text">Edit Opening Balance — {editRecord.unit_label}</h3>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES) *</label>
              <input type="number" min="0" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">As Of Date</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
              <textarea rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} className={inputCls} />
            </div>
            {editError && <p className="text-xs text-danger">{editError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditRecord(null)} className="px-4 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg text-text hover:bg-surface-hover dark:hover:bg-dark-hover">Cancel</button>
              <button onClick={handleEdit} disabled={editSaving} className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
                {editSaving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-text">Import Opening Balances — {CAT_LABELS[activeCategory]}</h3>
            <p className="text-xs text-text-muted">
              Upload an .xlsx file with columns: <strong>A</strong> Unit Label, <strong>B</strong> Amount, <strong>C</strong> As Of Date (YYYY-MM-DD), <strong>D</strong> Notes (optional)
            </p>

            {!importResult && (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-text-muted mb-1">Excel File (.xlsx)</label>
                  <input type="file" accept=".xlsx" onChange={e => { setImportFile(e.target.files?.[0] ?? null); setImportPreview(null) }}
                    className="block w-full text-sm text-text-muted file:mr-3 file:py-1.5 file:px-3 file:border file:border-surface-border file:rounded-lg file:text-xs file:font-medium file:bg-surface file:text-text hover:file:bg-surface-hover" />
                </div>
                <button onClick={handleParseExcel} disabled={!importFile || importParsing}
                  className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
                  {importParsing ? 'Parsing…' : 'Preview'}
                </button>
              </div>
            )}

            {importError && <p className="text-xs text-danger">{importError}</p>}

            {importPreview && !importResult && (
              <>
                <div className="text-xs text-text-muted">
                  {importPreview.filter(r => r.valid).length} valid / {importPreview.filter(r => !r.valid).length} invalid rows
                </div>
                <div className="overflow-x-auto max-h-60 border border-surface-border dark:border-dark-border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-hover dark:bg-dark-hover sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-text-muted">Row</th>
                        <th className="text-left py-2 px-3 font-medium text-text-muted">Unit</th>
                        <th className="text-right py-2 px-3 font-medium text-text-muted">Amount</th>
                        <th className="text-left py-2 px-3 font-medium text-text-muted">As Of</th>
                        <th className="text-left py-2 px-3 font-medium text-text-muted">Notes</th>
                        <th className="text-left py-2 px-3 font-medium text-text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((row, i) => (
                        <tr key={i} className={`border-t border-surface-border dark:border-dark-border ${!row.valid ? 'bg-danger/5' : ''}`}>
                          <td className="py-1.5 px-3 text-text-muted">{row.rowNum}</td>
                          <td className="py-1.5 px-3 font-medium">{row.unitLabel}</td>
                          <td className="py-1.5 px-3 text-right font-mono">{row.amount?.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                          <td className="py-1.5 px-3 text-text-muted">{row.asOfDate ?? '—'}</td>
                          <td className="py-1.5 px-3 text-text-muted truncate max-w-[120px]">{row.notes || '—'}</td>
                          <td className="py-1.5 px-3">
                            {row.valid
                              ? <span className="text-success font-medium">✓ Valid</span>
                              : <span className="text-danger">{row.error}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setImportPreview(null); setImportFile(null) }}
                    className="px-4 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg text-text hover:bg-surface-hover dark:hover:bg-dark-hover">
                    Re-upload
                  </button>
                  <button onClick={handleBulkImport} disabled={importSaving || importPreview.filter(r => r.valid).length === 0}
                    className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50">
                    {importSaving ? 'Importing…' : `Import ${importPreview.filter(r => r.valid).length} Valid Rows`}
                  </button>
                </div>
              </>
            )}

            {importResult && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-sm text-success">
                <p className="font-medium">Import complete</p>
                <p className="mt-1 text-text-muted text-xs">{importResult.saved} records saved · {importResult.skipped} skipped (duplicates or errors)</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => { setShowImport(false); setImportPreview(null); setImportResult(null); setImportFile(null) }}
                className="px-4 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg text-text hover:bg-surface-hover dark:hover:bg-dark-hover">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

// -- Page -----------------------------------------------------------------------
type SectionKey =
  | 'general' | 'facility' | 'branding'
  | 'billing' | 'notifications' | 'documents'
  | 'integrations' | 'data' | 'security' | 'danger'

const SIDEBAR_SECTIONS: { key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }>; group: string; danger?: boolean }[] = [
  { key: 'general',       label: 'General',             icon: SettingsIcon, group: 'Workspace' },
  { key: 'facility',      label: 'Facility setup',      icon: Building2,    group: 'Workspace' },
  { key: 'branding',      label: 'Branding',            icon: Palette,      group: 'Workspace' },
  { key: 'billing',       label: 'Billing & payments',  icon: CreditCard,   group: 'Operations' },
  { key: 'notifications', label: 'Notifications',       icon: Bell,         group: 'Operations' },
  { key: 'documents',     label: 'Document templates',  icon: FileText,     group: 'Operations' },
  { key: 'integrations',  label: 'Integrations',        icon: Plug,         group: 'Platform' },
  { key: 'data',          label: 'Data & imports',      icon: Database,     group: 'Platform' },
  { key: 'security',      label: 'Access & security',   icon: ShieldCheck,  group: 'Platform' },
  { key: 'danger',        label: 'Danger zone',         icon: AlertTriangle,group: 'Platform', danger: true },
]

export function SettingsPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const active = (searchParams.get('section') ?? 'general') as SectionKey

  function setSection(key: SectionKey) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', key)
    router.replace(`/settings?${params.toString()}`, { scroll: false })
  }

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex">
        {/* Sidebar nav */}
        <aside className="w-64 shrink-0 border-r border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-surface flex flex-col overflow-y-auto">
          <div className="px-5 py-5 border-b border-surface-border dark:border-dark-border">
            <h1 className="text-base font-semibold text-text">Settings</h1>
            <p className="mt-0.5 text-xs text-text-muted">Workspace configuration</p>
          </div>
          <nav className="px-2 py-4 flex-1">
            {['Workspace', 'Operations', 'Platform'].map(group => (
              <div key={group} className="mb-4">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {group}
                </div>
                <ul className="space-y-0.5">
                  {SIDEBAR_SECTIONS.filter(s => s.group === group).map(s => {
                    const Icon = s.icon
                    const isActive = active === s.key
                    return (
                      <li key={s.key}>
                        <button
                          onClick={() => setSection(s.key)}
                          className={[
                            'w-full flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors text-left',
                            isActive
                              ? s.danger
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium'
                                : 'bg-surface dark:bg-dark-card text-text font-medium border border-surface-border dark:border-dark-border shadow-sm'
                              : s.danger
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                                : 'text-text-muted hover:bg-surface dark:hover:bg-dark-card hover:text-text',
                          ].join(' ')}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{s.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {active === 'general'       && <GeneralSection />}
          {active === 'facility'      && <FacilitySection />}
          {active === 'branding'      && <BrandingSection />}
          {active === 'billing'       && <BillingSection />}
          {active === 'notifications' && <NotificationsSection />}
          {active === 'documents'     && <DocumentsSection />}
          {active === 'integrations'  && <IntegrationsSection />}
          {active === 'data'          && <DataSection />}
          {active === 'security'      && <SecuritySection />}
          {active === 'danger'        && <DangerSection />}
        </div>
      </main>
    </DashboardLayout>
  )
}
