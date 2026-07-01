'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IntegrationsPageClient } from '@/app/integrations/IntegrationsPageClient'
import { ENTRY_POINTS } from '@/lib/mock-data'
import type { EntryPoint, EntryPointType, EntryPointDirection } from '@/lib/types'
import { cn } from '@/lib/cn'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { getInvoiceCategories, updateInvoiceCategory, type InvoiceCategory } from '@/lib/api/invoices'
import {
  getOpeningBalances, createOpeningBalance, updateOpeningBalance, voidOpeningBalance,
  parseOpeningBalanceExcel, bulkImportOpeningBalances,
  type OpeningBalance, type ExcelPreviewRow,
} from '@/lib/api/opening-balances'
import { getUnitsFromApi, type UnitData } from '@/lib/api/units'
import {
  getSettings, updateSettings, listSystemUsers, listSystemUsersPaged, inviteUser, updateSystemUser, deactivateSystemUser, resendInvite,
  listRoles, createRole, updateRole, deleteRole,
  getRulesDocumentInfo, uploadRulesDocument, deleteRulesDocument,
  resetTestData,
  type FacilitySettings, type SystemUser, type AppRole, type RolePermission, type DocumentInfo,
  type ResetTestDataResult,
} from '@/lib/api/settings'

// ── General Settings ──────────────────────────────────────────────────────────
function GeneralSettings() {
  const [form, setForm] = useState({
    property_name:    '',
    management_email: '',
    contact_phone:    '',
    currency:         'KES',
    timezone:         'Africa/Nairobi',
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(s => {
      setForm({
        property_name:    s.property_name    ?? '',
        management_email: s.management_email ?? '',
        contact_phone:    s.contact_phone    ?? '',
        currency:         s.currency         ?? 'KES',
        timezone:         s.timezone         ?? 'Africa/Nairobi',
      })
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    await updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading…</div>

  return (
    <div className="p-6 max-w-xl space-y-5">
      <h3 className="text-sm font-semibold text-text">Property Information</h3>
      {([
        { label: 'Property Name',    key: 'property_name',    type: 'text' },
        { label: 'Management Email', key: 'management_email', type: 'email' },
      ] as const).map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-text-muted mb-1">{f.label}</label>
          <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      ))}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Contact Phone</label>
        <PhoneInput value={form.contact_phone} onChange={v => setForm(p => ({ ...p, contact_phone: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Currency</label>
          <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="USD">USD — US Dollar</option>
            <option value="UGX">UGX — Ugandan Shilling</option>
            <option value="TZS">TZS — Tanzanian Shilling</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Timezone</label>
          <select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="Africa/Nairobi">Africa/Nairobi (EAT +3)</option>
            <option value="Africa/Lagos">Africa/Lagos (WAT +1)</option>
            <option value="Africa/Johannesburg">Africa/Johannesburg (SAST +2)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
      <button onClick={save}
        className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
        {saved ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Billing Settings ──────────────────────────────────────────────────────────
function BillingSettings() {
  const [form, setForm] = useState({
    rent_due_day:           1,
    grace_period_days:      5,
    late_fee_percent:       2.0,
    deposit_months:         2,
    service_charge_enabled: true,
    auto_generate_charges:  true,
    service_charge_amount:  0,
    sc_billing_cycle:       'monthly' as 'monthly' | 'quarterly' | 'semi_annual' | 'annual',
    sc_due_day:             5,
    water_rate_per_unit:    0,
    management_fee_percent: 0,
    sewerage_percent:       0,
  })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<InvoiceCategory[]>([])
  const [catForms, setCatForms] = useState<Record<string, Partial<InvoiceCategory>>>({})
  const [catSaving, setCatSaving] = useState<string | null>(null)
  const [catSaved, setCatSaved] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getSettings(), getInvoiceCategories()]).then(([s, cats]) => {
      setForm({
        rent_due_day:           s.rent_due_day           ?? 1,
        grace_period_days:      s.grace_period_days      ?? 5,
        late_fee_percent:       s.late_fee_percent       ?? 2.0,
        deposit_months:         s.deposit_months         ?? 2,
        service_charge_enabled: s.service_charge_enabled ?? true,
        auto_generate_charges:  s.auto_generate_charges  ?? true,
        service_charge_amount:  (s as unknown as Record<string,number>).service_charge_amount ?? 0,
        sc_billing_cycle:       (s.sc_billing_cycle ?? 'monthly') as 'monthly' | 'quarterly' | 'semi_annual' | 'annual',
        sc_due_day:             s.sc_due_day ?? 5,
        water_rate_per_unit:    s.water_rate_per_unit    ?? 0,
        management_fee_percent: s.management_fee_percent ?? 0,
        sewerage_percent:       s.sewerage_percent       ?? 0,
      })
      setCategories(cats)
      const forms: Record<string, Partial<InvoiceCategory>> = {}
      cats.forEach(c => { forms[c.id] = { ...c } })
      setCatForms(forms)
    }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    await updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveCat(id: string) {
    setCatSaving(id)
    try {
      await updateInvoiceCategory(id, catForms[id] ?? {})
      setCatSaved(id)
      setTimeout(() => setCatSaved(null), 2000)
    } finally { setCatSaving(null) }
  }

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading…</div>

  const numFields = [
    { label: 'Rent Due Day',    sublabel: 'Day of month rent is due',         key: 'rent_due_day'      as const, suffix: 'th of month' },
    { label: 'Grace Period',    sublabel: 'Days before late fees apply',       key: 'grace_period_days' as const, suffix: 'days' },
    { label: 'Late Fee Rate',   sublabel: 'Per week after grace period',       key: 'late_fee_percent'  as const, suffix: '% per week' },
    { label: 'Deposit Months',  sublabel: 'Security deposit requirement',      key: 'deposit_months'    as const, suffix: 'months rent' },
  ]

  const toggles = [
    { label: 'Enable Service Charge',          desc: 'Bill monthly service charge alongside rent',               key: 'service_charge_enabled' as const },
    { label: 'Auto-generate Monthly Charges',  desc: 'Automatically create rent + service charges on 1st',      key: 'auto_generate_charges'  as const },
  ]

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text mb-4">Rent & Payment Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          {numFields.map(f => (
            <div key={f.key} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
              <label className="block text-xs font-medium text-text-muted mb-0.5">{f.label}</label>
              <p className="text-[10px] text-text-muted mb-2">{f.sublabel}</p>
              <div className="flex items-center gap-2">
                <input type="number" value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-16 px-2 py-1 text-sm border border-surface-border dark:border-dark-border rounded bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <span className="text-xs text-text-muted">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Service Charge Settings</h3>
        <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4 space-y-3">
          {toggles.map(t => (
            <div key={t.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">{t.label}</p>
                <p className="text-xs text-text-muted">{t.desc}</p>
              </div>
              <button onClick={() => setForm(p => ({ ...p, [t.key]: !p[t.key] }))}
                className={`w-10 h-5 rounded-full relative transition-colors ${form[t.key] ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${form[t.key] ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
          <div className="border-t border-surface-border dark:border-dark-border pt-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-text mb-0.5">Monthly Rate per Unit</p>
              <p className="text-xs text-text-muted mb-2">Fixed SC amount billed per month — invoices are multiplied by months in the billing period</p>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={form.service_charge_amount}
                  onChange={e => setForm(p => ({ ...p, service_charge_amount: parseFloat(e.target.value) || 0 }))}
                  className="w-28 px-2 py-1 text-sm border border-surface-border dark:border-dark-border rounded bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <span className="text-xs text-text-muted">KES / unit / month</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-text mb-0.5">Billing Cycle</p>
                <p className="text-xs text-text-muted mb-2">How often SC invoices are generated</p>
                <select value={form.sc_billing_cycle}
                  onChange={e => setForm(p => ({ ...p, sc_billing_cycle: e.target.value as typeof p.sc_billing_cycle }))}
                  className="w-full px-2 py-1 text-sm border border-surface-border dark:border-dark-border rounded bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-text mb-0.5">Due Day</p>
                <p className="text-xs text-text-muted mb-2">Day of month invoice is due</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="28" value={form.sc_due_day}
                    onChange={e => setForm(p => ({ ...p, sc_due_day: parseInt(e.target.value) || 5 }))}
                    className="w-16 px-2 py-1 text-sm border border-surface-border dark:border-dark-border rounded bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <span className="text-xs text-text-muted">of month</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text mb-1">Water & Sewerage Rates</h3>
        <p className="text-xs text-text-muted mb-4">Applied globally to all water meter readings. Sewerage and management fee are calculated as a percentage of the raw water charge.</p>
        <div className="grid grid-cols-3 gap-4">
          {([
            { label: 'Water Rate',      sublabel: 'KES per m³',                   key: 'water_rate_per_unit'    as const, suffix: 'KES/m³' },
            { label: 'Management Fee',  sublabel: '% of water charge',             key: 'management_fee_percent' as const, suffix: '%' },
            { label: 'Sewerage',        sublabel: '% of water charge (excl. fee)', key: 'sewerage_percent'       as const, suffix: '%' },
          ] as const).map(f => (
            <div key={f.key} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
              <label className="block text-xs font-medium text-text-muted mb-0.5">{f.label}</label>
              <p className="text-[10px] text-text-muted mb-2">{f.sublabel}</p>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-20 px-2 py-1 text-sm border border-surface-border dark:border-dark-border rounded bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <span className="text-xs text-text-muted">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={save}
        className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
        {saved ? '✓ Saved' : 'Save Changes'}
      </button>

      {/* Invoice Categories */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text mb-1">Invoice Categories</h3>
          <p className="text-xs text-text-muted mb-4">Configure bank details and taglines shown on printed invoices for each billing category.</p>
          <div className="space-y-4">
            {categories.map(cat => {
              const cf = catForms[cat.id] ?? {}
              const set = (k: keyof InvoiceCategory, v: string | boolean) =>
                setCatForms(p => ({ ...p, [cat.id]: { ...p[cat.id], [k]: v } }))
              return (
                <div key={cat.id} className="border border-surface-border dark:border-dark-border rounded-lg p-4 bg-surface dark:bg-dark-surface space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded">{cat.code}</span>
                      <span className="ml-2 text-sm font-semibold text-text">{cat.name}</span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                      <button onClick={() => set('active', !(cf.active ?? cat.active))}
                        className={`w-8 h-4 rounded-full relative transition-colors ${(cf.active ?? cat.active) ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 shadow transition-all ${(cf.active ?? cat.active) ? 'right-0.5' : 'left-0.5'}`} />
                      </button>
                      Active
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">Tagline (shown on invoice header)</label>
                    <input type="text" value={(cf.tagline as string) ?? ''}
                      onChange={e => set('tagline', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-surface-border dark:border-dark-border rounded bg-white dark:bg-dark-card text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder={`e.g. ${cat.name} Statement`} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Bank Name</label>
                      <input type="text" value={(cf.bank_name as string) ?? ''}
                        onChange={e => set('bank_name', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-surface-border dark:border-dark-border rounded bg-white dark:bg-dark-card text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="e.g. Equity Bank" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Account Number</label>
                      <input type="text" value={(cf.bank_account as string) ?? ''}
                        onChange={e => set('bank_account', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-surface-border dark:border-dark-border rounded bg-white dark:bg-dark-card text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="0123456789" />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Branch</label>
                      <input type="text" value={(cf.bank_branch as string) ?? ''}
                        onChange={e => set('bank_branch', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-surface-border dark:border-dark-border rounded bg-white dark:bg-dark-card text-text focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Nairobi" />
                    </div>
                  </div>
                  <button
                    onClick={() => saveCat(cat.id)}
                    disabled={catSaving === cat.id}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${catSaved === cat.id ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'} disabled:opacity-50`}
                  >
                    {catSaving === cat.id ? 'Saving…' : catSaved === cat.id ? '✓ Saved' : 'Save'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notification Settings ─────────────────────────────────────────────────────
function NotificationSettings() {
  const [form, setForm] = useState<Partial<FacilitySettings>>({})
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(s => setForm(s)).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    await updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggle = (key: keyof FacilitySettings) =>
    setForm(p => ({ ...p, [key]: !p[key] }))

  if (loading) return <div className="p-6 text-sm text-text-muted">Loading…</div>

  const sections = [
    { category: 'Onboarding', items: [
      { label: 'Welcome email on registration', desc: 'Send a welcome email to new tenants and owners when they are registered. Disable during development or bulk imports.', channels: ['email'], key: 'send_welcome_email' as const },
    ]},
    { category: 'Financial', items: [
      { label: 'Rent overdue reminder',    desc: 'Alert when rent is unpaid after grace period', channels: ['email','sms'], key: 'notify_rent_overdue'         as const },
      { label: 'Payment received',         desc: 'Notify when a payment is logged',              channels: ['email'],       key: 'notify_payment_received'      as const },
      { label: 'Arrears escalation',       desc: 'Alert when arrears exceed 2 months',           channels: ['email','sms'], key: 'notify_arrears_escalation'    as const },
    ]},
    { category: 'Maintenance', items: [
      { label: 'New work order',           desc: 'Notify supervisor of new maintenance request', channels: ['email'],       key: 'notify_new_work_order'        as const },
      { label: 'Work order overdue',       desc: 'Alert when open work order is 7+ days old',   channels: ['email'],       key: 'notify_work_order_overdue'    as const },
      { label: 'Preventive maintenance due', desc: 'Reminder 7 days before scheduled task',     channels: ['email'],       key: 'notify_preventive_maintenance' as const },
    ]},
    { category: 'Compliance', items: [
      { label: 'Breach recorded',          desc: 'Alert when a new breach is logged',            channels: ['email'],       key: 'notify_breach_recorded'       as const },
      { label: 'Document expiry (30 days)',desc: 'Alert when certificate or contract nears expiry', channels: ['email'],   key: 'notify_document_expiry'       as const },
    ]},
    { category: 'Utilities', items: [
      { label: 'Water loss alert',         desc: 'Notify when water loss exceeds 10%',           channels: ['email','sms'], key: 'notify_water_loss'            as const },
      { label: 'Meter reading due',        desc: 'Monthly reminder to capture meter readings',   channels: ['email'],       key: 'notify_meter_reading_due'     as const },
    ]},
  ]

  const paused = !!form.notifications_paused

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* ── Master pause banner ── */}
      <div className={`rounded-xl border-2 px-5 py-4 flex items-center justify-between gap-4 ${paused ? 'border-warning bg-warning/10' : 'border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface'}`}>
        <div>
          <p className={`text-sm font-semibold ${paused ? 'text-warning' : 'text-text'}`}>
            {paused ? '⚠ All notifications are paused' : 'Notifications active'}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {paused
              ? 'No billing emails, payment receipts, or alerts will be sent. Auth emails (OTP, invites) are unaffected.'
              : 'Billing emails, payment receipts, and alerts send normally. Toggle to pause all outgoing notifications.'}
          </p>
        </div>
        <button
          onClick={async () => {
            const updated = { ...form, notifications_paused: !paused }
            setForm(updated)
            await updateSettings({ notifications_paused: !paused })
          }}
          className={`flex-shrink-0 w-12 h-6 rounded-full relative cursor-pointer transition-colors ${paused ? 'bg-warning' : 'bg-success'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-all ${paused ? 'left-0.5' : 'right-0.5'}`} />
        </button>
      </div>

      {sections.map(section => (
        <div key={section.category}>
          <h3 className="text-sm font-semibold text-text mb-3">{section.category}</h3>
          <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden divide-y divide-surface-border dark:divide-dark-border">
            {section.items.map(item => (
              <div key={item.key} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                  <div className="flex gap-1 mt-1">
                    {item.channels.map(c => (
                      <span key={c} className="text-[10px] font-semibold uppercase bg-surface-hover dark:bg-dark-hover border border-surface-border dark:border-dark-border rounded px-1.5 py-0.5 text-text-muted">{c}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => toggle(item.key)}
                  className={`w-10 h-5 rounded-full relative cursor-pointer flex-shrink-0 transition-colors ${form[item.key] ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${form[item.key] ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={save}
        className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
        {saved ? '✓ Saved' : 'Save Changes'}
      </button>
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
  )
}

// ── Branding ──────────────────────────────────────────────────────────────────
function BrandingSettings() {
  const [form,    setForm]    = useState({ brand_name: '', brand_logo_url: '' })
  const [plan,    setPlan]    = useState('standard')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')
  const isPremium = plan === 'premium'

  useEffect(() => {
    getSettings().then(s => {
      setPlan(s.plan ?? 'standard')
      setForm({ brand_name: s.brand_name ?? '', brand_logo_url: s.brand_logo_url ?? '' })
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true); setSaved(false); setError('')
    try {
      await updateSettings({ brand_name: form.brand_name, brand_logo_url: form.brand_logo_url })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.') }
    finally { setSaving(false) }
  }

  if (loading) return <p className="p-6 text-sm text-text-muted">Loading…</p>

  return (
    <div className="p-6 space-y-6 max-w-lg">
      {/* Plan badge */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-medium text-text-muted mb-1">Current Plan</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isPremium
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-surface-muted dark:bg-dark-hover text-text-muted'
          }`}>
            {isPremium ? '★ Premium' : 'Standard'}
          </span>
        </div>
        {!isPremium && (
          <p className="text-xs text-text-muted mt-4">
            White-label branding is available on the <strong>Premium</strong> plan.
            Contact <a href="mailto:sales@quantumconnect.io" className="text-primary-600 hover:underline">sales@quantumconnect.io</a> to upgrade.
          </p>
        )}
      </div>

      {/* Brand fields — editable on premium, locked on standard */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Brand Name</label>
          <input
            value={form.brand_name}
            onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
            disabled={!isPremium}
            placeholder={isPremium ? 'e.g. Great Wall Gardens' : 'QuantumConnect (default)'}
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-[11px] text-text-muted mt-1">Replaces "QuantumConnect" in the bottom bar and outbound emails.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Brand Logo URL</label>
          <input
            value={form.brand_logo_url}
            onChange={e => setForm(f => ({ ...f, brand_logo_url: e.target.value }))}
            disabled={!isPremium}
            placeholder={isPremium ? 'https://…/your-icon.png' : 'QuantumConnect icon (default)'}
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-[11px] text-text-muted mt-1">16×16px icon shown next to the brand name. PNG with transparent background recommended.</p>
        </div>
      </div>

      {error  && <p className="text-xs text-danger">{error}</p>}
      {saved  && <p className="text-xs text-success">Branding saved.</p>}

      {isPremium && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
        >
          {saving && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      )}
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
  )
}

// ── Facility Setup — Entry Points ─────────────────────────────────────────────

const TYPE_ICON: Record<EntryPointType, string> = {
  pedestrian: '🚶',
  vehicle:    '🚗',
  service:    '🔧',
  emergency:  '🚨',
  mixed:      '🔀',
}

const STATUS_CLASS: Record<string, string> = {
  active:      'bg-success/10 text-success',
  locked:      'bg-warning/10 text-warning',
  fault:       'bg-danger/10 text-danger',
  maintenance: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
}

const DIRECTION_LABEL: Record<EntryPointDirection, string> = {
  entry: 'Entry only',
  exit:  'Exit only',
  both:  'Entry & Exit',
}

function EntryPointRow({ ep, onEdit }: { ep: EntryPoint; onEdit: (ep: EntryPoint) => void }) {
  return (
    <tr className="hover:bg-surface-hover dark:hover:bg-dark-hover">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_ICON[ep.type]}</span>
          <div>
            <p className="text-sm font-medium text-text">{ep.name}</p>
            {ep.location_description && <p className="text-xs text-text-muted">{ep.location_description}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted capitalize">{ep.type}</td>
      <td className="px-4 py-3 text-xs text-text-muted">{DIRECTION_LABEL[ep.direction]}</td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {ep.operating_hours.always_open
          ? '24/7'
          : `${ep.operating_hours.open_time} – ${ep.operating_hours.close_time}`}
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded capitalize', STATUS_CLASS[ep.status])}>
          {ep.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-[11px] px-2 py-0.5 rounded', ep.requires_staff ? 'bg-surface-muted text-text-muted' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400')}>
          {ep.requires_staff ? 'Manned' : 'Automated'}
        </span>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onEdit(ep)} className="text-xs text-primary-600 hover:underline mr-3">Edit</button>
        <button className="text-xs text-danger hover:underline">Remove</button>
      </td>
    </tr>
  )
}

function AddEntryPointModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Add Entry Point</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
            <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Main Vehicle Gate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text">
                <option value="vehicle">Vehicle</option>
                <option value="pedestrian">Pedestrian</option>
                <option value="service">Service</option>
                <option value="emergency">Emergency</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Direction</label>
              <select className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text">
                <option value="both">Entry & Exit</option>
                <option value="entry">Entry only</option>
                <option value="exit">Exit only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Location Description</label>
            <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text" placeholder="e.g. North perimeter, facing Ngong Road" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="always_open" className="accent-primary-600" />
            <label htmlFor="always_open" className="text-sm text-text">Always open (24/7)</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Opens</label>
              <input type="time" defaultValue="06:00" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Closes</label>
              <input type="time" defaultValue="22:00" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="manned" className="accent-primary-600" />
            <label htmlFor="manned" className="text-sm text-text">Requires staff (manned gate)</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <textarea className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text h-16 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text">Cancel</button>
          <button onClick={() => { alert('Entry point added (demo)'); onClose() }}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Add Entry Point
          </button>
        </div>
      </div>
    </div>
  )
}

function FacilitySetupSettings() {
  const [showAdd, setShowAdd] = useState(false)
  const [editEp, setEditEp] = useState<EntryPoint | null>(null)

  const stats = useMemo(() => ({
    total:      ENTRY_POINTS.length,
    active:     ENTRY_POINTS.filter(e => e.status === 'active').length,
    fault:      ENTRY_POINTS.filter(e => e.status === 'fault').length,
    manned:     ENTRY_POINTS.filter(e => e.requires_staff).length,
  }), [])

  return (
    <div className="p-6 space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">Building Details</h3>
          <button className="text-xs text-primary-600 hover:underline">Edit</button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { label: 'Property Name',    value: 'Green Valley Estate' },
            { label: 'Total Units',      value: '24 units across 3 blocks' },
            { label: 'Floors',           value: '6 floors per block' },
            { label: 'Year Built',       value: '2018' },
            { label: 'Plot Number',      value: 'L.R No. 209/12476' },
            { label: 'Physical Address', value: 'Ngong Road, Nairobi' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-text-muted mb-0.5">{f.label}</p>
              <p className="font-medium text-text">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text">Entry Points</h3>
            <p className="text-xs text-text-muted mt-0.5">All gates and access points for this facility.</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            + Add Entry Point
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',  value: stats.total,  color: 'text-text' },
            { label: 'Active', value: stats.active, color: 'text-success' },
            { label: 'Fault',  value: stats.fault,  color: 'text-danger' },
            { label: 'Manned', value: stats.manned, color: 'text-text-muted' },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>
                {['Entry Point','Type','Direction','Hours','Status','Mode',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {ENTRY_POINTS.map(ep => (
                <EntryPointRow key={ep.id} ep={ep} onEdit={setEditEp} />
              ))}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-text-muted mt-2">
          Devices (biometric readers, ANPR cameras, boom gate controllers) are managed from the <strong>Access Control</strong> page.
        </p>
      </div>

      <AddEntryPointModal open={showAdd} onClose={() => setShowAdd(false)} />
      {editEp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditEp(null)} />
          <div className="relative z-10 bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text">Edit — {editEp.name}</h2>
              <button onClick={() => setEditEp(null)} className="text-text-muted hover:text-text text-lg">✕</button>
            </div>
            <p className="text-sm text-text-muted mb-4">Edit form mirrors the Add form. Implementation pending.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Documents Settings ─────────────────────────────────────────────────────────
function DocumentsSettings() {
  const [info,     setInfo]     = useState<DocumentInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [uploading,setUploading]= useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  useEffect(() => {
    getRulesDocumentInfo().then(setInfo).catch(() => setInfo({ configured: false, filename: '', size: 0 })).finally(() => setLoading(false))
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Only PDF files are accepted.'); return }
    setUploading(true); setError(null); setSuccess(null)
    try {
      const updated = await uploadRulesDocument(file)
      setInfo(updated)
      setSuccess('Rules & Regulations uploaded successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete() {
    setDeleting(true); setError(null); setSuccess(null)
    try {
      await deleteRulesDocument()
      setInfo({ configured: false, filename: '', size: 0 })
      setSuccess('Document removed.')
    } catch {
      setError('Failed to remove document.')
    } finally {
      setDeleting(false)
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text">Property Documents</h2>
        <p className="text-sm text-text-muted mt-1">
          Upload documents that are automatically attached to emails sent to new residents.
        </p>
      </div>

      {/* Rules & Regulations card */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 text-2xl">
            📄
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text">Rules &amp; Regulations</p>
            <p className="text-sm text-text-muted mt-0.5">
              Attached to the welcome email sent to every new resident upon registration.
            </p>
            {loading ? (
              <p className="text-sm text-text-muted mt-2">Loading…</p>
            ) : info?.configured ? (
              <div className="mt-3 flex items-center gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
                <span className="text-success text-lg">✓</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{info.filename}</p>
                  <p className="text-xs text-text-muted">{formatSize(info.size)}</p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-danger hover:underline disabled:opacity-50 flex-shrink-0"
                >
                  {deleting ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                <span className="text-warning text-lg">⚠</span>
                <p className="text-sm text-text-muted">No document uploaded — welcome emails will be sent without an attachment.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-surface-border dark:border-dark-border">
          <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${uploading ? 'opacity-50 cursor-not-allowed bg-surface-muted text-text-muted' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
            {uploading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
            ) : (
              <>{info?.configured ? '↑ Replace PDF' : '↑ Upload PDF'}</>
            )}
            <input type="file" accept="application/pdf" className="sr-only" onChange={handleUpload} disabled={uploading} />
          </label>
          <p className="text-xs text-text-muted">PDF only, max 10 MB</p>
        </div>

        {error   && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-success">{success}</p>}
      </Card>
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
  )
}

// ── TEMPORARY: Danger Zone ────────────────────────────────────────────────────
// Remove this component and its tab content before production go-live.
function DangerZone() {
  const [confirmText, setConfirmText]   = useState('')
  const [running, setRunning]           = useState(false)
  const [result, setResult]             = useState<ResetTestDataResult | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [showModal, setShowModal]       = useState(false)

  async function handleReset() {
    setRunning(true); setError(null); setResult(null)
    try {
      const res = await resetTestData()
      setResult(res)
      setShowModal(false)
      setConfirmText('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Warning banner */}
      <div className="rounded-lg border-2 border-danger/40 bg-danger/5 p-4 flex gap-3">
        <span className="text-danger text-xl mt-0.5">⚠️</span>
        <div>
          <p className="font-semibold text-danger">Danger Zone — Temporary</p>
          <p className="text-sm text-text-muted mt-1">
            This section is for test-data cleanup only. Remove it before go-live.
          </p>
        </div>
      </div>

      {/* Reset card */}
      <div className="rounded-lg border border-danger/30 bg-surface dark:bg-dark-card p-5 space-y-3">
        <div>
          <p className="font-medium text-text">Clear All Test Data</p>
          <p className="text-sm text-text-muted mt-1">
            Permanently deletes all meter readings, invoices, charges, payments and
            disconnection notices, then resets all meter baselines to zero.
            Meters, units, persons, leases and opening balances are <strong>kept</strong>.
          </p>
        </div>
        <ul className="text-xs text-text-muted space-y-0.5 list-disc list-inside">
          <li>invoice_payments</li>
          <li>disconnection_notices</li>
          <li>charges</li>
          <li>invoices</li>
          <li>meter_readings</li>
          <li>meter_type_history</li>
          <li>meters → last_reading &amp; last_reading_date reset to NULL</li>
        </ul>
        <button
          onClick={() => { setShowModal(true); setConfirmText(''); setError(null); setResult(null) }}
          className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
        >
          Clear Test Data…
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm space-y-1">
          <p className="font-medium text-success">Reset complete — all test data removed.</p>
          <ul className="text-text-muted text-xs space-y-0.5 list-disc list-inside mt-2">
            <li>{result.invoice_payments_deleted} payments deleted</li>
            <li>{result.disconnection_notices_deleted} disconnection notices deleted</li>
            <li>{result.charges_deleted} charges deleted</li>
            <li>{result.invoices_deleted} invoices deleted</li>
            <li>{result.meter_readings_deleted} meter readings deleted</li>
            <li>{result.meter_type_history_deleted} type history records deleted</li>
            <li>{result.meters_baseline_reset} meter baselines reset</li>
          </ul>
        </div>
      )}

      {/* Confirm modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="font-semibold text-text text-lg">Confirm Data Reset</p>
            </div>
            <p className="text-sm text-text-muted">
              This will permanently delete <strong>all</strong> billing and meter reading data. This cannot be undone.
            </p>
            <p className="text-sm text-text">
              Type <strong className="text-danger">RESET</strong> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="RESET"
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-danger"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm text-text hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={confirmText !== 'RESET' || running}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 disabled:opacity-40 transition-colors"
              >
                {running ? 'Resetting…' : 'Yes, Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// -- Page -----------------------------------------------------------------------
export function SettingsPageClient() {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Settings" subtitle="Property configuration, billing rules and user management" />
        <Tabs defaultValue="general" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="facility">Facility Setup</TabsTrigger>
              <TabsTrigger value="billing">Billing &amp; Payments</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="data-setup">Data Setup</TabsTrigger>
              <TabsTrigger value="danger-zone">⚠ Danger Zone</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="general"       className="flex-1 overflow-y-auto mt-0"><GeneralSettings /></TabsContent>
          <TabsContent value="facility"      className="flex-1 overflow-y-auto mt-0"><FacilitySetupSettings /></TabsContent>
          <TabsContent value="billing"       className="flex-1 overflow-y-auto mt-0"><BillingSettings /></TabsContent>
          <TabsContent value="notifications" className="flex-1 overflow-y-auto mt-0"><NotificationSettings /></TabsContent>
          <TabsContent value="roles"         className="flex-1 overflow-y-auto mt-0"><RolesSettings /></TabsContent>
          <TabsContent value="users"         className="flex-1 overflow-y-auto mt-0"><UsersSettings /></TabsContent>
          <TabsContent value="branding"      className="flex-1 overflow-y-auto mt-0"><BrandingSettings /></TabsContent>
          <TabsContent value="integrations"  className="flex-1 overflow-y-auto mt-0"><IntegrationsPageClient /></TabsContent>
          <TabsContent value="documents"     className="flex-1 overflow-y-auto mt-0"><DocumentsSettings /></TabsContent>
          <TabsContent value="data-setup"    className="flex-1 overflow-y-auto mt-0"><DataSetupSettings /></TabsContent>
          <TabsContent value="danger-zone"  className="flex-1 overflow-y-auto mt-0"><DangerZone /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
