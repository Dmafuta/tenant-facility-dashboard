'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck, Users as UsersIcon, KeyRound, Scale, Tags, Fingerprint,
  Terminal, ClipboardCheck, Search, Plus, MoreVertical, Download,
  Play, GitBranch, History, AlertTriangle, CheckCircle2, XCircle,
  Clock, Globe, Lock, Smartphone, Mail, Eye, EyeOff, Copy, RefreshCw,
  Sparkles, Building2, Activity, ShieldAlert, Zap,
  FileCode2, Code2, LayoutDashboard, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import {
  listSystemUsersPaged, inviteUser, updateSystemUser, deactivateSystemUser,
  listRoles, createRole, updateRole, deleteRole,
  getUserSessions, adminRevokeSession, adminToggle2fa,
  type SystemUser, type AppRole, type RolePermission, type AdminSession,
} from '@/lib/api/settings'
import { sendPasswordReset } from '@/lib/api/auth'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab =
  | 'overview' | 'users' | 'roles' | 'policies' | 'attributes'
  | 'auth' | 'tokens' | 'reviews'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { key: 'overview',   label: 'Overview',       icon: LayoutDashboard, hint: 'Posture & risk signals' },
  { key: 'users',      label: 'Users',          icon: UsersIcon,       hint: 'Identities & lifecycle' },
  { key: 'roles',      label: 'Roles',          icon: KeyRound,        hint: 'Attribute bundles' },
  { key: 'policies',   label: 'Policies',       icon: Scale,           hint: 'ABAC rules & simulator' },
  { key: 'attributes', label: 'Attributes',     icon: Tags,            hint: 'Subject / resource / env' },
  { key: 'auth',       label: 'Authentication', icon: Fingerprint,     hint: 'MFA, SSO, sessions' },
  { key: 'tokens',     label: 'API & tokens',   icon: Terminal,        hint: 'PATs & service accounts' },
  { key: 'reviews',    label: 'Access reviews', icon: ClipboardCheck,  hint: 'Certifications & audit' },
]

// ── Shared sub-components ──────────────────────────────────────────────────────
function PaneHeader({ title, description, actions }: {
  title: string; description: string; actions?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-surface-border dark:border-dark-border px-8 py-5">
      <div>
        <h3 className="text-base font-semibold text-text">{title}</h3>
        <p className="mt-0.5 text-xs text-text-muted max-w-lg">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

function SubCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card', className)}>
      {children}
    </div>
  )
}

