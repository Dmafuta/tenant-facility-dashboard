'use client'
import React, { useState, useMemo } from 'react'
import {
  Bell, Check, Send, Activity, Mail, Smartphone, MessageSquare, Plug, Lock,
  Search, ArrowUpDown, User, Plus, Download, Pencil, ExternalLink, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

// ── Types ─────────────────────────────────────────────────────────────────────
type NotifChannel = 'email' | 'sms' | 'push' | 'inapp' | 'webhook'
type NotifSeverity = 'info' | 'warning' | 'critical'
type NotifCategoryKey = 'onboarding' | 'financial' | 'maintenance' | 'compliance' | 'security' | 'utilities' | 'operations'

type NotifEvent = {
  key: string
  name: string
  description: string
  category: NotifCategoryKey
  severity: NotifSeverity
  enabled: boolean
  channels: Record<NotifChannel, boolean>
  recipients: string[]
  escalation?: { afterMins: number; to: string }
  locked?: boolean
}

// ── Static data ───────────────────────────────────────────────────────────────
const NOTIF_CATEGORIES: { key: NotifCategoryKey; label: string; hint: string }[] = [
  { key: 'onboarding',   label: 'Onboarding',          hint: 'New tenants, owners and staff' },
  { key: 'financial',    label: 'Financial',            hint: 'Invoicing, receipts, arrears' },
  { key: 'maintenance',  label: 'Maintenance',          hint: 'Work orders and preventive tasks' },
  { key: 'utilities',    label: 'Utilities & meters',   hint: 'Readings, thresholds and anomalies' },
  { key: 'compliance',   label: 'Compliance',           hint: 'Leases, KYC and document expiry' },
  { key: 'security',     label: 'Security & access',    hint: 'Auth, sign-ins and permission changes' },
  { key: 'operations',   label: 'Operations',           hint: 'Visitors, incidents and rules' },
]

const CHANNEL_META: Record<NotifChannel, { label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = {
  email:   { label: 'Email',   icon: Mail,          hint: 'SMTP / API provider' },
  sms:     { label: 'SMS',     icon: Smartphone,    hint: 'SMS gateway' },
  push:    { label: 'Push',    icon: Bell,          hint: 'Mobile push (APNs / FCM)' },
  inapp:   { label: 'In-app',  icon: MessageSquare, hint: 'Bell inbox in the app' },
  webhook: { label: 'Webhook', icon: Plug,          hint: 'Deliver to external endpoint' },
}

const SEVERITY_META: Record<NotifSeverity, { label: string; cls: string; dot: string }> = {
  info:     { label: 'Info',     cls: 'border-sky-200 bg-sky-50 text-sky-700',         dot: 'bg-sky-500' },
  warning:  { label: 'Warning',  cls: 'border-amber-200 bg-amber-50 text-amber-700',   dot: 'bg-amber-500' },
  critical: { label: 'Critical', cls: 'border-rose-200 bg-rose-50 text-rose-700',      dot: 'bg-rose-500' },
}

const NOTIF_EVENTS: NotifEvent[] = [
  { key: 'welcome_email',      name: 'Welcome email on registration', description: 'Send a welcome email to new tenants and owners when they are registered.', category: 'onboarding', severity: 'info', enabled: false, channels: { email: true, sms: false, push: false, inapp: false, webhook: false }, recipients: ['Tenant', 'Owner'] },
  { key: 'invite_sent',        name: 'Portal invitation',             description: 'Notify a user when they are invited to the tenant / owner portal.',         category: 'onboarding', severity: 'info', enabled: true,  channels: { email: true, sms: true, push: false, inapp: false, webhook: false }, recipients: ['Recipient'] },

  { key: 'rent_overdue',       name: 'Rent overdue reminder',         description: 'Alert tenant when rent is unpaid after the grace period.',    category: 'financial', severity: 'warning',  enabled: true,  channels: { email: true, sms: true, push: false, inapp: true, webhook: false }, recipients: ['Tenant', 'Property manager'], escalation: { afterMins: 4320, to: 'Finance lead' } },
  { key: 'payment_received',   name: 'Payment received',              description: 'Notify tenant and finance when a payment is logged.',          category: 'financial', severity: 'info',     enabled: true,  channels: { email: true, sms: false, push: false, inapp: true, webhook: true }, recipients: ['Tenant', 'Finance'] },
  { key: 'arrears_escalation', name: 'Arrears escalation',            description: 'Alert managers when arrears exceed 2 months.',                category: 'financial', severity: 'critical', enabled: false, channels: { email: true, sms: true, push: false, inapp: true, webhook: false }, recipients: ['Property manager', 'Finance lead'], escalation: { afterMins: 1440, to: 'Head of operations' } },
  { key: 'invoice_issued',     name: 'Invoice issued',                description: 'Send monthly invoices to tenants and owners.',                category: 'financial', severity: 'info',     enabled: true,  channels: { email: true, sms: false, push: false, inapp: true, webhook: false }, recipients: ['Tenant', 'Owner'] },

  { key: 'wo_new',     name: 'New work order',              description: 'Notify supervisor of a new maintenance request.',            category: 'maintenance', severity: 'info',    enabled: true, channels: { email: true, sms: false, push: true, inapp: true, webhook: false }, recipients: ['Maintenance supervisor'] },
  { key: 'wo_overdue', name: 'Work order overdue',          description: 'Alert when an open work order is 7+ days old.',             category: 'maintenance', severity: 'warning', enabled: true, channels: { email: true, sms: false, push: true, inapp: true, webhook: false }, recipients: ['Maintenance supervisor', 'Property manager'] },
  { key: 'pm_due',     name: 'Preventive maintenance due',  description: 'Reminder 7 days before a scheduled task.',                  category: 'maintenance', severity: 'info',    enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: false }, recipients: ['Maintenance team'] },

  { key: 'meter_anomaly',  name: 'Meter anomaly detected',  description: 'Consumption spike or drop outside expected band.',         category: 'utilities', severity: 'warning', enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: true }, recipients: ['Facilities lead'] },
  { key: 'reading_missing',name: 'Missing meter reading',   description: 'No reading captured for a scheduled cycle.',               category: 'utilities', severity: 'info',    enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: false }, recipients: ['Meter reader', 'Facilities lead'] },

  { key: 'lease_expiring', name: 'Lease expiring',  description: '60 days before lease end date.',                     category: 'compliance', severity: 'warning', enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: false }, recipients: ['Tenant', 'Leasing officer'] },
  { key: 'kyc_pending',    name: 'KYC pending',     description: 'Documents outstanding after registration.',           category: 'compliance', severity: 'warning', enabled: true, channels: { email: true, sms: true, push: false, inapp: true, webhook: false }, recipients: ['Compliance officer'] },
  { key: 'doc_expiry',     name: 'Document expiry', description: 'Insurance, permit or certificate about to expire.',  category: 'compliance', severity: 'warning', enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: false }, recipients: ['Compliance officer', 'Owner'] },

  { key: 'auth_otp',   name: 'Sign-in OTP & security codes',   description: 'One-time codes for login and sensitive actions. Cannot be disabled.', category: 'security', severity: 'critical', enabled: true, locked: true, channels: { email: true, sms: true, push: false, inapp: false, webhook: false }, recipients: ['Recipient'] },
  { key: 'new_device', name: 'New device sign-in',              description: 'Alert user when a new device or location signs in.',                  category: 'security', severity: 'warning',  enabled: true, channels: { email: true, sms: false, push: true, inapp: true, webhook: false }, recipients: ['Recipient'] },
  { key: 'role_change',name: 'Role or permission change',       description: 'Notify affected user and workspace admins.',                          category: 'security', severity: 'warning',  enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: true }, recipients: ['Recipient', 'Workspace admin'] },

  { key: 'visitor_arrival',  name: 'Visitor arrival',           description: 'Notify host when a visitor is checked in at the gate.',     category: 'operations', severity: 'info',    enabled: true, channels: { email: false, sms: false, push: true, inapp: true, webhook: false }, recipients: ['Host'] },
  { key: 'rule_breach',      name: 'Rules breach recorded',     description: 'House rules infraction logged against a unit.',             category: 'operations', severity: 'warning', enabled: true, channels: { email: true, sms: false, push: false, inapp: true, webhook: false }, recipients: ['Tenant', 'Property manager'] },
  { key: 'incident_critical',name: 'Critical incident',         description: 'Fire, flood or security incident requiring escalation.',    category: 'operations', severity: 'critical', enabled: true, channels: { email: true, sms: true, push: true, inapp: true, webhook: true }, recipients: ['On-call manager', 'Security lead'], escalation: { afterMins: 15, to: 'Head of operations' } },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMinutes(m: number) {
  if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.round(m / 60)}h`
  return `${Math.round(m / 1440)}d`
}

// ── SummaryTile ───────────────────────────────────────────────────────────────
function SummaryTile({ label, value, icon: Icon, tone = 'default' }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'emerald' | 'amber' | 'muted'
}) {
  const toneCls =
    tone === 'emerald' ? 'text-emerald-700 bg-emerald-50'
    : tone === 'amber'   ? 'text-amber-700 bg-amber-50'
    : tone === 'muted'   ? 'text-text-muted bg-surface-hover'
    : 'text-primary-600 bg-primary-50'
  return (
    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', toneCls)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-text">{value}</div>
    </div>
  )
}

// ── NotifSwitch ───────────────────────────────────────────────────────────────
function NotifSwitch({ checked, onChange, disabled, tone = 'emerald' }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; tone?: 'emerald' | 'amber'
}) {
  const onCls = tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? onCls : 'bg-surface-border dark:bg-dark-border',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5'
      )} />
    </button>
  )
}

// ── EventRow ──────────────────────────────────────────────────────────────────
function EventRow({ event, dimmed, onToggle, onChannel }: {
  event: NotifEvent; dimmed: boolean
  onToggle: (v: boolean) => void
  onChannel: (ch: NotifChannel, v: boolean) => void
}) {
  const sev = SEVERITY_META[event.severity]
  return (
    <div className={cn('group flex items-start gap-4 px-4 py-3.5', dimmed && 'opacity-60')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text">{event.name}</span>
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', sev.cls)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', sev.dot)} />
            {sev.label}
          </span>
          {event.locked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-surface-border dark:border-dark-border px-2 py-0.5 text-[10px] text-text-muted">
              <Lock className="h-3 w-3" /> Always on
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-text-muted">{event.description}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {(Object.keys(CHANNEL_META) as NotifChannel[]).map((ch) => {
            const Icon = CHANNEL_META[ch].icon
            const on = event.channels[ch]
            return (
              <button
                key={ch}
                type="button"
                onClick={() => onChannel(ch, !on)}
                disabled={!event.enabled || event.locked}
                title={CHANNEL_META[ch].hint}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] uppercase tracking-wide transition-colors',
                  on
                    ? 'border-primary-300 bg-primary-50 text-primary-600 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'border-transparent bg-surface-hover text-text-muted hover:bg-surface-border dark:bg-dark-hover',
                  (!event.enabled || event.locked) && 'cursor-not-allowed opacity-60'
                )}
              >
                <Icon className="h-3 w-3" />
                {CHANNEL_META[ch].label}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {event.recipients.join(' · ')}
          </span>
          {event.escalation && (
            <span className="inline-flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Escalate after {formatMinutes(event.escalation.afterMins)} → {event.escalation.to}
            </span>
          )}
        </div>
      </div>
      <NotifSwitch checked={event.enabled} onChange={onToggle} disabled={event.locked} />
    </div>
  )
}

// ── Rules Tab ─────────────────────────────────────────────────────────────────
function NotifRulesTab() {
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'
  const selectCls = inputCls
  const cardCls = 'rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5'

  return (
    <div className="mt-6 space-y-5">
      <div className={cardCls}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text tracking-tight">Quiet hours</h3>
            <p className="mt-0.5 text-xs text-text-muted">Suppress non-critical outbound messages during set hours. Critical events (incidents, OTP) always deliver.</p>
          </div>
          <NotifSwitch checked={true} onChange={() => {}} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Start</label>
            <input defaultValue="21:00" className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">End</label>
            <input defaultValue="07:00" className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Timezone</label>
            <select defaultValue="Africa/Nairobi" className={selectCls}>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
              <option value="Europe/London">Europe/London</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-text tracking-tight">Digest &amp; batching</h3>
        <p className="mt-0.5 text-xs text-text-muted">Roll up low-priority alerts into scheduled digests instead of firing individually.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Frequency</label>
            <select defaultValue="daily" className={selectCls}>
              <option value="off">Off — send immediately</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mon)</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Delivery time</label>
            <input defaultValue="08:30" className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Applies to</label>
            <select defaultValue="info" className={selectCls}>
              <option value="info">Info events only</option>
              <option value="info_warn">Info + Warning</option>
              <option value="all">All non-critical</option>
            </select>
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-text tracking-tight">Rate limits &amp; retries</h3>
        <p className="mt-0.5 text-xs text-text-muted">Protect recipients and providers from bursty traffic. Failed deliveries retry with exponential backoff.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Max per recipient / hour</label>
            <input type="number" defaultValue={20} className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Max SMS / day (workspace)</label>
            <input type="number" defaultValue={2000} className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Retry attempts</label>
            <select defaultValue="3" className={selectCls}>
              {['1','2','3','5','8'].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-text tracking-tight">Sender identity</h3>
        <p className="mt-0.5 text-xs text-text-muted">Default From identity used across email and SMS. Category-level overrides available.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">From name</label>
            <input defaultValue="Great Wall Gardens" className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">From email</label>
            <input defaultValue="notify@greatwallgardens.estate" className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Reply-to</label>
            <input defaultValue="support@greatwallgardens.estate" className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">SMS sender ID</label>
            <input defaultValue="GREATWALL" className={inputCls} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Discard</Button>
        <Button variant="primary" size="sm">Save changes</Button>
      </div>
    </div>
  )
}

// ── Recipients Tab ────────────────────────────────────────────────────────────
function NotifRecipientsTab() {
  const roles = [
    { role: 'Tenant',                  channels: 'Email, SMS, Push',        events: 8 },
    { role: 'Owner',                   channels: 'Email, In-app',           events: 5 },
    { role: 'Property manager',        channels: 'Email, In-app, Push',     events: 11 },
    { role: 'Maintenance supervisor',  channels: 'Email, Push',             events: 4 },
    { role: 'Finance lead',            channels: 'Email, In-app',           events: 6 },
    { role: 'Compliance officer',      channels: 'Email, SMS',              events: 3 },
    { role: 'On-call manager',         channels: 'SMS, Push, Webhook',      events: 2 },
    { role: 'Workspace admin',         channels: 'Email, In-app',           events: 4 },
  ]
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-text">Role-based recipients</h3>
            <p className="text-xs text-text-muted">Who receives each event by default. Users inherit from their role.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add role
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface-hover/40 dark:bg-dark-hover text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Role</th>
              <th className="px-4 py-2 text-left font-medium">Preferred channels</th>
              <th className="px-4 py-2 text-left font-medium">Subscribed events</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {roles.map((r) => (
              <tr key={r.role} className="hover:bg-surface-hover/30 dark:hover:bg-dark-hover/30">
                <td className="px-4 py-2.5 font-medium text-text">{r.role}</td>
                <td className="px-4 py-2.5 text-text-muted">{r.channels}</td>
                <td className="px-4 py-2.5 text-text-muted">{r.events}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5">
        <h3 className="text-sm font-semibold tracking-tight text-text">Channel providers</h3>
        <p className="mt-0.5 text-xs text-text-muted">Notifications route through the connections configured in Integrations.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(CHANNEL_META) as NotifChannel[]).map((ch) => {
            const Icon = CHANNEL_META[ch].icon
            return (
              <div key={ch} className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-sm font-medium text-text">{CHANNEL_META[ch].label}</div>
                    <div className="text-[11px] text-text-muted">{CHANNEL_META[ch].hint}</div>
                  </div>
                </div>
                <a href="/settings?section=integrations" className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline">
                  Manage <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Activity Tab ──────────────────────────────────────────────────────────────
function NotifActivityTab() {
  const rows = [
    { t: '2m ago',  ev: 'Payment received',              to: 'j.mwangi@…',       ch: 'Email',   status: 'delivered' },
    { t: '18m ago', ev: 'Rent overdue reminder',         to: '+254 712 •••',     ch: 'SMS',     status: 'delivered' },
    { t: '42m ago', ev: 'Work order overdue',            to: 'supervisor@…',     ch: 'Email',   status: 'delivered' },
    { t: '1h ago',  ev: 'Meter anomaly detected',        to: 'https://hooks.…',  ch: 'Webhook', status: 'retry' },
    { t: '3h ago',  ev: 'Welcome email on registration', to: 'a.owino@…',        ch: 'Email',   status: 'skipped' },
    { t: '5h ago',  ev: 'New device sign-in',            to: 's.admin@…',        ch: 'Push',    status: 'delivered' },
    { t: '6h ago',  ev: 'Arrears escalation',            to: '+254 733 •••',     ch: 'SMS',     status: 'failed' },
  ]
  const badge = (s: string) => {
    if (s === 'delivered') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    if (s === 'retry')     return 'border-amber-200 bg-amber-50 text-amber-700'
    if (s === 'failed')    return 'border-rose-200 bg-rose-50 text-rose-700'
    return 'border-surface-border bg-surface text-text-muted'
  }
  return (
    <div className="mt-6 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
      <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-text">Recent deliveries</h3>
          <p className="text-xs text-text-muted">Last 24 hours across all channels. Full logs available under Integrations.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-surface-hover/40 dark:bg-dark-hover text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium">When</th>
            <th className="px-4 py-2 text-left font-medium">Event</th>
            <th className="px-4 py-2 text-left font-medium">Recipient</th>
            <th className="px-4 py-2 text-left font-medium">Channel</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border dark:divide-dark-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface-hover/30 dark:hover:bg-dark-hover/30">
              <td className="px-4 py-2.5 text-text-muted">{r.t}</td>
              <td className="px-4 py-2.5 font-medium text-text">{r.ev}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{r.to}</td>
              <td className="px-4 py-2.5 text-text-muted">{r.ch}</td>
              <td className="px-4 py-2.5">
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', badge(r.status))}>{r.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Test Dialog ───────────────────────────────────────────────────────────────
function NotifTestDialog({ open, onClose, events }: { open: boolean; onClose: () => void; events: NotifEvent[] }) {
  const [evKey, setEvKey]   = useState(events[0]?.key ?? '')
  const [ch, setCh]         = useState<NotifChannel>('email')
  const [to, setTo]         = useState('')
  if (!open) return null
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-dark-card shadow-2xl">
        <div className="border-b border-surface-border dark:border-dark-border px-5 py-4">
          <p className="text-base font-semibold text-text">Send test notification</p>
          <p className="mt-0.5 text-xs text-text-muted">Deliver a sample of any event to a single recipient. Test sends bypass quiet hours but respect provider limits.</p>
        </div>
        <div className="p-5 grid gap-3">
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Event</label>
            <select value={evKey} onChange={(e) => setEvKey(e.target.value)} className={inputCls}>
              {events.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Channel</label>
            <select value={ch} onChange={(e) => setCh(e.target.value as NotifChannel)} className={inputCls}>
              {(Object.keys(CHANNEL_META) as NotifChannel[]).map((c) => (
                <option key={c} value={c}>{CHANNEL_META[c].label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="block text-xs font-medium text-text-muted">Recipient</label>
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email@example.com or +254712345678" className={inputCls} />
          </div>
        </div>
        <div className="border-t border-surface-border dark:border-dark-border px-5 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="gap-1.5" onClick={() => onClose()}>
            <Send className="h-3.5 w-3.5" /> Send test
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── NotificationsSection ──────────────────────────────────────────────────────
export function NotificationsSection() {
  const [events, setEvents]       = useState<NotifEvent[]>(NOTIF_EVENTS)
  const [paused, setPaused]       = useState(false)
  const [tab, setTab]             = useState<'events' | 'rules' | 'recipients' | 'activity'>('events')
  const [query, setQuery]         = useState('')
  const [catFilter, setCatFilter] = useState<NotifCategoryKey | 'all'>('all')
  const [sevFilter, setSevFilter] = useState<NotifSeverity | 'all'>('all')
  const [testOpen, setTestOpen]   = useState(false)

  const filtered = useMemo(() => events.filter((e) => {
    if (catFilter !== 'all' && e.category !== catFilter) return false
    if (sevFilter !== 'all' && e.severity !== sevFilter) return false
    if (query && !(`${e.name} ${e.description}`.toLowerCase().includes(query.toLowerCase()))) return false
    return true
  }), [events, catFilter, sevFilter, query])

  const grouped = useMemo(() => {
    const map: Record<string, NotifEvent[]> = {}
    for (const e of filtered) (map[e.category] ??= []).push(e)
    return map
  }, [filtered])

  const total   = events.length
  const enabled = events.filter((e) => e.enabled).length
  const critical = events.filter((e) => e.severity === 'critical' && e.enabled).length
  const channelsUsed = new Set<NotifChannel>()
  events.forEach((e) => (Object.keys(e.channels) as NotifChannel[]).forEach((c) => { if (e.enabled && e.channels[c]) channelsUsed.add(c) }))

  const patch = (key: string, up: (e: NotifEvent) => NotifEvent) =>
    setEvents((prev) => prev.map((e) => (e.key === key ? up(e) : e)))

  const selectCls = 'px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="max-w-6xl px-8 py-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Notifications</h2>
          <p className="mt-1 text-sm text-text-muted">Control every event the platform emits — channels, recipients, severity and escalation.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTestOpen(true)}>
            <Send className="h-4 w-4" /> Send test
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab('activity')}>
            <Activity className="h-4 w-4" /> Delivery logs
          </Button>
        </div>
      </header>

      {/* Master pause */}
      <div className={cn(
        'mt-6 flex items-start justify-between gap-4 rounded-lg border p-4',
        paused
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-surface-border dark:border-dark-border bg-white dark:bg-dark-card'
      )}>
        <div className="flex items-start gap-3">
          <span className={cn(
            'mt-0.5 flex h-8 w-8 items-center justify-center rounded-md',
            paused ? 'bg-amber-100 text-amber-700' : 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
          )}>
            {paused ? <AlertTriangle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </span>
          <div>
            <div className="text-sm font-medium text-text">
              {paused ? 'All notifications are paused' : 'Notifications are active'}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {paused
                ? 'No billing emails, receipts or operational alerts will be sent. Security & OTP messages are unaffected.'
                : 'Events are delivered on their configured channels. Toggle to pause during maintenance windows or bulk imports.'}
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <span className="text-xs text-text-muted">Pause all</span>
          <NotifSwitch checked={paused} onChange={setPaused} tone={paused ? 'amber' : 'emerald'} />
        </label>
      </div>

      {/* KPI tiles */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Events"          value={String(total)}            icon={Bell} />
        <SummaryTile label="Enabled"         value={`${enabled}/${total}`}    icon={Check} tone="emerald" />
        <SummaryTile label="Critical live"   value={String(critical)}         icon={AlertTriangle} tone={critical ? 'amber' : 'muted'} />
        <SummaryTile label="Channels in use" value={String(channelsUsed.size)} icon={Send} />
      </div>

      {/* Tab bar */}
      <div className="mt-6 flex items-center gap-1 border-b border-surface-border dark:border-dark-border">
        {([
          { k: 'events',     l: 'Events' },
          { k: 'rules',      l: 'Delivery rules' },
          { k: 'recipients', l: 'Recipients & routing' },
          { k: 'activity',   l: 'Activity' },
        ] as const).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              'relative -mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              tab === t.k
                ? 'border-primary-600 font-medium text-text'
                : 'border-transparent text-text-muted hover:text-text'
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="mt-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events by name or description"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as NotifCategoryKey | 'all')} className={selectCls}>
              <option value="all">All categories</option>
              {NOTIF_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value as NotifSeverity | 'all')} className={selectCls}>
              <option value="all">All severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Grouped events */}
          <div className="mt-5 space-y-6">
            {NOTIF_CATEGORIES.filter((c) => grouped[c.key]?.length).map((c) => (
              <section key={c.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-text">{c.label}</h3>
                    <p className="text-xs text-text-muted">{c.hint}</p>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {grouped[c.key].filter((e) => e.enabled).length} of {grouped[c.key].length} enabled
                  </span>
                </div>
                <div className="divide-y divide-surface-border dark:divide-dark-border overflow-hidden rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
                  {grouped[c.key].map((e) => (
                    <EventRow
                      key={e.key}
                      event={e}
                      dimmed={paused}
                      onToggle={(v) => patch(e.key, (x) => ({ ...x, enabled: v }))}
                      onChannel={(ch, v) => patch(e.key, (x) => ({ ...x, channels: { ...x.channels, [ch]: v } }))}
                    />
                  ))}
                </div>
              </section>
            ))}
            {!Object.keys(grouped).length && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border dark:border-dark-border py-12 text-center">
                <Bell className="mb-2 h-6 w-6 text-text-muted/60" />
                <p className="text-sm font-medium text-text">No events match these filters</p>
                <p className="mt-0.5 text-xs text-text-muted">Clear the search or pick a different category.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'rules'      && <NotifRulesTab />}
      {tab === 'recipients' && <NotifRecipientsTab />}
      {tab === 'activity'   && <NotifActivityTab />}

      <NotifTestDialog open={testOpen} onClose={() => setTestOpen(false)} events={events} />
    </div>
  )
}
