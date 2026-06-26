'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import {
  getInvoices, getInvoice, issueInvoice, voidInvoice, applyPayment, removePayment,
  bulkIssueInvoices,
  type InvoiceData, type InvoiceCategory,
  getInvoiceCategories,
} from '@/lib/api/invoices'
import { apiFetch } from '@/lib/api/fetch'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'blue' | 'purple' }> = {
  draft:   { label: 'Draft',   variant: 'default' },
  issued:  { label: 'Issued',  variant: 'blue' },
  partial: { label: 'Partial', variant: 'warning' },
  paid:    { label: 'Paid',    variant: 'success' },
  voided:  { label: 'Voided',  variant: 'danger' },
}

function StatusBadge({ status }: { status: string }) {
  const { label, variant } = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={variant}>{label}</Badge>
}

const CATEGORY_LABELS: Record<string, string> = {
  WS: 'Water & Sewerage',
  SC: 'Service Charge',
  OT: 'Other Charges',
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  water:     'Water (incl. mgmt fee)',
  sewerage:  'Sewerage',
  service_charge: 'Service Charge',
  other:     'Other',
}

// ── Main component ─────────────────────────────────────────────────────────

export function BillingPageClient() {
  const [activeTab, setActiveTab]     = useState<'WS' | 'SC' | 'OT'>('WS')
  const [invoices, setInvoices]       = useState<InvoiceData[]>([])
  const [categories, setCategories]   = useState<InvoiceCategory[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('')

  // Detail panel
  const [selected, setSelected]       = useState<InvoiceData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Pay modal
  const [payTarget, setPayTarget]     = useState<InvoiceData | null>(null)
  const [payAmount, setPayAmount]     = useState('')
  const [payDate, setPayDate]         = useState('')
  const [payMethod, setPayMethod]     = useState('mpesa')
  const [payRef, setPayRef]           = useState('')
  const [payNotes, setPayNotes]       = useState('')
  const [paying, setPaying]           = useState(false)

  // SC billing run modal
  const [showRunModal, setShowRunModal] = useState(false)
  const [runPeriod, setRunPeriod]       = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [running, setRunning]           = useState(false)
  const [runResult, setRunResult]       = useState<{ invoicesCreated: number; skipped: number; message: string } | null>(null)

  // Bulk issue modal
  const [showBulkModal, setShowBulkModal]   = useState(false)
  const [bulkPeriod, setBulkPeriod]         = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [bulkIssuing, setBulkIssuing]       = useState(false)
  const [bulkResult, setBulkResult]         = useState<{ issued: number } | null>(null)

  // Action states
  const [actioning, setActioning]     = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, cats] = await Promise.all([getInvoices(), getInvoiceCategories()])
      setInvoices(inv)
      setCategories(cats)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtered list ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.category_code !== activeTab) return false
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false
      if (periodFilter && inv.period !== periodFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const unit   = (inv.unit_label   ?? '').toLowerCase()
        const person = (inv.person_name  ?? '').toLowerCase()
        const stmt   = (inv.statement_no ?? '').toLowerCase()
        if (!unit.includes(q) && !person.includes(q) && !stmt.includes(q)) return false
      }
      return true
    })
  }, [invoices, activeTab, statusFilter, periodFilter, search])

  // Stats for active tab
  const tabStats = useMemo(() => {
    const tab = invoices.filter(i => i.category_code === activeTab && i.status !== 'voided')
    const outstanding = tab.filter(i => ['issued','partial'].includes(i.status))
      .reduce((s, i) => s + i.balance, 0)
    const collected = tab.reduce((s, i) => s + i.paid_amount, 0)
    const drafts = tab.filter(i => i.status === 'draft').length
    return { outstanding, collected, drafts }
  }, [invoices, activeTab])

  // Unique periods for filter dropdown
  const periods = useMemo(() => {
    const ps = [...new Set(invoices.filter(i => i.period).map(i => i.period!))]
    return ps.sort().reverse()
  }, [invoices])

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleIssue(inv: InvoiceData) {
    setActioning(inv.id)
    setError(null)
    try {
      const updated = await issueInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to issue invoice')
    } finally {
      setActioning(null)
    }
  }

  async function handleVoid(inv: InvoiceData) {
    if (!confirm(`Void invoice ${inv.statement_no}? Any payments will become unallocated credits.`)) return
    setActioning(inv.id)
    setError(null)
    try {
      const updated = await voidInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to void invoice')
    } finally {
      setActioning(null)
    }
  }

  async function handlePay() {
    if (!payTarget || !payAmount) return
    setPaying(true)
    setError(null)
    try {
      const updated = await applyPayment(payTarget.id, {
        amount:         parseFloat(payAmount),
        payment_date:   payDate || undefined,
        payment_method: payMethod || undefined,
        reference_no:   payRef || undefined,
        notes:          payNotes || undefined,
      })
      setInvoices(prev => prev.map(i => i.id === payTarget.id ? updated : i))
      if (selected?.id === payTarget.id) {
        // Reload full detail to get updated payments list
        const detail = await getInvoice(payTarget.id)
        setSelected(detail)
      }
      setPayTarget(null)
      resetPayForm()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to record payment')
    } finally {
      setPaying(false)
    }
  }

  async function handleRemovePayment(paymentId: string) {
    if (!confirm('Remove this payment?')) return
    setError(null)
    try {
      await removePayment(paymentId)
      if (selected) {
        const detail = await getInvoice(selected.id)
        setSelected(detail)
        setInvoices(prev => prev.map(i => i.id === detail.id ? detail : i))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove payment')
    }
  }

  async function openDetail(inv: InvoiceData) {
    setSelected(inv)
    setDetailLoading(true)
    try {
      const detail = await getInvoice(inv.id)
      setSelected(detail)
    } catch {
      // keep the summary data
    } finally {
      setDetailLoading(false)
    }
  }

  function openPay(inv: InvoiceData) {
    setPayTarget(inv)
    setPayAmount(inv.balance > 0 ? inv.balance.toFixed(2) : '')
    setPayDate(new Date().toISOString().slice(0, 10))
    setPayMethod('mpesa')
    setPayRef('')
    setPayNotes('')
  }

  function resetPayForm() {
    setPayAmount(''); setPayDate(''); setPayMethod('mpesa'); setPayRef(''); setPayNotes('')
  }

  async function handleRunSC() {
    setRunning(true); setError(null); setRunResult(null)
    try {
      const result = await apiFetch<{ invoicesCreated: number; skipped: number; message: string }>(
        '/billing-runs/service-charge', { method: 'POST', body: JSON.stringify({ period: runPeriod }) }
      )
      setRunResult(result)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Billing run failed')
    } finally {
      setRunning(false)
    }
  }

  async function handleBulkIssue() {
    setBulkIssuing(true); setError(null); setBulkResult(null)
    try {
      const result = await bulkIssueInvoices(bulkPeriod, activeTab)
      setBulkResult(result)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk issue failed')
    } finally {
      setBulkIssuing(false)
    }
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { code: 'WS' | 'SC' | 'OT'; label: string }[] = [
    { code: 'WS', label: 'Water & Sewerage' },
    { code: 'SC', label: 'Service Charge' },
    { code: 'OT', label: 'Other Charges' },
  ]

  const activeCategory = categories.find(c => c.code === activeTab)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Error banner */}
      {error && (
        <div className="bg-danger/10 text-danger text-sm px-4 py-2 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-4 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex items-center gap-1 border-b border-surface-border dark:border-dark-border">
        {tabs.map(t => (
          <button
            key={t.code}
            onClick={() => setActiveTab(t.code)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === t.code
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-text-muted hover:text-text'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted mb-1">Outstanding</p>
          <p className="text-lg font-semibold text-danger">{fmt(tabStats.outstanding)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted mb-1">Collected</p>
          <p className="text-lg font-semibold text-success">{fmt(tabStats.collected)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted mb-1">Drafts</p>
          <p className="text-lg font-semibold text-text">{tabStats.drafts}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search unit, person, statement…"
          className="w-56"
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all',     label: 'All statuses' },
            { value: 'draft',   label: 'Draft' },
            { value: 'issued',  label: 'Issued' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid',    label: 'Paid' },
            { value: 'voided',  label: 'Voided' },
          ]}
        />
        <Select
          value={periodFilter}
          onChange={setPeriodFilter}
          options={[
            { value: '', label: 'All periods' },
            ...periods.map(p => ({ value: p, label: p })),
          ]}
        />
        <Button variant="ghost" size="sm" onClick={load} className="ml-auto">
          Refresh
        </Button>
        {tabStats.drafts > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setShowBulkModal(true); setBulkResult(null) }}>
            Issue All Drafts ({tabStats.drafts})
          </Button>
        )}
        {activeTab === 'SC' && (
          <Button variant="primary" size="sm" onClick={() => { setShowRunModal(true); setRunResult(null) }}>
            Run SC Billing
          </Button>
        )}
      </div>

      {/* Main area: list + detail panel */}
      <div className={cn('flex gap-4', selected ? 'items-start' : '')}>

        {/* Invoice list */}
        <Card className={cn('overflow-hidden', selected ? 'flex-1 min-w-0' : 'w-full')}>
          {loading ? (
            <div className="p-8 text-center text-text-muted text-sm">Loading invoices…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No invoices found{search || statusFilter !== 'all' || periodFilter ? ' matching filters' : ` for ${CATEGORY_LABELS[activeTab]}`}.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Statement</th>
                  <th className="px-4 py-3 text-left">Unit / Account</th>
                  <th className="px-4 py-3 text-left">Person</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Charges</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => openDetail(inv)}
                    className={cn(
                      'border-b border-surface-border dark:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-hover cursor-pointer transition-colors',
                      selected?.id === inv.id && 'bg-primary-50 dark:bg-primary-900/10'
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-medium">{inv.statement_no}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{inv.unit_label ?? '—'}</div>
                      {inv.account_no && inv.account_no !== inv.unit_label && (
                        <div className="text-xs text-text-muted">{inv.account_no}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{inv.person_name ?? '—'}</td>
                    <td className="px-4 py-3 text-text-muted">{inv.period ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{fmt(inv.current_charges)}</td>
                    <td className={cn(
                      'px-4 py-3 text-right font-semibold',
                      inv.balance > 0 ? 'text-danger' : 'text-success'
                    )}>
                      {fmt(inv.balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {inv.status === 'draft' && (
                          <Button
                            size="sm" variant="primary"
                            disabled={actioning === inv.id}
                            onClick={() => handleIssue(inv)}
                          >
                            Issue
                          </Button>
                        )}
                        {['issued', 'partial'].includes(inv.status) && (
                          <Button
                            size="sm" variant="ghost"
                            disabled={actioning === inv.id}
                            onClick={() => openPay(inv)}
                          >
                            Pay
                          </Button>
                        )}
                        {['draft', 'issued', 'partial'].includes(inv.status) && (
                          <Button
                            size="sm" variant="danger"
                            disabled={actioning === inv.id}
                            onClick={() => handleVoid(inv)}
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 space-y-3">
            <Card className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-text-muted">{selected.statement_no}</p>
                  <p className="font-semibold text-sm mt-0.5">{selected.unit_label}</p>
                  <p className="text-xs text-text-muted">{selected.person_name ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <button
                    onClick={() => setSelected(null)}
                    className="text-text-muted hover:text-text"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <span className="text-text-muted">Period</span>
                <span className="font-medium">{selected.period ?? '—'}</span>
                <span className="text-text-muted">Issue Date</span>
                <span className="font-medium">{fmtDate(selected.issue_date)}</span>
                <span className="text-text-muted">Due Date</span>
                <span className="font-medium">{fmtDate(selected.due_date)}</span>
                <span className="text-text-muted">Account No</span>
                <span className="font-medium">{selected.account_no ?? '—'}</span>
              </div>

              {/* Category tagline */}
              {activeCategory?.tagline && (
                <p className="text-xs text-text-muted italic border-t border-surface-border dark:border-dark-border pt-2">
                  {activeCategory.tagline}
                </p>
              )}

              {/* Balance summary */}
              <div className="bg-surface dark:bg-dark-surface rounded-lg p-3 space-y-1.5 text-xs border border-surface-border dark:border-dark-border">
                <div className="flex justify-between">
                  <span className="text-text-muted">Previous Balance</span>
                  <span>{fmt(selected.previous_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Current Charges</span>
                  <span>{fmt(selected.current_charges)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Paid</span>
                  <span className="text-success">− {fmt(selected.paid_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-surface-border dark:border-dark-border pt-1.5 mt-1.5 text-sm">
                  <span>Balance Due</span>
                  <span className={selected.balance > 0 ? 'text-danger' : 'text-success'}>
                    {fmt(selected.balance)}
                  </span>
                </div>
              </div>

              {/* Line items */}
              {detailLoading ? (
                <p className="text-xs text-text-muted">Loading details…</p>
              ) : selected.line_items && selected.line_items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Line Items</p>
                  <div className="space-y-1">
                    {selected.line_items.map(li => (
                      <div key={li.id} className="flex justify-between text-xs">
                        <span className="text-text-muted">
                          {CHARGE_TYPE_LABELS[li.charge_type] ?? li.charge_type}
                        </span>
                        <span className="font-medium">{fmt(li.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment history */}
              {selected.payments && selected.payments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">Payments</p>
                  <div className="space-y-1.5">
                    {selected.payments.map(p => (
                      <div key={p.id} className="flex items-start justify-between text-xs gap-2">
                        <div>
                          <span className="font-medium text-success">{fmt(p.amount)}</span>
                          <span className="text-text-muted ml-1">
                            {fmtDate(p.payment_date)} · {p.payment_method ?? ''}
                          </span>
                          {p.reference_no && (
                            <div className="text-text-muted font-mono">{p.reference_no}</div>
                          )}
                        </div>
                        {['issued','partial','paid'].includes(selected.status) && (
                          <button
                            onClick={() => handleRemovePayment(p.id)}
                            className="text-danger hover:underline flex-shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bank / payment details from category */}
              {activeCategory && (activeCategory.bank_name || activeCategory.bank_account) && (
                <div className="border-t border-surface-border dark:border-dark-border pt-3 space-y-1 text-xs text-text-muted">
                  {activeCategory.bank_name && <p>Bank: <span className="text-text">{activeCategory.bank_name}</span></p>}
                  {activeCategory.bank_account && <p>Account: <span className="text-text font-mono">{activeCategory.bank_account}</span></p>}
                  {activeCategory.bank_branch && <p>Branch: <span className="text-text">{activeCategory.bank_branch}</span></p>}
                </div>
              )}

              {/* Detail actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {selected.status === 'draft' && (
                  <Button
                    size="sm" variant="primary" className="flex-1"
                    disabled={actioning === selected.id}
                    onClick={() => handleIssue(selected)}
                  >
                    Issue Invoice
                  </Button>
                )}
                {['issued', 'partial'].includes(selected.status) && (
                  <Button
                    size="sm" variant="ghost" className="flex-1"
                    onClick={() => openPay(selected)}
                  >
                    Record Payment
                  </Button>
                )}
                {['draft', 'issued', 'partial'].includes(selected.status) && (
                  <Button
                    size="sm" variant="danger"
                    disabled={actioning === selected.id}
                    onClick={() => handleVoid(selected)}
                  >
                    Void
                  </Button>
                )}
                <a
                  href={`/billing/invoice/${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  Print / PDF
                </a>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* SC Billing Run modal */}
      <Modal
        open={showRunModal}
        onClose={() => { setShowRunModal(false); setRunResult(null) }}
        title="Run Service Charge Billing"
        size="sm"
      >
        <div className="p-5 space-y-4">
          {runResult ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Billing Run Complete</p>
                <p>{runResult.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary-600">{runResult.invoicesCreated}</p>
                  <p className="text-text-muted text-xs mt-1">Invoices Created</p>
                </div>
                <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-text-muted">{runResult.skipped}</p>
                  <p className="text-text-muted text-xs mt-1">Units Skipped</p>
                </div>
              </div>
              <Button variant="primary" className="w-full" onClick={() => { setShowRunModal(false); setRunResult(null) }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                This will generate a draft Service Charge invoice for every active unit for the selected period.
                Units already billed for that period will be skipped.
              </p>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Billing Period (YYYY-MM)</label>
                <input
                  type="month"
                  value={runPeriod}
                  onChange={e => setRunPeriod(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowRunModal(false)}>Cancel</Button>
                <Button
                  variant="primary" className="flex-1"
                  disabled={running || !runPeriod}
                  onClick={handleRunSC}
                >
                  {running ? 'Running…' : `Run for ${runPeriod}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Bulk Issue modal */}
      <Modal
        open={showBulkModal}
        onClose={() => { setShowBulkModal(false); setBulkResult(null) }}
        title={`Issue All ${activeTab} Drafts`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {bulkResult ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Done</p>
                <p>{bulkResult.issued} invoice{bulkResult.issued !== 1 ? 's' : ''} issued successfully.</p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => { setShowBulkModal(false); setBulkResult(null) }}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                This will issue all <strong>{tabStats.drafts}</strong> draft invoices in the <strong>{activeTab}</strong> category for the selected period.
                Each invoice will be snapshotted with the current outstanding balance and a notification sent to the tenant.
              </p>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Billing Period</label>
                <input
                  type="month"
                  value={bulkPeriod}
                  onChange={e => setBulkPeriod(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowBulkModal(false)}>Cancel</Button>
                <Button
                  variant="primary" className="flex-1"
                  disabled={bulkIssuing || !bulkPeriod}
                  onClick={handleBulkIssue}
                >
                  {bulkIssuing ? 'Issuing…' : `Issue for ${bulkPeriod}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Pay modal */}
      <Modal
        open={!!payTarget}
        onClose={() => { setPayTarget(null); resetPayForm() }}
        title={`Record Payment — ${payTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {payTarget && (
            <div className="bg-surface dark:bg-dark-surface rounded-lg p-3 text-sm border border-surface-border dark:border-dark-border">
              <div className="flex justify-between">
                <span className="text-text-muted">Outstanding</span>
                <span className="font-semibold text-danger">{fmt(payTarget.balance)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-text-muted">Unit</span>
                <span>{payTarget.unit_label}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES) *</label>
            <input
              type="number" min="0" step="0.01"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Method</label>
              <Select
                value={payMethod}
                onChange={setPayMethod}
                options={[
                  { value: 'mpesa',       label: 'M-Pesa' },
                  { value: 'bank',        label: 'Bank Transfer' },
                  { value: 'cash',        label: 'Cash' },
                  { value: 'credit',      label: 'Credit' },
                  { value: 'adjustment',  label: 'Adjustment' },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reference No.</label>
            <input
              type="text"
              value={payRef}
              onChange={e => setPayRef(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="M-Pesa code, cheque no…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <textarea
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => { setPayTarget(null); resetPayForm() }}>
              Cancel
            </Button>
            <Button
              variant="primary" className="flex-1"
              disabled={paying || !payAmount || parseFloat(payAmount) <= 0}
              onClick={handlePay}
            >
              {paying ? 'Saving…' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