function SubCardHeader({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border px-5 py-3.5">
      <div>
        <div className="text-sm font-semibold text-text">{title}</div>
        {hint && <div className="text-[11.5px] text-text-muted">{hint}</div>}
      </div>
      {right}
    </div>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-surface-border dark:bg-dark-border',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

function FieldSwitch({ label, checked }: { label: string; checked?: boolean }) {
  const [on, setOn] = useState(!!checked)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12.5px] text-text">{label}</span>
      <Toggle checked={on} onChange={setOn} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW PANE
// ══════════════════════════════════════════════════════════════════════════════
function OverviewPane() {
  const kpis = [
    { label: 'Active users',     value: '21',  delta: '+2',  tone: 'neutral' as const, icon: UsersIcon },
    { label: 'MFA coverage',     value: '76%', delta: '+4%', tone: 'up'      as const, icon: ShieldCheck },
    { label: 'Privileged (L2+)', value: '8',   delta: '',    tone: 'neutral' as const, icon: KeyRound },
    { label: 'Pending invites',  value: '3',   delta: '',    tone: 'neutral' as const, icon: Mail },
    { label: 'Stale accounts',   value: '2',   delta: '',    tone: 'down'    as const, icon: AlertTriangle },
    { label: 'Failed logins',    value: '5',   delta: '24h', tone: 'down'    as const, icon: Lock },
  ]

  const complianceChecks = [
    { label: 'SOC 2 Type II',    pct: 82 },
    { label: 'ISO 27001',        pct: 67 },
    { label: 'GDPR',             pct: 90 },
    { label: 'PCI DSS',          pct: 44 },
  ]

  const recentEvents = [
    { t: '2m ago',    who: 'Dennis S.',  action: 'signed in',  detail: 'Chrome · Nairobi', ok: true },
    { t: '18m ago',   who: 'Stephen M.', action: 'approved',   detail: 'Invoice INV-2287', ok: true },
    { t: '1h ago',    who: 'Raphael I.', action: 'denied',     detail: '/users/manage — policy block', ok: false },
    { t: '3h ago',    who: 'Unknown',    action: 'failed login',detail: '5 attempts · IP 41.90.x.x', ok: false },
  ]

  return (
    <div>
      <PaneHeader title="Overview" description="Security posture, risk signals and compliance progress at a glance." />
      <div className="p-8 space-y-6">
        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3 text-center">
                <Icon className="mx-auto mb-1 h-4 w-4 text-text-muted" />
                <div className="text-2xl font-semibold tabular-nums text-text">{k.value}</div>
                <div className="mt-0.5 text-[10.5px] text-text-muted">{k.label}</div>
                {k.delta && (
                  <div className={cn('mt-0.5 text-[10px] font-medium', k.tone === 'up' ? 'text-emerald-600' : k.tone === 'down' ? 'text-rose-600' : 'text-text-muted')}>
                    {k.delta}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk signals */}
          <SubCard>
            <SubCardHeader title="Risk signals" hint="Items requiring attention" />
            <ul className="divide-y divide-surface-border dark:divide-dark-border">
              {[
                { msg: '2 accounts inactive for 60+ days', sev: 'warn' },
                { msg: '1 service account token not rotated in 187 days', sev: 'danger' },
                { msg: 'MFA not enforced for Finance Officer role', sev: 'warn' },
                { msg: 'SSO not linked for 13 users', sev: 'info' },
              ].map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px]',
                    r.sev === 'danger' ? 'bg-rose-100 text-rose-700'
                    : r.sev === 'warn' ? 'bg-amber-100 text-amber-700'
                    : 'bg-sky-100 text-sky-700'
                  )}>
                    {r.sev === 'danger' ? '!' : r.sev === 'warn' ? '⚠' : 'i'}
                  </span>
                  <span className="text-[12.5px] text-text">{r.msg}</span>
                </li>
              ))}
            </ul>
          </SubCard>

          {/* Recent events */}
          <SubCard>
            <SubCardHeader title="Recent access events" hint="Live feed from the access log" />
            <ul className="divide-y divide-surface-border dark:divide-dark-border">
              {recentEvents.map((e, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                  {e.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-rose-500" />}
                  <div className="min-w-0 flex-1">
                    <span className="text-[12.5px] font-medium text-text">{e.who}</span>
                    <span className="mx-1 text-[12px] text-text-muted">{e.action}</span>
                    <span className="text-[11.5px] text-text-muted truncate">{e.detail}</span>
                  </div>
                  <span className="text-[10.5px] text-text-muted shrink-0">{e.t}</span>
                </li>
              ))}
            </ul>
          </SubCard>
        </div>

        {/* Compliance bars */}
        <SubCard>
          <SubCardHeader title="Compliance progress" hint="Automated checks against framework controls" />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {complianceChecks.map((c) => (
              <div key={c.label}>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="font-medium text-text">{c.label}</span>
                  <span className="text-text-muted">{c.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-border dark:bg-dark-border overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', c.pct >= 80 ? 'bg-emerald-500' : c.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500')}
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SubCard>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// USERS PANE
// ══════════════════════════════════════════════════════════════════════════════
type PortalUser = {
  name: string; email: string; role: string; status: 'active' | 'inactive'
  mfa: boolean; lastLogin: string; linked: string
  passwordChangedAt: string | null
  attrs: { scope: string; clearance: string; dept?: string }
}

function mapToPortalUser(u: SystemUser): PortalUser {
  return {
    name: u.fullName, email: u.email, role: u.role,
    status: u.status === 'active' ? 'active' : 'inactive',
    mfa: u.twoFactorEnabled ?? false,
    lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—',
    passwordChangedAt: u.passwordChangedAt ?? null,
    linked: u.person_name ?? '—',
    attrs: { scope: 'All properties', clearance: 'L1' },
  }
}

function InviteUserModal({ open, onClose, roles, onSuccess }: {
  open: boolean; onClose: () => void; roles: AppRole[]; onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (roles.length > 0 && !roleId) setRoleId(roles[0].id)
  }, [roles, roleId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !fullName || !roleId) return
    setSaving(true); setError('')
    try {
      await inviteUser({ email, full_name: fullName, role_id: roleId })
      onSuccess(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite user" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Full name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" required
            className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required
            className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Role</label>
          <select value={roleId} onChange={e => setRoleId(e.target.value)} required
            className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {error && <p className="text-[12px] text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1 border-t border-surface-border dark:border-dark-border">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send invite'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function UsersPane() {
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [users, setUsers] = useState<SystemUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<SystemUser | null>(null)
  const [bulk, setBulk] = useState<Set<string>>(new Set())
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roles, setRoles] = useState<AppRole[]>([])

  const loadRoles = useCallback(async () => {
    try { setRoles(await listRoles()) } catch {}
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listSystemUsersPaged({
        search: q || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page, size: 20,
      })
      setUsers(data.content)
      setTotal(data.totalElements)
    } catch {} finally { setLoading(false) }
  }, [q, statusFilter, page])

  useEffect(() => { loadRoles() }, [loadRoles])
  useEffect(() => { setPage(0) }, [q, statusFilter])
  useEffect(() => { loadUsers() }, [loadUsers])

  const toggleAll = () => {
    if (bulk.size === users.length && users.length > 0) setBulk(new Set())
    else setBulk(new Set(users.map(u => u.id)))
  }

  const portalUsers = useMemo(() => users.map(mapToPortalUser), [users])

  return (
    <div>
      <PaneHeader
        title="Users"
        description="Portal identities, attribute assignments and account lifecycle."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" />Export</Button>
            <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}><Plus className="h-3.5 w-3.5" />Invite user</Button>
          </>
        }
      />
      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="h-8 w-64 pl-8 pr-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-surface-border dark:border-dark-border p-0.5 text-xs">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={cn('rounded px-2.5 py-1 capitalize transition-colors', statusFilter === s ? 'bg-white dark:bg-dark-card font-medium shadow-sm text-text' : 'text-text-muted hover:text-text')}>{s}</button>
            ))}
          </div>
          {bulk.size > 0 && (
            <div className="ml-2 flex items-center gap-2 text-[12px] text-text-muted">
              <span>{bulk.size} selected</span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><MoreVertical className="h-3 w-3" />Bulk actions</Button>
            </div>
          )}
        </div>

        {/* Table */}
        <SubCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover/40 dark:bg-dark-hover text-[11px] uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <input type="checkbox" checked={bulk.size === users.length && users.length > 0} onChange={toggleAll} className="size-3.5" />
                  </th>
                  <th className="text-left px-3 py-2">User</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Scope</th>
                  <th className="text-left px-3 py-2">Auth</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Last login</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-[12px] text-text-muted">Loading…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-[12px] text-text-muted">No users found.</td></tr>
                ) : portalUsers.map((u, i) => {
                  const raw = users[i]
                  return (
                    <tr key={raw.id} className="hover:bg-surface-hover/30 dark:hover:bg-dark-hover/30 cursor-pointer" onClick={() => setSelected(raw)}>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={bulk.has(raw.id)}
                          onChange={() => {
                            const n = new Set(bulk)
                            if (n.has(raw.id)) n.delete(raw.id); else n.add(raw.id)
                            setBulk(n)
                          }}
                          className="size-3.5"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text">{u.name}</div>
                        <div className="text-[11.5px] text-text-muted">{u.email}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="default" className="font-normal">{u.role}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[12px] text-text">{u.attrs.scope}</span>
                        <span className="ml-1.5 inline-flex items-center rounded bg-surface-hover dark:bg-dark-hover px-1 py-0.5 text-[10px] font-medium text-text-muted">{u.attrs.clearance}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {u.mfa ? <ShieldCheck className="size-3.5 text-emerald-600" /> : <ShieldAlert className="size-3.5 text-amber-600" />}
                          <span className="text-[11.5px] text-text-muted">{u.mfa ? 'MFA' : 'No MFA'}</span>
                          {u.sso && <Badge variant="default" className="ml-1 h-4 px-1 text-[9px]">SSO</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-flex items-center gap-1 text-[12px]', u.status === 'active' ? 'text-emerald-700' : 'text-text-muted')}>
                          <span className={cn('size-1.5 rounded-full', u.status === 'active' ? 'bg-emerald-500' : 'bg-text-muted/40')} />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-text-muted">{u.lastLogin}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="size-3.5" /></Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-surface-border dark:border-dark-border px-4 py-2 text-[11.5px] text-text-muted">
            <span>{total} users</span>
            <span>Attributes drive ABAC policy decisions</span>
          </div>
        </SubCard>
      </div>

      {/* User drawer */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.fullName} size="lg">
          <UserDrawerContent user={mapToPortalUser(selected)} systemUser={selected} roles={roles} onRefresh={() => { loadUsers(); setSelected(null) }} />
        </Modal>
      )}

      {inviteOpen && (
        <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} roles={roles} onSuccess={loadUsers} />
      )}
    </div>
  )
}

