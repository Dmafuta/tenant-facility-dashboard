'use client'
import React, { useState, useEffect } from 'react'
import {
  CreditCard, History, Globe, Layers, Building2, AlertCircle, Info,
  CircleDollarSign, TrendingUp, Calendar, Check, Plus, CheckCircle2,
  FileText, Smartphone, Landmark, Banknote, Wallet, Percent,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  getSettings, updateSettings, type FacilitySettings,
} from '@/lib/api/settings'
import { getInvoiceCategories, updateInvoiceCategory, type InvoiceCategory } from '@/lib/api/invoices'

// ── Local types ───────────────────────────────────────────────────────────────
type PropertyScope = 'workspace' | string
type BillingProperty = { id: string; code: string; name: string; units: number; overridden: boolean }

type PaymentMethodKey = 'mpesa' | 'bank' | 'card' | 'cash'
type PaymentMethodCfg = {
  key: PaymentMethodKey; label: string; provider: string
  enabled: boolean; primary: boolean; fee: string; detail: string
}

type BillingForm = {
  rent_due_day: number; grace_period_days: number; late_fee_percent: number; deposit_months: number
  invoicePrefix: string; proration: string
  service_charge_enabled: boolean; auto_generate_charges: boolean
  service_charge_amount: number; sc_billing_cycle: string; sc_due_day: number
  water_rate_per_unit: number; management_fee_percent: number; sewerage_percent: number
  readingDay: number; minimumCharge: number
  vatEnabled: boolean; vatRate: number
  withholdingEnabled: boolean; withholdingRate: number; taxPin: string
}

// ── Static data ───────────────────────────────────────────────────────────────
const BILLING_PROPERTIES: BillingProperty[] = [
  { id: 'res', code: 'RES', name: 'Great Wall — Residential', units: 156, overridden: true },
  { id: 'com', code: 'COM', name: 'Great Wall — Commercial',  units: 71,  overridden: false },
]

const DEFAULT_METHODS: PaymentMethodCfg[] = [
  { key: 'mpesa', label: 'M-Pesa Paybill',  provider: 'Safaricom Daraja', enabled: true,  primary: true,  fee: '0%',          detail: 'Paybill 542334 · Account = Unit code' },
  { key: 'bank',  label: 'Bank transfer',   provider: 'Direct deposit',   enabled: true,  primary: false, fee: '0%',          detail: 'Per-category bank details on invoice' },
  { key: 'card',  label: 'Card payments',   provider: 'Stripe (KE)',       enabled: false, primary: false, fee: '2.9% + 30',  detail: 'Visa, Mastercard, Amex' },
  { key: 'cash',  label: 'Cash at office',  provider: 'Manual receipt',   enabled: true,  primary: false, fee: '0%',          detail: 'Requires accountant countersign' },
]

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-primary-600' : 'bg-surface-border dark:bg-dark-border',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  )
}

