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
  bulkIssueInvoices, sendInvoiceEmail, applyLateFees,
  writeOffInvoice, bulkEmailInvoices, sendInvoiceDisconnectionNotice,
  getAgedDebtors, getBillingSummary, getOutstandingBalances,
  requestVoidInvoice, approveVoidInvoice, rejectVoidInvoice,
  requestWriteOffInvoice, approveWriteOffInvoice, rejectWriteOffInvoice,
  createCreditNote, getCollectionSummary, getUnallocatedCredits, getAllCreditNotes, applyCredit,
  disputeInvoice, resolveDispute,
  type InvoiceData, type InvoiceCategory, type InvoicePayment, type AgedDebtorRow, type AgedDebtorSummary,
  type BillingSummary, type OutstandingBalanceRow,
  type CollectionSummary, type CollectionSummaryRow,
  getInvoiceCategories,
} from '@/lib/api/invoices'
import {
  getOpeningBalances, createOpeningBalance, updateOpeningBalance, voidOpeningBalance,
  type OpeningBalance,
} from '@/lib/api/opening-balances'
import { createPaymentPlan, type PaymentPlanData } from '@/lib/api/payment-plans'
import { apiFetch } from '@/lib/api/fetch'
import { getSettings } from '@/lib/api/settings'
import { useAbac } from '@/lib/abac/context'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `KES ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' | 'blue' | 'purple' }> = {
  draft:           { label: 'Draft',           variant: 'default' },
  issued:          { label: 'Issued',          variant: 'blue' },
  partial:         { label: 'Partial',         variant: 'warning' },
  paid:            { label: 'Paid',            variant: 'success' },
  void_requested:       { label: 'Void Requested',       variant: 'warning' },
  write_off_requested:  { label: 'Write-Off Requested',  variant: 'warning' },
  voided:          { label: 'Voided',          variant: 'danger' },
  written_off:     { label: 'Written Off',     variant: 'purple' },
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

function defaultPeriodForCycle(cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual') {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (cycle === 'quarterly')   return `${year}-Q${Math.ceil(month / 3)}`
  if (cycle === 'semi_annual') return month <= 6 ? `${year}-H1` : `${year}-H2`
  if (cycle === 'annual')      return `${year}`
  return `${year}-${String(month).padStart(2, '0')}`
}

function PeriodPicker({ cycle, value, onChange }: {
  cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  value: string
  onChange: (v: string) => void
}) {
  const year  = value ? parseInt(value.split('-')[0]) || new Date().getFullYear() : new Date().getFullYear()
  const setYear = (y: number) => onChange(defaultPeriodForCycle(cycle).replace(/^\d{4}/, String(y)))

  if (cycle === 'monthly') return (
    <input type="month" value={value} onChange={e => onChange(e.target.value)}
      className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
  )

  const segments = cycle === 'quarterly'
    ? ['Q1','Q2','Q3','Q4']
    : cycle === 'semi_annual'
      ? ['H1','H2']
      : []

  const active = value.split('-')[1] ?? ''

  return (
    <div className="flex gap-2">
      <input
        type="number" value={year} min={2020} max={2099}
        onChange={e => setYear(parseInt(e.target.value) || year)}
        className="w-24 h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {cycle === 'annual' ? (
        <span className="flex items-center text-xs text-text-muted">Full year</span>
      ) : (
        <div className="flex gap-1 flex-1">
          {segments.map(seg => (
            <button key={seg} type="button"
              onClick={() => onChange(`${year}-${seg}`)}
              className={`flex-1 h-9 text-sm rounded-lg border transition-colors ${active === seg
                ? 'bg-primary-600 text-white border-primary-600'
                : 'border-surface-border dark:border-dark-border text-text hover:bg-surface-hover dark:hover:bg-dark-hover'}`}
            >
              {seg}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function BillingPageClient() {
  const { subject } = useAbac()
  const [activeTab, setActiveTab]     = useState<'WS' | 'SC' | 'OT' | 'Reports' | 'Adjustments'>('WS')
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
  const [scCycle, setScCycle]           = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly')
  const [scDueDay, setScDueDay]         = useState(5)
  const [runPeriod, setRunPeriod]       = useState('')
  const [running, setRunning]           = useState(false)
  const [runResult, setRunResult]       = useState<{ invoicesCreated: number; skipped: number; message: string } | null>(null)

  // Load SC settings when run modal opens
  useEffect(() => {
    if (!showRunModal) return
    getSettings().then(s => {
      const cycle = (s.sc_billing_cycle ?? 'monthly') as typeof scCycle
      setScCycle(cycle)
      setScDueDay(s.sc_due_day ?? 5)
      setRunPeriod(defaultPeriodForCycle(cycle))
    }).catch(() => {})
  }, [showRunModal])

  // Bulk email modal (declared here so the useEffect below can reference it)
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false)

  // Load SC settings when bulk email modal opens on SC tab
  useEffect(() => {
    if (!showBulkEmailModal || activeTab !== 'SC') return
    getSettings().then(s => {
      const cycle = (s.sc_billing_cycle ?? 'monthly') as typeof scCycle
      setScCycle(cycle)
      setBulkEmailPeriod(defaultPeriodForCycle(cycle))
    }).catch(() => {})
  }, [showBulkEmailModal, activeTab])

  // Bulk issue modal
  const [showBulkModal, setShowBulkModal]   = useState(false)
  const [bulkPeriod, setBulkPeriod]         = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [bulkIssuing, setBulkIssuing]       = useState(false)
  const [bulkResult, setBulkResult]         = useState<{ issued: number; skipped: number } | null>(null)

  // Send email
  const [emailing, setEmailing]       = useState<string | null>(null)
  const [emailMsg, setEmailMsg]       = useState<string | null>(null)

  // Late fees modal
  const [showLateModal, setShowLateModal] = useState(false)
  const [latePct, setLatePct]           = useState('5')
  const [lateFeeRunning, setLateFeeRunning] = useState(false)
  const [lateFeeResult, setLateFeeResult] = useState<{ updated: number; message: string } | null>(null)

  // Void modal (maker: request void)
  const [voidTarget, setVoidTarget]   = useState<InvoiceData | null>(null)
  const [voidReason, setVoidReason]   = useState('')
  const [voidNotes, setVoidNotes]     = useState('')
  const [voiding, setVoiding]         = useState(false)

  // Reject void modal (checker)
  const [rejectVoidTarget, setRejectVoidTarget] = useState<InvoiceData | null>(null)
  const [rejectingVoid, setRejectingVoid]       = useState(false)
  const [approvingVoid, setApprovingVoid]       = useState<string | null>(null)

  // Write-off modal (maker: request write-off)
  const [writeOffTarget, setWriteOffTarget]     = useState<InvoiceData | null>(null)
  const [writeOffNotes, setWriteOffNotes]       = useState('')
  const [writingOff, setWritingOff]             = useState(false)

  // Reject write-off modal (checker)
  const [rejectWriteOffTarget, setRejectWriteOffTarget] = useState<InvoiceData | null>(null)
  const [rejectingWriteOff, setRejectingWriteOff]       = useState(false)
  const [approvingWriteOff, setApprovingWriteOff]       = useState<string | null>(null)

  // Bulk email modal (continued)
  const [bulkEmailPeriod, setBulkEmailPeriod]       = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [bulkEmailing, setBulkEmailing]             = useState(false)
  const [bulkEmailResult, setBulkEmailResult]       = useState<{ sent: number; skipped: number; message: string } | null>(null)

  // Disconnection notice
  const [disconnectTarget, setDisconnectTarget] = useState<InvoiceData | null>(null)
  const [disconnectType, setDisconnectType]     = useState<'reminder' | 'formal'>('reminder')
  const [sendingNotice, setSendingNotice]       = useState(false)

  // Credit note modal
  const [creditNoteTarget, setCreditNoteTarget]   = useState<InvoiceData | null>(null)
  const [creditNoteAmount, setCreditNoteAmount]   = useState('')
  const [creditNoteReason, setCreditNoteReason]   = useState('')
  const [issuingCredit, setIssuingCredit]         = useState(false)
  const [creditSuccess, setCreditSuccess]         = useState<string | null>(null)

  // Available credits for selected invoice
  const [availableCredits, setAvailableCredits] = useState<InvoicePayment[]>([])
  const [creditsLoading, setCreditsLoading]     = useState(false)
  const [applyingCredit, setApplyingCredit]     = useState<string | null>(null)

  // Credit notes ledger (Adjustments tab)
  const [allCreditNotes, setAllCreditNotes]   = useState<InvoicePayment[]>([])
  const [cnLoading, setCnLoading]             = useState(false)

  // Dispute
  const [disputeTarget, setDisputeTarget]       = useState<InvoiceData | null>(null)
  const [disputeReason, setDisputeReason]       = useState('')
  const [disputing, setDisputing]               = useState(false)
  const [resolvingDispute, setResolvingDispute] = useState<string | null>(null)

  // Payment plan
  const [planTarget, setPlanTarget]         = useState<InvoiceData | null>(null)
  const [planInstallments, setPlanInstallments] = useState('3')
  const [planStart, setPlanStart]           = useState('')
  const [planNotes, setPlanNotes]           = useState('')
  const [creatingPlan, setCreatingPlan]     = useState(false)
  const [planResult, setPlanResult]         = useState<PaymentPlanData | null>(null)

  // Opening balances (Adjustments tab)
  const [openingBals, setOpeningBals]         = useState<OpeningBalance[]>([])
  const [obLoading, setObLoading]             = useState(false)
  const [showAddOb, setShowAddOb]             = useState(false)
  const [obCategory, setObCategory]           = useState<'WS' | 'SC'>('WS')
  const [obUnitLabel, setObUnitLabel]         = useState('')
  const [obUnitId, setObUnitId]               = useState('')
  const [obAmount, setObAmount]               = useState('')
  const [obNotes, setObNotes]                 = useState('')
  const [obSaving, setObSaving]               = useState(false)
  const [obError, setObError]                 = useState<string | null>(null)
  const [editOb, setEditOb]                   = useState<OpeningBalance | null>(null)
  const [editObAmount, setEditObAmount]       = useState('')
  const [editObNotes, setEditObNotes]         = useState('')

  // Reports tab
  const [reportTab, setReportTab]       = useState<'aged' | 'outstanding' | 'summary' | 'collection'>('aged')
  const [reportPeriod, setReportPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [agedData, setAgedData]               = useState<{ rows: AgedDebtorRow[]; summary: AgedDebtorSummary } | null>(null)
  const [summaryData, setSummaryData]         = useState<BillingSummary | null>(null)
  const [outstandingData, setOutstandingData] = useState<OutstandingBalanceRow[] | null>(null)
  const [collectionData, setCollectionData]   = useState<{ summary: CollectionSummary; rows: CollectionSummaryRow[] } | null>(null)
  const [reportLoading, setReportLoading]     = useState(false)

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

  // Fetch unallocated credits when an issued/partial invoice is selected
  useEffect(() => {
    if (!selected || !['issued', 'partial'].includes(selected.status)) {
      setAvailableCredits([])
      return
    }
    setCreditsLoading(true)
    getUnallocatedCredits(selected.unit_id, selected.category_code)
      .then(setAvailableCredits)
      .catch(() => setAvailableCredits([]))
      .finally(() => setCreditsLoading(false))
  }, [selected?.id, selected?.status]) // eslint-disable-line react-hooks/exhaustive-deps

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

  function openVoid(inv: InvoiceData) {
    setVoidTarget(inv)
    setVoidReason('')
    setVoidNotes('')
  }

  async function handleVoid() {
    if (!voidTarget || !voidReason) return
    setVoiding(true)
    setError(null)
    try {
      const updated = await requestVoidInvoice(voidTarget.id, { void_reason: voidReason, void_notes: voidNotes || undefined })
      setInvoices(prev => prev.map(i => i.id === voidTarget.id ? updated : i))
      if (selected?.id === voidTarget.id) setSelected(updated)
      setVoidTarget(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request void')
    } finally {
      setVoiding(false)
    }
  }

  async function handleApproveVoid(inv: InvoiceData) {
    setApprovingVoid(inv.id)
    setError(null)
    try {
      const updated = await approveVoidInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to approve void')
    } finally {
      setApprovingVoid(null)
    }
  }

  async function handleRejectVoid(inv: InvoiceData) {
    setRejectingVoid(true)
    setError(null)
    try {
      const updated = await rejectVoidInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
      setRejectVoidTarget(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reject void')
    } finally {
      setRejectingVoid(false)
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

  // ── Email invoice ────────────────────────────────────────────────────────

  async function handleSendEmail(inv: InvoiceData) {
    setEmailing(inv.id)
    setEmailMsg(null)
    setError(null)
    try {
      const res = await sendInvoiceEmail(inv.id)
      setEmailMsg(res.message)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setEmailing(null)
    }
  }

  // ── Late fees ─────────────────────────────────────────────────────────────

  async function handleApplyLateFees() {
    setLateFeeRunning(true); setError(null); setLateFeeResult(null)
    try {
      const result = await applyLateFees(parseFloat(latePct), !['Reports','Adjustments'].includes(activeTab) ? activeTab : undefined)
      setLateFeeResult(result)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to apply late fees')
    } finally {
      setLateFeeRunning(false)
    }
  }

  // ── Write-off ─────────────────────────────────────────────────────────────

  async function handleWriteOff() {
    if (!writeOffTarget) return
    setWritingOff(true)
    setError(null)
    try {
      const updated = await requestWriteOffInvoice(writeOffTarget.id, writeOffNotes || undefined)
      setInvoices(prev => prev.map(i => i.id === writeOffTarget.id ? updated : i))
      if (selected?.id === writeOffTarget.id) setSelected(updated)
      setWriteOffTarget(null)
      setWriteOffNotes('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to request write-off')
    } finally {
      setWritingOff(false)
    }
  }

  async function handleApproveWriteOff(inv: InvoiceData) {
    setApprovingWriteOff(inv.id)
    setError(null)
    try {
      const updated = await approveWriteOffInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to approve write-off')
    } finally {
      setApprovingWriteOff(null)
    }
  }

  async function handleRejectWriteOff(inv: InvoiceData) {
    setRejectingWriteOff(true)
    setError(null)
    try {
      const updated = await rejectWriteOffInvoice(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
      setRejectWriteOffTarget(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reject write-off')
    } finally {
      setRejectingWriteOff(false)
    }
  }

  // ── Dispute ───────────────────────────────────────────────────────────────

  async function handleDisputeInvoice() {
    if (!disputeTarget || !disputeReason.trim()) return
    setDisputing(true)
    setError(null)
    try {
      const updated = await disputeInvoice(disputeTarget.id, disputeReason)
      setInvoices(prev => prev.map(i => i.id === disputeTarget.id ? updated : i))
      if (selected?.id === disputeTarget.id) setSelected(updated)
      setDisputeTarget(null)
      setDisputeReason('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to flag dispute')
    } finally {
      setDisputing(false)
    }
  }

  async function handleResolveDispute(inv: InvoiceData) {
    setResolvingDispute(inv.id)
    setError(null)
    try {
      const updated = await resolveDispute(inv.id)
      setInvoices(prev => prev.map(i => i.id === inv.id ? updated : i))
      if (selected?.id === inv.id) setSelected(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resolve dispute')
    } finally {
      setResolvingDispute(null)
    }
  }

  // ── Payment plan ─────────────────────────────────────────────────────────

  async function handleCreatePlan() {
    if (!planTarget || parseInt(planInstallments) < 2 || !planStart) return
    setCreatingPlan(true)
    setError(null)
    try {
      const plan = await createPaymentPlan({
        unit_id:                planTarget.unit_id,
        unit_label:             planTarget.unit_label ?? undefined,
        person_id:              planTarget.person_id ?? undefined,
        person_name:            planTarget.person_name ?? undefined,
        person_email:           planTarget.person_email ?? undefined,
        person_phone:           planTarget.person_phone ?? undefined,
        invoice_id:             planTarget.id,
        total_amount:           planTarget.balance,
        number_of_installments: parseInt(planInstallments),
        start_date:             planStart,
        notes:                  planNotes || undefined,
      })
      setPlanResult(plan)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create payment plan')
    } finally {
      setCreatingPlan(false)
    }
  }

  // ── Bulk email ─────────────────────────────────────────────────────────────

  async function handleBulkEmail() {
    setBulkEmailing(true); setError(null); setBulkEmailResult(null)
    try {
      const result = await bulkEmailInvoices(bulkEmailPeriod, !['Reports','Adjustments'].includes(activeTab) ? activeTab : undefined)
      setBulkEmailResult(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk email failed')
    } finally {
      setBulkEmailing(false)
    }
  }

  // ── Disconnection notice ───────────────────────────────────────────────────

  async function handleSendNotice() {
    if (!disconnectTarget) return
    setSendingNotice(true)
    setError(null)
    try {
      const res = await sendInvoiceDisconnectionNotice(disconnectTarget.id, disconnectType)
      setEmailMsg(res.message)
      setDisconnectTarget(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send notice')
    } finally {
      setSendingNotice(false)
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  async function loadReport(tab: typeof reportTab, period?: string) {
    setReportLoading(true)
    const p = period ?? reportPeriod
    try {
      if (tab === 'aged')        setAgedData(await getAgedDebtors())
      if (tab === 'outstanding') setOutstandingData(await getOutstandingBalances())
      if (tab === 'summary')     setSummaryData(await getBillingSummary(p))
      if (tab === 'collection')  setCollectionData(await getCollectionSummary(p, activeTab !== 'Reports' ? activeTab : 'WS'))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setReportLoading(false)
    }
  }

  async function loadOpeningBalances() {
    setObLoading(true)
    try { setOpeningBals(await getOpeningBalances()) }
    catch { /* silent */ }
    finally { setObLoading(false) }
  }

  async function loadCreditNotes() {
    setCnLoading(true)
    try { setAllCreditNotes(await getAllCreditNotes()) }
    catch { /* silent */ }
    finally { setCnLoading(false) }
  }

  function switchReportTab(t: typeof reportTab) {
    setReportTab(t)
    loadReport(t)
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────

  const tabs: { code: 'WS' | 'SC' | 'OT' | 'Reports' | 'Adjustments'; label: string }[] = [
    { code: 'WS',          label: 'Water & Sewerage' },
    { code: 'SC',          label: 'Service Charge' },
    { code: 'OT',          label: 'Other Charges' },
    { code: 'Adjustments', label: 'Adjustments' },
    { code: 'Reports',     label: 'Reports' },
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
            onClick={() => {
              setActiveTab(t.code)
              if (t.code === 'Adjustments') { loadOpeningBalances(); loadCreditNotes() }
            }}
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
      {activeTab !== 'Reports' && activeTab !== 'Adjustments' && (
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
      )}

      {/* Toolbar */}
      {activeTab !== 'Reports' && activeTab !== 'Adjustments' && (
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
            { value: 'voided',      label: 'Voided' },
            { value: 'written_off', label: 'Written Off' },
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
        <Button variant="ghost" size="sm" onClick={() => { setShowLateModal(true); setLateFeeResult(null) }}>
          Late Fees
        </Button>
        {tabStats.drafts > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setShowBulkModal(true); setBulkResult(null) }}>
            Issue All Drafts ({tabStats.drafts})
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => { setShowBulkEmailModal(true); setBulkEmailResult(null) }}>
          Bulk Email
        </Button>
        {activeTab === 'SC' && (
          <Button variant="primary" size="sm" onClick={() => { setShowRunModal(true); setRunResult(null) }}>
            Run SC Billing
          </Button>
        )}
      </div>
      )}

      {/* Email success banner */}
      {emailMsg && (
        <div className="bg-success/10 text-success text-sm px-4 py-2 rounded-lg flex items-center justify-between">
          {emailMsg}
          <button onClick={() => setEmailMsg(null)} className="ml-4 font-medium hover:underline">Dismiss</button>
        </div>
      )}

      {/* Reports tab */}
      {activeTab === 'Reports' && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-surface-border dark:border-dark-border">
            {(['aged', 'outstanding', 'summary', 'collection'] as const).map(t => (
              <button
                key={t}
                onClick={() => switchReportTab(t)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  reportTab === t
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-text-muted hover:text-text'
                )}
              >
                {t === 'aged' ? 'Aged Debtors' : t === 'outstanding' ? 'Outstanding Balances' : t === 'summary' ? 'Billing Summary' : 'Collection'}
              </button>
            ))}
          </div>

          {reportLoading && <div className="text-center text-text-muted text-sm py-8">Loading report…</div>}

          {/* Aged Debtors */}
          {reportTab === 'aged' && !reportLoading && (
            <div className="space-y-4">
              {!agedData ? (
                <div className="text-center text-text-muted text-sm py-8">
                  <Button variant="primary" onClick={() => loadReport('aged')}>Load Aged Debtors Report</Button>
                </div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-4 gap-3">
                    {([['0-30 days', agedData.summary.total_0_30, 'text-warning'], ['31-60 days', agedData.summary.total_31_60, 'text-orange-500'], ['61-90 days', agedData.summary.total_61_90, 'text-danger'], ['90+ days', agedData.summary.total_90_plus, 'text-danger font-bold']] as const).map(([label, val, cls]) => (
                      <Card key={label} className="p-4">
                        <p className="text-xs text-text-muted mb-1">{label}</p>
                        <p className={cn('text-base font-semibold', cls)}>{fmt(val as number)}</p>
                      </Card>
                    ))}
                  </div>
                  <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide">
                          <th className="px-4 py-3 text-left">Statement</th>
                          <th className="px-4 py-3 text-left">Unit</th>
                          <th className="px-4 py-3 text-left">Person</th>
                          <th className="px-4 py-3 text-left">Due Date</th>
                          <th className="px-4 py-3 text-right">Days Overdue</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-center">Bucket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agedData.rows.map(row => (
                          <tr key={row.id} className="border-b border-surface-border dark:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-hover">
                            <td className="px-4 py-3 font-mono text-xs">{row.statement_no}</td>
                            <td className="px-4 py-3">{row.unit_label ?? '—'}</td>
                            <td className="px-4 py-3 text-text-muted">{row.person_name ?? '—'}</td>
                            <td className="px-4 py-3 text-text-muted">{fmtDate(row.due_date)}</td>
                            <td className={cn('px-4 py-3 text-right font-medium', row.days_overdue > 60 ? 'text-danger' : row.days_overdue > 30 ? 'text-orange-500' : 'text-warning')}>
                              {row.days_overdue}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-danger">{fmt(row.balance)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', row.bucket === '90+' ? 'bg-danger/10 text-danger' : row.bucket === '61-90' ? 'bg-orange-100 text-orange-700' : row.bucket === '31-60' ? 'bg-warning/10 text-warning' : 'bg-blue-50 text-blue-700')}>
                                {row.bucket}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {agedData.rows.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No outstanding invoices.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Card>
                  <div className="text-right text-sm font-semibold">
                    Grand Total Outstanding: <span className="text-danger">{fmt(agedData.summary.grand_total)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Outstanding Balances */}
          {reportTab === 'outstanding' && !reportLoading && (
            <div className="space-y-4">
              {!outstandingData ? (
                <div className="text-center text-text-muted text-sm py-8">
                  <Button variant="primary" onClick={() => loadReport('outstanding')}>Load Outstanding Balances</Button>
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide">
                        <th className="px-4 py-3 text-left">Unit</th>
                        <th className="px-4 py-3 text-left">Person</th>
                        <th className="px-4 py-3 text-right">Water & Sewerage</th>
                        <th className="px-4 py-3 text-right">Service Charge</th>
                        <th className="px-4 py-3 text-right">Other</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-left">Earliest Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outstandingData.map(row => (
                        <tr key={row.unit_id} className="border-b border-surface-border dark:border-dark-border hover:bg-surface-hover dark:hover:bg-dark-hover">
                          <td className="px-4 py-3 font-medium">{row.unit_label ?? '—'}</td>
                          <td className="px-4 py-3 text-text-muted">{row.person_name ?? '—'}</td>
                          <td className="px-4 py-3 text-right">{row.ws_balance > 0 ? fmt(row.ws_balance) : '—'}</td>
                          <td className="px-4 py-3 text-right">{row.sc_balance > 0 ? fmt(row.sc_balance) : '—'}</td>
                          <td className="px-4 py-3 text-right">{row.ot_balance > 0 ? fmt(row.ot_balance) : '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-danger">{fmt(row.total_balance)}</td>
                          <td className="px-4 py-3 text-text-muted">{fmtDate(row.earliest_due)}</td>
                        </tr>
                      ))}
                      {outstandingData.length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No outstanding balances.</td></tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {/* Billing Summary */}
          {reportTab === 'summary' && !reportLoading && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <label className="text-sm text-text-muted">Period</label>
                <input
                  type="month"
                  value={reportPeriod}
                  onChange={e => setReportPeriod(e.target.value)}
                  className="h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button variant="primary" size="sm" onClick={() => loadReport('summary', reportPeriod)}>
                  Load
                </Button>
              </div>
              {summaryData && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      ['Total Invoiced', summaryData.grand_invoiced, 'text-text'],
                      ['Total Paid', summaryData.grand_paid, 'text-success'],
                      ['Outstanding', summaryData.grand_outstanding, 'text-danger'],
                      ['Collection Rate', null, 'text-primary-600'],
                    ].map(([label, val, cls]) => (
                      <Card key={label as string} className="p-4">
                        <p className="text-xs text-text-muted mb-1">{label}</p>
                        <p className={cn('text-lg font-semibold', cls as string)}>
                          {label === 'Collection Rate'
                            ? `${summaryData.grand_collection_rate}%`
                            : fmt(val as number)}
                        </p>
                      </Card>
                    ))}
                  </div>
                  <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide">
                          <th className="px-4 py-3 text-left">Category</th>
                          <th className="px-4 py-3 text-right">Invoices</th>
                          <th className="px-4 py-3 text-right">Invoiced</th>
                          <th className="px-4 py-3 text-right">Paid</th>
                          <th className="px-4 py-3 text-right">Outstanding</th>
                          <th className="px-4 py-3 text-right">Collection %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryData.categories.filter(c => c.invoice_count > 0).map(cat => (
                          <tr key={cat.category_code} className="border-b border-surface-border dark:border-dark-border">
                            <td className="px-4 py-3 font-medium">{CATEGORY_LABELS[cat.category_code] ?? cat.category_code}</td>
                            <td className="px-4 py-3 text-right text-text-muted">{cat.invoice_count}</td>
                            <td className="px-4 py-3 text-right">{fmt(cat.invoiced)}</td>
                            <td className="px-4 py-3 text-right text-success">{fmt(cat.paid)}</td>
                            <td className="px-4 py-3 text-right text-danger">{fmt(cat.outstanding)}</td>
                            <td className="px-4 py-3 text-right font-medium">{cat.collection_rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Collection Summary */}
          {reportTab === 'collection' && !reportLoading && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm text-text-muted">Period</label>
                <input
                  type="month" value={reportPeriod}
                  onChange={e => setReportPeriod(e.target.value)}
                  className="h-8 px-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none"
                />
                {(['WS','SC','OT'] as const).map(cat => (
                  <button key={cat} onClick={async () => { setReportLoading(true); try { setCollectionData(await getCollectionSummary(reportPeriod, cat)) } catch { setError('Failed to load') } finally { setReportLoading(false) } }}
                    className="px-3 py-1 text-xs rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:bg-surface-hover dark:hover:bg-dark-hover">
                    {cat === 'WS' ? 'Water & Sewerage' : cat === 'SC' ? 'Service Charge' : 'Other'}
                  </button>
                ))}
                <Button size="sm" variant="outline" onClick={() => loadReport('collection')}>Load</Button>
              </div>
              {!collectionData ? (
                <div className="py-16 text-center text-text-muted text-sm">Select a period and category, then click Load.</div>
              ) : (
                <>
                  {/* KPI strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {([
                      ['Billed',       collectionData.summary.total_billed,      'text-text'],
                      ['Collected',    collectionData.summary.total_collected,   'text-success'],
                      ['Outstanding',  collectionData.summary.total_outstanding, 'text-danger'],
                      ['Collection %', null,                                     collectionData.summary.collection_rate >= 80 ? 'text-success' : collectionData.summary.collection_rate >= 50 ? 'text-warning' : 'text-danger'],
                    ] as const).map(([label, val, cls]) => (
                      <Card key={label} className="p-4">
                        <p className="text-xs text-text-muted mb-1">{label}</p>
                        <p className={cn('text-lg font-bold', cls)}>
                          {label === 'Collection %' ? `${collectionData.summary.collection_rate}%` : fmt(val as number)}
                        </p>
                      </Card>
                    ))}
                  </div>
                  {/* Status pills */}
                  <div className="flex gap-3 text-xs text-text-muted">
                    <span className="font-medium text-success">✓ {collectionData.summary.fully_paid} Paid</span>
                    <span className="font-medium text-warning">~ {collectionData.summary.partial} Partial</span>
                    <span className="font-medium text-danger">✗ {collectionData.summary.unpaid} Unpaid</span>
                    <span>({collectionData.summary.total_invoices} total)</span>
                  </div>
                  {/* Per-unit table */}
                  <Card className="overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide bg-slate-50 dark:bg-dark-card">
                          <th className="px-4 py-3 text-left">Unit</th>
                          <th className="px-4 py-3 text-left">Person</th>
                          <th className="px-4 py-3 text-left">Statement</th>
                          <th className="px-4 py-3 text-right">Billed</th>
                          <th className="px-4 py-3 text-right">Collected</th>
                          <th className="px-4 py-3 text-right">Outstanding</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collectionData.rows.map((r, i) => (
                          <tr key={r.id} className={cn('border-b border-surface-border dark:border-dark-border', i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-dark-card/20')}>
                            <td className="px-4 py-2.5 font-medium text-text">{r.unit_label ?? '—'}</td>
                            <td className="px-4 py-2.5 text-text-muted">{r.person_name ?? '—'}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{r.statement_no}</td>
                            <td className="px-4 py-2.5 text-right">{fmt(r.billed)}</td>
                            <td className="px-4 py-2.5 text-right text-success">{fmt(r.collected)}</td>
                            <td className={cn('px-4 py-2.5 text-right font-semibold', r.outstanding > 0 ? 'text-danger' : 'text-success')}>{fmt(r.outstanding)}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                          </tr>
                        ))}
                        {collectionData.rows.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-text-muted">No invoices for this period and category.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Adjustments tab */}
      {activeTab === 'Adjustments' && (
        <div className="space-y-6">

          {/* Opening Balances */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text">Opening Balances</h3>
                <p className="text-xs text-text-muted mt-0.5">Carry-forward balances applied once on the next issued invoice. Cannot be edited once applied.</p>
              </div>
              <div className="flex gap-2">
                <a
                  href="/api/backend/opening-balances/template"
                  download="opening-balances-template.xlsx"
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:text-text hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors"
                >
                  ↓ Template
                </a>
                <Button size="sm" variant="outline" onClick={() => { setShowAddOb(true); setObError(null); setObUnitLabel(''); setObUnitId(''); setObAmount(''); setObNotes(''); setObCategory('WS') }}>
                  + Add Balance
                </Button>
              </div>
            </div>
            <Card className="overflow-hidden p-0">
              {obLoading ? (
                <div className="py-10 text-center text-text-muted text-sm">Loading…</div>
              ) : openingBals.length === 0 ? (
                <div className="py-10 text-center text-text-muted text-sm">No opening balances on file.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide bg-slate-50 dark:bg-dark-card">
                      <th className="px-4 py-3 text-left">Unit</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">As Of</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                      <th className="px-4 py-3 text-left">Created By</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {openingBals.map((ob, i) => (
                      <tr key={ob.id} className={cn('border-b border-surface-border dark:border-dark-border', i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-dark-card/20')}>
                        <td className="px-4 py-2.5 font-medium text-text">{ob.unit_label ?? '—'}</td>
                        <td className="px-4 py-2.5 text-text-muted">{ob.category_code}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{fmt(ob.amount)}</td>
                        <td className="px-4 py-2.5 text-text-muted text-xs">{ob.as_of_date ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                            ob.status === 'active'  ? 'bg-success/10 text-success' :
                            ob.status === 'applied' ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' :
                            'bg-surface-border text-text-muted'
                          )}>
                            {ob.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-text-muted text-xs max-w-[160px] truncate">{ob.notes ?? '—'}</td>
                        <td className="px-4 py-2.5 text-text-muted text-xs">{ob.created_by ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {ob.status === 'active' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditOb(ob); setEditObAmount(String(ob.amount)); setEditObNotes(ob.notes ?? '') }}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                              >Edit</button>
                              <span className="text-text-muted">·</span>
                              <button
                                onClick={async () => {
                                  if (!confirm('Void this opening balance?')) return
                                  try { await voidOpeningBalance(ob.id); await loadOpeningBalances() }
                                  catch { setObError('Failed to void') }
                                }}
                                className="text-xs text-danger hover:underline"
                              >Void</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>

          {/* Credit Notes ledger */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-text">Unallocated Credit Notes</h3>
              <p className="text-xs text-text-muted mt-0.5">Credits issued via Credit Note that haven't been applied to an invoice yet.</p>
            </div>
            <Card className="overflow-hidden p-0">
              {cnLoading ? (
                <div className="py-10 text-center text-text-muted text-sm">Loading…</div>
              ) : allCreditNotes.length === 0 ? (
                <div className="py-10 text-center text-text-muted text-sm">No unallocated credit notes.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border dark:border-dark-border text-xs text-text-muted uppercase tracking-wide bg-slate-50 dark:bg-dark-card">
                      <th className="px-4 py-3 text-left">Unit</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                      <th className="px-4 py-3 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCreditNotes.map((note, i) => {
                      const unitLabel = invoices.find(inv => inv.unit_id === note.unit_id)?.unit_label ?? note.unit_id?.slice(0, 8) ?? '—'
                      return (
                        <tr key={note.id} className={cn('border-b border-surface-border dark:border-dark-border', i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-dark-card/20')}>
                          <td className="px-4 py-2.5 font-medium text-text">{unitLabel}</td>
                          <td className="px-4 py-2.5 text-text-muted">{note.category_code ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-success">{fmt(note.amount)}</td>
                          <td className="px-4 py-2.5 text-text-muted text-xs">{fmtDate(note.payment_date)}</td>
                          <td className="px-4 py-2.5 text-text-muted text-xs max-w-[200px] truncate">{note.notes ?? '—'}</td>
                          <td className="px-4 py-2.5 text-text-muted text-xs">{fmtDate(note.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Main area: list + detail panel */}
      {activeTab !== 'Reports' && activeTab !== 'Adjustments' && (
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
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <StatusBadge status={inv.status} />
                        {inv.disputed && !inv.dispute_resolved && (
                          <Badge variant="warning">Disputed</Badge>
                        )}
                      </div>
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
                            onClick={() => openVoid(inv)}
                          >
                            Request Void
                          </Button>
                        )}
                        {['issued', 'partial'].includes(inv.status) && (
                          <Button
                            size="sm" variant="danger"
                            disabled={actioning === inv.id}
                            onClick={(e) => { e.stopPropagation(); setWriteOffTarget(inv) }}
                          >
                            Write Off
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
                {selected.meter_reading_id && (
                  <>
                    <span className="text-text-muted">Source</span>
                    <span className="font-medium text-primary-600">From meter reading</span>
                  </>
                )}
              </div>

              {/* Void audit info */}
              {selected.status === 'voided' && (
                <div className="bg-danger/5 border border-danger/20 rounded-lg p-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-danger uppercase tracking-wide text-[10px]">Void Details</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <span className="text-text-muted">Reason</span>
                    <span className="font-medium capitalize">{selected.void_reason?.replace(/_/g, ' ') ?? '—'}</span>
                    <span className="text-text-muted">Voided By</span>
                    <span className="font-medium">{selected.voided_by ?? '—'}</span>
                    <span className="text-text-muted">Voided At</span>
                    <span className="font-medium">{selected.voided_at ? fmtDate(selected.voided_at) : '—'}</span>
                    {selected.void_notes && (
                      <>
                        <span className="text-text-muted">Notes</span>
                        <span className="font-medium">{selected.void_notes}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Void request pending */}
              {selected.status === 'void_requested' && (() => {
                const isChecker = ['facility_manager', 'finance_officer'].includes(subject.role)
                const isRequestor = selected.void_requested_by === subject.id
                const canCheck = isChecker && !isRequestor
                return (
                  <div className="border border-warning/40 bg-warning/5 rounded-lg p-3 space-y-2 text-xs">
                    <p className="font-semibold text-warning uppercase tracking-wide text-[10px]">Void Pending Approval</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <span className="text-text-muted">Requested By</span>
                      <span className="font-medium">{selected.void_requested_by_name ?? '—'}</span>
                      <span className="text-text-muted">Requested At</span>
                      <span className="font-medium">{selected.void_requested_at ? fmtDate(selected.void_requested_at) : '—'}</span>
                      <span className="text-text-muted">Reason</span>
                      <span className="font-medium capitalize">{selected.void_reason?.replace(/_/g, ' ') ?? '—'}</span>
                      {selected.void_notes && (
                        <>
                          <span className="text-text-muted">Notes</span>
                          <span className="font-medium">{selected.void_notes}</span>
                        </>
                      )}
                    </div>
                    {canCheck && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="danger" className="flex-1"
                          disabled={approvingVoid === selected.id}
                          onClick={() => handleApproveVoid(selected)}>
                          {approvingVoid === selected.id ? 'Approving…' : 'Approve Void'}
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1"
                          onClick={() => setRejectVoidTarget(selected)}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {!canCheck && (
                      <p className="text-text-muted italic">
                        {isRequestor
                          ? 'Awaiting approval from another authorised user.'
                          : 'Awaiting approval from Facility Manager or Finance Officer.'}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Write-off request pending */}
              {selected.status === 'write_off_requested' && (() => {
                const isChecker = ['facility_manager', 'finance_officer'].includes(subject.role)
                const isRequestor = selected.write_off_requested_by === subject.id
                const canCheck = isChecker && !isRequestor
                return (
                  <div className="border border-warning/40 bg-warning/5 rounded-lg p-3 space-y-2 text-xs">
                    <p className="font-semibold text-warning uppercase tracking-wide text-[10px]">Write-Off Pending Approval</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <span className="text-text-muted">Requested By</span>
                      <span className="font-medium">{selected.write_off_requested_by_name ?? '—'}</span>
                      <span className="text-text-muted">Requested At</span>
                      <span className="font-medium">{selected.write_off_requested_at ? fmtDate(selected.write_off_requested_at) : '—'}</span>
                      <span className="text-text-muted">Balance</span>
                      <span className="font-medium text-danger">{fmt(selected.balance)}</span>
                      {selected.write_off_request_notes && (
                        <>
                          <span className="text-text-muted">Notes</span>
                          <span className="font-medium">{selected.write_off_request_notes}</span>
                        </>
                      )}
                    </div>
                    {canCheck && (
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="danger" className="flex-1"
                          disabled={approvingWriteOff === selected.id}
                          onClick={() => handleApproveWriteOff(selected)}>
                          {approvingWriteOff === selected.id ? 'Approving…' : 'Approve Write-Off'}
                        </Button>
                        <Button size="sm" variant="ghost" className="flex-1"
                          onClick={() => setRejectWriteOffTarget(selected)}>
                          Reject
                        </Button>
                      </div>
                    )}
                    {!canCheck && (
                      <p className="text-text-muted italic">
                        {isRequestor
                          ? 'Awaiting approval from another authorised user.'
                          : 'Awaiting approval from Facility Manager or Finance Officer.'}
                      </p>
                    )}
                  </div>
                )
              })()}

              {/* Dispute info */}
              {selected.disputed && (
                <div className={cn(
                  'border rounded-lg p-3 space-y-2 text-xs',
                  selected.dispute_resolved
                    ? 'border-success/30 bg-success/5'
                    : 'border-warning/40 bg-warning/5'
                )}>
                  <p className={cn(
                    'font-semibold uppercase tracking-wide text-[10px]',
                    selected.dispute_resolved ? 'text-success' : 'text-warning'
                  )}>
                    {selected.dispute_resolved ? 'Dispute Resolved' : 'Invoice Disputed'}
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <span className="text-text-muted">Reason</span>
                    <span className="font-medium">{selected.dispute_reason ?? '—'}</span>
                    <span className="text-text-muted">Flagged By</span>
                    <span className="font-medium">{selected.disputed_by ?? '—'}</span>
                    <span className="text-text-muted">Flagged At</span>
                    <span className="font-medium">{selected.disputed_at ? fmtDate(selected.disputed_at) : '—'}</span>
                    {selected.dispute_resolved && (
                      <>
                        <span className="text-text-muted">Resolved By</span>
                        <span className="font-medium">{selected.dispute_resolved_by ?? '—'}</span>
                        <span className="text-text-muted">Resolved At</span>
                        <span className="font-medium">{selected.dispute_resolved_at ? fmtDate(selected.dispute_resolved_at) : '—'}</span>
                      </>
                    )}
                  </div>
                  {!selected.dispute_resolved && (
                    <Button size="sm" variant="ghost" className="w-full"
                      disabled={resolvingDispute === selected.id}
                      onClick={() => handleResolveDispute(selected)}>
                      {resolvingDispute === selected.id ? 'Resolving…' : 'Mark Resolved'}
                    </Button>
                  )}
                </div>
              )}

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

              {/* Available credits */}
              {['issued', 'partial'].includes(selected.status) && (
                <div className="border-t border-surface-border dark:border-dark-border pt-3 space-y-2">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Available Credits</p>
                  {creditsLoading ? (
                    <p className="text-xs text-text-muted">Loading…</p>
                  ) : availableCredits.length === 0 ? (
                    <p className="text-xs text-text-muted">No unallocated credits for this unit.</p>
                  ) : (
                    <div className="space-y-1">
                      {availableCredits.map(cr => (
                        <div key={cr.id} className="flex items-center justify-between bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                          <div className="text-xs">
                            <span className="font-semibold text-success">{fmt(cr.amount)}</span>
                            <span className="text-text-muted ml-2">{cr.notes ?? cr.payment_method}</span>
                            {cr.payment_date && <span className="text-text-muted ml-2">{fmtDate(cr.payment_date)}</span>}
                          </div>
                          <Button
                            size="sm" variant="ghost"
                            disabled={applyingCredit === cr.id}
                            onClick={async () => {
                              setApplyingCredit(cr.id)
                              try {
                                const updated = await applyCredit(selected.id, cr.id)
                                setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i))
                                setSelected(updated)
                                setAvailableCredits(prev => prev.filter(c => c.id !== cr.id))
                              } catch (e: unknown) {
                                setError(e instanceof Error ? e.message : 'Failed to apply credit')
                              } finally {
                                setApplyingCredit(null)
                              }
                            }}
                          >
                            {applyingCredit === cr.id ? 'Applying…' : 'Apply'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                    onClick={() => openVoid(selected)}
                  >
                    Request Void
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
                <a
                  href={`/api/backend/invoices/${selected.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border dark:border-dark-border text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  Download PDF
                </a>
                {selected.person_email && ['issued','partial'].includes(selected.status) && (
                  <Button
                    size="sm" variant="ghost"
                    disabled={emailing === selected.id}
                    onClick={() => handleSendEmail(selected)}
                  >
                    {emailing === selected.id ? 'Sending…' : 'Email'}
                  </Button>
                )}
                {selected.person_email && ['issued','partial'].includes(selected.status) && (
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => setDisconnectTarget(selected)}
                  >
                    Send Notice
                  </Button>
                )}
                {['issued', 'partial'].includes(selected.status) && (
                  <Button
                    size="sm" variant="danger"
                    disabled={actioning === selected.id}
                    onClick={() => setWriteOffTarget(selected)}
                  >
                    Write Off
                  </Button>
                )}
                {['issued', 'partial', 'paid'].includes(selected.status) && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { setCreditNoteTarget(selected); setCreditNoteAmount(''); setCreditNoteReason(''); setCreditSuccess(null) }}
                  >
                    Credit Note
                  </Button>
                )}
                {['issued', 'partial'].includes(selected.status) && !selected.disputed && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => { setDisputeTarget(selected); setDisputeReason('') }}
                  >
                    Flag Dispute
                  </Button>
                )}
                {['issued', 'partial'].includes(selected.status) && selected.balance > 0 && (
                  <Button
                    size="sm" variant="outline"
                    onClick={() => {
                      setPlanTarget(selected)
                      setPlanInstallments('3')
                      setPlanStart(new Date().toISOString().slice(0, 10))
                      setPlanNotes('')
                      setPlanResult(null)
                    }}
                  >
                    Payment Plan
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
      )}

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
                Generates a draft SC invoice per unit for the selected period.
                Units already billed for that period will be skipped.
              </p>
              <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-xs text-text-muted space-y-0.5">
                <p><span className="font-medium text-text">Cycle:</span> {
                  scCycle === 'monthly' ? 'Monthly' :
                  scCycle === 'quarterly' ? 'Quarterly (3 line items per invoice)' :
                  scCycle === 'semi_annual' ? 'Semi-Annual (6 line items per invoice)' :
                  'Annual (12 line items per invoice)'
                }</p>
                <p><span className="font-medium text-text">Due day:</span> {scDueDay}{scDueDay === 1 ? 'st' : scDueDay === 2 ? 'nd' : scDueDay === 3 ? 'rd' : 'th'} of the billing period</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Billing Period</label>
                <PeriodPicker cycle={scCycle} value={runPeriod} onChange={setRunPeriod} />
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
              {bulkResult.skipped > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">⚠ {bulkResult.skipped} draft{bulkResult.skipped !== 1 ? 's' : ''} skipped</p>
                  <p className="text-xs">These may have been blocked by the back-billing guard (unit already has a later issued invoice), or failed due to another validation error. Check server logs for details.</p>
                </div>
              )}
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

      {/* Void modal */}
      <Modal
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        title={`Request Void — ${voidTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {voidTarget && (
            <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Unit</span>
                <span>{voidTarget.unit_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Balance</span>
                <span className="font-semibold">{fmt(voidTarget.balance)}</span>
              </div>
            </div>
          )}

          {/* Payment warning */}
          {voidTarget && voidTarget.payments && voidTarget.payments.length > 0 && (
            <div className="bg-warning/10 text-warning text-xs rounded-lg px-3 py-2">
              This invoice has <strong>{voidTarget.payments.length}</strong> payment(s) totalling{' '}
              <strong>{fmt(voidTarget.paid_amount)}</strong>. They will be released to the unallocated pool for manual reallocation.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Void Reason *</label>
            <select
              value={voidReason}
              onChange={e => setVoidReason(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">— Select a reason —</option>
              <option value="reading_error">Reading Error</option>
              <option value="wrong_unit">Wrong Unit</option>
              <option value="duplicate">Duplicate Invoice</option>
              <option value="rate_error">Rate Error</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <textarea
              value={voidNotes}
              onChange={e => setVoidNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Describe the reason for voiding…"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button
              variant="danger" className="flex-1"
              disabled={voiding || !voidReason}
              onClick={handleVoid}
            >
              {voiding ? 'Requesting…' : 'Request Void'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject void modal */}
      <Modal
        open={!!rejectVoidTarget}
        onClose={() => setRejectVoidTarget(null)}
        title={`Reject Void — ${rejectVoidTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">
            Rejecting will restore the invoice to its previous status. The requestor will need to submit a new void request if needed.
          </p>
          {rejectVoidTarget && (
            <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Requested By</span>
                <span className="font-medium">{rejectVoidTarget.void_requested_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Reason</span>
                <span className="font-medium capitalize">{rejectVoidTarget.void_reason?.replace(/_/g, ' ')}</span>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setRejectVoidTarget(null)}>Cancel</Button>
            <Button
              variant="ghost" className="flex-1 border border-danger text-danger hover:bg-danger/5"
              disabled={rejectingVoid}
              onClick={() => rejectVoidTarget && handleRejectVoid(rejectVoidTarget)}
            >
              {rejectingVoid ? 'Rejecting…' : 'Reject Void Request'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Write-off modal (maker: request write-off) */}
      <Modal
        open={!!writeOffTarget}
        onClose={() => { setWriteOffTarget(null); setWriteOffNotes('') }}
        title={`Request Write-Off — ${writeOffTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="bg-warning/10 text-warning text-sm rounded-lg p-4">
            <p className="font-semibold mb-1">Request Write-Off</p>
            <p>This will submit a write-off request for approval. A second authorised user must approve before the balance is cleared.</p>
          </div>
          {writeOffTarget && (
            <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Unit</span>
                <span>{writeOffTarget.unit_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Balance to Write Off</span>
                <span className="font-semibold text-danger">{fmt(writeOffTarget.balance)}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reason / Notes (optional)</label>
            <textarea
              value={writeOffNotes}
              onChange={e => setWriteOffNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="e.g. Tenant vacated with unrecoverable debt, approved by management"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setWriteOffTarget(null); setWriteOffNotes('') }}>Cancel</Button>
            <Button variant="danger" className="flex-1" disabled={writingOff} onClick={handleWriteOff}>
              {writingOff ? 'Requesting…' : 'Request Write-Off'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject write-off modal */}
      <Modal
        open={!!rejectWriteOffTarget}
        onClose={() => setRejectWriteOffTarget(null)}
        title={`Reject Write-Off — ${rejectWriteOffTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">
            Rejecting will restore the invoice to its previous status.
          </p>
          {rejectWriteOffTarget && (
            <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Requested By</span>
                <span className="font-medium">{rejectWriteOffTarget.write_off_requested_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Balance</span>
                <span className="font-semibold text-danger">{fmt(rejectWriteOffTarget.balance)}</span>
              </div>
              {rejectWriteOffTarget.write_off_request_notes && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Notes</span>
                  <span className="font-medium">{rejectWriteOffTarget.write_off_request_notes}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setRejectWriteOffTarget(null)}>Cancel</Button>
            <Button
              variant="ghost" className="flex-1 border border-danger text-danger hover:bg-danger/5"
              disabled={rejectingWriteOff}
              onClick={() => rejectWriteOffTarget && handleRejectWriteOff(rejectWriteOffTarget)}
            >
              {rejectingWriteOff ? 'Rejecting…' : 'Reject Write-Off Request'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Email modal */}
      <Modal
        open={showBulkEmailModal}
        onClose={() => { setShowBulkEmailModal(false); setBulkEmailResult(null) }}
        title={`Bulk Email Invoices — ${!['Reports','Adjustments'].includes(activeTab) ? activeTab : 'All'}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {bulkEmailResult ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Done</p>
                <p>{bulkEmailResult.message}</p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => { setShowBulkEmailModal(false); setBulkEmailResult(null) }}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                {activeTab === 'SC'
                  ? <>Send SC invoice emails to all <strong>owners</strong> with issued or partial invoices for the selected period. A PDF with monthly breakdown will be attached.</>
                  : <>Send invoice emails to all tenants with <strong>issued or partial</strong> invoices for the selected period. A PDF attachment will be included.</>
                } Invoices without an email address will be skipped.
              </p>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Billing Period</label>
                {activeTab === 'SC'
                  ? <PeriodPicker cycle={scCycle} value={bulkEmailPeriod} onChange={setBulkEmailPeriod} />
                  : <input
                      type="month"
                      value={bulkEmailPeriod}
                      onChange={e => setBulkEmailPeriod(e.target.value)}
                      className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                }
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowBulkEmailModal(false)}>Cancel</Button>
                <Button
                  variant="primary" className="flex-1"
                  disabled={bulkEmailing || !bulkEmailPeriod}
                  onClick={handleBulkEmail}
                >
                  {bulkEmailing ? 'Sending…' : `Send for ${bulkEmailPeriod}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Disconnection Notice modal */}
      <Modal
        open={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        title={`Send Notice — ${disconnectTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">
            Send a disconnection notice email to <strong>{disconnectTarget?.person_name}</strong> at{' '}
            <span className="font-mono text-xs">{disconnectTarget?.person_email}</span>.
          </p>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">Notice Type</label>
            <div className="flex gap-2">
              {(['reminder', 'formal'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setDisconnectType(t)}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-lg border transition-colors',
                    disconnectType === t
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'border-surface-border dark:border-dark-border text-text-muted hover:text-text'
                  )}
                >
                  {t === 'reminder' ? '🔔 Payment Reminder' : '⚠️ Formal Notice'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setDisconnectTarget(null)}>Cancel</Button>
            <Button
              variant="primary" className="flex-1"
              disabled={sendingNotice}
              onClick={handleSendNotice}
            >
              {sendingNotice ? 'Sending…' : 'Send Notice'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Late Fees modal */}
      <Modal
        open={showLateModal}
        onClose={() => { setShowLateModal(false); setLateFeeResult(null) }}
        title="Apply Late Payment Fees"
        size="sm"
      >
        <div className="p-5 space-y-4">
          {lateFeeResult ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Done</p>
                <p>{lateFeeResult.message}</p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => { setShowLateModal(false); setLateFeeResult(null) }}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                This will add a late payment fee charge to all overdue invoices (past their due date)
                {!['Reports','Adjustments'].includes(activeTab) ? ` in the ${activeTab} category` : ''}.
              </p>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Late Fee Percentage (%)</label>
                <input
                  type="number" min="0.1" max="50" step="0.1"
                  value={latePct}
                  onChange={e => setLatePct(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowLateModal(false)}>Cancel</Button>
                <Button
                  variant="danger" className="flex-1"
                  disabled={lateFeeRunning || !latePct || parseFloat(latePct) <= 0}
                  onClick={handleApplyLateFees}
                >
                  {lateFeeRunning ? 'Applying…' : `Apply ${latePct}% Late Fee`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Credit Note modal */}
      <Modal
        open={!!creditNoteTarget}
        onClose={() => { setCreditNoteTarget(null); setCreditSuccess(null) }}
        title={`Credit Note — ${creditNoteTarget?.unit_label ?? ''} (${creditNoteTarget?.category_code ?? ''})`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {creditSuccess ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Credit note issued</p>
                <p>{creditSuccess}</p>
                <p className="text-xs mt-1 opacity-80">The credit sits in the unit's unallocated pool. Apply it to the next invoice via the payment panel.</p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setCreditNoteTarget(null)}>Close</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-muted">
                Issues an unallocated credit for this unit. The credit can be applied to any outstanding invoice
                for <strong>{creditNoteTarget?.unit_label}</strong> in the <strong>{creditNoteTarget?.category_code}</strong> category.
              </p>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES)</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={creditNoteAmount}
                  onChange={e => setCreditNoteAmount(e.target.value)}
                  placeholder="e.g. 1500.00"
                  className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Reason</label>
                <input
                  type="text"
                  value={creditNoteReason}
                  onChange={e => setCreditNoteReason(e.target.value)}
                  placeholder="e.g. Meter over-read correction for June 2026"
                  className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setCreditNoteTarget(null)}>Cancel</Button>
                <Button
                  variant="primary" className="flex-1"
                  disabled={issuingCredit || !creditNoteAmount || !creditNoteReason || Number(creditNoteAmount) <= 0}
                  onClick={async () => {
                    if (!creditNoteTarget) return
                    setIssuingCredit(true)
                    try {
                      await createCreditNote({
                        unitId:       creditNoteTarget.unit_id,
                        categoryCode: creditNoteTarget.category_code,
                        amount:       Number(creditNoteAmount),
                        reason:       creditNoteReason,
                        referenceInvoiceId: creditNoteTarget.id,
                      })
                      setCreditSuccess(`KES ${Number(creditNoteAmount).toLocaleString()} credit created for ${creditNoteTarget.unit_label}.`)
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Failed to create credit note')
                      setCreditNoteTarget(null)
                    } finally {
                      setIssuingCredit(false)
                    }
                  }}
                >
                  {issuingCredit ? 'Issuing…' : 'Issue Credit Note'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Dispute modal */}
      <Modal
        open={!!disputeTarget}
        onClose={() => { setDisputeTarget(null); setDisputeReason('') }}
        title={`Flag Dispute — ${disputeTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <p className="text-sm text-text-muted">
            Marking this invoice as disputed will pause late fees until the dispute is resolved.
          </p>
          {disputeTarget && (
            <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Invoice</span>
                <span className="font-mono text-xs">{disputeTarget.statement_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Balance</span>
                <span className="font-semibold text-danger">{fmt(disputeTarget.balance)}</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Dispute Reason *</label>
            <textarea
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Describe the dispute (e.g. reading appears incorrect, charges not agreed…)"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setDisputeTarget(null); setDisputeReason('') }}>Cancel</Button>
            <Button
              variant="outline" className="flex-1 border-warning text-warning hover:bg-warning/5"
              disabled={disputing || !disputeReason.trim()}
              onClick={handleDisputeInvoice}
            >
              {disputing ? 'Flagging…' : 'Flag as Disputed'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Plan modal */}
      <Modal
        open={!!planTarget}
        onClose={() => { setPlanTarget(null); setPlanResult(null) }}
        title={`Payment Plan — ${planTarget?.statement_no ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {planResult ? (
            <div className="space-y-3">
              <div className="bg-success/10 text-success rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Payment Plan Created</p>
                <p>{planResult.installments.length} installments starting {fmtDate(planResult.installments[0]?.due_date ?? null)}.</p>
              </div>
              <div className="divide-y divide-surface-border dark:divide-dark-border">
                {planResult.installments.map(inst => (
                  <div key={inst.id} className="flex justify-between text-sm py-2">
                    <span className="text-text-muted">#{inst.installment_no} · {fmtDate(inst.due_date)}</span>
                    <span className="font-medium">{fmt(inst.amount)}</span>
                  </div>
                ))}
              </div>
              <Button variant="primary" className="w-full" onClick={() => { setPlanTarget(null); setPlanResult(null) }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              {planTarget && (
                <div className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total outstanding</span>
                    <span className="font-semibold text-danger">{fmt(planTarget.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Tenant</span>
                    <span>{planTarget.person_name ?? '—'}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Installments *</label>
                  <input
                    type="number" min="2" max="24" step="1"
                    value={planInstallments}
                    onChange={e => setPlanInstallments(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">First Due Date *</label>
                  <input
                    type="date"
                    value={planStart}
                    onChange={e => setPlanStart(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              {planTarget && parseInt(planInstallments) >= 2 && planTarget.balance > 0 && (
                <p className="text-xs text-text-muted bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg px-3 py-2">
                  ≈ {fmt(Math.ceil(planTarget.balance / parseInt(planInstallments)))} per installment (last may differ slightly)
                </p>
              )}
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
                <textarea
                  value={planNotes}
                  onChange={e => setPlanNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="e.g. Agreed with tenant on 25 Jun 2026"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setPlanTarget(null)}>Cancel</Button>
                <Button
                  variant="primary" className="flex-1"
                  disabled={creatingPlan || !planStart || parseInt(planInstallments) < 2}
                  onClick={handleCreatePlan}
                >
                  {creatingPlan ? 'Creating…' : `Create ${planInstallments}-Part Plan`}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add Opening Balance modal */}
      <Modal
        open={showAddOb}
        onClose={() => setShowAddOb(false)}
        title="Add Opening Balance"
        size="sm"
      >
        <div className="p-5 space-y-4">
          {obError && <div className="text-danger text-sm">{obError}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Category</label>
              <select value={obCategory} onChange={e => setObCategory(e.target.value as 'WS' | 'SC')}
                className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none">
                <option value="WS">Water & Sewerage</option>
                <option value="SC">Service Charge</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES)</label>
              <input type="number" min="0" step="0.01" value={obAmount} onChange={e => setObAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Unit Label</label>
            <input type="text" value={obUnitLabel} onChange={e => setObUnitLabel(e.target.value)}
              placeholder="e.g. A-101"
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none" />
            <p className="text-xs text-text-muted mt-1">Must match an existing unit label exactly.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <input type="text" value={obNotes} onChange={e => setObNotes(e.target.value)}
              placeholder="e.g. Balance brought forward from legacy system"
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAddOb(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1"
              disabled={obSaving || !obUnitLabel || !obAmount || Number(obAmount) < 0}
              onClick={async () => {
                setObSaving(true); setObError(null)
                try {
                  // Find unit by label via existing invoices as a proxy
                  const matchedInvoice = invoices.find(i => (i.unit_label ?? '').toLowerCase() === obUnitLabel.trim().toLowerCase())
                  if (!matchedInvoice) { setObError(`Unit "${obUnitLabel}" not found. Check the label and try again.`); return }
                  await createOpeningBalance({
                    unitId:       matchedInvoice.unit_id,
                    unitLabel:    matchedInvoice.unit_label ?? obUnitLabel,
                    categoryCode: obCategory,
                    amount:       Number(obAmount),
                    notes:        obNotes || undefined,
                  })
                  setShowAddOb(false)
                  await loadOpeningBalances()
                } catch (e) {
                  setObError(e instanceof Error ? e.message : 'Failed to save')
                } finally {
                  setObSaving(false)
                }
              }}
            >
              {obSaving ? 'Saving…' : 'Save Balance'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Opening Balance modal */}
      <Modal
        open={!!editOb}
        onClose={() => setEditOb(null)}
        title={`Edit Opening Balance — ${editOb?.unit_label ?? ''}`}
        size="sm"
      >
        <div className="p-5 space-y-4">
          {obError && <div className="text-danger text-sm">{obError}</div>}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES)</label>
            <input type="number" min="0" step="0.01" value={editObAmount} onChange={e => setEditObAmount(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <input type="text" value={editObNotes} onChange={e => setEditObNotes(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-text focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setEditOb(null)}>Cancel</Button>
            <Button variant="primary" className="flex-1"
              disabled={obSaving || !editObAmount || Number(editObAmount) < 0}
              onClick={async () => {
                if (!editOb) return
                setObSaving(true); setObError(null)
                try {
                  await updateOpeningBalance(editOb.id, { amount: Number(editObAmount), notes: editObNotes || undefined })
                  setEditOb(null)
                  await loadOpeningBalances()
                } catch (e) {
                  setObError(e instanceof Error ? e.message : 'Failed to update')
                } finally {
                  setObSaving(false)
                }
              }}
            >
              {obSaving ? 'Saving…' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
