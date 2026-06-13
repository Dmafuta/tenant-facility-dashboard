'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

// ── Shared primitives ──────────────────────────────────────────────────────

const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-text-muted/60'
const LABEL = 'block text-xs font-medium text-text-muted mb-1.5'

function Field({ label, required, optional, children }: {
  label: string; required?: boolean; optional?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className={LABEL}>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
        {optional && <span className="text-text-muted/60 ml-1 font-normal">(optional)</span>}
      </label>
      {children}
    </div>
  )
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted whitespace-nowrap">{title}</span>
      <div className="flex-1 h-px bg-surface-border dark:bg-dark-border" />
    </div>
  )
}

function FooterNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-2 border-t border-surface-border dark:border-dark-border">
      {children}
    </div>
  )
}

function ConfirmRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 border-b border-surface-border dark:border-dark-border last:border-b-0 text-sm">
      <span className="w-32 text-text-muted flex-shrink-0 text-xs pt-0.5">{label}</span>
      <span className={cn('text-xs font-medium flex-1', highlight ? 'text-warning' : 'text-text')}>{value}</span>
    </div>
  )
}

function ModeToggle({ modes, active, onChange }: {
  modes: { value: string; label: string; icon: string }[]
  active: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-1 p-1 bg-surface-muted dark:bg-dark-hover rounded-lg">
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all',
            active === m.value
              ? 'bg-surface dark:bg-dark-card text-text shadow-sm'
              : 'text-text-muted hover:text-text'
          )}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
    </div>
  )
}

function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400">
      {children}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. Tenant Exit Modal — Move Out or Unit Transfer
// ═══════════════════════════════════════════════════════════════════════════

const TODAY = new Date().toISOString().slice(0, 10)

const HANDBACK_CONDITIONS = [
  { value: 'good',   label: 'Good condition — no deductions' },
  { value: 'minor',  label: 'Minor defects — small deduction likely' },
  { value: 'major',  label: 'Significant damage — major deduction' },
]

