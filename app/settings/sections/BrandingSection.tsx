'use client'
import React, { useState, useMemo } from 'react'
import {
  Palette, IdCard, Mail, Globe, Settings as SettingsIcon,
  History, Eye, Sparkles, Upload, Download, RefreshCw, Trash2,
  PenLine, ExternalLink, Check, CheckCircle2, Lock, Info,
  Database, FileText, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────
type BrandingPlan = 'standard' | 'premium' | 'enterprise'
type BrandingTab  = 'identity' | 'visual' | 'communications' | 'portal' | 'advanced'

type BrandingState = {
  brandName:         string
  legalSuffix:       string
  tagline:           string
  supportEmail:      string
  website:           string
  primary:           string
  accent:            string
  onPrimary:         'light' | 'dark'
  radius:            'sharp' | 'soft' | 'rounded'
  density:           'comfortable' | 'compact'
  fontFamily:        'system' | 'inter' | 'grotesk' | 'serif'
  logoLight:         string | null
  logoDark:          string | null
  faviconUrl:        string | null
  wordmarkUrl:       string | null
  emailFromName:     string
  emailReplyTo:      string
  emailFooter:       string
  emailAccent:       boolean
  invoiceHeaderLine: string
  invoiceFooterNote: string
  showWatermark:     boolean
  customDomain:      string
  portalWelcome:     string
  hideLovableBadge:  boolean
  loginHeroUrl:      string | null
}

const DEFAULT_BRANDING: BrandingState = {
  brandName:         'Great Wall Gardens',
  legalSuffix:       'Ltd.',
  tagline:           'Property management, reimagined.',
  supportEmail:      'support@greatwallgardens.estate',
  website:           'https://greatwallgardens.estate',
  primary:           '#2563eb',
  accent:            '#0ea5e9',
  onPrimary:         'light',
  radius:            'soft',
  density:           'comfortable',
  fontFamily:        'inter',
  logoLight:         null,
  logoDark:          null,
  faviconUrl:        null,
  wordmarkUrl:       null,
  emailFromName:     'Great Wall Gardens',
  emailReplyTo:      'no-reply@greatwallgardens.estate',
  emailFooter:       'You are receiving this because you manage a unit at Great Wall Gardens.',
  emailAccent:       true,
  invoiceHeaderLine: 'Tax invoice — issued by Great Wall Gardens Management on behalf of the landlord.',
  invoiceFooterNote: 'Kindly settle within the due date. For queries, reply to this email.',
  showWatermark:     false,
  customDomain:      '',
  portalWelcome:     'Welcome back. Manage your residence, requests and payments.',
  hideLovableBadge:  false,
  loginHeroUrl:      null,
}

const PLAN_ENTITLEMENTS: Record<BrandingPlan, {
  label: string
  tone:  string
  features: { key: string; label: string; included: boolean }[]
}> = {
  standard: {
    label: 'Standard',
    tone:  'bg-surface text-text-muted border-surface-border dark:border-dark-border',
    features: [
      { key: 'brand-name',  label: 'Brand name & logo',                    included: true  },
      { key: 'colors',      label: 'Primary color',                         included: true  },
      { key: 'email',       label: 'Email sender name',                     included: true  },
      { key: 'invoice',     label: 'Custom invoice header/footer',          included: false },
      { key: 'portal',      label: 'Custom portal messaging',               included: false },
      { key: 'domain',      label: 'Custom domain (brand.yourco.com)',      included: false },
      { key: 'whitelabel',  label: 'Full white-label',                      included: false },
      { key: 'sso',         label: 'Branded SSO / login page',              included: false },
    ],
  },
  premium: {
    label: 'Premium',
    tone:  'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400',
    features: [
      { key: 'brand-name',  label: 'Brand name & logo',                    included: true  },
      { key: 'colors',      label: 'Primary color',                         included: true  },
      { key: 'email',       label: 'Email sender name',                     included: true  },
      { key: 'invoice',     label: 'Custom invoice header/footer',          included: true  },
      { key: 'portal',      label: 'Custom portal messaging',               included: true  },
      { key: 'domain',      label: 'Custom domain (brand.yourco.com)',      included: true  },
      { key: 'whitelabel',  label: 'Full white-label',                      included: true  },
      { key: 'sso',         label: 'Branded SSO / login page',              included: false },
    ],
  },
  enterprise: {
    label: 'Enterprise',
    tone:  'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
    features: [
      { key: 'brand-name',  label: 'Brand name & logo',                    included: true },
      { key: 'colors',      label: 'Primary color',                         included: true },
      { key: 'email',       label: 'Email sender name',                     included: true },
      { key: 'invoice',     label: 'Custom invoice header/footer',          included: true },
      { key: 'portal',      label: 'Custom portal messaging',               included: true },
      { key: 'domain',      label: 'Custom domain (brand.yourco.com)',      included: true },
      { key: 'whitelabel',  label: 'Full white-label',                      included: true },
      { key: 'sso',         label: 'Branded SSO / login page',              included: true },
    ],
  },
}

const PALETTE_PRESETS = [
  { name: 'Signal Blue',      primary: '#2563eb', accent: '#0ea5e9' },
  { name: 'Emerald Trust',    primary: '#059669', accent: '#10b981' },
  { name: 'Regal Indigo',     primary: '#4f46e5', accent: '#8b5cf6' },
  { name: 'Executive Slate',  primary: '#0f172a', accent: '#475569' },
  { name: 'Amber Prestige',   primary: '#b45309', accent: '#f59e0b' },
  { name: 'Crimson',          primary: '#b91c1c', accent: '#ef4444' },
]

// ── Small helpers ──────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-text-muted">{hint}</p>}
    </div>
  )
}

