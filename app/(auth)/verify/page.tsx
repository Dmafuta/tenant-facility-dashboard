'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { verifyOtp, sendOtp } from '@/lib/api/auth'

const CODE_LENGTH = 6

function VerifyForm() {
  const searchParams  = useSearchParams()
  const email         = searchParams.get('email') ?? ''
  const channel       = searchParams.get('channel') ?? 'email'   // 'email' | '2fa'
  const maskedContact = searchParams.get('maskedContact') ?? ''
  const isSms         = channel === '2fa' && maskedContact.startsWith('+')

  const [digits, setDigits]       = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [resending, setResend]    = useState(false)
  const [resent, setResent]       = useState(false)
  const [countdown, setCountdown] = useState(30)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function handleDigit(index: number, value: string) {
    setError('')
    const char = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    if (char && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus()
    if (char && next.every(d => d !== '')) submit(next.join(''))
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = [...digits]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setDigits(next)
    inputs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
    if (pasted.length === CODE_LENGTH) submit(pasted)
  }

  async function submit(code: string) {
    setLoading(true)
    setError('')
    try {
      await verifyOtp(email, code)
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code.')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResend(true)
    try {
      await sendOtp(email)
      setResent(true)
      setCountdown(30)
      setTimeout(() => setResent(false), 3000)
    } catch {
      // silent fail on resend
    } finally {
      setResend(false)
    }
  }

  const code   = digits.join('')
  const filled = code.length === CODE_LENGTH

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow">G</div>
          <span className="text-base font-semibold text-text">Green Valley Estate</span>
        </div>

        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-4xl">
          {isSms ? '📱' : '📬'}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-text mb-2">
            {isSms ? 'Check your phone' : 'Check your email'}
          </h1>
          <p className="text-sm text-text-muted leading-relaxed">
            {maskedContact
              ? <>Enter the 6-digit code sent to <strong className="text-text">{maskedContact}</strong>.</>
              : email
                ? <>Enter the 6-digit code sent to <strong className="text-text">{email}</strong>.</>
                : 'Enter the 6-digit code sent to you.'}
          </p>
          {isSms && (
            <p className="text-xs text-text-muted mt-1">
              Also sent to your email as backup.
            </p>
          )}
        </div>

        <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all
                bg-surface dark:bg-dark-card text-text
                ${d ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-border dark:border-dark-border'}
                ${error ? 'border-danger' : ''}
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              `}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-xs text-danger bg-danger/10 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {resent && (
          <p className="text-center text-xs text-success bg-success/10 rounded-lg px-3 py-2 mb-4">
            A new code has been sent
          </p>
        )}

        <button
          onClick={() => submit(code)}
          disabled={!filled || loading}
          className="w-full py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2 mb-4"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying&hellip;</>
          ) : (
            'Verify &amp; Continue'
          )}
        </button>

        <p className="text-center text-sm text-text-muted">
          Didn&apos;t receive a code?{' '}
          {channel === '2fa' ? (
            <Link href="/login" className="text-primary-600 font-medium hover:underline">
              Sign in again
            </Link>
          ) : countdown > 0 ? (
            <span className="text-text-muted">Resend in {countdown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-primary-600 font-medium hover:underline disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          )}
        </p>

        <div className="mt-8 pt-6 border-t border-surface-border dark:border-dark-border text-center">
          <Link href="/login" className="text-xs text-text-muted hover:text-text transition-colors">
            &larr; Back to sign in
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          Your session is protected with two-factor authentication.
        </p>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  )
}