export function TenantExitModal({ open, onClose, personName, currentUnit }: {
  open: boolean
  onClose: () => void
  personName: string
  currentUnit: string
}) {
  const [mode, setMode]   = useState<'move_out' | 'transfer'>('move_out')
  const [step, setStep]   = useState(0)

  const [moveOut, setMoveOut] = useState({
    exit_date: TODAY, condition: 'good', keys_returned: 'true',
    deposit_deduction: '0', notes: '',
  })
  const [transfer, setTransfer] = useState({
    transfer_date: TODAY, destination_unit: '', reason: '',
  })

  const setMO = (k: keyof typeof moveOut) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setMoveOut(f => ({ ...f, [k]: e.target.value }))
  const setTR = (k: keyof typeof transfer) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setTransfer(f => ({ ...f, [k]: e.target.value }))

  function reset() {
    setMode('move_out'); setStep(0)
    setMoveOut({ exit_date: TODAY, condition: 'good', keys_returned: 'true', deposit_deduction: '0', notes: '' })
    setTransfer({ transfer_date: TODAY, destination_unit: '', reason: '' })
  }

  const canProceedMO    = !!moveOut.exit_date
  const canProceedTR    = !!transfer.transfer_date && !!transfer.destination_unit
  const conditionLabel  = HANDBACK_CONDITIONS.find(c => c.value === moveOut.condition)?.label ?? ''
  const deduction       = Number(moveOut.deposit_deduction)

  function handleSubmit() {
    if (mode === 'move_out') {
      alert(`Move Out confirmed for ${personName} from ${currentUnit} on ${moveOut.exit_date}. Lease closed, access revoked, unit marked Vacant.`)
    } else {
      alert(`Transfer confirmed: ${personName} moving from ${currentUnit} to ${transfer.destination_unit} on ${transfer.transfer_date}.`)
    }
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }}
      title={`Tenant Exit — ${personName}`} size="md">
      <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(100vh-12rem)]">

        <ModeToggle
          modes={[
            { value: 'move_out', label: 'Move Out', icon: '↩' },
            { value: 'transfer', label: 'Unit Transfer', icon: '↔' },
          ]}
          active={mode}
          onChange={v => { setMode(v as 'move_out' | 'transfer'); setStep(0) }}
        />

        {/* ── MOVE OUT ── */}
        {mode === 'move_out' && step === 0 && (
          <div className="space-y-4">
            <WarnBanner>
              This will close the active lease, revoke gate &amp; access credentials, and mark <strong>{currentUnit}</strong> as <strong>Vacant</strong>.
            </WarnBanner>

            <SectionDivider title="Exit Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Move-out Date" required>
                <input className={INPUT} type="date" value={moveOut.exit_date} onChange={setMO('exit_date')} />
              </Field>
              <Field label="Keys Returned">
                <select className={INPUT} value={moveOut.keys_returned} onChange={setMO('keys_returned')}>
                  <option value="true">Yes — all keys handed over</option>
                  <option value="false">No — keys outstanding</option>
                </select>
              </Field>
            </div>

            <Field label="Unit Handback Condition" required>
              <select className={INPUT} value={moveOut.condition} onChange={setMO('condition')}>
                {HANDBACK_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>

            <SectionDivider title="Deposit Reconciliation" />
            <Field label="Deposit Deduction (KES)" optional>
              <input className={INPUT} type="number" min="0" value={moveOut.deposit_deduction} onChange={setMO('deposit_deduction')}
                placeholder="0 = full deposit refunded" />
            </Field>

            <Field label="Notes / Handover Notes" optional>
              <textarea className={cn(INPUT, 'resize-none h-20')} value={moveOut.notes} onChange={setMO('notes')}
                placeholder="Any issues, outstanding items, meter readings taken…" />
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceedMO}>Next: Confirm →</Button>
            </FooterNav>
          </div>
        )}

        {mode === 'move_out' && step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Tenant"         value={personName} />
              <ConfirmRow label="Current Unit"   value={currentUnit} />
              <ConfirmRow label="Move-out Date"  value={moveOut.exit_date} />
              <ConfirmRow label="Condition"      value={conditionLabel} />
              <ConfirmRow label="Keys Returned"  value={moveOut.keys_returned === 'true' ? 'Yes' : 'No — outstanding'} />
              <ConfirmRow label="Deposit Deduct" value={deduction > 0 ? `KES ${deduction.toLocaleString()}` : 'None — full refund'} />
              {moveOut.notes && <ConfirmRow label="Notes" value={moveOut.notes} />}
            </div>
            <WarnBanner>
              ⚠ After confirming: active lease will be <strong>closed</strong>, gate &amp; portal access will be <strong>revoked</strong>, and the unit will be marked <strong>Vacant</strong>. This cannot be undone without creating a new lease.
            </WarnBanner>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Confirm Move Out</Button>
            </FooterNav>
          </div>
        )}

        {/* ── UNIT TRANSFER ── */}
        {mode === 'transfer' && step === 0 && (
          <div className="space-y-4">
            <WarnBanner>
              The current lease on <strong>{currentUnit}</strong> will close and a new lease will open on the destination unit. Access credentials update automatically.
            </WarnBanner>

            <SectionDivider title="Transfer Details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Transfer Date" required>
                <input className={INPUT} type="date" value={transfer.transfer_date} onChange={setTR('transfer_date')} />
              </Field>
              <Field label="Destination Unit" required>
                <select className={INPUT} value={transfer.destination_unit} onChange={setTR('destination_unit')}>
                  <option value="">Select unit…</option>
                  <option value="Block A — 102">Block A — 102</option>
                  <option value="Block A — 103">Block A — 103</option>
                  <option value="Block B — 201">Block B — 201</option>
                  <option value="Block B — 205">Block B — 205</option>
                  <option value="Block C — 301">Block C — 301</option>
                </select>
              </Field>
            </div>
            <Field label="Reason for Transfer" optional>
              <input className={INPUT} value={transfer.reason} onChange={setTR('reason')} placeholder="e.g. Upgrading to larger unit" />
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceedTR}>Next: Confirm →</Button>
            </FooterNav>
          </div>
        )}

        {mode === 'transfer' && step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Tenant"           value={personName} />
              <ConfirmRow label="From Unit"         value={currentUnit} highlight />
              <ConfirmRow label="To Unit"           value={transfer.destination_unit} highlight />
              <ConfirmRow label="Transfer Date"     value={transfer.transfer_date} />
              {transfer.reason && <ConfirmRow label="Reason" value={transfer.reason} />}
            </div>
            <WarnBanner>
              ⚠ Old lease on {currentUnit} will close on {transfer.transfer_date}. A new lease on {transfer.destination_unit} will open. Please update rent terms on the new lease.
            </WarnBanner>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Confirm Transfer</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Owner Exit Modal — Sell Unit or Transfer Ownership
// ═══════════════════════════════════════════════════════════════════════════

const TRANSFER_REASONS = [
  { value: 'gift',       label: 'Gift' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'family',     label: 'Family Transfer' },
  { value: 'trust',      label: 'Trust / Estate' },
  { value: 'other',      label: 'Other' },
]

export function OwnerExitModal({ open, onClose, personName, ownedUnitLabels }: {
  open: boolean
  onClose: () => void
  personName: string
  ownedUnitLabels: string[]
}) {
  const [mode, setMode] = useState<'sell' | 'transfer'>('sell')
  const [step, setStep] = useState(0)

  const [sell, setSell] = useState({
    sale_date: TODAY, unit: ownedUnitLabels[0] ?? '', sale_price: '', new_owner_name: '', notes: '',
  })
  const [xfer, setXfer] = useState({
    transfer_date: TODAY, unit: ownedUnitLabels[0] ?? '', reason: 'family', recipient_name: '', notes: '',
  })

  const setSE = (k: keyof typeof sell) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setSell(f => ({ ...f, [k]: e.target.value }))
  const setXF = (k: keyof typeof xfer) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setXfer(f => ({ ...f, [k]: e.target.value }))

  function reset() {
    setMode('sell'); setStep(0)
    setSell({ sale_date: TODAY, unit: ownedUnitLabels[0] ?? '', sale_price: '', new_owner_name: '', notes: '' })
    setXfer({ transfer_date: TODAY, unit: ownedUnitLabels[0] ?? '', reason: 'family', recipient_name: '', notes: '' })
  }

  const canProceedSell  = !!sell.sale_date && !!sell.unit && !!sell.new_owner_name
  const canProceedXfer  = !!xfer.transfer_date && !!xfer.unit && !!xfer.recipient_name
  const xferReasonLabel = TRANSFER_REASONS.find(r => r.value === xfer.reason)?.label ?? ''

  function handleSubmit() {
    if (mode === 'sell') {
      alert(`Sale confirmed: ${personName}'s ownership of ${sell.unit} transferred to ${sell.new_owner_name} on ${sell.sale_date}.`)
    } else {
      alert(`Ownership transfer confirmed: ${personName}'s ${xfer.unit} transferred to ${xfer.recipient_name} (${xferReasonLabel}).`)
    }
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }}
      title={`Ownership Exit — ${personName}`} size="md">
      <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(100vh-12rem)]">

        <ModeToggle
          modes={[
            { value: 'sell',     label: 'Sell Unit',          icon: '💰' },
            { value: 'transfer', label: 'Transfer Ownership',  icon: '🤝' },
          ]}
          active={mode}
          onChange={v => { setMode(v as 'sell' | 'transfer'); setStep(0) }}
        />

        {/* ── SELL ── */}
        {mode === 'sell' && step === 0 && (
          <div className="space-y-4">
            <WarnBanner>
              The owner's record will be archived. The new buyer must be registered separately to complete KYC. Title deed transfer is handled outside this system.
            </WarnBanner>

            <SectionDivider title="Sale Details" />
            {ownedUnitLabels.length > 1 && (
              <Field label="Unit Being Sold" required>
                <select className={INPUT} value={sell.unit} onChange={setSE('unit')}>
                  {ownedUnitLabels.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sale Date" required>
                <input className={INPUT} type="date" value={sell.sale_date} onChange={setSE('sale_date')} />
              </Field>
              <Field label="Sale Price (KES)" optional>
                <input className={INPUT} type="number" min="0" value={sell.sale_price} onChange={setSE('sale_price')}
                  placeholder="e.g. 8 500 000" />
              </Field>
            </div>

            <SectionDivider title="New Owner" />
            <Field label="New Owner Name" required>
              <input className={INPUT} value={sell.new_owner_name} onChange={setSE('new_owner_name')}
                placeholder="Full name of buyer — register separately for KYC" />
            </Field>
            <Field label="Notes" optional>
              <textarea className={cn(INPUT, 'resize-none h-16')} value={sell.notes} onChange={setSE('notes')}
                placeholder="Agent details, special conditions, payment terms…" />
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceedSell}>Next: Confirm →</Button>
            </FooterNav>
          </div>
        )}

        {mode === 'sell' && step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Current Owner"  value={personName} />
              <ConfirmRow label="Unit"           value={sell.unit} />
              <ConfirmRow label="Sale Date"      value={sell.sale_date} />
              <ConfirmRow label="Sale Price"     value={sell.sale_price ? `KES ${Number(sell.sale_price).toLocaleString()}` : 'Not recorded'} />
              <ConfirmRow label="New Owner"      value={sell.new_owner_name} highlight />
              {sell.notes && <ConfirmRow label="Notes" value={sell.notes} />}
            </div>
            <WarnBanner>
              ⚠ {personName}'s ownership of <strong>{sell.unit}</strong> will be <strong>archived</strong>. Register <strong>{sell.new_owner_name}</strong> as a new owner to complete the transition.
            </WarnBanner>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Confirm Sale</Button>
            </FooterNav>
          </div>
        )}

        {/* ── TRANSFER ── */}
        {mode === 'transfer' && step === 0 && (
          <div className="space-y-4">
            <WarnBanner>
              Used for gifts, inheritance, family transfers, or trust arrangements. The recipient should be registered separately for KYC.
            </WarnBanner>

            <SectionDivider title="Transfer Details" />
            {ownedUnitLabels.length > 1 && (
              <Field label="Unit Being Transferred" required>
                <select className={INPUT} value={xfer.unit} onChange={setXF('unit')}>
                  {ownedUnitLabels.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Transfer Date" required>
                <input className={INPUT} type="date" value={xfer.transfer_date} onChange={setXF('transfer_date')} />
              </Field>
              <Field label="Reason" required>
                <select className={INPUT} value={xfer.reason} onChange={setXF('reason')}>
                  {TRANSFER_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Recipient Name" required>
              <input className={INPUT} value={xfer.recipient_name} onChange={setXF('recipient_name')}
                placeholder="Full name of recipient" />
            </Field>
            <Field label="Notes" optional>
              <textarea className={cn(INPUT, 'resize-none h-16')} value={xfer.notes} onChange={setXF('notes')}
                placeholder="Relationship to owner, legal reference, solicitor details…" />
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceedXfer}>Next: Confirm →</Button>
            </FooterNav>
          </div>
        )}

        {mode === 'transfer' && step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Current Owner"   value={personName} />
              <ConfirmRow label="Unit"            value={xfer.unit} />
              <ConfirmRow label="Transfer Date"   value={xfer.transfer_date} />
              <ConfirmRow label="Reason"          value={xferReasonLabel} />
              <ConfirmRow label="Recipient"       value={xfer.recipient_name} highlight />
              {xfer.notes && <ConfirmRow label="Notes" value={xfer.notes} />}
            </div>
            <WarnBanner>
              ⚠ {personName}'s ownership will be <strong>archived</strong>. Register <strong>{xfer.recipient_name}</strong> as a new owner to complete the transition and KYC.
            </WarnBanner>
            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ Confirm Transfer</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Staff Exit Modal — End Contract
// ═══════════════════════════════════════════════════════════════════════════

const EXIT_REASONS = [
  { value: 'natural_expiry',  label: 'Natural Expiry',            desc: 'Contract reached its end date' },
  { value: 'resignation',     label: 'Resignation',               desc: 'Staff member voluntarily left' },
  { value: 'mutual',          label: 'Mutual Agreement',          desc: 'Both parties agreed to end the contract' },
  { value: 'termination',     label: 'Disciplinary Termination',  desc: 'Contract ended due to conduct or performance' },
  { value: 'redundancy',      label: 'Redundancy',                desc: 'Role eliminated or restructured' },
  { value: 'retirement',      label: 'Retirement',                desc: 'Staff member is retiring' },
]

export function StaffExitModal({ open, onClose, personName, jobTitle, contractType }: {
  open: boolean
  onClose: () => void
  personName: string
  jobTitle: string
  contractType?: string
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    exit_date: TODAY,
    last_working_date: TODAY,
    reason: 'natural_expiry',
    handover_notes: '',
  })

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function reset() {
    setStep(0)
    setForm({ exit_date: TODAY, last_working_date: TODAY, reason: 'natural_expiry', handover_notes: '' })
  }

  const reasonInfo    = EXIT_REASONS.find(r => r.value === form.reason)!
  const isTermination = form.reason === 'termination'
  const canProceed    = !!form.exit_date && !!form.reason

  function handleSubmit() {
    alert(`Contract ended for ${personName} (${jobTitle}). Reason: ${reasonInfo.label}. Exit date: ${form.exit_date}. Gate access revoked.`)
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }}
      title={`End Contract — ${personName}`} size="md">
      <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(100vh-12rem)]">

        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted dark:bg-dark-hover border border-surface-border dark:border-dark-border">
              <span className="text-xl">👷</span>
              <div>
                <p className="text-sm font-semibold text-text">{personName}</p>
                <p className="text-xs text-text-muted">{jobTitle}{contractType ? ` · ${contractType}` : ''}</p>
              </div>
            </div>

            <SectionDivider title="Exit Reason" />
            <div className="space-y-2">
              {EXIT_REASONS.map(r => (
                <label key={r.value} className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  form.reason === r.value
                    ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-surface-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700'
                )}>
                  <input type="radio" name="exit_reason" value={r.value}
                    checked={form.reason === r.value}
                    onChange={set('reason')}
                    className="mt-0.5 accent-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-text">{r.label}</p>
                    <p className="text-xs text-text-muted">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {isTermination && (
              <div className="p-3 rounded-lg border border-danger/30 bg-danger/5 text-xs text-danger space-y-1">
                <p className="font-semibold">Disciplinary Termination</p>
                <p>Ensure a termination letter has been issued and all HR documentation is complete before proceeding. Consult legal if required.</p>
              </div>
            )}

            <SectionDivider title="Exit Dates" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Official Exit Date" required>
                <input className={INPUT} type="date" value={form.exit_date} onChange={set('exit_date')} />
              </Field>
              <Field label="Last Working Date" optional>
                <input className={INPUT} type="date" value={form.last_working_date} onChange={set('last_working_date')}
                  max={form.exit_date} />
              </Field>
            </div>

            <Field label="Handover Notes" optional>
              <textarea className={cn(INPUT, 'resize-none h-20')} value={form.handover_notes} onChange={set('handover_notes')}
                placeholder="Outstanding tasks, keys / equipment returned, replacement arranged…" />
            </Field>

            <FooterNav>
              <span />
              <Button onClick={() => setStep(1)} disabled={!canProceed}>Next: Confirm →</Button>
            </FooterNav>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-surface-border dark:border-dark-border overflow-hidden bg-surface dark:bg-dark-card">
              <ConfirmRow label="Staff Member"     value={personName} />
              <ConfirmRow label="Job Title"        value={jobTitle} />
              <ConfirmRow label="Exit Reason"      value={reasonInfo.label} highlight={isTermination} />
              <ConfirmRow label="Official Exit"    value={form.exit_date} />
              <ConfirmRow label="Last Working Day" value={form.last_working_date || form.exit_date} />
              {form.handover_notes && <ConfirmRow label="Handover Notes" value={form.handover_notes} />}
            </div>

            <WarnBanner>
              ⚠ On confirmation: gate &amp; portal access will be <strong>revoked on {form.exit_date}</strong>. The HR record will be archived as <strong>Former Staff</strong>. This action cannot be undone without HR manager intervention.
            </WarnBanner>

            {isTermination && (
              <div className="p-3 rounded-lg border border-danger/30 bg-danger/5 text-xs text-danger">
                Disciplinary termination — confirm all documentation is complete and signed.
              </div>
            )}

            <FooterNav>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={handleSubmit}>✓ End Contract</Button>
            </FooterNav>
          </div>
        )}
      </div>
    </Modal>
  )
}
