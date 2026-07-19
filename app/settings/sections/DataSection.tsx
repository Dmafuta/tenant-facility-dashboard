'use client'
import React, { useState, useMemo } from 'react'
import { FileSpreadsheet, Download, Plus, Search, ArrowUpDown, Info, History } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// ── Types ──────────────────────────────────────────────────────────────────────
type BalanceCategory = 'water' | 'service' | 'other'
type BalanceStatus = 'active' | 'voided' | 'applied'

type OpeningBalance = {
  id: string; unit: string; amount: number; asOf: string
  notes: string; status: BalanceStatus; category: BalanceCategory
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const CATEGORIES: { key: BalanceCategory; label: string; description: string }[] = [
  { key: 'water',   label: 'Water & Sewerage',  description: 'Metered water and sewerage arrears carried into the platform.' },
  { key: 'service', label: 'Service Charge',     description: 'Outstanding service charge balances from the previous system.' },
  { key: 'other',   label: 'Other',              description: 'Miscellaneous carried balances that don\'t fit standard categories.' },
]

const OPENING_BALANCES: OpeningBalance[] = [
  { id: 'ob-1', unit: 'A-101', amount: 4778.25, asOf: '2026-04-07', notes: 'Balance carried from previous billing system', status: 'active',  category: 'water' },
  { id: 'ob-2', unit: 'B-205', amount: 2150.00, asOf: '2026-04-07', notes: 'Arrears from Q1 2026',                         status: 'active',  category: 'water' },
  { id: 'ob-3', unit: 'C-312', amount: 900.00,  asOf: '2026-03-31', notes: 'Disputed — under review',                      status: 'voided',  category: 'water' },
  { id: 'ob-4', unit: 'A-103', amount: 3200.00, asOf: '2026-04-01', notes: 'Service charge carried over',                  status: 'active',  category: 'service' },
  { id: 'ob-5', unit: 'D-104', amount: 1500.00, asOf: '2026-04-01', notes: 'Applied to May invoice',                       status: 'applied', category: 'service' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SummaryStat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-text-muted">{label}:</span>
      <span className={emphasis ? 'font-semibold tabular-nums text-text' : 'font-medium tabular-nums text-text'}>
        {value}
      </span>
    </div>
  )
}

function BalanceStatusPill({ status }: { status: BalanceStatus }) {
  const map: Record<BalanceStatus, { label: string; cls: string }> = {
    active:  { label: 'Active',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    applied: { label: 'Applied', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    voided:  { label: 'Voided',  cls: 'bg-surface-hover text-text-muted border-surface-border dark:border-dark-border' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

function EmptyBalances({ category }: { category: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover dark:bg-dark-hover">
        <FileSpreadsheet className="h-5 w-5 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text">No {category.toLowerCase()} balances yet</p>
      <p className="max-w-sm text-xs text-text-muted">
        Add balances individually or import an Excel sheet using the template to get started.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />Download template
        </Button>
        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />Add balance
        </Button>
      </div>
    </div>
  )
}

function ImportCard({ title, description, fileTypes }: { title: string; description: string; fileTypes: string }) {
  return (
    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-primary-600">
          <FileSpreadsheet className="h-4 w-4" />
        </div>
        <Badge variant="default" className="text-[10px] font-medium">{fileTypes}</Badge>
      </div>
      <h4 className="mt-3 text-sm font-semibold text-text">{title}</h4>
      <p className="mt-1 text-xs text-text-muted">{description}</p>
      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />Template
        </Button>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5" />Import
        </Button>
      </div>
    </div>
  )
}

// ── DataSection ────────────────────────────────────────────────────────────────
export function DataSection() {
  const [activeCat, setActiveCat] = useState<BalanceCategory>('water')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return OPENING_BALANCES.filter(
      (b) => b.category === activeCat &&
        (q === '' || b.unit.toLowerCase().includes(q) || b.notes.toLowerCase().includes(q)),
    )
  }, [activeCat, query])

  const totals = useMemo(() => {
    const all = OPENING_BALANCES.filter((b) => b.category === activeCat)
    const total = all.reduce((s, b) => s + (b.status === 'voided' ? 0 : b.amount), 0)
    const active = all.filter((b) => b.status === 'active').length
    return { count: all.length, total, active }
  }, [activeCat])

  const activeCategory = CATEGORIES.find((c) => c.key === activeCat)!

  return (
    <div className="relative">
      {/* Header */}
      <div className="border-b border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface">
        <div className="mx-auto max-w-6xl px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text">Data &amp; imports</h2>
              <p className="mt-1 text-sm text-text-muted">
                Seed the workspace with opening balances, historical records, and bulk imports.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <History className="h-3.5 w-3.5" />Import history
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8 space-y-6">
        {/* Opening balances card */}
        <section className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
          <header className="flex items-start justify-between gap-4 border-b border-surface-border dark:border-dark-border px-6 py-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text">Opening balances</h3>
                <Badge variant="default" className="h-5 px-1.5 text-[10px] font-medium">Pre-system arrears</Badge>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">
                One-time lump-sum per unit representing pre-system arrears. Applied automatically when the first invoice is issued.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />Template
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />Import Excel
              </Button>
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />Add opening balance
              </Button>
            </div>
          </header>

          {/* Category tabs */}
          <div className="border-b border-surface-border dark:border-dark-border px-6">
            <nav className="-mb-px flex gap-6">
              {CATEGORIES.map((c) => {
                const isActive = activeCat === c.key
                const count = OPENING_BALANCES.filter((b) => b.category === c.key).length
                return (
                  <button
                    key={c.key}
                    onClick={() => setActiveCat(c.key)}
                    className={[
                      'flex items-center gap-2 border-b-2 px-1 py-3 text-sm transition-colors',
                      isActive
                        ? 'border-primary-600 text-text font-medium'
                        : 'border-transparent text-text-muted hover:text-text',
                    ].join(' ')}
                  >
                    <span>{c.label}</span>
                    <span className={[
                      'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium',
                      isActive ? 'bg-primary-50 text-primary-600' : 'bg-surface-hover dark:bg-dark-hover text-text-muted',
                    ].join(' ')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Category description + summary */}
          <div className="grid grid-cols-1 gap-4 border-b border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-6 py-4 sm:grid-cols-[1fr_auto]">
            <p className="text-xs text-text-muted">{activeCategory.description}</p>
            <div className="flex items-center gap-6 text-xs">
              <SummaryStat label="Entries" value={totals.count.toString()} />
              <SummaryStat label="Active" value={totals.active.toString()} />
              <SummaryStat
                label="Outstanding"
                value={`KES ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                emphasis
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 border-b border-surface-border dark:border-dark-border px-6 py-3">
            <div className="relative w-72 max-w-full">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by unit or notes…"
                className="h-8 w-full pl-8 pr-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="text-xs text-text-muted">
              Showing <span className="font-medium text-text">{rows.length}</span> of {totals.count}
            </div>
          </div>

          {/* Table */}
          {rows.length === 0 ? (
            <EmptyBalances category={activeCategory.label} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border dark:border-dark-border bg-surface-hover/30 dark:bg-dark-hover/30 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                    <th className="px-6 py-2.5">
                      <button className="inline-flex items-center gap-1 hover:text-text">
                        Unit <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-6 py-2.5 text-right">Amount</th>
                    <th className="px-6 py-2.5">As of</th>
                    <th className="px-6 py-2.5">Notes</th>
                    <th className="px-6 py-2.5">Status</th>
                    <th className="px-6 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                  {rows.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-hover/20 dark:hover:bg-dark-hover/20">
                      <td className="px-6 py-3">
                        <span className="font-medium text-text">{b.unit}</span>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        <span className="text-text-muted">KES</span>{' '}
                        <span className="font-medium text-text">
                          {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-3 tabular-nums text-text-muted">{formatDate(b.asOf)}</td>
                      <td className="px-6 py-3 text-text-muted">{b.notes}</td>
                      <td className="px-6 py-3"><BalanceStatusPill status={b.status} /></td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-danger hover:text-danger">Void</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-start gap-2 border-t border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-6 py-3 text-[11px] text-text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Opening balances are immutable once the first invoice is generated. To reverse an entry after that point,
              issue a credit note from{' '}
              <a href="/settings?section=billing" className="text-text underline underline-offset-2 hover:text-primary-600">
                Billing &amp; payments
              </a>.
            </p>
          </div>
        </section>

        {/* Import cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ImportCard
            title="Bulk unit import"
            description="Upload the master unit register including block, floor, size, and default rates."
            fileTypes="XLSX · CSV"
          />
          <ImportCard
            title="Tenant &amp; lease import"
            description="Import active tenants, lease terms, deposit balances, and contact records."
            fileTypes="XLSX · CSV"
          />
          <ImportCard
            title="Meter readings history"
            description="Historical utility readings for accurate billing continuity."
            fileTypes="XLSX · CSV"
          />
          <ImportCard
            title="Chart of accounts"
            description="GL codes, cost centres, and account mappings for financial exports."
            fileTypes="XLSX · CSV · JSON"
          />
        </div>
      </div>
    </div>
  )
}