// ── ToggleRow ─────────────────────────────────────────────────────────────────
function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <div className="text-sm font-medium text-text">{label}</div>
        {hint && <div className="text-xs text-text-muted">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

// ── BillCard ──────────────────────────────────────────────────────────────────
function BillCard({ title, description, icon: Icon, children }: {
  title: string; description?: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
      <header className="border-b border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-5 py-3 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white dark:bg-dark-card border border-surface-border dark:border-dark-border text-text-muted">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          {description && <p className="text-[11px] text-text-muted mt-0.5">{description}</p>}
        </div>
      </header>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  )
}

// ── BillKpi ───────────────────────────────────────────────────────────────────
function BillKpi({ icon: Icon, label, value, delta, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; delta: string
  tone: 'primary' | 'success' | 'warn' | 'neutral'
}) {
  const map = {
    primary: 'text-primary-600 bg-primary-50 dark:bg-primary-900/20',
    success: 'text-emerald-700 bg-emerald-100',
    warn:    'text-amber-700 bg-amber-100',
    neutral: 'text-text-muted bg-surface-hover',
  } as const
  return (
    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-3">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', map[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold tabular-nums text-text">{value}</div>
      <div className="text-[11px] text-text-muted">{delta}</div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="block text-xs font-medium text-text-muted">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  )
}

// ── PaymentMethodRow ──────────────────────────────────────────────────────────
function PaymentMethodRow({ method, onChange }: {
  method: PaymentMethodCfg; onChange: (patch: Partial<PaymentMethodCfg>) => void
}) {
  const iconMap: Record<PaymentMethodKey, React.ComponentType<{ className?: string }>> = {
    mpesa: Smartphone, bank: Landmark, card: CreditCard, cash: Banknote,
  }
  const Icon = iconMap[method.key]
  return (
    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-4 flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-hover dark:bg-dark-hover">
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">{method.label}</span>
          {method.primary && (
            <span className="rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 text-[10px] font-semibold">PRIMARY</span>
          )}
          <span className="text-[11px] text-text-muted">· {method.provider}</span>
        </div>
        <div className="text-xs text-text-muted truncate mt-0.5">{method.detail}</div>
      </div>
      <div className="text-right hidden md:block">
        <div className="text-[11px] text-text-muted uppercase tracking-wider">Fee</div>
        <div className="text-sm font-semibold tabular-nums text-text">{method.fee}</div>
      </div>
      <div className="flex items-center gap-3 pl-2 border-l border-surface-border dark:border-dark-border">
        {!method.primary && method.enabled && (
          <button
            className="text-[11px] font-medium text-primary-600 hover:underline"
            onClick={() => onChange({ primary: true })}
          >
            Make primary
          </button>
        )}
        <Toggle checked={method.enabled} onChange={(v) => onChange({ enabled: v, primary: v ? method.primary : false })} />
      </div>
    </div>
  )
}

// ── BillingSection ────────────────────────────────────────────────────────────
export function BillingSection() {
  const [scope, setScope]     = useState<PropertyScope>('workspace')
  const [tab, setTab]         = useState('cycle')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const [form, setForm] = useState<BillingForm>({
    rent_due_day: 1, grace_period_days: 5, late_fee_percent: 2, deposit_months: 2,
    invoicePrefix: 'INV', proration: 'daily',
    service_charge_enabled: true, auto_generate_charges: true,
    service_charge_amount: 0, sc_billing_cycle: 'monthly', sc_due_day: 5,
    water_rate_per_unit: 135, management_fee_percent: 20, sewerage_percent: 75,
    readingDay: 28, minimumCharge: 200,
    vatEnabled: false, vatRate: 16, withholdingEnabled: false, withholdingRate: 5, taxPin: '',
  })
  const [savedForm, setSavedForm] = useState<BillingForm>(form)

  const [categories,  setCategories]  = useState<InvoiceCategory[]>([])
  const [catForms,    setCatForms]    = useState<Record<string, Partial<InvoiceCategory>>>({})
  const [catSaving,   setCatSaving]   = useState<string | null>(null)
  const [catSaved,    setCatSaved]    = useState<string | null>(null)

  const [methods, setMethods] = useState<PaymentMethodCfg[]>(DEFAULT_METHODS)

  useEffect(() => {
    Promise.all([getSettings(), getInvoiceCategories()]).then(([s, cats]) => {
      const loaded: BillingForm = {
        rent_due_day:           s.rent_due_day           ?? 1,
        grace_period_days:      s.grace_period_days      ?? 5,
        late_fee_percent:       s.late_fee_percent       ?? 2,
        deposit_months:         s.deposit_months         ?? 2,
        invoicePrefix:          'INV',
        proration:              'daily',
        service_charge_enabled: s.service_charge_enabled ?? true,
        auto_generate_charges:  s.auto_generate_charges  ?? true,
        service_charge_amount:  (s as unknown as Record<string, number>).service_charge_amount ?? 0,
        sc_billing_cycle:       s.sc_billing_cycle       ?? 'monthly',
        sc_due_day:             s.sc_due_day             ?? 5,
        water_rate_per_unit:    s.water_rate_per_unit    ?? 135,
        management_fee_percent: s.management_fee_percent ?? 20,
        sewerage_percent:       s.sewerage_percent       ?? 75,
        readingDay:             28, minimumCharge: 200,
        vatEnabled: false, vatRate: 16, withholdingEnabled: false, withholdingRate: 5, taxPin: '',
      }
      setForm(loaded)
      setSavedForm(loaded)
      setCategories(cats)
      const forms: Record<string, Partial<InvoiceCategory>> = {}
      cats.forEach((c) => { forms[c.id] = { ...c } })
      setCatForms(forms)
    }).finally(() => setLoading(false))
  }, [])

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm)

  async function handleSave() {
    setSaving(true)
    try {
      await updateSettings(form as unknown as Partial<FacilitySettings>)
      setSavedForm({ ...form })
      setSavedAt(Date.now())
      setTimeout(() => setSavedAt(null), 3000)
    } finally { setSaving(false) }
  }

  async function saveCat(id: string) {
    setCatSaving(id)
    try {
      await updateInvoiceCategory(id, catForms[id] ?? {})
      setCatSaved(id)
      setTimeout(() => setCatSaved(null), 2000)
    } finally { setCatSaving(null) }
  }

  const scopedProperty = scope !== 'workspace' ? BILLING_PROPERTIES.find((p) => p.id === scope) : null
  const overrideCount  = BILLING_PROPERTIES.filter((p) => p.overridden).length
  const totalUnits     = BILLING_PROPERTIES.reduce((s, p) => s + p.units, 0)

  const inputCls = 'px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 tabular-nums'
  const selectCls = inputCls

  const TABS = [
    { id: 'cycle',      label: 'Rent cycle & fees',   icon: Calendar },
    { id: 'service',    label: 'Service charge',        icon: CreditCard },
    { id: 'utilities',  label: 'Utility rates',         icon: Globe },
    { id: 'categories', label: 'Invoice categories',    icon: FileText },
    { id: 'methods',    label: 'Payment methods',       icon: Wallet },
    { id: 'taxes',      label: 'Taxes',                 icon: Percent },
  ]

  const waterCharge  = 12 * form.water_rate_per_unit
  const mgmtFee      = waterCharge * form.management_fee_percent / 100
  const sewerageFee  = waterCharge * form.sewerage_percent / 100
  const waterTotal   = waterCharge + mgmtFee + sewerageFee

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading billing settings…</div>

  return (
    <div className="relative pb-32">
      {/* Header */}
      <div className="border-b border-surface-border dark:border-dark-border bg-gradient-to-b from-surface-hover/40 to-surface dark:from-dark-hover/40 dark:to-dark-surface">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-text">Billing &amp; payments</h2>
                <p className="text-xs text-text-muted">Rent cycles, service charges, utility rates, invoice categories and collection channels.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 rounded-md border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-2.5 py-1.5 text-xs">
                <Globe className="h-3.5 w-3.5 text-text-muted" />
                <span className="text-text-muted">Currency</span>
                <span className="font-medium text-text">KES</span>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <History className="h-3.5 w-3.5" /> Audit log
              </Button>
            </div>
          </div>

          {/* Scope selector */}
          <div className="mt-5 rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted pr-2">Scope</span>
              <button
                onClick={() => setScope('workspace')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors',
                  scope === 'workspace'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-surface dark:bg-dark-surface hover:bg-surface-hover dark:hover:bg-dark-hover text-text border-surface-border dark:border-dark-border'
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Workspace default
                <span className="ml-1 rounded bg-black/10 px-1 text-[10px]">
                  {BILLING_PROPERTIES.length - overrideCount} inherit
                </span>
              </button>
              <div className="mx-1 h-4 w-px bg-surface-border dark:bg-dark-border" />
              {BILLING_PROPERTIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setScope(p.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs border transition-colors',
                    scope === p.id
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-surface dark:bg-dark-surface hover:bg-surface-hover dark:hover:bg-dark-hover text-text border-surface-border dark:border-dark-border'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="font-mono">{p.code}</span>
                  <span className="opacity-70">· {p.units}u</span>
                  {p.overridden && (
                    <span className={cn('ml-1 rounded-full px-1.5 text-[9px] font-semibold', scope === p.id ? 'bg-white/20' : 'bg-amber-100 text-amber-800')}>OVR</span>
                  )}
                </button>
              ))}
            </div>
            {scopedProperty ? (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-700 shrink-0" />
                <div className="flex-1 text-amber-900">
                  <span className="font-medium">Editing override for {scopedProperty.code} — {scopedProperty.name}.</span>{' '}
                  Changes here only affect this property's <span className="font-mono">{scopedProperty.units}</span> units and will diverge from workspace defaults.
                </div>
                <button className="text-[11px] font-medium text-amber-900 underline underline-offset-2 hover:no-underline">
                  Revert to inherit
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-3 py-2 text-xs text-text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  Editing <span className="font-medium text-text">workspace defaults</span>. Applies to all {totalUnits} units across {BILLING_PROPERTIES.length} properties except the {overrideCount} with explicit overrides.
                </div>
              </div>
            )}
          </div>

          {/* KPI strip */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <BillKpi icon={CircleDollarSign} label="Monthly invoiced"  value="KES 4.28M" delta="+3.2%"  tone="primary" />
            <BillKpi icon={TrendingUp}       label="Collection rate"   value="94.6%"     delta="+1.1%"  tone="success" />
            <BillKpi icon={AlertCircle}      label="Outstanding"       value="KES 612K"  delta="-8.4%"  tone="warn" />
            <BillKpi icon={Calendar}         label="Next invoice run"  value="Aug 1"     delta="auto-run 06:00" tone="neutral" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-8 py-6">
        <div className="flex gap-1 border-b border-surface-border dark:border-dark-border -mx-1 mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                  active ? 'border-primary-600 text-text' : 'border-transparent text-text-muted hover:text-text'
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab: Rent cycle */}
        {tab === 'cycle' && (
          <div className="space-y-5">
            <BillCard title="Rent cycle" icon={Calendar} description="Cadence and grace window for standard rent invoicing.">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label="Rent due day" hint="Day of month rent is due">
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={28} value={form.rent_due_day}
                      onChange={(e) => setForm((p) => ({ ...p, rent_due_day: +e.target.value }))}
                      className={cn(inputCls, 'w-20')} />
                    <span className="text-xs text-text-muted">of month</span>
                  </div>
                </Field>
                <Field label="Grace period" hint="Days before late fees apply">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={form.grace_period_days}
                      onChange={(e) => setForm((p) => ({ ...p, grace_period_days: +e.target.value }))}
                      className={cn(inputCls, 'w-20')} />
                    <span className="text-xs text-text-muted">days</span>
                  </div>
                </Field>
                <Field label="Late fee rate" hint="Per week after grace period">
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={form.late_fee_percent}
                      onChange={(e) => setForm((p) => ({ ...p, late_fee_percent: +e.target.value }))}
                      className={cn(inputCls, 'w-20')} />
                    <span className="text-xs text-text-muted">% / week</span>
                  </div>
                </Field>
                <Field label="Deposit" hint="Security deposit at lease start">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} value={form.deposit_months}
                      onChange={(e) => setForm((p) => ({ ...p, deposit_months: +e.target.value }))}
                      className={cn(inputCls, 'w-20')} />
                    <span className="text-xs text-text-muted">months</span>
                  </div>
                </Field>
              </div>
            </BillCard>

            <BillCard title="Invoice numbering & proration" icon={FileText} description="Applied to all invoice categories in this scope.">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="Invoice prefix">
                  <input value={form.invoicePrefix}
                    onChange={(e) => setForm((p) => ({ ...p, invoicePrefix: e.target.value }))}
                    className={cn(inputCls, 'font-mono w-full')} />
                </Field>
                <Field label="Next number preview">
                  <div className="h-9 flex items-center rounded-lg border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-3 text-xs font-mono text-text-muted">
                    {form.invoicePrefix}-2026-<span className="text-primary-600">004821</span>
                  </div>
                </Field>
                <Field label="Mid-cycle proration">
                  <select value={form.proration} onChange={(e) => setForm((p) => ({ ...p, proration: e.target.value }))} className={cn(selectCls, 'w-full')}>
                    <option value="daily">Daily (30ths)</option>
                    <option value="monthly">Whole month</option>
                    <option value="none">No proration</option>
                  </select>
                </Field>
              </div>
            </BillCard>
          </div>
        )}

        {/* Tab: Service charge */}
        {tab === 'service' && (
          <BillCard title="Service charge" icon={CreditCard} description="Monthly maintenance charge billed alongside rent.">
            <ToggleRow label="Enable service charge"        hint="Bill monthly service charge alongside rent"                       checked={form.service_charge_enabled} onChange={(v) => setForm((p) => ({ ...p, service_charge_enabled: v }))} />
            <ToggleRow label="Auto-generate monthly charges" hint="Automatically create rent + service charge invoices on the 1st"   checked={form.auto_generate_charges}  onChange={(v) => setForm((p) => ({ ...p, auto_generate_charges: v }))} />
            <hr className="border-surface-border dark:border-dark-border" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Monthly rate per unit" hint="KES per unit per month">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">KES</span>
                  <input type="number" value={form.service_charge_amount}
                    onChange={(e) => setForm((p) => ({ ...p, service_charge_amount: +e.target.value }))}
                    className={cn(inputCls, 'w-28')} />
                  <span className="text-xs text-text-muted">/ unit / mo</span>
                </div>
              </Field>
              <Field label="Billing cycle" hint="How often SC invoices are generated">
                <select value={form.sc_billing_cycle} onChange={(e) => setForm((p) => ({ ...p, sc_billing_cycle: e.target.value }))} className={cn(selectCls, 'w-full')}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-annual</option>
                  <option value="annual">Annual</option>
                </select>
              </Field>
              <Field label="Due day" hint="Day of month the SC invoice is due">
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={28} value={form.sc_due_day}
                    onChange={(e) => setForm((p) => ({ ...p, sc_due_day: +e.target.value }))}
                    className={cn(inputCls, 'w-20')} />
                  <span className="text-xs text-text-muted">of month</span>
                </div>
              </Field>
            </div>
          </BillCard>
        )}

        {/* Tab: Utilities */}
        {tab === 'utilities' && (
          <BillCard title="Water & sewerage rates" icon={Globe} description="Applied to all water meter readings. Sewerage and management fees are calculated as a percentage of the raw water charge.">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Water rate" hint="KES per cubic metre">
                <div className="flex items-center gap-2">
                  <input type="number" value={form.water_rate_per_unit}
                    onChange={(e) => setForm((p) => ({ ...p, water_rate_per_unit: +e.target.value }))}
                    className={cn(inputCls, 'w-28')} />
                  <span className="text-xs text-text-muted">KES/m³</span>
                </div>
              </Field>
              <Field label="Management fee" hint="% of water charge">
                <div className="flex items-center gap-2">
                  <input type="number" value={form.management_fee_percent}
                    onChange={(e) => setForm((p) => ({ ...p, management_fee_percent: +e.target.value }))}
                    className={cn(inputCls, 'w-28')} />
                  <span className="text-xs text-text-muted">%</span>
                </div>
              </Field>
              <Field label="Sewerage" hint="% of water charge (excl. fee)">
                <div className="flex items-center gap-2">
                  <input type="number" value={form.sewerage_percent}
                    onChange={(e) => setForm((p) => ({ ...p, sewerage_percent: +e.target.value }))}
                    className={cn(inputCls, 'w-28')} />
                  <span className="text-xs text-text-muted">%</span>
                </div>
              </Field>
              <Field label="Meter reading day" hint="Day of month readings are captured">
                <input type="number" min={1} max={28} value={form.readingDay}
                  onChange={(e) => setForm((p) => ({ ...p, readingDay: +e.target.value }))}
                  className={cn(inputCls, 'w-28')} />
              </Field>
              <Field label="Minimum charge" hint="Applied when consumption is below floor">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">KES</span>
                  <input type="number" value={form.minimumCharge}
                    onChange={(e) => setForm((p) => ({ ...p, minimumCharge: +e.target.value }))}
                    className={cn(inputCls, 'w-28')} />
                </div>
              </Field>
              {/* Preview */}
              <div className="rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover p-3 text-xs">
                <div className="font-medium text-text mb-1">Preview · 12 m³ consumption</div>
                <div className="space-y-0.5 text-text-muted tabular-nums">
                  <div className="flex justify-between"><span>Water (12 × {form.water_rate_per_unit})</span><span>KES {waterCharge.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Mgmt fee ({form.management_fee_percent}%)</span><span>KES {mgmtFee.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Sewerage ({form.sewerage_percent}%)</span><span>KES {sewerageFee.toLocaleString()}</span></div>
                  <div className="flex justify-between pt-1 border-t border-surface-border dark:border-dark-border mt-1 font-semibold text-text">
                    <span>Total</span><span>KES {waterTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </BillCard>
        )}

        {/* Tab: Invoice categories */}
        {tab === 'categories' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">Invoice categories &amp; bank accounts</h3>
                <p className="text-xs text-text-muted mt-0.5">Each category is billed on its own invoice with its own bank details and tagline.</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add category
              </Button>
            </div>
            {categories.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border dark:border-dark-border py-12 text-center text-text-muted">
                <FileText className="mb-2 h-6 w-6 opacity-40" />
                <p className="text-sm">No invoice categories configured</p>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {categories.map((cat) => {
                const cf = catForms[cat.id] ?? {}
                const set = (k: keyof InvoiceCategory, v: string | boolean) =>
                  setCatForms((p) => ({ ...p, [cat.id]: { ...p[cat.id], [k]: v } }))
                const configured = cf.bank_name && cf.bank_account
                const isActive   = cf.active ?? cat.active

                return (
                  <div key={cat.id} className={cn('rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-4 transition-colors', !isActive && 'opacity-60')}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 text-[11px] font-bold font-mono">
                          {cat.code}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-text">{cat.name}</div>
                          <div className="text-[11px] text-text-muted flex items-center gap-1">
                            {configured ? (
                              <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Bank configured</>
                            ) : (
                              <><AlertCircle className="h-3 w-3 text-amber-600" /> Bank not configured</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-text-muted">{isActive ? 'Active' : 'Inactive'}</span>
                        <Toggle checked={isActive} onChange={(v) => set('active', v)} />
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <Field label="Tagline (shown on invoice header)">
                        <input value={(cf.tagline as string) ?? ''} onChange={(e) => set('tagline', e.target.value)}
                          placeholder={`e.g. ${cat.name} Statement`}
                          className={cn(inputCls, 'w-full')} />
                      </Field>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Bank name">
                          <input value={(cf.bank_name as string) ?? ''} onChange={(e) => set('bank_name', e.target.value)}
                            placeholder="e.g. Equity Bank" className={cn(inputCls, 'w-full')} />
                        </Field>
                        <Field label="Account number">
                          <input value={(cf.bank_account as string) ?? ''} onChange={(e) => set('bank_account', e.target.value)}
                            placeholder="0123456789" className={cn(inputCls, 'w-full font-mono')} />
                        </Field>
                        <Field label="Branch">
                          <input value={(cf.bank_branch as string) ?? ''} onChange={(e) => set('bank_branch', e.target.value)}
                            placeholder="Nairobi" className={cn(inputCls, 'w-full')} />
                        </Field>
                      </div>
                      <div className="flex justify-end">
                        <Button variant="primary" size="sm" onClick={() => saveCat(cat.id)} loading={catSaving === cat.id}>
                          {catSaved === cat.id ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Save'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab: Payment methods */}
        {tab === 'methods' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">Payment methods</h3>
                <p className="text-xs text-text-muted mt-0.5">Channels tenants can use to settle invoices. The primary method is shown first on the tenant portal.</p>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add method
              </Button>
            </div>
            <div className="space-y-3">
              {methods.map((m) => (
                <PaymentMethodRow
                  key={m.key}
                  method={m}
                  onChange={(patch) => setMethods((prev) => prev.map((x) => {
                    if (x.key !== m.key) return patch.primary ? { ...x, primary: false } : x
                    return { ...x, ...patch }
                  }))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tab: Taxes */}
        {tab === 'taxes' && (
          <BillCard title="Taxes & withholding" icon={Percent} description="Statutory rates applied at invoice generation.">
            <ToggleRow label="Enable VAT"              hint="Add VAT line to applicable invoices"                                          checked={form.vatEnabled}           onChange={(v) => setForm((p) => ({ ...p, vatEnabled: v }))} />
            <ToggleRow label="Enable withholding tax"  hint="Deduct WHT on service-charge lines for commercial tenants"                    checked={form.withholdingEnabled}   onChange={(v) => setForm((p) => ({ ...p, withholdingEnabled: v }))} />
            <hr className="border-surface-border dark:border-dark-border" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="VAT rate">
                <div className="flex items-center gap-2">
                  <input type="number" disabled={!form.vatEnabled} value={form.vatRate}
                    onChange={(e) => setForm((p) => ({ ...p, vatRate: +e.target.value }))}
                    className={cn(inputCls, 'w-20')} />
                  <span className="text-xs text-text-muted">%</span>
                </div>
              </Field>
              <Field label="Withholding rate">
                <div className="flex items-center gap-2">
                  <input type="number" disabled={!form.withholdingEnabled} value={form.withholdingRate}
                    onChange={(e) => setForm((p) => ({ ...p, withholdingRate: +e.target.value }))}
                    className={cn(inputCls, 'w-20')} />
                  <span className="text-xs text-text-muted">%</span>
                </div>
              </Field>
              <Field label="KRA PIN">
                <input value={form.taxPin} onChange={(e) => setForm((p) => ({ ...p, taxPin: e.target.value }))}
                  placeholder="P051234567X" className={cn(inputCls, 'font-mono w-full')} />
              </Field>
            </div>
          </BillCard>
        )}
      </div>

      {/* Sticky save bar */}
      <div className={cn(
        'fixed bottom-0 left-64 right-0 border-t border-surface-border dark:border-dark-border bg-white/95 dark:bg-dark-card/95 backdrop-blur transition-transform z-10',
        dirty ? 'translate-y-0' : 'translate-y-full'
      )}>
        <div className="mx-auto max-w-6xl px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
            </span>
            <span className="font-medium text-text">Unsaved changes</span>
            <span>· {scopedProperty ? `override on ${scopedProperty.code}` : 'workspace defaults'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setForm(savedForm); }}>Discard</Button>
            <Button variant="primary" size="sm" loading={saving} onClick={handleSave} className="gap-1.5">
              {savedAt ? <><Check className="h-3.5 w-3.5" /> Saved</> : 'Save changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
