'use client'
import React, { useState, useMemo } from 'react'
import {
  Mail, MessageSquare, Wallet, Send, Sparkles, Globe, Lock,
  Plug, Activity, AlertTriangle, Check, Plus, ChevronRight, ChevronLeft,
  Search, Building2, Eye, EyeOff, Copy, TestTube2, Pencil, RefreshCw,
  MoreVertical, GripVertical, History, ExternalLink,
} from 'lucide-react'
import { Database, IdCard } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────
type IntegrationEnv = 'production' | 'sandbox'
type IntegrationStatus = 'active' | 'degraded' | 'paused' | 'error'
type IntegrationScope = { kind: 'global' } | { kind: 'property'; label: string }

type Connection = {
  id: string; name: string; env: IntegrationEnv; scope: IntegrationScope
  status: IntegrationStatus; isDefault: boolean; lastUsed: string
  createdBy: string; meta: Record<string, string>; secretPreview?: string
}

type CategoryKey = 'email' | 'sms' | 'payments' | 'messaging' | 'kyc' | 'ai' | 'storage' | 'webhooks'

type Category = {
  key: CategoryKey; name: string; tagline: string
  icon: React.ComponentType<{ className?: string }>
  tint: string; providers: string[]
  supportsFailover: boolean; supportsInboundWebhook: boolean
  connections: Connection[]
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const INTEGRATION_CATEGORIES: Category[] = [
  {
    key: 'email', name: 'Email delivery', tagline: 'Transactional and marketing email providers',
    icon: Mail, tint: 'bg-sky-100 text-sky-700',
    providers: ['SMTP (generic)', 'SendGrid', 'Postmark', 'Amazon SES', 'Mailgun'],
    supportsFailover: true, supportsInboundWebhook: false,
    connections: [
      { id: 'e1', name: 'SendGrid — Primary', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: true, lastUsed: '2026-07-11', createdBy: 'System Admin', meta: { From: 'no-reply@greatwallgardens.estate', Provider: 'SendGrid', Region: 'eu-west' }, secretPreview: 'SG.•••••••••jK2' },
      { id: 'e2', name: 'Postmark — Transactional', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: false, lastUsed: '2026-07-10', createdBy: 'Ops', meta: { Stream: 'outbound', From: 'billing@greatwallgardens.estate' }, secretPreview: 'pm-•••••4ab' },
      { id: 'e3', name: 'Sandbox SMTP', env: 'sandbox', scope: { kind: 'global' }, status: 'paused', isDefault: false, lastUsed: '2026-06-04', createdBy: 'Dev', meta: { Host: 'smtp.mailtrap.io', Port: '2525' } },
    ],
  },
  {
    key: 'sms', name: 'SMS gateways', tagline: 'OTP, notices and reminders',
    icon: MessageSquare, tint: 'bg-violet-100 text-violet-700',
    providers: ["Africa's Talking", 'Afrinet Bulk SMS', 'Twilio', 'Infobip'],
    supportsFailover: true, supportsInboundWebhook: true,
    connections: [
      { id: 's1', name: "Africa's Talking — KE", env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: true, lastUsed: '2026-07-12', createdBy: 'System Admin', meta: { 'Sender ID': 'GWG', Username: 'gwg_prod' }, secretPreview: 'at_•••••••e12' },
      { id: 's2', name: 'Afrinet Bulk', env: 'production', scope: { kind: 'property', label: 'Phase 1' }, status: 'degraded', isDefault: false, lastUsed: '2026-07-09', createdBy: 'Ops', meta: { 'Sender ID': 'GWG', Endpoint: 'api.afrinet.co.ke' } },
    ],
  },
  {
    key: 'payments', name: 'Payments', tagline: 'Mobile money, cards, and bank rails',
    icon: Wallet, tint: 'bg-emerald-100 text-emerald-700',
    providers: ['M-Pesa Daraja', 'Stripe', 'Flutterwave', 'Pesapal'],
    supportsFailover: false, supportsInboundWebhook: true,
    connections: [
      { id: 'p1', name: 'M-Pesa — GWG Paybill', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: true, lastUsed: '2026-07-12', createdBy: 'Finance', meta: { Shortcode: '247247', Type: 'Paybill', 'Account prefix': 'GWG' }, secretPreview: 'cred_•••••7c9' },
      { id: 'p2', name: 'M-Pesa — Sandbox', env: 'sandbox', scope: { kind: 'global' }, status: 'active', isDefault: false, lastUsed: '2026-07-05', createdBy: 'Dev', meta: { Shortcode: '174379', Type: 'Paybill' } },
    ],
  },
  {
    key: 'messaging', name: 'Messaging & bots', tagline: 'Telegram, WhatsApp Business, Slack',
    icon: Send, tint: 'bg-indigo-100 text-indigo-700',
    providers: ['Telegram Bot', 'WhatsApp Business', 'Slack'],
    supportsFailover: false, supportsInboundWebhook: true,
    connections: [
      { id: 'm1', name: 'Telegram — Ops channel', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: true, lastUsed: '2026-07-12', createdBy: 'System Admin', meta: { Bot: '@gwg_ops_bot', 'Chat ID': '-100234•••' }, secretPreview: 'bot•••••:AA' },
    ],
  },
  {
    key: 'kyc', name: 'Identity & KYC', tagline: 'Verify tenants, staff and visitors',
    icon: IdCard, tint: 'bg-amber-100 text-amber-700',
    providers: ['Prembly', 'Smile ID', 'Onfido'],
    supportsFailover: true, supportsInboundWebhook: false,
    connections: [
      { id: 'k1', name: 'Prembly — Production', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: true, lastUsed: '2026-07-11', createdBy: 'Compliance', meta: { Region: 'KE / NG', 'App ID': 'gwg-prod' }, secretPreview: 'pk_•••••••b2' },
    ],
  },
  {
    key: 'ai', name: 'AI providers', tagline: 'Assistants, summarisation, classification',
    icon: Sparkles, tint: 'bg-fuchsia-100 text-fuchsia-700',
    providers: ['Anthropic', 'OpenAI', 'Google Gemini', 'Mistral'],
    supportsFailover: true, supportsInboundWebhook: false,
    connections: [
      { id: 'a1', name: 'Anthropic — Primary', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: true, lastUsed: '2026-07-12', createdBy: 'System Admin', meta: { Model: 'claude-sonnet-4-6', 'Rate limit': '50 rpm' }, secretPreview: 'sk-ant-•••••q4' },
      { id: 'a2', name: 'OpenAI — Fallback', env: 'production', scope: { kind: 'global' }, status: 'active', isDefault: false, lastUsed: '2026-07-08', createdBy: 'System Admin', meta: { Model: 'gpt-4o-mini', 'Rate limit': '60 rpm' }, secretPreview: 'sk-•••••••Xf' },
    ],
  },
  {
    key: 'storage', name: 'Storage & documents', tagline: 'Backups and long-term archives',
    icon: Database, tint: 'bg-slate-100 text-slate-700',
    providers: ['Amazon S3', 'Google Cloud Storage', 'Azure Blob'],
    supportsFailover: false, supportsInboundWebhook: false,
    connections: [],
  },
  {
    key: 'webhooks', name: 'Outbound webhooks', tagline: 'Subscribe partners to platform events',
    icon: Globe, tint: 'bg-teal-100 text-teal-700',
    providers: ['Generic HTTPS'],
    supportsFailover: false, supportsInboundWebhook: false,
    connections: [],
  },
]

function statusMeta(s: IntegrationStatus) {
  switch (s) {
    case 'active':   return { label: 'Healthy',  dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
    case 'degraded': return { label: 'Degraded', dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' }
    case 'paused':   return { label: 'Paused',   dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' }
    case 'error':    return { label: 'Error',    dot: 'bg-rose-500',    text: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── SummaryTile ────────────────────────────────────────────────────────────────
function SummaryTile({ label, value, icon: Icon, tone = 'default' }: {
  label: string; value: string; icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'emerald' | 'amber' | 'muted'
}) {
  const toneCls =
    tone === 'emerald' ? 'text-emerald-700 bg-emerald-50'
    : tone === 'amber'   ? 'text-amber-700 bg-amber-50'
    : tone === 'muted'   ? 'text-text-muted bg-surface-hover dark:bg-dark-hover'
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

// ── CategoryCard ───────────────────────────────────────────────────────────────
function CategoryCard({ category, onOpen }: { category: Category; onOpen: () => void }) {
  const Icon = category.icon
  const active = category.connections.filter((c) => c.status === 'active').length
  const total = category.connections.length
  const issues = category.connections.filter((c) => c.status === 'degraded' || c.status === 'error').length
  const defaultConn = category.connections.find((c) => c.isDefault)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-xl border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5 text-left transition-all hover:border-primary-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', category.tint)}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-text">{category.name}</h3>
      <p className="mt-0.5 text-xs text-text-muted line-clamp-2">{category.tagline}</p>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="font-medium text-text">{total}</span>
        <span className="text-text-muted">connection{total === 1 ? '' : 's'}</span>
        {total > 0 && (
          <span className="flex items-center gap-1 text-text-muted">
            · <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{active} active</span>
            {issues > 0 && (
              <><span> · </span><span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" /><span>{issues} issue{issues === 1 ? '' : 's'}</span></>
            )}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-muted">
        {defaultConn ? (
          <><Badge variant="default" className="h-5 rounded px-1.5 text-[10px] font-medium">Default</Badge><span className="truncate">{defaultConn.name}</span></>
        ) : (
          <span className="italic">Not configured</span>
        )}
      </div>
    </button>
  )
}

// ── ConnectionRow ──────────────────────────────────────────────────────────────
function ConnectionRow({ conn, categoryTint }: { conn: Connection; categoryTint: string }) {
  const [revealed, setRevealed] = useState(false)
  const st = statusMeta(conn.status)
  return (
    <tr className="hover:bg-surface-hover/20 dark:hover:bg-dark-hover/20">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', categoryTint)}>
            <Plug className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-text">{conn.name}</span>
              {conn.isDefault && <Badge variant="default" className="h-4 rounded px-1.5 text-[9px] font-medium">DEFAULT</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
              {Object.entries(conn.meta).slice(0, 3).map(([k, v]) => (
                <span key={k}><span className="text-text-muted/70">{k}:</span> {v}</span>
              ))}
            </div>
            {conn.secretPreview && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                <Lock className="h-2.5 w-2.5" />
                <span>{revealed ? conn.secretPreview.replace(/•/g, 'x') : conn.secretPreview}</span>
                <button onClick={() => setRevealed((v) => !v)} className="ml-0.5 hover:text-text">
                  {revealed ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                </button>
                <button className="hover:text-text">
                  <Copy className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
        {conn.scope.kind === 'global' ? (
          <span className="inline-flex items-center gap-1 text-text-muted"><Globe className="h-3 w-3" /> Global</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-text"><Building2 className="h-3 w-3 text-text-muted" /> {conn.scope.label}</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="default" className={cn('h-5 rounded px-1.5 text-[10px] font-medium capitalize', conn.env === 'sandbox' ? 'border-amber-200 bg-amber-50 text-amber-800' : '')}>
          {conn.env}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium', st.bg, st.text)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{formatDate(conn.lastUsed)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs"><TestTube2 className="h-3.5 w-3.5" />Test</Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-text-muted"><MoreVertical className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  )
}

// ── ConnectionsTab ─────────────────────────────────────────────────────────────
function ConnectionsTab({ category }: { category: Category }) {
  const [envFilter, setEnvFilter] = useState<'all' | IntegrationEnv>('all')
  const [q, setQ] = useState('')
  const rows = useMemo(() => category.connections
    .filter((c) => envFilter === 'all' || c.env === envFilter)
    .filter((c) => q.trim() === '' || c.name.toLowerCase().includes(q.toLowerCase())),
    [category.connections, envFilter, q])

  if (category.connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border dark:border-dark-border bg-surface-hover/20 dark:bg-dark-hover/20 px-8 py-16 text-center">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', category.tint)}>
          <category.icon className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-text">No connections yet</h3>
        <p className="mt-1 max-w-sm text-xs text-text-muted">
          Add your first {category.name.toLowerCase()} connection. You can add multiple providers and route between them per property or environment.
        </p>
        <Button size="sm" variant="primary" className="mt-4 gap-1.5"><Plus className="h-4 w-4" />Add connection</Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search connections"
            className="h-9 w-64 pl-8 pr-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-surface-border dark:border-dark-border p-0.5 text-xs">
          {(['all', 'production', 'sandbox'] as const).map((e) => (
            <button
              key={e}
              onClick={() => setEnvFilter(e)}
              className={cn('rounded px-2.5 py-1 capitalize transition-colors', envFilter === e ? 'bg-white dark:bg-dark-card font-medium shadow-sm text-text' : 'text-text-muted hover:text-text')}
            >{e}</button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
        <table className="w-full text-sm">
          <thead className="border-b border-surface-border dark:border-dark-border bg-surface-hover/30 dark:bg-dark-hover/30 text-xs text-text-muted">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Connection</th>
              <th className="px-4 py-2.5 text-left font-medium">Scope</th>
              <th className="px-4 py-2.5 text-left font-medium">Environment</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-left font-medium">Last used</th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {rows.map((c) => <ConnectionRow key={c.id} conn={c} categoryTint={category.tint} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── RoutingTab ─────────────────────────────────────────────────────────────────
function RoutingTab({ category }: { category: Category }) {
  const [order, setOrder] = useState(category.connections.filter((c) => c.env === 'production'))

  const move = (idx: number, delta: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev]
      const target = idx + delta
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text">Primary and fallback order</h3>
            <p className="mt-1 text-xs text-text-muted">When the primary provider fails or is rate-limited, the next healthy connection is tried in order.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5"><Check className="h-3.5 w-3.5" /> Save order</Button>
        </div>
        <ol className="mt-4 space-y-2">
          {order.map((c, i) => {
            const st = statusMeta(c.status)
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-md border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface p-3">
                <GripVertical className="h-4 w-4 text-text-muted/60" />
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-50 text-[11px] font-semibold text-primary-600">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text">{c.name}</div>
                  <div className="text-[11px] text-text-muted">{c.scope.kind === 'global' ? 'Global' : c.scope.label} · {c.env}</div>
                </div>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium', st.bg, st.text)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
                </span>
                <div className="flex items-center">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => move(i, -1)} disabled={i === 0}><ChevronLeft className="h-3.5 w-3.5 rotate-90" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => move(i, 1)} disabled={i === order.length - 1}><ChevronRight className="h-3.5 w-3.5 rotate-90" /></Button>
                </div>
              </li>
            )
          })}
          {order.length === 0 && <li className="py-6 text-center text-sm text-text-muted">No production connections to order.</li>}
        </ol>
      </div>
      <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5">
        <h3 className="text-sm font-semibold text-text">Per-property overrides</h3>
        <p className="mt-1 text-xs text-text-muted">Override the default routing for a specific property. Property-scoped connections take precedence over global fallback.</p>
        <div className="mt-4 space-y-2">
          {['Phase 1', 'Phase 2', 'Commercial Block'].map((prop) => (
            <div key={prop} className="flex items-center justify-between gap-3 rounded-md border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface p-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text">{prop}</span>
              </div>
              <select className="h-8 w-64 px-3 text-xs border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="inherit">Inherit global order</option>
                {category.connections.map((c) => (
                  <option key={c.id} value={c.id}>Force: {c.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── WebhooksTab ────────────────────────────────────────────────────────────────
function WebhooksTab({ category }: { category: Category }) {
  const url = `https://api.greatwallgardens.estate/webhooks/${category.key}/pw_a83f2e`
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5">
        <h3 className="text-sm font-semibold text-text">Inbound callback URL</h3>
        <p className="mt-1 text-xs text-text-muted">Paste this URL into your provider's dashboard to receive events.</p>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-3 py-2 font-mono text-xs">
          <Globe className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <span className="flex-1 truncate text-text">{url}</span>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> Copy</Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
          <Lock className="h-3.5 w-3.5" />Signed with HMAC-SHA256. Rotate the signing secret from the connection's actions menu.
        </div>
      </div>
      <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5">
        <h3 className="text-sm font-semibold text-text">Recent deliveries</h3>
        <p className="mt-1 text-xs text-text-muted">Last 24 hours</p>
        <div className="mt-3 flex items-center justify-center rounded-md border border-dashed border-surface-border dark:border-dark-border bg-surface-hover/20 dark:bg-dark-hover/20 py-10 text-xs text-text-muted">
          Delivery log will appear here once events are received.
        </div>
      </div>
    </div>
  )
}

// ── AuditTab ───────────────────────────────────────────────────────────────────
function AuditTab() {
  const events = [
    { at: '2026-07-12 09:14', who: 'System Admin', what: "Rotated API key on 'SendGrid — Primary'" },
    { at: '2026-07-11 16:02', who: 'Ops', what: "Set 'Anthropic — Primary' as default AI provider" },
    { at: '2026-07-10 11:47', who: 'Finance', what: 'Added M-Pesa paybill 247247 for GWG Phase 1' },
  ]
  return (
    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
      <ul className="divide-y divide-surface-border dark:divide-dark-border">
        {events.map((e, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <History className="mt-0.5 h-4 w-4 text-text-muted" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-text">{e.what}</div>
              <div className="mt-0.5 text-[11px] text-text-muted">{e.at} · {e.who}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]">View <ExternalLink className="h-3 w-3" /></Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── AddConnectionDialog ────────────────────────────────────────────────────────
function AddConnectionDialog({ category, open, onClose }: { category: Category; open: boolean; onClose: () => void }) {
  const [provider, setProvider] = useState(category.providers[0])
  const [env, setEnv] = useState<IntegrationEnv>('production')
  const [scope, setScope] = useState<'global' | 'property'>('global')

  return (
    <Modal open={open} onClose={onClose} title={`Add ${category.name.toLowerCase()} connection`} size="md">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Provider</label>
          <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" value={provider} onChange={(e) => setProvider(e.target.value)}>
            {category.providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">Connection name</label>
          <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. SendGrid — Transactional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">Environment</label>
            <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" value={env} onChange={(e) => setEnv(e.target.value as IntegrationEnv)}>
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">Scope</label>
            <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" value={scope} onChange={(e) => setScope(e.target.value as 'global' | 'property')}>
              <option value="global">Global (all properties)</option>
              <option value="property">Specific property</option>
            </select>
          </div>
        </div>
        {scope === 'property' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">Property</label>
            <select className="h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="phase1">Phase 1</option>
              <option value="phase2">Phase 2</option>
              <option value="commercial">Commercial Block</option>
            </select>
          </div>
        )}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-muted">API key / secret</label>
          <input type="password" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Paste credential — stored encrypted" />
          <p className="text-[11px] text-text-muted">You can rotate or revoke this credential later without deleting the connection.</p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" size="sm" className="gap-1.5"><TestTube2 className="h-3.5 w-3.5" /> Test connection</Button>
          <Button variant="primary" size="sm" onClick={onClose}>Save connection</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── IntegrationDetail ──────────────────────────────────────────────────────────
type DetailTab = 'connections' | 'routing' | 'webhooks' | 'audit'

function IntegrationDetail({ category, onBack }: { category: Category; onBack: () => void }) {
  const [tab, setTab] = useState<DetailTab>('connections')
  const [addOpen, setAddOpen] = useState(false)
  const Icon = category.icon

  const tabs = [
    { k: 'connections' as DetailTab, label: 'Connections', icon: Plug },
    ...(category.supportsFailover ? [{ k: 'routing' as DetailTab, label: 'Routing & fallback', icon: Activity }] : []),
    ...(category.supportsInboundWebhook ? [{ k: 'webhooks' as DetailTab, label: 'Inbound webhooks', icon: Globe }] : []),
    { k: 'audit' as DetailTab, label: 'Audit', icon: History },
  ]

  return (
    <div className="max-w-6xl px-8 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text">
        <ChevronLeft className="h-3.5 w-3.5" />All integrations
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', category.tint)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-text">{category.name}</h2>
            <p className="mt-0.5 text-sm text-text-muted">{category.tagline}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {category.providers.map((p) => (
                <Badge key={p} variant="default" className="h-5 rounded font-normal text-[10px]">{p}</Badge>
              ))}
            </div>
          </div>
        </div>
        <Button size="sm" variant="primary" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />Add connection
        </Button>
      </div>

      <div className="mt-6 flex items-center gap-1 border-b border-surface-border dark:border-dark-border">
        {tabs.map((t) => {
          const T = t.icon
          const isActive = tab === t.k
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={cn('inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors', isActive ? 'border-primary-600 text-text font-medium' : 'border-transparent text-text-muted hover:text-text')}
            >
              <T className="h-3.5 w-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {tab === 'connections' && <ConnectionsTab category={category} />}
        {tab === 'routing' && <RoutingTab category={category} />}
        {tab === 'webhooks' && <WebhooksTab category={category} />}
        {tab === 'audit' && <AuditTab />}
      </div>

      <AddConnectionDialog category={category} open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

// ── IntegrationsSection ────────────────────────────────────────────────────────
export function IntegrationsSection() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const category = INTEGRATION_CATEGORIES.find((c) => c.key === activeCategory) ?? null

  if (category) {
    return <IntegrationDetail category={category} onBack={() => setActiveCategory(null)} />
  }

  const totalConnections = INTEGRATION_CATEGORIES.reduce((n, c) => n + c.connections.length, 0)
  const totalHealthy = INTEGRATION_CATEGORIES.reduce((n, c) => n + c.connections.filter((x) => x.status === 'active').length, 0)
  const totalIssues = INTEGRATION_CATEGORIES.reduce((n, c) => n + c.connections.filter((x) => x.status === 'degraded' || x.status === 'error').length, 0)

  return (
    <div className="max-w-6xl px-8 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Integrations</h2>
          <p className="mt-1 text-sm text-text-muted">Connect providers, manage credentials per environment and property, and control failover.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5"><Activity className="h-4 w-4" />Delivery logs</Button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Categories" value={String(INTEGRATION_CATEGORIES.length)} icon={Plug} />
        <SummaryTile label="Connections" value={String(totalConnections)} icon={Activity} />
        <SummaryTile label="Healthy" value={String(totalHealthy)} icon={Check} tone="emerald" />
        <SummaryTile label="Needs attention" value={String(totalIssues)} icon={AlertTriangle} tone={totalIssues ? 'amber' : 'muted'} />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-lg border border-surface-border dark:border-dark-border bg-surface-hover/30 dark:bg-dark-hover/30 p-3.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
        <div className="text-xs text-text-muted">
          Credentials are encrypted at rest (AES-256) and scoped to workspace, property and environment.
          Secret values are masked; reveal actions require re-authentication and are captured in the audit trail.
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {INTEGRATION_CATEGORIES.map((c) => (
          <CategoryCard key={c.key} category={c} onOpen={() => setActiveCategory(c.key)} />
        ))}
      </div>
    </div>
  )
}
