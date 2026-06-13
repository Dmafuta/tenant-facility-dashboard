'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'

// ── Masking helpers ────────────────────────────────────────────────────────

/** +254712345678  →  +254 *** *** 678 */
export function maskPhone(phone: string): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return '*** *** ***'
  const last3 = digits.slice(-3)
  const prefix = phone.startsWith('+') ? phone.slice(0, 4) : phone.slice(0, 3)
  return `${prefix} *** *** ${last3}`
}

/** 12345678A  →  ******* 678A  (last 4 chars shown) */
export function maskNationalId(id: string): string {
  if (!id) return '—'
  if (id.length <= 4) return '****'
  const visible = id.slice(-4)
  return `${'*'.repeat(Math.max(id.length - 4, 3))} ${visible}`
}

/** P051234567X  →  ** *** *** 67X */
export function maskKraPin(pin: string): string {
  if (!pin) return '—'
  if (pin.length <= 3) return '****'
  const visible = pin.slice(-3)
  return `${'*'.repeat(Math.max(pin.length - 3, 4))} ${visible}`
}

export type MaskableFieldType = 'phone' | 'national_id' | 'kra_pin'

function applyMask(value: string, type: MaskableFieldType): string {
  if (type === 'phone')       return maskPhone(value)
  if (type === 'national_id') return maskNationalId(value)
  if (type === 'kra_pin')     return maskKraPin(value)
  return value
}

// ── MaskedField ────────────────────────────────────────────────────────────

interface MaskedFieldProps {
  value: string | undefined
  type: MaskableFieldType
  label?: string
  /** Called when the user clicks Reveal — parent opens OtpRevealModal */
  onReveal?: () => void
  /** If true, show the actual value (parent has verified OTP) */
  revealed?: boolean
  className?: string
}

export function MaskedField({
  value,
  type,
  label,
  onReveal,
  revealed = false,
  className,
}: MaskedFieldProps) {
  if (!value) return <span className="text-text-muted">—</span>

  const masked = applyMask(value, type)
  const display = revealed ? value : masked

  return (
    <span className={cn('inline-flex items-center gap-2 font-mono text-sm', className)}>
      <span className={revealed ? 'text-text' : 'text-text-muted tracking-wider'}>
        {display}
      </span>
      {onReveal && !revealed && (
        <button
          onClick={onReveal}
          className="text-[11px] font-medium font-sans text-primary-600 hover:underline flex-shrink-0 leading-none"
          title="Reveal — requires OTP"
        >
          Reveal
        </button>
      )}
      {revealed && (
        <span className="text-[10px] font-sans text-success font-medium flex items-center gap-0.5">
          🔓 Revealed
        </span>
      )}
    </span>
  )
}

// ── OtpRevealModal ─────────────────────────────────────────────────────────

interface OtpRevealModalProps {
  open: boolean
  onClose: () => void
  /** What field is being revealed, shown in the modal title */
  fieldType: MaskableFieldType
  /** Whose data (name shown in modal) */
  subjectName: string
  /** Phone to send the OTP to (the requesting admin's own verified phone) */
  requesterPhone: string
  /** Called when OTP is successfully verified — parent shows actual value */
  onVerified: () => void
}

const FIELD_LABEL: Record<MaskableFieldType, string> = {
  phone:       'Phone Number',
  national_id: 'National ID',
  kra_pin:     'KRA PIN',
}

export function OtpRevealModal({
  open,
  onClose,
  fieldType,
  subjectName,
  requesterPhone,
  onVerified,
}: OtpRevealModalProps) {
  const [stage, setStage]     = useState<'idle' | 'sending' | 'entry' | 'verifying' | 'success'>('idle')
  const [code, setCode]       = useState('')
  const [error, setError]     = useState('')
  const [countdown, setCountdown] = useState(0)
  const [resendCd, setResendCd]   = useState(0)

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setStage('idle')
      setCode('')
      setError('')
      setCountdown(0)
    }
  }, [open])

  // Auto-send OTP when modal opens
  useEffect(() => {
    if (open && stage === 'idle') handleSend()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Reveal auto-hides after 30s
  useEffect(() => {
    if (stage === 'success') {
      setCountdown(30)
      const t = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(t); onClose(); return 0 }
          return c - 1
        })
      }, 1000)
      return () => clearInterval(t)
    }
  }, [stage, onClose])

  // Resend cooldown
  useEffect(() => {
    if (resendCd > 0) {
      const t = setTimeout(() => setResendCd(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendCd])

  function handleSend() {
    setStage('sending')
    setError('')
    // In production: POST /api/otp/send { phone: requesterPhone, purpose: 'reveal_*' }
    setTimeout(() => {
      setStage('entry')
      setResendCd(60)
    }, 900)
  }

  function handleVerify() {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return }
    setStage('verifying')
    setError('')
    // In production: POST /api/otp/verify { code, purpose }
    // Demo: accept any 6-digit code
    setTimeout(() => {
      if (code === '000000') {
        setError('Invalid code. Try again.')
        setStage('entry')
        setCode('')
      } else {
        setStage('success')
        onVerified()
      }
    }, 800)
  }

  if (!open) return null

  const maskedRequesterPhone = maskPhone(requesterPhone)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-sm p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-text">
              Reveal {FIELD_LABEL[fieldType]}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {subjectName}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
        </div>

        {/* Sending */}
        {stage === 'sending' && (
          <div className="py-6 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-text-muted">Sending OTP to {maskedRequesterPhone}…</p>
          </div>
        )}

        {/* Code entry */}
        {stage === 'entry' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              🔒 A 6-digit code was sent to <strong>{maskedRequesterPhone}</strong>.
              This reveal will be logged.
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Enter 6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                placeholder="000000"
                autoFocus
                className="w-full px-4 py-3 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {error && <p className="text-xs text-danger mt-1">{error}</p>}
            </div>

            <button
              onClick={handleVerify}
              disabled={code.length !== 6}
              className="w-full py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify & Reveal
            </button>

            <div className="text-center">
              <button
                onClick={() => { setCode(''); handleSend() }}
                disabled={resendCd > 0}
                className="text-xs text-text-muted hover:text-text disabled:opacity-40"
              >
                {resendCd > 0 ? `Resend in ${resendCd}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {/* Verifying */}
        {stage === 'verifying' && (
          <div className="py-6 text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-text-muted">Verifying…</p>
          </div>
        )}

        {/* Success */}
        {stage === 'success' && (
          <div className="py-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto text-2xl">✓</div>
            <p className="text-sm font-medium text-text">Identity verified</p>
            <p className="text-xs text-text-muted">
              {FIELD_LABEL[fieldType]} is now visible for{' '}
              <span className="font-semibold text-warning">{countdown}s</span>
            </p>
            <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
              <div
                className="h-1.5 bg-primary-500 rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
