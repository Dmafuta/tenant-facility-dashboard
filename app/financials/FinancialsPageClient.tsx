'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { CanDo } from '@/components/ui/CanDo'
import { LEASES } from '@/lib/mock-data'
import type { ChargeType, ChargeStatus, BillingCycle, BillingRunItem } from '@/lib/types'
import { cn } from '@/lib/cn'
import { getAllCharges, recordPayment } from '@/lib/api/charges'
import type { ChargeData } from '@/lib/api/charges'
import { initiateStkPush, getMpesaTransactions, reconcileTransaction } from '@/lib/api/mpesa'
import type { MpesaTransactionData } from '@/lib/api/mpesa'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `KES ${n.toLocaleString()}`
}

function chargeTypeLabel(t: ChargeType): string {
  const MAP: Record<ChargeType, string> = {
    rent:                  'Rent',
    utility_water:         'Water',
    utility_water_sewer:   'Water & Sewer',
    utility_sewerage:      'Sewerage',
    utility_electricity:   'Electricity',
    utility_gas:           'Gas',
    utility_internet:      'Internet',
    utility_management_fee:'Utility Mgmt Fee',
    service_charge:        'Service Charge',
    advertisement:         'Advertisement',
    fine:                  'Fine',
    penalty:               'Penalty',
    deposit:               'Deposit',
    key_replacement:       'Key Replacement',
    other:                 'Other',
  }
  return MAP[t] ?? t
}

function chargeTypeGroup(t: ChargeType): string {
  if (t === 'rent') return 'rent'
  if (t.startsWith('utility')) return 'utility'
  if (t === 'service_charge') return 'service-charge'
  if (t === 'fine') return 'fine'
  if (t === 'penalty') return 'penalty'
  if (t === 'advertisement') return 'advertisement'
  if (t === 'deposit') return 'deposit'
  return 'other'
}

function statusBadge(s: string) {
  const MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending',  color: 'bg-warning/10 text-warning' },
    paid:    { label: 'Paid',     color: 'bg-success/10 text-success' },
    overdue: { label: 'Overdue',  color: 'bg-danger/10 text-danger' },
    waived:  { label: 'Waived',   color: 'bg-surface-border text-text-muted' },
    partial: { label: 'Partial',  color: 'bg-info/10 text-info' },
  }
  const { label, color } = MAP[s] ?? { label: s, color: '' }
  return <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', color)}>{label}</span>
}

function typeChip(t: string) {
  const group = chargeTypeGroup(t as ChargeType)
  const colorMap: Record<string, string> = {
    rent:           'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400',
    utility:        'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
    'service-charge':'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
    fine:           'bg-danger/10 text-danger',
    penalty:        'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    advertisement:  'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
    deposit:        'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    other:          'bg-surface-border text-text-muted',
  }
  return (
    <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', colorMap[group] ?? '')}>
      {chargeTypeLabel(t as ChargeType)}
    </span>
  )
}

// ── KPI card ───────────────────────────────────────────────────────────────

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-text-muted font-medium mb-1">{label}</p>
      <p className={cn('text-2xl font-bold', color ?? 'text-text')}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </Card>
  )
}

// ── Add Charge Modal ───────────────────────────────────────────────────────

const CHARGE_TYPES: ChargeType[] = [
  'rent','utility_water','utility_water_sewer','utility_sewerage','utility_electricity',
  'utility_gas','utility_internet','utility_management_fee','service_charge',
  'advertisement','fine','penalty','deposit','key_replacement','other',
]

function AddChargeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    unit_id: '', person_name: '', type: 'rent' as ChargeType,
    amount: '', due_date: '', period: '', description: '',
  })

  function handleSave() {
    // In production: POST to API
    alert('Charge created (demo — no persistence)')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Charge" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Unit</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. U-101"
              value={form.unit_id}
              onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Person / Tenant</label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Name"
              value={form.person_name}
              onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Charge Type</label>
          <select
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as ChargeType }))}
          >
            {CHARGE_TYPES.map(t => (
              <option key={t} value={t}>{chargeTypeLabel(t)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Amount (KES)</label>
            <input
              type="number"
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Billing Period</label>
            <input
              type="month"
              className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={form.period}
              onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Due Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Description (optional)</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave}>Create Charge</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Mark Paid Modal ────────────────────────────────────────────────────────

function MarkPaidModal({
  charge, open, onClose, onSaved,
}: { charge: ChargeData | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount]   = useState('')
  const [date,   setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [ref,    setRef]      = useState('')
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  if (!charge) return null
  const outstanding = charge.amount - (charge.paid_amount ?? 0)

  async function handleSave() {
    if (!charge) return
    const amt = parseFloat(amount || outstanding.toString())
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return }
    setSaving(true); setError('')
    try {
      await recordPayment(charge.unit_id, charge.id, {
        amount: amt,
        paid_date: date,
        receipt_no: ref || undefined,
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="sm">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-card text-sm">
          <p className="font-medium text-text">{charge.unit_label}</p>
          <p className="text-text-muted">{charge.person_name} · {chargeTypeLabel(charge.type as ChargeType)}</p>
          <p className="text-text mt-1">Outstanding: <span className="font-semibold text-danger">{fmt(outstanding)}</span></p>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Amount Received (KES)</label>
          <input
            type="number"
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder={outstanding.toString()}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Payment Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Reference / Receipt No.</label>
          <input
            className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. MPESA XXXXX"
            value={ref}
            onChange={e => setRef(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

const ALL_STATUSES = ['all', 'pending', 'overdue', 'partial', 'paid', 'waived'] as const
const ALL_TYPES    = ['all', 'rent', 'utility', 'service_charge', 'fine', 'penalty', 'advertisement', 'deposit', 'other'] as const


// ── Payments tab ──────────────────────────────────────────────────────────────

function payStatusBadge(s: string) {
  const MAP: Record<string, { label: string; classes: string }> = {
    pending:   { label: 'Pending',   classes: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
    failed:    { label: 'Failed',    classes: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500' },
  }
  const { label, classes } = MAP[s] ?? { label: s, classes: '' }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>{label}</span>
}

function StkPushModal({
  charge, open, onClose, onSent,
}: { charge: ChargeData | null; open: boolean; onClose: () => void; onSent?: () => void }) {
  const [phone,    setPhone]   = useState('')
  const [amount,   setAmount]  = useState('')
  const [loading,  setLoading] = useState(false)
  const [result,   setResult]  = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const outstanding = charge ? charge.amount - (charge.paid_amount ?? 0) : 0

  async function handleSend() {
    if (!charge) return
    const amt = parseFloat(amount) || outstanding
    if (amt <= 0) { setErrorMsg('Enter a valid amount.'); return }
    setLoading(true); setErrorMsg('')
    try {
      const res = await initiateStkPush({
        phone,
        amount: amt,
        charge_id: charge.id,
        unit_id: charge.unit_id,
        unit_label: charge.unit_label,
        person_name: charge.person_name,
        description: `Payment for ${charge.unit_label ?? charge.type}`,
      })
      if (res.accepted) {
        setResult('success')
        onSent?.()
      } else {
        setErrorMsg(res.customer_message ?? 'STK push was not accepted by Safaricom.')
        setResult('error')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to send STK push.')
      setResult('error')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setResult('idle'); setPhone(''); setAmount(''); setErrorMsg('')
    onClose()
  }

  if (!open || !charge) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">💚</span>
            <h3 className="text-sm font-semibold text-gray-900">M-Pesa STK Push</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {result === 'success' ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-semibold text-gray-900">Prompt sent to {phone}</p>
            <p className="text-xs text-gray-500">The tenant will receive a PIN prompt on their phone. The charge will be marked paid automatically once Safaricom confirms.</p>
            <button onClick={handleClose} className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Close</button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-sm">
              <p className="font-semibold text-green-900">{charge.unit_label} — {charge.person_name}</p>
              <p className="text-green-700">{fmt(outstanding)} outstanding</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Amount (KES)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={outstanding.toString()}
                min={1}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
              />
              <p className="text-xs text-gray-400">
                Outstanding: KES {outstanding.toLocaleString()} · Leave blank to charge full amount.
                {parseFloat(amount) > outstanding && (
                  <span className="ml-1 text-teal-600 font-medium">Excess will credit the next charge.</span>
                )}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Tenant M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
              />
              <p className="text-xs text-gray-400">A prompt for KES {(parseFloat(amount) || outstanding).toLocaleString()} will be sent to this number.</p>
            </div>
            {errorMsg && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{errorMsg}</p>}
            <button
              onClick={handleSend}
              disabled={loading || !phone.trim()}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Sending prompt…' : 'Send STK Push'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function UnmatchedC2bSection({
  transactions, charges, onReconciled,
}: {
  transactions: MpesaTransactionData[]
  charges: ChargeData[]
  onReconciled: () => void
}) {
  const unmatched = transactions.filter(
    p => p.status === 'completed' && p.transaction_type === 'c2b' && !p.charge_id
  )

  const [linking, setLinking]   = useState<Record<string, string>>({})   // txId → selected chargeId
  const [saving,  setSaving]    = useState<string | null>(null)           // txId being saved
  const [error,   setError]     = useState<string | null>(null)

  if (unmatched.length === 0) return null

  const unpaidCharges = charges.filter(c => c.status === 'pending' || c.status === 'overdue' || c.status === 'partial')

  async function handleLink(txId: string) {
    const chargeId = linking[txId]
    if (!chargeId) return
    setSaving(txId); setError(null)
    try {
      await reconcileTransaction(txId, chargeId)
      onReconciled()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to link transaction.')
    } finally { setSaving(null) }
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-orange-200">
        <span className="text-base">🔗</span>
        <h4 className="text-sm font-semibold text-orange-900 flex-1">
          Unmatched C2B Payments — Manual Reconciliation
        </h4>
        <span className="rounded-full bg-orange-100 border border-orange-200 px-2 py-0.5 text-xs font-medium text-orange-700">
          {unmatched.length} unmatched
        </span>
      </div>
      <p className="px-4 py-2 text-xs text-orange-700 border-b border-orange-100 bg-orange-50/60">
        These C2B payments arrived but couldn&apos;t be auto-matched to a unit. Select the correct charge and click Link.
      </p>
      <div className="divide-y divide-orange-100">
        {unmatched.map(p => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white hover:bg-orange-50/30">
            {/* Payment info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-gray-800">{p.mpesa_receipt || '—'}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="font-semibold text-gray-900">{fmt(Number(p.amount))}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">{p.phone}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                {p.bill_ref_number && (
                  <span>Typed account: <strong className="text-orange-700">&quot;{p.bill_ref_number}&quot;</strong></span>
                )}
                {p.person_name && <span>· {p.person_name}</span>}
                <span>· {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>
            {/* Charge picker */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={linking[p.id] ?? ''}
                onChange={e => setLinking(prev => ({ ...prev, [p.id]: e.target.value }))}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[200px]"
              >
                <option value="">— select charge to link —</option>
                {unpaidCharges.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.unit_label} · {c.person_name} · {fmt(c.amount - (c.paid_amount ?? 0))} ({c.type})
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleLink(p.id)}
                disabled={!linking[p.id] || saving === p.id}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-40"
              >
                {saving === p.id ? 'Linking…' : 'Link'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>
      )}
    </div>
  )
}

function PaymentsTabContent({
  transactions, charges, onRefresh,
}: {
  transactions: MpesaTransactionData[]
  charges: ChargeData[]
  onRefresh: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stkTarget, setStkTarget] = useState<ChargeData | null>(null)
  const [showStk, setShowStk] = useState(false)

  const filtered = useMemo(() => {
    return transactions.filter(p => statusFilter === 'all' || p.status === statusFilter)
  }, [transactions, statusFilter])

  const kpis = useMemo(() => {
    const completed     = transactions.filter(p => p.status === 'completed')
    const totalReceived = completed.reduce((s, p) => s + Number(p.amount), 0)
    const pending       = transactions.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)
    const unmatched     = transactions.filter(p => p.status === 'completed' && p.transaction_type === 'c2b' && !p.charge_id).length
    return { totalReceived, pending, unmatched, count: completed.length }
  }, [transactions])

  const unpaidCharges = charges.filter(c => c.status === 'pending' || c.status === 'overdue' || c.status === 'partial')

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Received"   value={fmt(kpis.totalReceived)}  color="text-success" sub="Confirmed payments" />
        <KPI label="Awaiting Confirm" value={fmt(kpis.pending)}        color="text-warning" sub="STK Push pending" />
        <KPI label="Unmatched C2B"    value={`${kpis.unmatched} txns`} color="text-danger"  sub="Needs reconciliation" />
        <KPI label="Transactions"     value={`${kpis.count} paid`}     sub="This period" />
      </div>

      {/* Send STK Push section */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💚</span>
          <h3 className="text-sm font-semibold text-gray-900">Send M-Pesa Payment Requests</h3>
          <span className="ml-1 text-xs text-gray-500">— trigger STK Push for outstanding charges</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-green-200">
                <th className="pb-2 pr-4 font-medium">Unit</th>
                <th className="pb-2 pr-4 font-medium">Tenant</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 pr-4 text-right font-medium">Outstanding</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {unpaidCharges.slice(0, 6).map(c => (
                <tr key={c.id} className="border-b border-green-100 last:border-0">
                  <td className="py-2 pr-4 font-medium text-gray-900">{c.unit_label}</td>
                  <td className="py-2 pr-4 text-gray-600">{c.person_name}</td>
                  <td className="py-2 pr-4 text-gray-500 text-xs">{c.description || chargeTypeLabel(c.type as ChargeType)}</td>
                  <td className="py-2 pr-4 text-right font-semibold text-red-600">
                    {fmt(c.amount - (c.paid_amount ?? 0))}
                  </td>
                  <td className="py-2 pr-4">{statusBadge(c.status)}</td>
                  <td className="py-2">
                    <button
                      onClick={() => { setStkTarget(c); setShowStk(true) }}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                    >
                      💚 STK Push
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmatched STK pushes */}
      {transactions.filter(p => p.status === 'pending' && !p.charge_id).length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span>⚠️</span>
            <h4 className="text-sm font-semibold text-amber-900">Pending STK Pushes — Awaiting Confirmation</h4>
          </div>
          {transactions.filter(p => p.status === 'pending' && !p.charge_id).map(p => (
            <div key={p.id} className="mt-2 flex items-center gap-3 rounded bg-white border border-amber-100 px-3 py-2 text-sm">
              <div className="flex-1">
                <span className="text-gray-600">{p.phone}</span>
                <span className="mx-2 text-gray-400">·</span>
                <span className="font-medium text-gray-900">{fmt(Number(p.amount))}</span>
                {p.unit_label && <><span className="mx-2 text-gray-400">·</span><span className="text-xs text-gray-500">{p.unit_label}</span></>}
              </div>
              <span className="text-xs text-amber-600">Awaiting PIN</span>
            </div>
          ))}
        </div>
      )}

      {/* Unmatched C2B — manual reconciliation */}
      <UnmatchedC2bSection
        transactions={transactions}
        charges={charges}
        onReconciled={onRefresh}
      />

      {/* Transactions ledger */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-900 flex-1">Transaction Ledger</h4>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Receipt / Ref</th>
                <th className="px-4 py-3 font-medium">Unit · Tenant</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3">
                    {p.mpesa_receipt ? (
                      <span className="font-mono text-xs font-semibold text-gray-800">{p.mpesa_receipt}</span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Pending</span>
                    )}
                    {p.checkout_request_id && (
                      <p className="text-[10px] text-gray-400 font-mono">{p.checkout_request_id.slice(-12)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.unit_label || '—'}</p>
                    <p className="text-xs text-gray-500">{p.person_name || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.transaction_type === 'c2b' ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-emerald-100 text-emerald-700">
                        💚 C2B Paybill
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">
                        📲 STK Push
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(Number(p.amount))}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">{payStatusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          {filtered.length} transactions · M-Pesa receipts auto-populated from Daraja callback
        </div>
      </div>

      <StkPushModal charge={stkTarget} open={showStk} onClose={() => setShowStk(false)} />
    </div>
  )
}


// ── Billing Cycle helpers ─────────────────────────────────────────────────────

const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly:     'Monthly',
  quarterly:   'Quarterly (3 months)',
  semi_annual: 'Semi-Annual (6 months)',
  annual:      'Annual',
}

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1, quarterly: 3, semi_annual: 6, annual: 12,
}

function cycleAmount(monthlyRent: number, cycle: BillingCycle): number {
  return monthlyRent * CYCLE_MONTHS[cycle]
}

function proRateAmount(monthlyRent: number, startDay: number): number {
  // Pro-rate: remaining days in month / 30
  const remaining = 30 - startDay + 1
  return Math.round((monthlyRent / 30) * remaining)
}

function RunBillingCycleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = new Date()
  const periodLabel = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const [generated, setGenerated] = useState(false)

  // Build preview items: active leases whose next_billing_date <= today
  const previewItems = useMemo((): BillingRunItem[] => {
    return (LEASES as (typeof LEASES[0])[])
      .filter(l => l.status === 'active' || l.status === 'notice_given')
      .map(l => {
        const cycle = l.billing_cycle ?? 'monthly'
        const amount = cycleAmount(l.monthly_rent, cycle)
        return {
          lease_id: l.id,
          unit_label: l.unit_label,
          tenant_name: l.tenant_name,
          charge_type: 'rent' as const,
          amount,
          period: periodLabel,
          pro_rated: false,
          billing_cycle: cycle,
        }
      })
  }, [periodLabel])

  const totalAmount = previewItems.reduce((s, i) => s + i.amount, 0)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Run Billing Cycle</h3>
            <p className="text-xs text-gray-500 mt-0.5">Period: <strong>{periodLabel}</strong> · {previewItems.length} leases due</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {!generated ? (
          <>
            {/* Billing cycle breakdown */}
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex gap-6 text-xs text-blue-700">
              {(['monthly', 'quarterly', 'semi_annual', 'annual'] as BillingCycle[]).map(c => {
                const count = previewItems.filter(i => i.billing_cycle === c).length
                if (!count) return null
                return <span key={c}><strong>{count}</strong> {CYCLE_LABELS[c]}</span>
              })}
            </div>

            {/* Preview table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-3 font-medium">Unit · Tenant</th>
                    <th className="px-4 py-3 font-medium">Billing Cycle</th>
                    <th className="px-4 py-3 font-medium">Monthly Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Charge Amount</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((item, i) => {
                    const lease = LEASES.find(l => l.id === item.lease_id)
                    return (
                      <tr key={item.lease_id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.unit_label}</p>
                          <p className="text-xs text-gray-500">{item.tenant_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.billing_cycle === 'monthly' ? 'bg-blue-100 text-blue-700' :
                            item.billing_cycle === 'quarterly' ? 'bg-purple-100 text-purple-700' :
                            item.billing_cycle === 'semi_annual' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {CYCLE_LABELS[item.billing_cycle]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">KES {lease?.monthly_rent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          KES {item.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {CYCLE_MONTHS[item.billing_cycle] > 1 && `×${CYCLE_MONTHS[item.billing_cycle]} months`}
                          {item.pro_rated && ' · pro-rated'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <p className="text-xs text-gray-500">Total charges to generate</p>
                <p className="text-lg font-bold text-gray-900">KES {totalAmount.toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
                <button
                  onClick={() => setGenerated(true)}
                  className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Generate {previewItems.length} Charges
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
            <div className="text-5xl">✅</div>
            <h4 className="text-base font-semibold text-gray-900">{previewItems.length} charges generated</h4>
            <p className="text-sm text-gray-500">
              KES {totalAmount.toLocaleString()} in charges created for period <strong>{periodLabel}</strong>.<br />
              Charges are now visible in the Charges tab. M-Pesa STK Push can be triggered per charge.
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setGenerated(false); onClose() }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => { setGenerated(false); onClose() }}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                💚 Send STK Push to All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function FinancialsPageClient() {
  const [activeTab, setActiveTab]      = useState<'charges' | 'payments'>('charges')
  const [showBillingCycle, setShowBillingCycle] = useState(false)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState<string>('all')
  const [typeFilter, setType]         = useState<string>('all')
  const [periodFilter, setPeriod]     = useState<string>('all')
  const [showAdd, setShowAdd]         = useState(false)
  const [payTarget, setPayTarget]     = useState<ChargeData | null>(null)
  const [showPay, setShowPay]         = useState(false)

  const [charges, setCharges]               = useState<ChargeData[]>([])
  const [transactions, setTransactions]     = useState<MpesaTransactionData[]>([])
  const [chargesLoading, setChargesLoading] = useState(true)

  const fetchCharges = useCallback(async () => {
    try {
      const data = await getAllCharges()
      setCharges(data)
    } catch { /* silently fail */ }
    finally { setChargesLoading(false) }
  }, [])

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await getMpesaTransactions()
      setTransactions(data)
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => { fetchCharges() }, [fetchCharges])
  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Unique periods for filter
  const periods = useMemo(() => {
    const set = new Set(charges.map(c => c.period).filter(Boolean) as string[])
    return ['all', ...Array.from(set).sort().reverse()]
  }, [charges])

  // Filtered charges
  const filtered = useMemo(() => {
    return charges.filter(c => {
      const q = search.toLowerCase()
      const matchSearch = !q || (c.unit_label ?? '').toLowerCase().includes(q) || (c.person_name ?? '').toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      const matchType   = typeFilter   === 'all' || c.type === typeFilter || (typeFilter === 'utility' && c.type.startsWith('utility'))
      const matchPeriod = periodFilter === 'all' || c.period === periodFilter
      return matchSearch && matchStatus && matchType && matchPeriod
    })
  }, [charges, search, statusFilter, typeFilter, periodFilter])

  // KPIs
  const kpis = useMemo(() => {
    const totalBilled    = charges.reduce((s, c) => s + c.amount, 0)
    const totalCollected = charges.reduce((s, c) => s + (c.paid_amount ?? 0), 0)
    const outstanding    = charges.filter(c => c.status !== 'paid' && c.status !== 'waived')
                                   .reduce((s, c) => s + (c.amount - (c.paid_amount ?? 0)), 0)
    const overdue        = charges.filter(c => c.status === 'overdue')
                                   .reduce((s, c) => s + (c.amount - (c.paid_amount ?? 0)), 0)
    return { totalBilled, totalCollected, outstanding, overdue }
  }, [charges])

  function openPay(c: ChargeData) {
    setPayTarget(c)
    setShowPay(true)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['charges', 'payments'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'charges' ? '📋 Charges' : '💚 Payments (M-Pesa)'}
          </button>
        ))}
      </div>

      {activeTab === 'payments' && (
        <PaymentsTabContent
          transactions={transactions}
          charges={charges}
          onRefresh={() => { fetchCharges(); fetchTransactions() }}
        />
      )}

      {activeTab === 'charges' && <>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Billed"    value={fmt(kpis.totalBilled)}    sub="All charge types" />
        <KPI label="Collected"       value={fmt(kpis.totalCollected)}  color="text-success" sub="Payments received" />
        <KPI label="Outstanding"     value={fmt(kpis.outstanding)}     color="text-warning" sub="Unpaid & partial" />
        <KPI label="Overdue"         value={fmt(kpis.overdue)}         color="text-danger"  sub="Past due date" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search unit, person, description…"
          className="w-64"
        />
        <Select
          value={statusFilter}
          onChange={setStatus}
          options={ALL_STATUSES.map(s => ({ value: s, label: s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1) }))}
          className="w-40"
        />
        <Select
          value={typeFilter}
          onChange={setType}
          options={ALL_TYPES.map(t => ({
            value: t,
            label: t === 'all' ? 'All Types' : t === 'utility' ? 'Utilities' : chargeTypeLabel(t as ChargeType),
          }))}
          className="w-44"
        />
        <Select
          value={periodFilter}
          onChange={setPeriod}
          options={periods.map(p => ({ value: p, label: p === 'all' ? 'All Periods' : p }))}
          className="w-36"
        />
        <div className="ml-auto flex gap-2">
          <CanDo action="export" resource={{ type: "charge" }}>
            <Button variant="outline" size="sm" onClick={() => alert('Export CSV (demo)')}>
              ↓ Export
            </Button>
          </CanDo>
          <CanDo action="charge.create" resource={{ type: "charge" }}>
            <Button variant="outline" size="sm" onClick={() => setShowBillingCycle(true)}>⚡ Run Billing Cycle</Button>
          </CanDo>
          <CanDo action="charge.create" resource={{ type: "charge" }}>
            <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Charge</Button>
          </CanDo>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap text-xs">
        {(['pending','overdue','partial','paid','waived'] as ChargeStatus[]).map(s => {
          const count = charges.filter(c => c.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatus(statusFilter === s ? 'all' : s)}
              className={cn(
                'px-3 py-1 rounded-full border font-medium transition-colors',
                statusFilter === s
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-surface-border dark:border-dark-border text-text-muted hover:border-primary-400 hover:text-primary-600'
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({count})
            </button>
          )
        })}
      </div>

      {/* Charges table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Unit / Person</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Paid</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Period</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Due Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-text-muted text-sm">
                    No charges match the current filters.
                  </td>
                </tr>
              ) : filtered.map((c, i) => {
                const outstanding = c.amount - (c.paid_amount ?? 0)
                const canPay = c.status !== 'paid' && c.status !== 'waived'
                return (
                  <tr
                    key={c.id}
                    className={cn(
                      'border-b border-surface-border dark:border-dark-border transition-colors hover:bg-surface-muted dark:hover:bg-dark-hover',
                      i === filtered.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{c.unit_label}</p>
                      <p className="text-xs text-text-muted">{c.person_name}</p>
                      {c.description && (
                        <p className="text-[11px] text-text-muted/70 truncate max-w-[200px]">{c.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{typeChip(c.type)}</td>
                    <td className="px-4 py-3 text-right font-medium text-text">{fmt(c.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-medium', (c.paid_amount ?? 0) > 0 ? 'text-success' : 'text-text-muted')}>
                        {fmt(c.paid_amount ?? 0)}
                      </span>
                      {outstanding > 0 && c.status !== 'waived' && (
                        <p className="text-[11px] text-danger">{fmt(outstanding)} left</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{c.period}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">{c.due_date}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canPay && (
                          <CanDo action="charge.create" resource={{ type: "charge" }}>
                            <button
                              onClick={() => openPay(c)}
                              className="text-xs px-2.5 py-1 rounded border border-surface-border dark:border-dark-border text-text-muted hover:border-primary-400 hover:text-primary-600 transition-colors"
                            >
                              Pay
                            </button>
                          </CanDo>
                        )}
                        <CanDo action="charge.waive" resource={{ type: "charge" }}>
                          {canPay && (
                            <button
                              onClick={() => alert('Waive (demo)')}
                              className="text-xs px-2.5 py-1 rounded border border-surface-border dark:border-dark-border text-text-muted hover:border-warning hover:text-warning transition-colors"
                            >
                              Waive
                            </button>
                          )}
                        </CanDo>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-surface-border dark:border-dark-border bg-surface-muted dark:bg-dark-card text-xs text-text-muted">
          {chargesLoading ? 'Loading…' : `Showing ${filtered.length} of ${charges.length} charges`}
        </div>
      </Card>

      {/* Modals */}
      <RunBillingCycleModal open={showBillingCycle} onClose={() => setShowBillingCycle(false)} />
      <AddChargeModal open={showAdd} onClose={() => setShowAdd(false)} />
      <MarkPaidModal  charge={payTarget} open={showPay} onClose={() => setShowPay(false)} onSaved={() => { fetchCharges(); setShowPay(false) }} />

      </>}
    </div>
  )
}
