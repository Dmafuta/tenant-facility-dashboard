'use client'
import React, { useState, useMemo } from 'react'
import { Upload, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'

// ── Shared input styling ───────────────────────────────────────────────────────
const INPUT = 'w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500'
const SELECT = 'h-9 w-full px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer'

// ── Building blocks ────────────────────────────────────────────────────────────
function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-muted">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  )
}

// ── Logo upload ────────────────────────────────────────────────────────────────
function LogoUpload() {
  const [preview, setPreview] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover">
        {preview ? (
          <img src={preview} alt="Workspace logo" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-text-muted">
            <Upload className="h-5 w-5" />
            <span className="text-[10px]">Logo</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setPreview(URL.createObjectURL(f))
          }}
        />
      </div>
      <p className="text-center text-[10px] text-text-muted">PNG/SVG · max 2MB</p>
    </div>
  )
}

// ── Delete workspace dialog ────────────────────────────────────────────────────
function DeleteWorkspaceDialog({ workspaceName }: { workspaceName: string }) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const canDelete = confirmText === workspaceName
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Delete workspace</Button>
      <Modal open={open} onClose={() => { setOpen(false); setConfirmText('') }} title="Delete workspace?" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            This permanently deletes <strong className="text-text">{workspaceName}</strong>, its units, tenants,
            leases, and financial history. This cannot be undone.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted">
              Type <span className="font-mono text-text">{workspaceName}</span> to confirm
            </label>
            <input
              className={INPUT}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={workspaceName}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); setConfirmText('') }}>Cancel</Button>
            <Button variant="danger" size="sm" disabled={!canDelete} onClick={() => setOpen(false)}>
              I understand, delete workspace
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ── Form state ─────────────────────────────────────────────────────────────────
type GeneralForm = {
  orgName: string; legalName: string; supportEmail: string
  contactPhoneCountry: string; contactPhone: string
  addressLine: string; city: string; country: string
  currency: string; timezone: string; dateFormat: string; fiscalYearStart: string
  billingEmail: string; taxId: string; paymentTerms: string
}

const INITIAL: GeneralForm = {
  orgName: 'Great Wall Gardens',
  legalName: 'Great Wall Gardens Property Ltd.',
  supportEmail: 'hello@greatwallgardens.estate',
  contactPhoneCountry: '+254',
  contactPhone: '712 345 678',
  addressLine: 'Eastern Bypass',
  city: 'Nairobi',
  country: 'KE',
  currency: 'KES',
  timezone: 'Africa/Nairobi',
  dateFormat: 'DD MMM YYYY',
  fiscalYearStart: '01-01',
  billingEmail: 'finance@greatwallgardens.estate',
  taxId: 'P051234567X',
  paymentTerms: 'net_15',
}

