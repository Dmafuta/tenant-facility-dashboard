'use client'
import React, { useState, useMemo } from 'react'
import { AlertTriangle, ShieldCheck, Check, Download, RefreshCw, Trash2, Clock, Lock, History, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { resetTestData, type ResetTestDataResult } from '@/lib/api/settings'

// ── Types ─────────────────────────────────────────────────────────────────────
type DangerImpact = 'reversible' | 'destructive' | 'catastrophic'

type DangerAction = {
  id: string
  title: string
  description: string
  impact: DangerImpact
  affects: string[]
  preserves?: string[]
  confirmPhrase: string
  buttonLabel: string
  requiresPassword?: boolean
  cooldownHours?: number
  temporary?: boolean
}

// ── Static action definitions ─────────────────────────────────────────────────
const DANGER_ACTIONS: DangerAction[] = [
  {
    id: 'clear_test',
    title: 'Clear all test data',
    description:
      'Permanently deletes meter readings, invoices, charges, payments and disconnection notices, then resets all meter baselines to zero. Meters, units, persons, leases and opening balances are kept.',
    impact: 'destructive',
    affects: [
      'invoice_payments',
      'disconnection_notices',
      'charges',
      'invoices',
      'meter_readings',
      'meter_type_history',
      'meters → last_reading & last_reading_date reset to NULL',
    ],
    confirmPhrase: 'CLEAR TEST DATA',
    buttonLabel: 'Clear test data…',
    temporary: true,
  },
  {
    id: 'reset_billing',
    title: 'Reset billing cycle',
    description:
      'Voids all draft invoices in the current cycle and rolls billing counters back to the start of the period. Posted and paid invoices are untouched.',
    impact: 'destructive',
    affects: ['draft invoices', 'billing counters', 'pending charges'],
    preserves: ['posted invoices', 'paid invoices', 'audit trail'],
    confirmPhrase: 'RESET CYCLE',
    buttonLabel: 'Reset current cycle…',
    cooldownHours: 24,
  },
  {
    id: 'purge_communications',
    title: 'Purge communication logs',
    description:
      'Deletes all sent emails, SMS, push and in-app notification records older than 24 hours. Delivery receipts and compliance archives are retained.',
    impact: 'destructive',
    affects: ['email_log', 'sms_log', 'push_log', 'inapp_log'],
    preserves: ['delivery_receipts', 'compliance_archive'],
    confirmPhrase: 'PURGE LOGS',
    buttonLabel: 'Purge logs…',
  },
  {
    id: 'rotate_secrets',
    title: 'Rotate all API keys & webhooks',
    description:
      'Invalidates every active API key and webhook signing secret. External integrations will fail until you update them with the new values.',
    impact: 'destructive',
    affects: ['api_keys', 'webhook_secrets', 'oauth_client_secrets'],
    confirmPhrase: 'ROTATE ALL',
    buttonLabel: 'Rotate all secrets…',
    requiresPassword: true,
  },
  {
    id: 'transfer_ownership',
    title: 'Transfer workspace ownership',
    description:
      'Assigns another administrator as the sole workspace owner. You will lose owner-level privileges immediately and cannot undo this action without their consent.',
    impact: 'catastrophic',
    affects: ['workspace_ownership', 'billing_contact'],
    confirmPhrase: 'TRANSFER OWNERSHIP',
    buttonLabel: 'Transfer ownership…',
    requiresPassword: true,
  },
  {
    id: 'delete_workspace',
    title: 'Delete workspace permanently',
    description:
      'Deletes this workspace, every property, every resident record, every document, every financial transaction and every user account tied to it. Backups are purged after 30 days. There is no recovery path after that window.',
    impact: 'catastrophic',
    affects: [
      'workspace',
      'all properties',
      'all users & residents',
      'all financial history',
      'all documents & media',
      'all integrations',
    ],
    confirmPhrase: 'DELETE GREAT WALL GARDENS',
    buttonLabel: 'Delete workspace…',
    requiresPassword: true,
    cooldownHours: 72,
  },
]

// ── DangerCard ────────────────────────────────────────────────────────────────
function DangerCard({ action, onTrigger }: { action: DangerAction; onTrigger: () => void }) {
  const impactMap = {
    reversible: {
      label: 'Reversible',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      accent: 'border-amber-300',
      icon: RefreshCw,
      iconTone: 'bg-amber-50 text-amber-700',
    },
    destructive: {
      label: 'Destructive',
      badge: 'bg-red-100 text-red-800 border-red-300',
      accent: 'border-red-300',
      icon: Trash2,
      iconTone: 'bg-red-50 text-red-700',
    },
    catastrophic: {
      label: 'Catastrophic',
      badge: 'bg-red-950 text-red-100 border-red-900',
      accent: 'border-red-500 ring-1 ring-red-500/20',
      icon: AlertTriangle,
      iconTone: 'bg-red-950 text-red-200',
    },
  } as const
  const meta = impactMap[action.impact]
  const Icon = meta.icon

  return (
    <div className={'relative rounded-lg border-2 bg-white dark:bg-dark-card overflow-hidden ' + meta.accent}>
      {action.impact === 'catastrophic' && (
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundImage: 'repeating-linear-gradient(180deg, #b91c1c 0 10px, #0a0a0a 10px 20px)' }}
        />
      )}
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={'grid size-10 shrink-0 place-items-center rounded-md ' + meta.iconTone}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-text">{action.title}</h3>
                <span className={'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' + meta.badge}>
                  {meta.label}
                </span>
                {action.temporary && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                    <Clock className="h-2.5 w-2.5" /> Temporary
                  </span>
                )}
                {action.requiresPassword && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-surface-border dark:border-dark-border bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                    <Lock className="h-2.5 w-2.5" /> Password required
                  </span>
                )}
                {action.cooldownHours && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-surface-border dark:border-dark-border bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted">
                    <Clock className="h-2.5 w-2.5" /> {action.cooldownHours}h cooldown
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-text-muted max-w-2xl leading-relaxed">{action.description}</p>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-800 mb-1">Will delete / reset</p>
                  <ul className="space-y-0.5">
                    {action.affects.map((x) => (
                      <li key={x} className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono">
                        <span className="inline-block h-1 w-1 rounded-full bg-red-600" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
                {action.preserves && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 mb-1">Preserves</p>
                    <ul className="space-y-0.5">
                      {action.preserves.map((x) => (
                        <li key={x} className="flex items-center gap-1.5 text-[11px] text-text-muted font-mono">
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onTrigger}
            className={
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ' +
              (action.impact === 'catastrophic'
                ? 'bg-red-950 text-red-50 hover:bg-black'
                : 'bg-red-600 text-white hover:bg-red-700')
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {action.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DangerConfirmDialog ───────────────────────────────────────────────────────
function DangerConfirmDialog({
  action,
  onClose,
  onConfirm,
}: {
  action: DangerAction
  onClose: () => void
  onConfirm: (result?: ResetTestDataResult) => void
}) {
  const [phrase, setPhrase]           = useState('')
  const [password, setPassword]       = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [count, setCount]             = useState(5)
  const [executing, setExecuting]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const phraseOk   = phrase.trim() === action.confirmPhrase
  const passwordOk = !action.requiresPassword || password.length >= 6
  const canConfirm = phraseOk && passwordOk && acknowledged && count === 0 && !executing

  // start countdown once on mount
  useMemo(() => {
    const iv = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(iv); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const catastrophic = action.impact === 'catastrophic'

  async function handleConfirm() {
    setExecuting(true)
    setError(null)
    try {
      if (action.id === 'clear_test') {
        const result = await resetTestData()
        onConfirm(result)
      } else {
        await new Promise((r) => setTimeout(r, 700))
        onConfirm()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
      setExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-dark-card">
        {/* Hazard stripe */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, #b91c1c 0 10px, #0a0a0a 10px 20px)' }}
          aria-hidden
        />

        {/* Header */}
        <div className={catastrophic ? 'bg-gradient-to-b from-red-950 to-neutral-950 text-red-50 p-5' : 'bg-red-50 p-5 border-b border-red-200'}>
          <div className="flex items-start gap-3">
            <div className={'grid size-10 shrink-0 place-items-center rounded-md ' + (catastrophic ? 'bg-red-500/20 ring-1 ring-red-400/40' : 'bg-red-100')}>
              <AlertTriangle className={'h-5 w-5 ' + (catastrophic ? 'text-red-300' : 'text-red-700')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={'text-base font-semibold ' + (catastrophic ? 'text-white' : 'text-red-900')}>{action.title}</p>
              <p className={'mt-1 text-xs ' + (catastrophic ? 'text-red-100/80' : 'text-red-800')}>
                This action cannot be undone. Read carefully before confirming.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50/50 p-3">
            <p className="text-xs font-semibold text-red-900 mb-1.5">You are about to permanently affect:</p>
            <ul className="space-y-0.5">
              {action.affects.map((x) => (
                <li key={x} className="flex items-center gap-1.5 text-[11px] text-red-950 font-mono">
                  <span className="inline-block h-1 w-1 rounded-full bg-red-600" />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-muted">
              Type <span className="font-mono font-bold text-red-700">{action.confirmPhrase}</span> to confirm
            </label>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={action.confirmPhrase}
              autoFocus
              className={
                'w-full px-3 py-2 rounded-lg border text-sm font-mono bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-red-500 ' +
                (phrase && !phraseOk ? 'border-red-400' : 'border-surface-border dark:border-dark-border')
              }
            />
          </div>

          {action.requiresPassword && (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-muted">Confirm with your password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface text-sm text-text focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          <label className="flex items-start gap-2 rounded-md border border-surface-border dark:border-dark-border bg-surface/60 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-surface-border"
            />
            <span className="text-xs text-text-muted">
              I understand this action is <strong className="text-red-700">{action.impact}</strong>,
              cannot be reversed from the interface, and will be permanently recorded in the audit trail under my account.
            </span>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-surface-border dark:border-dark-border bg-surface/60 p-4 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 ' +
              (catastrophic ? 'bg-red-950 text-red-50 hover:bg-black' : 'bg-red-600 text-white hover:bg-red-700')
            }
          >
            {executing ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Executing…</>
            ) : count > 0 ? (
              <>Confirm in {count}s</>
            ) : (
              <><AlertTriangle className="h-3.5 w-3.5" /> {action.buttonLabel.replace('…', '')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DangerSection ─────────────────────────────────────────────────────────────
export function DangerSection() {
  const [target, setTarget]     = useState<DangerAction | null>(null)
  const [resetResult, setResetResult] = useState<ResetTestDataResult | null>(null)

  function handleConfirm(result?: ResetTestDataResult) {
    if (result) setResetResult(result)
    setTarget(null)
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-red-50/40 via-white dark:via-dark-surface to-white dark:to-dark-surface">
      {/* Hazard stripe header */}
      <div
        className="h-2 w-full"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, #b91c1c 0 14px, #0a0a0a 14px 28px)' }}
        aria-hidden
      />

      <div className="p-6 space-y-6">
        {/* Danger banner */}
        <div className="relative overflow-hidden rounded-lg border border-red-900/20 bg-gradient-to-br from-red-950 via-red-900 to-neutral-950 text-red-50 shadow-lg shadow-red-950/20">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0 2px, transparent 2px 12px)' }}
          />
          <div className="relative flex items-start gap-4 p-5">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-red-500/20 ring-1 ring-red-400/40">
              <AlertTriangle className="h-5 w-5 text-red-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">Restricted Area</p>
                <span className="inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-200">
                  Owner-only
                </span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-white">Danger zone — irreversible operations</h2>
              <p className="mt-1 text-sm text-red-100/80 max-w-2xl">
                Actions in this area permanently alter or destroy customer data. They cannot be undone from the interface
                and may not be recoverable even from backups. Proceed only if you understand the consequences.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end text-right">
              <p className="text-[10px] font-mono uppercase tracking-widest text-red-300/70">Session</p>
              <p className="text-xs font-mono text-red-100">FA · facility_manager</p>
              <p className="mt-1 text-[10px] font-mono text-red-300/70">All actions logged</p>
            </div>
          </div>
        </div>

        {/* Pre-flight checklist */}
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Before you proceed</p>
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1 text-xs text-amber-900">
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3" /> Export a full backup</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3" /> Notify affected admins</li>
                <li className="flex items-center gap-1.5"><Check className="h-3 w-3" /> Confirm you are on the correct workspace</li>
              </ul>
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 text-sm font-medium transition-colors">
              <Download className="h-3.5 w-3.5" /> Export backup
            </button>
          </div>
        </div>

        {/* Reset result */}
        {resetResult && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm space-y-2">
            <p className="font-semibold text-emerald-800">Reset complete — all test data removed.</p>
            <ul className="text-xs text-emerald-900 space-y-0.5 list-disc list-inside">
              <li>{resetResult.invoice_payments_deleted} payments deleted</li>
              <li>{resetResult.disconnection_notices_deleted} disconnection notices deleted</li>
              <li>{resetResult.charges_deleted} charges deleted</li>
              <li>{resetResult.invoices_deleted} invoices deleted</li>
              <li>{resetResult.meter_readings_deleted} meter readings deleted</li>
              <li>{resetResult.meter_type_history_deleted} type history records deleted</li>
              <li>{resetResult.meters_baseline_reset} meter baselines reset</li>
            </ul>
          </div>
        )}

        {/* Danger action cards */}
        <div className="space-y-3">
          {DANGER_ACTIONS.map((a) => (
            <DangerCard key={a.id} action={a} onTrigger={() => setTarget(a)} />
          ))}
        </div>

        {/* Audit footer */}
        <div className="flex items-center justify-between rounded-md border border-surface-border dark:border-dark-border bg-surface px-4 py-3 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <History className="h-3.5 w-3.5" />
            <span>Every action here is recorded to the immutable audit trail.</span>
          </div>
          <a
            href="/audit-trail"
            className="inline-flex items-center gap-1 font-medium text-text hover:text-primary-600 transition-colors"
          >
            View audit log <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {target && (
        <DangerConfirmDialog
          action={target}
          onClose={() => setTarget(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
