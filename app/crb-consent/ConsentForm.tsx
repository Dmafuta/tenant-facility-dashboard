'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCrbConsentInfo, submitCrbConsent, type CrbConsentInfo } from '@/lib/api/crb'

type State = 'loading' | 'ready' | 'submitting' | 'done' | 'used' | 'expired' | 'invalid'

export function ConsentForm() {
  const params    = useSearchParams()
  const token     = params.get('token') ?? ''
  const [state,   setState]   = useState<State>('loading')
  const [info,    setInfo]    = useState<CrbConsentInfo | null>(null)
  const [error,   setError]   = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!token) { setState('invalid'); return }

    getCrbConsentInfo(token)
      .then(data => {
        setInfo(data)
        setState(data.already_used ? 'used' : 'ready')
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : ''
        setState(msg.toLowerCase().includes('expired') ? 'expired' : 'invalid')
        setError(msg)
      })
  }, [token])

  async function handleAgree() {
    if (!checked) return
    setState('submitting')
    try {
      await submitCrbConsent(token)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setState('ready')
    }
  }

  // ── States ─────────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="w-8 h-8 border-[3px] border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Verifying consent link…</p>
        </div>
      </Card>
    )
  }

  if (state === 'done') {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Consent Recorded</h2>
            <p className="text-sm text-gray-500">
              Thank you, <strong>{info?.person_name}</strong>. Your consent has been recorded
              and <strong>{info?.property_name}</strong> has been notified.
            </p>
          </div>
          <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 w-full text-center">
            You may close this window.
          </p>
        </div>
      </Card>
    )
  }

  if (state === 'used') {
    return (
      <Card>
        <StatusMessage
          icon="✓"
          iconBg="bg-green-100"
          title="Already Consented"
          message="You have already given consent for this credit check. No further action is needed."
        />
      </Card>
    )
  }

  if (state === 'expired') {
    return (
      <Card>
        <StatusMessage
          icon="⏰"
          iconBg="bg-amber-100"
          title="Link Expired"
          message="This consent link has expired. Please contact the property manager to request a new one."
        />
      </Card>
    )
  }

  if (state === 'invalid') {
    return (
      <Card>
        <StatusMessage
          icon="✕"
          iconBg="bg-red-100"
          title="Invalid Link"
          message={error || "This consent link is invalid or has already been used. Please contact the property manager."}
        />
      </Card>
    )
  }

  // ── Ready — show consent form ───────────────────────────────────────────────

  const expiresDate = info?.expires_at
    ? new Date(info.expires_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <Card>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
          {info?.property_name?.[0] ?? 'F'}
        </div>
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">{info?.property_name}</p>
        <h1 className="text-xl font-bold text-gray-900">Credit Reference Check</h1>
        <p className="text-sm text-gray-500 mt-1">Consent Request for {info?.person_name}</p>
      </div>

      {/* What this is */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-blue-800">
        <p className="font-semibold mb-2">What is a CRB check?</p>
        <p className="text-blue-700 leading-relaxed">
          A Credit Reference Bureau (CRB) check verifies your credit standing with Kenya's licensed
          credit bureaus. It shows whether you have any outstanding loan defaults or listings that
          may affect your tenancy application.
        </p>
      </div>

      {/* What will be accessed */}
      <div className="space-y-2 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What will be checked</p>
        {[
          'Your credit history and repayment records',
          'Any current CRB listings or blacklistings',
          'Credit score (if available)',
        ].map(item => (
          <div key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
            {item}
          </div>
        ))}
      </div>

      {/* How it's used */}
      <div className="space-y-2 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">How your data will be used</p>
        {[
          `Shared only with ${info?.property_name} for tenancy screening purposes`,
          'Not stored beyond what is required by law',
          'You have the right to dispute any incorrect listings with the CRB directly',
        ].map(item => (
          <div key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
            {item}
          </div>
        ))}
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors mb-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer flex-shrink-0"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          I, <strong>{info?.person_name}</strong>, voluntarily consent to{' '}
          <strong>{info?.property_name}</strong> performing a Credit Reference Bureau check
          on my credit record for the purpose of evaluating my tenancy application.
        </span>
      </label>

      {error && state === 'ready' && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {/* Submit */}
      <button
        onClick={handleAgree}
        disabled={!checked || state === 'submitting'}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all
          bg-blue-600 text-white hover:bg-blue-700
          disabled:opacity-40 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
      >
        {state === 'submitting' && (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {state === 'submitting' ? 'Recording consent…' : 'I Agree — Proceed with CRB Check'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-4">
        This consent link expires on <strong>{expiresDate}</strong>.
      </p>
    </Card>
  )
}

// ── Local UI primitives ─────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-lg">
      {children}
    </div>
  )
}

function StatusMessage({ icon, iconBg, title, message }: {
  icon: string; iconBg: string; title: string; message: string
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <div className={`w-16 h-16 rounded-full ${iconBg} flex items-center justify-center text-2xl`}>
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
        <p className="text-sm text-gray-500 max-w-sm">{message}</p>
      </div>
    </div>
  )
}