function BrandToggleRow({
  label, hint, checked, onChange,
}: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text">{label}</p>
        {hint && <p className="text-xs text-text-muted mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary-600' : 'bg-surface-border dark:bg-dark-border',
        )}
      >
        <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'right-0.5' : 'left-0.5')} />
      </button>
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-2 py-1.5">
      <label className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md border border-surface-border dark:border-dark-border cursor-pointer" style={{ background: value }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 border-0 bg-transparent p-0 text-xs font-mono text-text outline-none"
      />
    </div>
  )
}

function BrandAssetSlot({
  label, hint, value, onChange, aspect, surface, disabled,
}: {
  label: string; hint?: string; value: string | null
  onChange: (v: string | null) => void
  aspect: 'wide' | 'square'; surface: 'light' | 'dark'; disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text">{label}</label>
      <div className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors',
        aspect === 'wide' ? 'h-20 w-full' : 'h-20 w-20',
        surface === 'dark' ? 'bg-slate-900' : 'bg-surface-hover/40 dark:bg-dark-hover',
        disabled ? 'opacity-60' : 'hover:border-primary-400',
      )}>
        {value ? (
          <>
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
            <button
              onClick={() => onChange(null)}
              disabled={disabled}
              className="absolute top-1 right-1 rounded-md bg-white/90 dark:bg-dark-card/90 p-1 shadow-sm hover:bg-white dark:hover:bg-dark-card"
            >
              <Trash2 className="h-3 w-3 text-text-muted" />
            </button>
          </>
        ) : (
          <div className={cn('flex flex-col items-center gap-1', surface === 'dark' ? 'text-slate-400' : 'text-text-muted')}>
            <Upload className="h-4 w-4" />
            <span className="text-[10px]">Upload</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onChange(URL.createObjectURL(f))
          }}
        />
      </div>
      {hint && <p className="text-[10px] text-text-muted">{hint}</p>}
    </div>
  )
}

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[9px] uppercase tracking-wider text-text-muted">{label}</div>
      {children}
    </div>
  )
}