function UserDrawerContent({ user, systemUser, roles, onRefresh }: {
  user: PortalUser; systemUser?: SystemUser; roles?: AppRole[]; onRefresh?: () => void
}) {
  const [tab, setTab] = useState<'profile' | 'sessions' | 'security'>('profile')
  const [roleId, setRoleId] = useState(systemUser?.role_id ?? '')
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [mfaEnabled, setMfaEnabled] = useState(user.mfa)
  const [mfaWorking, setMfaWorking] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetWorking, setResetWorking] = useState(false)

  useEffect(() => {
    if (tab !== 'sessions' || !systemUser) return
    setSessionsLoading(true)
    getUserSessions(systemUser.id)
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [tab, systemUser])

  async function handleRevoke(sessionId: string) {
    if (!systemUser) return
    setRevoking(sessionId)
    try {
      await adminRevokeSession(systemUser.id, sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch {
      // silently ignore
    } finally {
      setRevoking(null)
    }
  }

  async function handleToggleMfa() {
    if (!systemUser) return
    const next = !mfaEnabled
    setMfaWorking(true)
    try {
      await adminToggle2fa(systemUser.id, next)
      setMfaEnabled(next)
    } catch {
      // silently ignore
    } finally {
      setMfaWorking(false)
    }
  }

  async function handleForceReset() {
    if (!systemUser) return
    setResetWorking(true)
    try {
      await sendPasswordReset(systemUser.email)
      setResetSent(true)
    } catch {
      // silently ignore
    } finally {
      setResetWorking(false)
    }
  }

  async function save() {
    if (!systemUser) return
    setSaving(true); setError('')
    try {
      await updateSystemUser(systemUser.id, { role_id: roleId || undefined })
      onRefresh?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  async function handleDeactivate() {
    if (!systemUser) return
    setDeactivating(true); setError('')
    try {
      await deactivateSystemUser(systemUser.id)
      onRefresh?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Deactivate failed')
    } finally { setDeactivating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid size-11 place-items-center rounded-full bg-primary-50 font-semibold text-primary-600 shrink-0">
          {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div className="text-sm text-text-muted">{user.email}</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Badge variant="default" className="font-normal">{user.role}</Badge>
            <Badge variant="default" className="font-normal text-[10px]">Clearance {user.attrs.clearance}</Badge>
            {user.mfa && <Badge variant="default" className="font-normal text-[10px] text-emerald-700"><ShieldCheck className="mr-0.5 size-2.5" />MFA</Badge>}
          </div>
        </div>
      </div>
      <div className="flex border-b border-surface-border dark:border-dark-border gap-0 text-xs">
        {(['profile', 'sessions', 'security'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('px-3 py-2.5 border-b-2 -mb-px capitalize', tab === t ? 'border-primary-600 text-text font-semibold' : 'border-transparent text-text-muted hover:text-text')}>{t}</button>
        ))}
      </div>
      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[['Full name', user.name], ['Email', user.email], ['Linked person', user.linked], ['Last login', user.lastLogin]].map(([l, v]) => (
              <div key={l}>
                <div className="text-[10.5px] uppercase tracking-wide text-text-muted">{l}</div>
                <div className="mt-0.5 text-sm font-medium text-text">{v}</div>
              </div>
            ))}
          </div>
          {roles && roles.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Role</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)}
                className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
      {tab === 'sessions' && (
        <div className="space-y-2">
          {sessionsLoading && (
            <p className="text-[12px] text-text-muted text-center py-4">Loading sessions…</p>
          )}
          {!sessionsLoading && sessions.length === 0 && (
            <p className="text-[12px] text-text-muted text-center py-4">No active sessions found.</p>
          )}
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Smartphone className="size-4 text-text-muted" />
                <div>
                  <div className="text-[13px] font-medium text-text">{s.deviceName}</div>
                  <div className="text-[11px] text-text-muted">
                    {s.ipAddress} · {new Date(s.lastSeenAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-7 text-xs text-danger"
                disabled={revoking === s.id}
                onClick={() => handleRevoke(s.id)}
              >
                {revoking === s.id ? '…' : 'Revoke'}
              </Button>
            </div>
          ))}
        </div>
      )}
      {tab === 'security' && (
        <div className="space-y-3">
          {/* MFA row */}
          <div className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={cn('size-4', mfaEnabled ? 'text-emerald-600' : 'text-amber-600')} />
              <div>
                <div className="text-[13px] font-medium text-text">Multi-factor authentication</div>
                <div className="text-[11px] text-text-muted">{mfaEnabled ? 'Enrolled — OTP on login' : 'Not enrolled'}</div>
              </div>
            </div>
            <Button
              variant="outline" size="sm" className="h-7 text-xs"
              disabled={mfaWorking}
              onClick={handleToggleMfa}
            >
              {mfaWorking ? '…' : mfaEnabled ? 'Disable MFA' : 'Enforce MFA'}
            </Button>
          </div>

          {/* Password row */}
          <div className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <Lock className="size-4 text-emerald-600" />
              <div>
                <div className="text-[13px] font-medium text-text">Password</div>
                <div className="text-[11px] text-text-muted">
                  {user.passwordChangedAt
                    ? `Last changed ${new Date(user.passwordChangedAt).toLocaleDateString()}`
                    : 'Never changed'}
                </div>
              </div>
            </div>
            <Button
              variant="outline" size="sm" className="h-7 text-xs"
              disabled={resetWorking || resetSent}
              onClick={handleForceReset}
            >
              {resetSent ? 'Email sent ✓' : resetWorking ? '…' : 'Force reset'}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-[12px] text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1 border-t border-surface-border dark:border-dark-border mt-4">
        <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={deactivating}>
          {deactivating ? 'Deactivating…' : 'Deactivate'}
        </Button>
        {tab === 'profile' && (
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLES PANE
// ══════════════════════════════════════════════════════════════════════════════
const PERM_RESOURCES = ['unit', 'people', 'lease', 'invoice', 'meter', 'report', 'settings', 'hr', 'document', 'notice']
const PERM_ACTIONS   = ['read', 'write', 'manage']

function RoleModal({ open, onClose, existing, onSuccess }: {
  open: boolean; onClose: () => void; existing?: AppRole; onSuccess: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [desc, setDesc] = useState(existing?.description ?? '')
  const [perms, setPerms] = useState<Set<string>>(
    new Set((existing?.permissions ?? []).map((p: RolePermission) => `${p.action}:${p.resource}`))
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePerm(action: string, resource: string) {
    const key = `${action}:${resource}`
    const next = new Set(perms)
    if (next.has(key)) next.delete(key); else next.add(key)
    setPerms(next)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const permissions: RolePermission[] = Array.from(perms).map(k => {
      const [action, resource] = k.split(':')
      return { action, resource }
    })
    try {
      if (existing) {
        await updateRole(existing.id, { name, description: desc, permissions })
      } else {
        await createRole({ name, description: desc, permissions })
      }
      onSuccess(); onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit role' : 'New role'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Finance Officer" required
              className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description"
              className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wide">Permissions</label>
          <SubCard>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface-hover/40 dark:bg-dark-hover text-[10px] uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="text-left px-3 py-2">Resource</th>
                    {PERM_ACTIONS.map(a => <th key={a} className="px-3 py-2 capitalize">{a}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                  {PERM_RESOURCES.map(res => (
                    <tr key={res} className="hover:bg-surface-hover/20">
                      <td className="px-3 py-2 font-medium text-text capitalize">{res}</td>
                      {PERM_ACTIONS.map(act => (
                        <td key={act} className="px-3 py-2 text-center">
                          <input type="checkbox"
                            checked={perms.has(`${act}:${res}`)}
                            onChange={() => togglePerm(act, res)}
                            className="size-3.5" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SubCard>
        </div>
        {error && <p className="text-[12px] text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1 border-t border-surface-border dark:border-dark-border">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RolesPane() {
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)
  const [modalRole, setModalRole] = useState<AppRole | undefined>(undefined)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRoles(await listRoles()) } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    setDeleting(id)
    try { await deleteRole(id); load() } catch {} finally { setDeleting(null) }
  }

  return (
    <div>
      <PaneHeader
        title="Roles"
        description="Roles are named bundles of subject attributes. ABAC policies evaluate role + attributes + conditions — roles alone don't grant access."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><GitBranch className="mr-1.5 size-3.5" />Compare</Button>
            <Button variant="primary" size="sm" className="gap-1.5" onClick={() => { setModalRole(undefined); setModalOpen(true) }}><Plus className="mr-1.5 size-3.5" />New role</Button>
          </>
        }
      />
      <div className="p-8 space-y-4">
        <div className="rounded-md border border-primary-200 bg-primary-50/50 p-3.5">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary-600" />
            <div className="text-[12.5px]">
              <p className="font-semibold text-text">Roles bundle attributes; policies grant access</p>
              <p className="text-text-muted">Assigning a role sets subject attributes (department, clearance, permissions). Whether a user can actually perform an action depends on the ABAC policy set — including scope, conditions and environment attributes at request time.</p>
            </div>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-[12px] text-text-muted py-8">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {roles.map((r) => (
              <SubCard key={r.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold truncate text-text">{r.name}</h3>
                      </div>
                      <p className="mt-0.5 text-[12px] text-text-muted">{r.description ?? '—'}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"><MoreVertical className="size-3.5" /></Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.permissions.slice(0, 4).map((p) => (
                      <code key={`${p.action}:${p.resource}`} className="rounded bg-surface-hover dark:bg-dark-hover px-1.5 py-0.5 text-[10.5px] font-mono text-text">{p.action}:{p.resource}</code>
                    ))}
                    {r.permissions.length > 4 && <span className="text-[10.5px] text-text-muted">+{r.permissions.length - 4} more</span>}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-surface-border dark:border-dark-border pt-2.5">
                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                      <span><span className="font-semibold text-text">{r.permissions.length}</span> perms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => { setModalRole(r); setModalOpen(true) }}>Edit</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] text-danger" onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                        {deleting === r.id ? '…' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </div>
              </SubCard>
            ))}
          </div>
        )}
      </div>
      {modalOpen && (
        <RoleModal open={modalOpen} onClose={() => setModalOpen(false)} existing={modalRole} onSuccess={load} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICIES PANE
// ══════════════════════════════════════════════════════════════════════════════
type PolicyEffect = 'allow' | 'deny' | 'step-up'
type Policy = {
  id: string; name: string; desc: string; effect: PolicyEffect
  subject: string; action: string; resource: string; conditions: string[]
  version: number; enabled: boolean; hits: number; lastModified: string
}

const POLICIES: Policy[] = [
  { id: 'pol.finance.approve.high', name: 'High-value invoice approval requires L3', desc: 'Invoices above 100,000 KES need executive clearance and MFA re-auth', effect: 'step-up', subject: "role = 'Finance Officer' OR clearance = 'L3'", action: 'financials.approve', resource: 'invoice.amount > 100000', conditions: ['mfa_recent < 5m', 'business_hours = true'], version: 4, enabled: true, hits: 47, lastModified: '2h ago' },
  { id: 'pol.property.scope', name: 'Property-scoped access', desc: 'Managers can only act on properties in their assigned scope', effect: 'allow', subject: "role IN ('Facility Manager','Property Manager')", action: 'properties.*', resource: 'property.id IN subject.scope', conditions: [], version: 12, enabled: true, hits: 2841, lastModified: '3d ago' },
  { id: 'pol.lease.terminate', name: 'Lease termination — dual control', desc: 'Terminating an active lease requires approval from two L2+ users', effect: 'step-up', subject: "clearance >= 'L2'", action: 'leases.terminate', resource: "lease.status = 'active'", conditions: ['approvals_required = 2', 'reason_documented = true'], version: 2, enabled: true, hits: 8, lastModified: '1w ago' },
  { id: 'pol.readonly.owners', name: 'Owners are read-only', desc: 'Owner role has no write access anywhere', effect: 'deny', subject: "role = 'Owner'", action: '*.create OR *.edit OR *.delete', resource: '*', conditions: [], version: 1, enabled: true, hits: 156, lastModified: '1mo ago' },
  { id: 'pol.afterhours', name: 'After-hours financial ops', desc: 'Financial mutations outside business hours require step-up MFA', effect: 'step-up', subject: '*', action: 'financials.*', resource: '*', conditions: ['business_hours = false', 'mfa_recent < 2m'], version: 3, enabled: false, hits: 0, lastModified: '2w ago' },
]

function EffectBadge({ effect }: { effect: PolicyEffect }) {
  const map = {
    allow:    { c: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, l: 'Allow' },
    deny:     { c: 'bg-rose-100 text-rose-800',       icon: XCircle,      l: 'Deny' },
    'step-up':{ c: 'bg-amber-100 text-amber-800',     icon: ShieldAlert,  l: 'Step-up' },
  }
  const m = map[effect]
  const Icon = m.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold', m.c)}>
      <Icon className="size-2.5" />{m.l}
    </span>
  )
}

function PoliciesPane() {
  const [selected, setSelected] = useState<Policy | null>(POLICIES[0])
  const [view, setView] = useState<'visual' | 'json'>('visual')
  const [simOpen, setSimOpen] = useState(false)

  return (
    <div>
      <PaneHeader
        title="Policies"
        description="ABAC rules that evaluate subject, action, resource and environment attributes to allow, deny or require step-up authentication."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setSimOpen(true)} className="gap-1.5"><Play className="mr-1.5 size-3.5" />Test access</Button>
            <Button variant="outline" size="sm" className="gap-1.5"><History className="mr-1.5 size-3.5" />Version history</Button>
            <Button variant="primary" size="sm" className="gap-1.5"><Plus className="mr-1.5 size-3.5" />New policy</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-[calc(100vh-10rem)]">
        {/* Policy list */}
        <div className="border-r border-surface-border dark:border-dark-border bg-surface-hover/20 dark:bg-dark-hover/20">
          <div className="border-b border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface px-4 py-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
              <input placeholder="Search policies…" className="h-8 w-full pl-8 pr-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <ul className="p-2 space-y-1">
            {POLICIES.map((p) => {
              const active = selected?.id === p.id
              return (
                <li key={p.id}>
                  <button onClick={() => setSelected(p)} className={cn('w-full rounded-md border p-2.5 text-left transition-colors', active ? 'border-primary-300 bg-white dark:bg-dark-card shadow-sm' : 'border-transparent hover:bg-white dark:hover:bg-dark-card')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold truncate text-text">{p.name}</div>
                        <code className="text-[10.5px] text-text-muted truncate block">{p.id}</code>
                      </div>
                      <EffectBadge effect={p.effect} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-text-muted">
                      <span>v{p.version} · {p.hits.toLocaleString()} hits</span>
                      {!p.enabled && <Badge variant="default" className="h-3.5 px-1 text-[9px]">Disabled</Badge>}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Policy editor */}
        {selected && (
          <div className="min-w-0 bg-surface dark:bg-dark-surface flex flex-col">
            <div className="border-b border-surface-border dark:border-dark-border px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold truncate text-text">{selected.name}</h3>
                    <EffectBadge effect={selected.effect} />
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">v{selected.version}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12px] text-text-muted">{selected.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Toggle checked={selected.enabled} />
                  <span className="text-[11px] font-medium text-text">{selected.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <div className="mt-3 inline-flex rounded-md border border-surface-border dark:border-dark-border p-0.5">
                <button onClick={() => setView('visual')} className={cn('px-3 py-1 text-[11px] font-medium rounded', view === 'visual' ? 'bg-primary-600 text-white' : 'text-text-muted')}><FileCode2 className="mr-1 inline size-3" />Visual</button>
                <button onClick={() => setView('json')} className={cn('px-3 py-1 text-[11px] font-medium rounded', view === 'json' ? 'bg-primary-600 text-white' : 'text-text-muted')}><Code2 className="mr-1 inline size-3" />JSON</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {view === 'visual' ? (
                <div className="space-y-3">
                  {[
                    { label: 'WHEN subject',    value: selected.subject,  tone: 'border-sky-400 bg-sky-50/50 text-sky-900',     icon: UsersIcon },
                    { label: 'ATTEMPTS action', value: selected.action,   tone: 'border-violet-400 bg-violet-50/50 text-violet-900', icon: Zap },
                    { label: 'ON resource',     value: selected.resource, tone: 'border-teal-400 bg-teal-50/50 text-teal-900',   icon: Building2 },
                  ].map((row) => {
                    const Icon = row.icon
                    return (
                      <div key={row.label} className={cn('rounded-md border-l-4 p-3', row.tone)}>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide"><Icon className="size-3" />{row.label}</div>
                        <code className="mt-1 block font-mono text-[12px]">{row.value}</code>
                      </div>
                    )
                  })}
                  {selected.conditions.length > 0 && (
                    <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 p-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900"><Clock className="size-3" />AND all conditions match</div>
                      <ul className="mt-1.5 space-y-1">
                        {selected.conditions.map((c) => (
                          <li key={c} className="flex items-center gap-2 text-[12px]"><span className="text-amber-700">▸</span><code className="font-mono text-[11.5px]">{c}</code></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rounded-md border-l-4 border-primary-400 bg-primary-50/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text"><Activity className="size-3" />THEN</div>
                      <EffectBadge effect={selected.effect} />
                    </div>
                    <p className="mt-1 text-[12.5px] text-text">
                      {selected.effect === 'allow' && 'Grant the request and log the decision.'}
                      {selected.effect === 'deny' && 'Reject the request and log the denial with the failed condition.'}
                      {selected.effect === 'step-up' && 'Require fresh MFA within the last 5 minutes; grant on success, deny on failure.'}
                    </p>
                  </div>
                </div>
              ) : (
                <pre className="rounded-md border border-surface-border dark:border-dark-border bg-zinc-950 p-4 text-[11.5px] font-mono text-zinc-100 overflow-x-auto leading-relaxed">
{`{
  "id": "${selected.id}",
  "version": ${selected.version},
  "effect": "${selected.effect}",
  "subject": { "match": "${selected.subject}" },
  "action": "${selected.action}",
  "resource": { "match": "${selected.resource}" },
  "conditions": ${JSON.stringify(selected.conditions, null, 2)}
}`}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
      {simOpen && (
        <Modal open={simOpen} onClose={() => setSimOpen(false)} title="Access simulator" size="lg">
          <p className="text-sm text-text-muted mb-4">Test what would happen if a subject attempts an action on a resource, right now.</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-text-muted">Subject (user)</label>
              <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>Stephen Muema (Payroll Officer · L2)</option>
                <option>Dennis Simiyu (Facility Manager · L3)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-text-muted">Action</label>
              <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option>financials.approve</option>
                <option>financials.view</option>
                <option>leases.terminate</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-text-muted">Resource</label>
              <input defaultValue="invoice.amount=250000, property=GWG1" className="h-9 w-full px-3 font-mono text-xs border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <Button variant="primary" className="w-full gap-1.5"><Play className="size-3.5" />Evaluate decision</Button>
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ATTRIBUTES PANE
// ══════════════════════════════════════════════════════════════════════════════
function AttributesPane() {
  const groups = [
    { key: 'subject',  title: 'Subject attributes',     tone: 'border-sky-400 bg-sky-50/50',    icon: UsersIcon,  hint: 'Properties of the user making a request',
      items: [
        { name: 'role',         type: 'enum',     values: 'Facility Manager, Finance Officer, …',  source: 'user_roles' },
        { name: 'clearance',    type: 'enum',     values: 'L1 · L2 · L3',                         source: 'user_roles' },
        { name: 'department',   type: 'string',   values: 'Operations, Finance, Front Office…',    source: 'profiles' },
        { name: 'scope',        type: 'array',    values: 'property_ids',                          source: 'user_property_scope' },
        { name: 'mfa_enrolled', type: 'bool',     values: 'true / false',                          source: 'auth.mfa_factors' },
      ]},
    { key: 'resource', title: 'Resource attributes',    tone: 'border-teal-400 bg-teal-50/50',  icon: Building2,  hint: 'Properties of the object being acted on',
      items: [
        { name: 'property_id',  type: 'uuid',     values: 'resource.property_id',                  source: 'properties' },
        { name: 'amount',       type: 'number',   values: 'invoice / payment amount',              source: 'invoices, payments' },
        { name: 'sensitivity',  type: 'enum',     values: 'public · internal · confidential',      source: 'documents.sensitivity' },
        { name: 'status',       type: 'enum',     values: 'draft, active, closed…',                source: 'state column' },
      ]},
    { key: 'env',      title: 'Environment attributes', tone: 'border-amber-400 bg-amber-50/50', icon: Globe,     hint: 'Contextual signals evaluated at request time',
      items: [
        { name: 'business_hours',  type: 'bool',     values: 'Mon–Fri 08:00–18:00 EAT',           source: 'server clock' },
        { name: 'mfa_recent',      type: 'duration', values: 'seconds since last MFA',             source: 'session claims' },
        { name: 'ip_trusted',      type: 'bool',     values: 'IP in allow-list',                   source: 'ip_allowlist' },
        { name: 'geo_country',     type: 'iso2',     values: 'KE, US, …',                          source: 'IP geolocation' },
      ]},
  ]

  return (
    <div>
      <PaneHeader
        title="Attributes &amp; scopes"
        description="Definitions used across every ABAC policy. Add new attributes to expose additional context to your policy engine."
        actions={<Button variant="primary" size="sm" className="gap-1.5"><Plus className="mr-1.5 size-3.5" />New attribute</Button>}
      />
      <div className="p-8 space-y-6">
        {groups.map((g) => {
          const Icon = g.icon
          return (
            <div key={g.key} className={cn('rounded-lg border-l-4 border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card', g.tone)}>
              <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border px-5 py-3.5">
                <div>
                  <div className="text-sm font-semibold text-text">{g.title}</div>
                  <div className="text-[11.5px] text-text-muted">{g.hint}</div>
                </div>
                <Icon className="size-4 text-text-muted" />
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-hover/30 dark:bg-dark-hover/30 text-[10.5px] uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="text-left px-5 py-2">Attribute</th>
                    <th className="text-left px-5 py-2">Type</th>
                    <th className="text-left px-5 py-2">Values</th>
                    <th className="text-left px-5 py-2">Source</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                  {g.items.map((a) => (
                    <tr key={a.name} className="hover:bg-surface-hover/20 dark:hover:bg-dark-hover/20">
                      <td className="px-5 py-2.5"><code className="font-mono text-[12px] text-text">{a.name}</code></td>
                      <td className="px-5 py-2.5"><Badge variant="default" className="font-mono text-[10px]">{a.type}</Badge></td>
                      <td className="px-5 py-2.5 text-[12px] text-text-muted">{a.values}</td>
                      <td className="px-5 py-2.5"><code className="text-[11px] text-text-muted">{a.source}</code></td>
                      <td className="px-5 py-2.5"><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="size-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION PANE
// ══════════════════════════════════════════════════════════════════════════════
function AuthPane() {
  return (
    <div>
      <PaneHeader title="Authentication" description="How users prove identity before ABAC evaluation. Configure password policy, MFA enforcement, SSO providers and session controls." />
      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubCard>
          <SubCardHeader title="Password policy" hint="Applied at signup, reset and rotation" />
          <div className="p-5 space-y-3.5">
            <FieldSwitch label="Minimum length: 12 characters" checked />
            <FieldSwitch label="Require uppercase, lowercase, number &amp; symbol" checked />
            <FieldSwitch label="Block passwords from Have I Been Pwned" checked />
            <FieldSwitch label="Rotate every 90 days" />
            <FieldSwitch label="Prevent reuse of last 5 passwords" checked />
          </div>
        </SubCard>

        <SubCard>
          <SubCardHeader title="Multi-factor authentication" hint="Layered on top of password / SSO" />
          <div className="p-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] uppercase tracking-wide font-medium text-text-muted">Enforcement</label>
              <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" defaultValue="required-privileged">
                <option value="optional">Optional — user choice</option>
                <option value="required-privileged">Required for L2+ and privileged actions</option>
                <option value="required-all">Required for all users</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-text">Allowed factors</p>
              <FieldSwitch label="Authenticator app (TOTP)" checked />
              <FieldSwitch label="Passkey / WebAuthn" checked />
              <FieldSwitch label="SMS one-time code" />
              <FieldSwitch label="Recovery codes" checked />
            </div>
            <div className="rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover p-2.5 text-[11.5px] text-text">
              <span className="font-semibold">Step-up window: </span>Fresh MFA required within 5 minutes for high-risk actions.
            </div>
          </div>
        </SubCard>

        <SubCard>
          <SubCardHeader title="Single sign-on" hint="SAML 2.0 / OIDC / SCIM provisioning" right={<Badge variant="default" className="text-[10px]">Enterprise</Badge>} />
          <div className="divide-y divide-surface-border dark:divide-dark-border">
            {[
              { name: 'Google Workspace',  protocol: 'OIDC',          status: 'connected', users: 8 },
              { name: 'Microsoft Entra ID',protocol: 'SAML 2.0',      status: 'not-configured', users: 0 },
              { name: 'Okta',              protocol: 'SAML 2.0 · SCIM', status: 'not-configured', users: 0 },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-[13px] font-medium text-text">{s.name}</div>
                  <div className="text-[11px] text-text-muted">{s.protocol} · {s.users} users</div>
                </div>
                {s.status === 'connected'
                  ? <Badge variant="default" className="bg-emerald-100 text-emerald-800"><CheckCircle2 className="mr-1 size-2.5" />Connected</Badge>
                  : <Button variant="outline" size="sm" className="h-7 text-xs">Configure</Button>}
              </div>
            ))}
          </div>
        </SubCard>

        <SubCard>
          <SubCardHeader title="Sessions &amp; device trust" hint="Applies to all portal users" />
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-text-muted">Idle timeout</label>
                <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" defaultValue="30m">
                  <option value="15m">15 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="4h">4 hours</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-text-muted">Absolute max</label>
                <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" defaultValue="12h">
                  <option value="8h">8 hours</option>
                  <option value="12h">12 hours</option>
                  <option value="24h">24 hours</option>
                </select>
              </div>
            </div>
            <FieldSwitch label="Limit to 3 concurrent sessions per user" />
            <FieldSwitch label="Bind sessions to IP + device fingerprint" checked />
            <FieldSwitch label="Force sign-out on password change" checked />
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-text-muted">IP allow-list (CIDR, comma-separated)</label>
              <textarea className="w-full px-3 py-2 text-xs font-mono border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" rows={2} defaultValue="196.201.0.0/16, 41.90.0.0/16" />
            </div>
          </div>
        </SubCard>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TOKENS PANE
// ══════════════════════════════════════════════════════════════════════════════
function TokensPane() {
  const [showKey, setShowKey] = useState(false)
  const pats = [
    { name: 'CI · deploy webhook',   user: 'System Admin', scopes: ['deployments:write'],          used: '2m ago',  expires: 'Jul 12, 2026', warn: false },
    { name: 'Kevin — meter uploads', user: 'Kevin Mutai',  scopes: ['meters:write', 'readings:read'], used: '6h ago',  expires: 'Sep 04, 2026', warn: false },
    { name: 'Finance report script', user: 'Stephen M.',   scopes: ['reports:read'],               used: '3d ago',  expires: 'expired',      warn: true },
  ]
  const svc = [
    { name: 'svc-billing-webhook', purpose: 'Stripe / M-Pesa callbacks',   rotated: '187d ago', warn: true },
    { name: 'svc-audit-shipper',   purpose: 'Streams audit log to S3',      rotated: '22d ago',  warn: false },
    { name: 'svc-mpesa-daraja',    purpose: 'Payment reconciliation cron',  rotated: '8d ago',   warn: false },
  ]

  return (
    <div>
      <PaneHeader
        title="API &amp; tokens"
        description="Personal access tokens for users and service accounts for backend integrations. All tokens are scoped and evaluated by the same ABAC engine."
        actions={<Button variant="primary" size="sm" className="gap-1.5"><Plus className="mr-1.5 size-3.5" />Issue token</Button>}
      />
      <div className="p-8 space-y-6">
        {/* Token reveal example */}
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-50/40 p-4 flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-4 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text">Token created — copy it now</div>
            <p className="text-[11.5px] text-text-muted">This is the only time the token will be shown. Store it somewhere safe.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-md border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface px-3 py-1.5 font-mono text-[11.5px] tracking-tight text-text">
                {showKey ? 'fac_pat_9k2d4mZ8xQ7bV3nR6tY1aL0eH5uW8jP2sC4iN9rB3vM7oX1qF2gK5wZ8hT4uY6nJ' : 'fac_pat_9k2d4mZ8••••••••••••••••••••••••••••••••••••••••'}
              </code>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setShowKey((v) => !v)}>
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0"><Copy className="size-3.5" /></Button>
            </div>
          </div>
        </div>

        {/* PATs */}
        <SubCard>
          <SubCardHeader title="Personal access tokens" hint="Issued to individual users; inherit their ABAC attributes" />
          <table className="w-full text-sm">
            <thead className="bg-surface-hover/30 dark:bg-dark-hover/30 text-[10.5px] uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left px-5 py-2">Token</th>
                <th className="text-left px-5 py-2">Owner</th>
                <th className="text-left px-5 py-2">Scopes</th>
                <th className="text-left px-5 py-2">Last used</th>
                <th className="text-left px-5 py-2">Expires</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {pats.map((t) => (
                <tr key={t.name} className="hover:bg-surface-hover/20 dark:hover:bg-dark-hover/20">
                  <td className="px-5 py-2.5 font-medium text-text">{t.name}</td>
                  <td className="px-5 py-2.5 text-[12.5px] text-text-muted">{t.user}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {t.scopes.map((s) => <code key={s} className="rounded bg-surface-hover dark:bg-dark-hover px-1.5 py-0.5 text-[10.5px] font-mono text-text">{s}</code>)}
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-[12px] text-text-muted">{t.used}</td>
                  <td className="px-5 py-2.5">
                    {t.warn ? <Badge variant="default" className="bg-rose-100 text-rose-800">Expired</Badge> : <span className="text-[12px] text-text-muted">{t.expires}</span>}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px]">Rotate</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] text-danger">Revoke</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SubCard>

        {/* Service accounts */}
        <SubCard>
          <SubCardHeader title="Service accounts" hint="Machine identities not tied to a user" right={<Button variant="outline" size="sm" className="h-7 text-xs gap-1"><Plus className="mr-1 size-3" />New service account</Button>} />
          <div className="divide-y divide-surface-border dark:divide-dark-border">
            {svc.map((s) => (
              <div key={s.name} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-md bg-primary-50 text-primary-600"><Terminal className="size-4" /></div>
                  <div>
                    <code className="text-[12.5px] font-mono font-semibold text-text">{s.name}</code>
                    <div className="text-[11px] text-text-muted">{s.purpose}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-[11.5px]', s.warn ? 'text-rose-700 font-semibold' : 'text-text-muted')}>
                    {s.warn && <AlertTriangle className="mr-1 inline size-3" />}Rotated {s.rotated}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1"><RefreshCw className="mr-1 size-3" />Rotate</Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><MoreVertical className="size-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </SubCard>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ACCESS REVIEWS PANE
// ══════════════════════════════════════════════════════════════════════════════
function ReviewsPane() {
  return (
    <div>
      <PaneHeader
        title="Access reviews"
        description="Periodic certification campaigns where reviewers confirm every user's access is still appropriate. Required for SOC 2, ISO 27001 and internal audit."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5"><Download className="mr-1.5 size-3.5" />Export CSV</Button>
            <Button variant="primary" size="sm" className="gap-1.5"><Plus className="mr-1.5 size-3.5" />Start review</Button>
          </>
        }
      />
      <div className="p-8 space-y-6">
        {/* Active campaign */}
        <SubCard>
          <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border px-5 py-3.5">
            <div>
              <div className="text-sm font-semibold text-text">Q3 2026 — Privileged access review</div>
              <div className="text-[11.5px] text-text-muted">Reviewing all L2+ users and service accounts</div>
            </div>
            <Badge variant="default" className="bg-amber-100 text-amber-800"><Clock className="mr-1 size-2.5" />In progress</Badge>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[{ l: 'Total items', v: '18', c: '' }, { l: 'Reviewed', v: '11', c: 'text-emerald-700' }, { l: 'Pending', v: '5', c: 'text-amber-700' }, { l: 'Overdue', v: '2', c: 'text-rose-700' }].map((k) => (
                <div key={k.l} className="rounded-md border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface px-3 py-2">
                  <div className="text-[10.5px] uppercase tracking-wide text-text-muted">{k.l}</div>
                  <div className={cn('text-lg font-semibold tabular-nums text-text', k.c)}>{k.v}</div>
                </div>
              ))}
            </div>
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-text-muted">Progress</span>
                <span className="font-semibold text-text">61%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-border dark:bg-dark-border overflow-hidden">
                <div className="h-full bg-primary-600" style={{ width: '61%' }} />
              </div>
            </div>
            <div className="rounded-md border border-surface-border dark:border-dark-border divide-y divide-surface-border dark:divide-dark-border">
              {[
                { user: 'Dennis Simiyu · Facility Manager · L3', reviewer: 'System Admin', state: 'kept' },
                { user: 'Barabara Noel · Property Manager · L2', reviewer: 'Dennis Simiyu',  state: 'kept' },
                { user: 'Stephen Muema · Payroll Officer · L2',  reviewer: 'Dennis Simiyu',  state: 'pending' },
                { user: 'svc-mpesa-daraja · service account',     reviewer: 'System Admin',   state: 'modify' },
                { user: 'Mike Aketch · Facility Manager · L2 (stale)', reviewer: 'System Admin', state: 'overdue' },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-[13px] font-medium text-text">{r.user}</div>
                    <div className="text-[11px] text-text-muted">Reviewer: {r.reviewer}</div>
                  </div>
                  {r.state === 'kept'    && <Badge variant="default" className="bg-emerald-100 text-emerald-800">Kept</Badge>}
                  {r.state === 'modify'  && <Badge variant="default" className="bg-sky-100 text-sky-800">Modify scope</Badge>}
                  {r.state === 'pending' && <Badge variant="default">Pending</Badge>}
                  {r.state === 'overdue' && <Badge variant="default" className="bg-rose-100 text-rose-800">Overdue</Badge>}
                </div>
              ))}
            </div>
          </div>
        </SubCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SubCard>
            <SubCardHeader title="Review schedule" hint="Automated campaigns for compliance" />
            <div className="p-5 space-y-3">
              {[
                { name: 'Privileged users (L2+)', cadence: 'Quarterly', next: 'Oct 1, 2026' },
                { name: 'Service accounts',       cadence: 'Quarterly', next: 'Oct 1, 2026' },
                { name: 'All users',              cadence: 'Annually',  next: 'Jan 1, 2027' },
                { name: 'External / guest users', cadence: 'Monthly',   next: 'Aug 1, 2026' },
              ].map((r) => (
                <div key={r.name} className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border px-3 py-2">
                  <div>
                    <div className="text-[13px] font-medium text-text">{r.name}</div>
                    <div className="text-[11px] text-text-muted">{r.cadence} · next {r.next}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">Edit</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full gap-1"><Plus className="mr-1.5 size-3" />Add campaign</Button>
            </div>
          </SubCard>

          <SubCard>
            <SubCardHeader title="Audit &amp; evidence" hint="Immutable log of every access decision and admin action" />
            <div className="p-5 space-y-3">
              {[{ l: 'Retention', v: '7 years' }, { l: 'Sink', v: 's3://facilityos-audit/' }].map((item) => (
                <div key={item.l} className="rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-text-muted">{item.l}</span>
                    <code className="text-[11px] font-mono text-text">{item.v}</code>
                  </div>
                </div>
              ))}
              <FieldSwitch label="Ship every decision to SIEM (Datadog / Splunk)" checked />
              <FieldSwitch label="Include denied decisions with trace" checked />
              <FieldSwitch label="Notify on suspicious patterns" checked />
              <Button variant="outline" size="sm" className="w-full">Open full audit trail</Button>
            </div>
          </SubCard>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SecuritySection — main component
// ══════════════════════════════════════════════════════════════════════════════
export function SecuritySection() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div className="flex min-h-full">
      {/* Left sidebar */}
      <aside className="w-56 shrink-0 border-r border-surface-border dark:border-dark-border bg-surface-hover/20 dark:bg-dark-hover/20">
        <div className="border-b border-surface-border dark:border-dark-border px-5 py-5">
          <h2 className="text-sm font-semibold text-text">Access &amp; security</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Enterprise ABAC console</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {TABS.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  isActive ? 'bg-white dark:bg-dark-card text-text font-medium shadow-sm border border-surface-border dark:border-dark-border' : 'text-text-muted hover:bg-white dark:hover:bg-dark-card hover:text-text',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <div className="truncate">{t.label}</div>
                  {!isActive && <div className="truncate text-[10px] text-text-muted">{t.hint}</div>}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-auto">
        {tab === 'overview'   && <OverviewPane />}
        {tab === 'users'      && <UsersPane />}
        {tab === 'roles'      && <RolesPane />}
        {tab === 'policies'   && <PoliciesPane />}
        {tab === 'attributes' && <AttributesPane />}
        {tab === 'auth'       && <AuthPane />}
        {tab === 'tokens'     && <TokensPane />}
        {tab === 'reviews'    && <ReviewsPane />}
      </div>
    </div>
  )
}