// ── GeneralSection ─────────────────────────────────────────────────────────────
export function GeneralSection() {
  const [form, setForm] = useState<GeneralForm>(INITIAL)
  const [saved, setSaved] = useState<GeneralForm>(INITIAL)
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved])
  const set = <K extends keyof GeneralForm>(k: K, v: GeneralForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const onSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 500))
    setSaved(form)
    setSaving(false)
  }
  const onDiscard = () => setForm(saved)

  return (
    <div className="relative">
      {/* Header */}
      <div className="border-b border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface">
        <div className="mx-auto max-w-3xl px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text">General</h2>
              <p className="mt-1 text-sm text-text-muted">Workspace identity, regional defaults, and billing details.</p>
            </div>
            <Badge variant="default" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Growth plan
            </Badge>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-8 py-8 pb-32 space-y-6">
        {/* Workspace profile */}
        <SectionCard
          title="Workspace profile"
          description="Public identity shown on invoices, notices, and tenant portals."
        >
          <div className="flex items-start gap-5">
            <LogoUpload />
            <div className="flex-1 space-y-4">
              <Field label="Workspace name" hint="Displayed in the sidebar and tenant portal.">
                <input className={INPUT} value={form.orgName} onChange={(e) => set('orgName', e.target.value)} />
              </Field>
              <Field label="Legal entity name" hint="Used on invoices and formal notices.">
                <input className={INPUT} value={form.legalName} onChange={(e) => set('legalName', e.target.value)} />
              </Field>
            </div>
          </div>
          <hr className="border-surface-border dark:border-dark-border" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Support email">
              <input type="email" className={INPUT} value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
            </Field>
            <Field label="Contact phone">
              <div className="flex gap-2">
                <select
                  className={cn(SELECT, 'w-[110px] flex-shrink-0')}
                  value={form.contactPhoneCountry}
                  onChange={(e) => set('contactPhoneCountry', e.target.value)}
                >
                  <option value="+254">🇰🇪 +254</option>
                  <option value="+256">🇺🇬 +256</option>
                  <option value="+255">🇹🇿 +255</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                </select>
                <input className={cn(INPUT, 'flex-1')} value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
              </div>
            </Field>
          </div>
          <Field label="Registered address">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
              <input className={INPUT} placeholder="Street address" value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
              <input className={INPUT} placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
              <select className={SELECT} value={form.country} onChange={(e) => set('country', e.target.value)}>
                <option value="KE">Kenya</option>
                <option value="UG">Uganda</option>
                <option value="TZ">Tanzania</option>
                <option value="RW">Rwanda</option>
              </select>
            </div>
          </Field>
        </SectionCard>

        {/* Regional defaults */}
        <SectionCard
          title="Regional defaults"
          description="Currency, timezone, and formatting used across the workspace."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <select className={SELECT} value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound Sterling</option>
                <option value="UGX">UGX — Ugandan Shilling</option>
              </select>
            </Field>
            <Field label="Timezone">
              <select className={SELECT} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Africa/Kampala">Africa/Kampala (EAT)</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </Field>
            <Field label="Date format">
              <select className={SELECT} value={form.dateFormat} onChange={(e) => set('dateFormat', e.target.value)}>
                <option value="DD MMM YYYY">12 Jul 2026</option>
                <option value="MM/DD/YYYY">07/12/2026</option>
                <option value="YYYY-MM-DD">2026-07-12</option>
              </select>
            </Field>
            <Field label="Fiscal year start">
              <select className={SELECT} value={form.fiscalYearStart} onChange={(e) => set('fiscalYearStart', e.target.value)}>
                <option value="01-01">January 1</option>
                <option value="04-01">April 1</option>
                <option value="07-01">July 1</option>
                <option value="10-01">October 1</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* Billing details */}
        <SectionCard
          title="Billing details"
          description="Used on tenant invoices and financial exports."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Billing email" hint="Receipts and platform invoices go here.">
              <input type="email" className={INPUT} value={form.billingEmail} onChange={(e) => set('billingEmail', e.target.value)} />
            </Field>
            <Field label="Tax / VAT ID">
              <input className={INPUT} value={form.taxId} onChange={(e) => set('taxId', e.target.value)} />
            </Field>
            <Field label="Default payment terms">
              <select className={SELECT} value={form.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)}>
                <option value="due_on_receipt">Due on receipt</option>
                <option value="net_7">Net 7</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
              </select>
            </Field>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <p className="text-text-muted">
              To change your subscription plan or payment method, visit{' '}
              <a href="/settings?section=billing" className="text-text underline underline-offset-2 hover:text-primary-600">
                Billing &amp; payments
              </a>.
            </p>
          </div>
        </SectionCard>

        {/* Danger zone */}
        <div className="rounded-lg border border-danger/40 bg-danger/5">
          <div className="border-b border-danger/20 px-6 py-4">
            <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
            <p className="mt-0.5 text-xs text-danger/80">Irreversible actions. Proceed with caution.</p>
          </div>
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <div className="text-sm font-medium text-text">Delete workspace</div>
              <p className="text-xs text-text-muted">
                Permanently remove this workspace, all units, tenants, and financial records.
              </p>
            </div>
            <DeleteWorkspaceDialog workspaceName={form.orgName} />
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-surface-border dark:border-dark-border bg-white/95 dark:bg-dark-card/95 px-3 py-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 pl-2 pr-1 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-text-muted">Unsaved changes</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>Discard</Button>
            <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