function BrandCard({
  title, description, icon: Icon, children, locked, lockReason,
}: {
  title: string; description?: string; icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode; locked?: boolean; lockReason?: string
}) {
  return (
    <section className={cn('relative overflow-hidden rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card', locked && 'opacity-95')}>
      <header className="flex items-center gap-2.5 border-b border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card text-text-muted">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {description && <p className="text-[11px] text-text-muted mt-0.5">{description}</p>}
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <Lock className="h-3 w-3" /> Premium
          </span>
        )}
      </header>
      <div className="space-y-4 px-5 py-5">{children}</div>
      {locked && (
        <div className="border-t border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-900/10 px-5 py-2 text-[11px] text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
          <Info className="h-3 w-3" /> {lockReason ?? 'Upgrade to Premium to unlock.'}
        </div>
      )}
    </section>
  )
}

// ── BrandingSection ────────────────────────────────────────────────────────────
export function BrandingSection() {
  const [plan]  = useState<BrandingPlan>('standard')
  const [state, setState] = useState<BrandingState>(DEFAULT_BRANDING)
  const [tab,   setTab]   = useState<BrandingTab>('identity')
  const [dirty, setDirty] = useState(false)

  const isPremium    = plan !== 'standard'
  const entitlement  = PLAN_ENTITLEMENTS[plan]

  function set<K extends keyof BrandingState>(key: K, value: BrandingState[K]) {
    setState((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }

  const completeness = useMemo(() => {
    const checks = [
      !!state.brandName,
      !!state.logoLight,
      !!state.faviconUrl,
      state.primary !== DEFAULT_BRANDING.primary || !!state.accent,
      !!state.emailFromName && !!state.emailReplyTo,
      !!state.tagline,
    ]
    const done = checks.filter(Boolean).length
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) }
  }, [state])

  const TABS: { key: BrandingTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'identity',       label: 'Identity',          icon: IdCard      },
    { key: 'visual',         label: 'Visual system',     icon: Palette     },
    { key: 'communications', label: 'Email & documents', icon: Mail        },
    { key: 'portal',         label: 'Portal & domain',   icon: Globe       },
    { key: 'advanced',       label: 'Advanced',          icon: SettingsIcon },
  ]

  return (
    <div className="relative pb-32">
      {/* Header */}
      <div className="border-b border-surface-border dark:border-dark-border bg-gradient-to-b from-surface-hover/40 to-surface dark:from-dark-hover dark:to-dark-surface">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600">
                <Palette className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-text">Branding &amp; white-label</h2>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', entitlement.tone)}>
                    {entitlement.label} plan
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Control how your workspace, emails, invoices and resident portal appear to tenants, owners and staff.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-1.5">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Setup</div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-border dark:bg-dark-border">
                    <div className="h-full bg-primary-600 transition-all" style={{ width: `${completeness.pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-text">{completeness.pct}%</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <History className="h-3.5 w-3.5" /> Change history
              </Button>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview live
              </Button>
            </div>
          </div>

          {/* Upgrade banner */}
          {!isPremium && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50 via-surface to-surface dark:from-primary-900/20 dark:via-dark-surface dark:to-dark-surface px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">Unlock full white-label with Premium</div>
                <p className="mt-0.5 text-xs text-text-muted">
                  Custom domain, branded emails and invoices, and remove all platform references across tenant-facing surfaces.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8">Compare plans</Button>
                <Button variant="primary" size="sm" className="h-8">Upgrade</Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-surface-border dark:border-dark-border -mb-px">
            {TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
                    active
                      ? 'border-primary-600 text-text font-medium'
                      : 'border-transparent text-text-muted hover:text-text',
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: form */}
          <div className="space-y-5 min-w-0">

            {/* ── Identity ── */}
            {tab === 'identity' && (
              <BrandCard title="Brand identity" description="Names and contact points shown across the app, emails and invoices." icon={IdCard}>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Brand name" hint='Replaces the platform name in the sidebar, emails and PDF headers.'>
                    <input
                      value={state.brandName}
                      onChange={(e) => set('brandName', e.target.value)}
                      className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </Field>
                  <Field label="Legal suffix" hint="Appears on invoices and formal documents.">
                    <input
                      value={state.legalSuffix}
                      onChange={(e) => set('legalSuffix', e.target.value)}
                      placeholder="Ltd. / LLC / Pty"
                      className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </Field>
                </div>
                <Field label="Tagline" hint="Short descriptor on the login screen and email footer.">
                  <input
                    value={state.tagline}
                    onChange={(e) => set('tagline', e.target.value)}
                    className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Support email">
                    <input
                      value={state.supportEmail}
                      onChange={(e) => set('supportEmail', e.target.value)}
                      className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      value={state.website}
                      onChange={(e) => set('website', e.target.value)}
                      className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </Field>
                </div>
              </BrandCard>
            )}

            {tab === 'identity' && (
              <BrandCard title="Logo & marks" description="Upload light, dark and square variants. SVG recommended for crispness." icon={Upload}>
                <div className="grid grid-cols-2 gap-4">
                  <BrandAssetSlot
                    label="Logo — light backgrounds"
                    hint="Used in sidebar, emails, invoices. PNG/SVG, max 2MB."
                    value={state.logoLight}
                    onChange={(v) => set('logoLight', v)}
                    aspect="wide" surface="light"
                  />
                  <BrandAssetSlot
                    label="Logo — dark backgrounds"
                    hint="Used on dark headers and login hero."
                    value={state.logoDark}
                    onChange={(v) => set('logoDark', v)}
                    aspect="wide" surface="dark"
                  />
                  <BrandAssetSlot
                    label="Favicon / app icon"
                    hint="Square, 512×512 minimum. Shown in browser tabs & mobile."
                    value={state.faviconUrl}
                    onChange={(v) => set('faviconUrl', v)}
                    aspect="square" surface="light"
                  />
                  <BrandAssetSlot
                    label="Wordmark (optional)"
                    hint="Text-only variant for compact placements."
                    value={state.wordmarkUrl}
                    onChange={(v) => set('wordmarkUrl', v)}
                    aspect="wide" surface="light"
                  />
                </div>
              </BrandCard>
            )}

            {/* ── Visual ── */}
            {tab === 'visual' && (
              <BrandCard title="Colors" description="Primary color drives buttons, links and highlights across every surface." icon={Palette}>
                <div>
                  <label className="block text-xs font-medium text-text mb-2">Palette presets</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PALETTE_PRESETS.map((p) => {
                      const active = state.primary === p.primary
                      return (
                        <button
                          key={p.name}
                          onClick={() => { set('primary', p.primary); set('accent', p.accent) }}
                          className={cn(
                            'flex items-center gap-2 rounded-md border p-2 text-left transition-colors',
                            active
                              ? 'border-primary-600 ring-2 ring-primary-200 dark:ring-primary-800 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-surface-border dark:border-dark-border hover:bg-surface-hover/40 dark:hover:bg-dark-hover',
                          )}
                        >
                          <div className="flex -space-x-1">
                            <span className="h-6 w-6 rounded-full border-2 border-white dark:border-dark-card" style={{ background: p.primary }} />
                            <span className="h-6 w-6 rounded-full border-2 border-white dark:border-dark-card" style={{ background: p.accent }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-text truncate">{p.name}</div>
                            <div className="text-[10px] text-text-muted font-mono">{p.primary}</div>
                          </div>
                          {active && <Check className="h-3.5 w-3.5 text-primary-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="border-t border-surface-border dark:border-dark-border" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Primary color" hint="Buttons, links, active nav.">
                    <ColorInput value={state.primary} onChange={(v) => set('primary', v)} />
                  </Field>
                  <Field label="Accent color" hint="Charts, badges, secondary highlights.">
                    <ColorInput value={state.accent} onChange={(v) => set('accent', v)} />
                  </Field>
                </div>
                <Field label="Text on primary" hint="Auto-contrast fallback if unset.">
                  <div className="flex gap-2">
                    {(['light', 'dark'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => set('onPrimary', v)}
                        className={cn(
                          'flex-1 rounded-md border px-3 py-2 text-xs font-medium capitalize transition-colors',
                          state.onPrimary === v
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                            : 'border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover/40 dark:hover:bg-dark-hover',
                        )}
                      >
                        {v} text
                      </button>
                    ))}
                  </div>
                </Field>
              </BrandCard>
            )}

            {tab === 'visual' && (
              <BrandCard title="Typography & shape" description="Set typeface, corner radius and density conventions." icon={PenLine}>
                <Field label="Font family">
                  <select
                    value={state.fontFamily}
                    onChange={(e) => set('fontFamily', e.target.value as BrandingState['fontFamily'])}
                    className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="system">System UI (recommended)</option>
                    <option value="inter">Inter</option>
                    <option value="grotesk">Space Grotesk</option>
                    <option value="serif">Serif (formal)</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Corner radius">
                    <div className="flex gap-2">
                      {(['sharp', 'soft', 'rounded'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => set('radius', v)}
                          className={cn(
                            'flex-1 border px-2 py-2 text-xs font-medium capitalize transition-colors',
                            v === 'sharp' ? 'rounded-none' : v === 'soft' ? 'rounded-md' : 'rounded-xl',
                            state.radius === v
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                              : 'border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover/40 dark:hover:bg-dark-hover',
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Density">
                    <div className="flex gap-2">
                      {(['comfortable', 'compact'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => set('density', v)}
                          className={cn(
                            'flex-1 rounded-md border px-2 py-2 text-xs font-medium capitalize transition-colors',
                            state.density === v
                              ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                              : 'border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover/40 dark:hover:bg-dark-hover',
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </BrandCard>
            )}

            {/* ── Communications ── */}
            {tab === 'communications' && (
              <>
                <BrandCard title="Email branding" description="How outbound mail looks in tenant and owner inboxes." icon={Mail}>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Sender name" hint="Shown as the From name in inboxes.">
                      <input
                        value={state.emailFromName}
                        onChange={(e) => set('emailFromName', e.target.value)}
                        className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </Field>
                    <Field label="Reply-to address">
                      <input
                        value={state.emailReplyTo}
                        onChange={(e) => set('emailReplyTo', e.target.value)}
                        className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </Field>
                  </div>
                  <Field label="Footer disclaimer" hint="Rendered at the bottom of every transactional email.">
                    <textarea
                      rows={2}
                      value={state.emailFooter}
                      onChange={(e) => set('emailFooter', e.target.value)}
                      className="w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </Field>
                  <BrandToggleRow
                    label="Use primary color as email accent"
                    hint="Header bar, CTA buttons and links pick up your primary color."
                    checked={state.emailAccent}
                    onChange={(v) => set('emailAccent', v)}
                  />
                </BrandCard>

                <BrandCard
                  title="Invoice & PDF branding"
                  description="Rendered on invoices, receipts, statements and notices."
                  icon={FileText}
                  locked={!isPremium}
                  lockReason="Custom invoice branding is a Premium feature."
                >
                  <Field label="Header line" hint="Shown under the logo on every PDF.">
                    <input
                      disabled={!isPremium}
                      value={state.invoiceHeaderLine}
                      onChange={(e) => set('invoiceHeaderLine', e.target.value)}
                      className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    />
                  </Field>
                  <Field label="Footer note">
                    <textarea
                      disabled={!isPremium}
                      rows={2}
                      value={state.invoiceFooterNote}
                      onChange={(e) => set('invoiceFooterNote', e.target.value)}
                      className="w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50"
                    />
                  </Field>
                  <BrandToggleRow
                    label='Show "PAID" / "OVERDUE" watermark'
                    hint="Diagonal status watermark on printed invoices."
                    checked={state.showWatermark}
                    onChange={(v) => set('showWatermark', v)}
                  />
                </BrandCard>
              </>
            )}

            {/* ── Portal ── */}
            {tab === 'portal' && (
              <>
                <BrandCard
                  title="Resident portal"
                  description="Tenant-facing web portal customisation."
                  icon={Globe}
                  locked={!isPremium}
                  lockReason="Portal customization requires Premium."
                >
                  <Field label="Welcome message" hint="Shown at the top of the portal dashboard.">
                    <textarea
                      disabled={!isPremium}
                      rows={2}
                      value={state.portalWelcome}
                      onChange={(e) => set('portalWelcome', e.target.value)}
                      className="w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50"
                    />
                  </Field>
                  <BrandAssetSlot
                    label="Login hero image"
                    hint="Full-bleed background on the tenant login page. 1600×900 recommended."
                    value={state.loginHeroUrl}
                    onChange={(v) => set('loginHeroUrl', v)}
                    aspect="wide" surface="dark"
                    disabled={!isPremium}
                  />
                </BrandCard>

                <BrandCard
                  title="Custom domain"
                  description="Host the tenant portal on your own subdomain."
                  icon={ExternalLink}
                  locked={!isPremium}
                  lockReason="Custom domains require Premium."
                >
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <Field label="Portal domain" hint="Add a CNAME pointing to the platform. Verified within 5 minutes.">
                      <input
                        disabled={!isPremium}
                        value={state.customDomain}
                        onChange={(e) => set('customDomain', e.target.value)}
                        placeholder="portal.yourbrand.com"
                        className="h-9 w-full rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-3 text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      />
                    </Field>
                    <Button disabled={!isPremium || !state.customDomain} variant="outline" size="sm" className="h-9">
                      Verify DNS
                    </Button>
                  </div>
                  {state.customDomain && isPremium && (
                    <div className="rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-3 py-2 text-xs font-mono text-text-muted">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Required DNS record</div>
                      <div>CNAME  {state.customDomain}  →  portal.platform.app</div>
                    </div>
                  )}
                </BrandCard>

                <BrandCard
                  title="White-label"
                  description="Remove platform references from tenant-facing surfaces."
                  icon={ShieldCheck}
                  locked={!isPremium}
                  lockReason="White-label requires Premium."
                >
                  <BrandToggleRow
                    label='Hide "Powered by …" footer'
                    hint="Applies to emails, portal, invoices and receipts."
                    checked={state.hideLovableBadge}
                    onChange={(v) => set('hideLovableBadge', v)}
                  />
                  <BrandToggleRow
                    label="Branded SSO / login page"
                    hint="Enterprise plan only. Full-page login with your palette, hero and legal links."
                    checked={false}
                    onChange={() => {}}
                  />
                </BrandCard>
              </>
            )}

            {/* ── Advanced ── */}
            {tab === 'advanced' && (
              <>
                <BrandCard title="Plan entitlements" description="Feature availability on your current plan." icon={ShieldCheck}>
                  <div className="divide-y divide-surface-border dark:divide-dark-border">
                    {entitlement.features.map((f) => (
                      <div key={f.key} className="flex items-center justify-between py-2.5">
                        <div className="text-sm text-text">{f.label}</div>
                        {f.included ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Included
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                            <Lock className="h-3.5 w-3.5" /> Premium
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </BrandCard>

                <BrandCard title="Export / import brand kit" description="Move brand settings between environments." icon={Database}>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Export brand kit (.json)
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <Upload className="h-3.5 w-3.5" /> Import kit
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> Reset to defaults
                    </Button>
                  </div>
                </BrandCard>
              </>
            )}
          </div>

          {/* Right: live preview */}
          <aside className="space-y-4 lg:sticky lg:top-4 self-start">
            <div className="overflow-hidden rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
              <div className="flex items-center justify-between border-b border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-text">Live preview</span>
                </div>
                <span className="text-[10px] text-text-muted">Auto-updating</span>
              </div>
              <div className="space-y-4 bg-surface-hover/20 dark:bg-dark-hover/20 p-4">
                {/* Sidebar chip */}
                <PreviewFrame label="Sidebar">
                  <div className="flex items-center gap-2 rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-2.5 py-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold"
                      style={{ background: state.primary, color: state.onPrimary === 'light' ? '#fff' : '#000' }}
                    >
                      {state.logoLight ? (
                        <img src={state.logoLight} alt="" className="h-full w-full object-contain" />
                      ) : state.brandName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold truncate text-text">{state.brandName || 'Brand'}</div>
                      <div className="text-[9px] text-text-muted truncate">{state.tagline}</div>
                    </div>
                  </div>
                </PreviewFrame>

                {/* Email header */}
                <PreviewFrame label="Email header">
                  <div className="overflow-hidden rounded-md border border-surface-border dark:border-dark-border bg-white">
                    <div
                      className="px-3 py-2.5 text-[10px] font-semibold"
                      style={{
                        background: state.emailAccent ? state.primary : '#f5f5f5',
                        color: state.emailAccent ? (state.onPrimary === 'light' ? '#fff' : '#000') : '#111',
                      }}
                    >
                      {state.brandName}
                    </div>
                    <div className="px-3 py-3 space-y-1.5">
                      <div className="text-[11px] font-semibold text-gray-900">Payment received — Invoice #INV-2041</div>
                      <div className="text-[10px] text-gray-500 leading-snug">Hi Alex, we&apos;ve received your rent payment of KES 45,000 for unit B-204.</div>
                      <button
                        className="mt-1 rounded px-2 py-1 text-[10px] font-medium"
                        style={{
                          background: state.primary,
                          color: state.onPrimary === 'light' ? '#fff' : '#000',
                        }}
                      >
                        View receipt
                      </button>
                    </div>
                    <div className="border-t px-3 py-1.5 text-[8px] text-gray-400">{state.emailFooter}</div>
                  </div>
                </PreviewFrame>

                {/* Invoice */}
                <PreviewFrame label="Invoice header">
                  <div className="rounded-md border border-surface-border dark:border-dark-border bg-white p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-gray-900">{state.brandName} <span className="font-normal text-gray-400">{state.legalSuffix}</span></div>
                        <div className="text-[9px] text-gray-400">{state.invoiceHeaderLine}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] uppercase tracking-wider text-gray-400">Invoice</div>
                        <div className="text-[11px] font-mono font-semibold text-gray-900">INV-2041</div>
                      </div>
                    </div>
                    <div className="mt-2 h-0.5 w-8" style={{ background: state.primary }} />
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[9px]">
                      <div className="text-gray-400">Amount due</div>
                      <div className="text-right font-mono font-semibold text-gray-900">KES 45,000.00</div>
                      <div className="text-gray-400">Due date</div>
                      <div className="text-right font-mono text-gray-700">05 Aug 2026</div>
                    </div>
                  </div>
                </PreviewFrame>

                {/* Login button */}
                <PreviewFrame label="Login button">
                  <button
                    className="w-full py-2 text-[11px] font-semibold transition-opacity hover:opacity-90"
                    style={{
                      background: state.primary,
                      color: state.onPrimary === 'light' ? '#fff' : '#000',
                      borderRadius: state.radius === 'sharp' ? 0 : state.radius === 'soft' ? 6 : 14,
                    }}
                  >
                    Sign in to {state.brandName}
                  </button>
                </PreviewFrame>
              </div>
            </div>

            {/* Completeness card */}
            <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Completeness</span>
                <span className="font-semibold tabular-nums text-text">{completeness.done} / {completeness.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-border dark:bg-dark-border">
                <div className="h-full bg-primary-600 transition-all" style={{ width: `${completeness.pct}%` }} />
              </div>
              <p className="text-[11px] text-text-muted pt-1">
                Add a favicon, tagline and primary color to reach 100%.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-surface-border dark:border-dark-border bg-white/95 dark:bg-dark-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-medium text-text">You have unsaved branding changes</span>
              <span className="text-text-muted text-xs">— tenants will see updates after publish.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setState(DEFAULT_BRANDING); setDirty(false) }}>
                Discard
              </Button>
              <Button variant="primary" size="sm" onClick={() => setDirty(false)}>
                Publish changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
