'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api/fetch'

function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const token        = searchParams.get('token') ?? ''

  const [info,     setInfo]     = useState<{ email: string; fullName: string } | null>(null)
  const [infoErr,  setInfoErr]  = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!token) { setInfoErr('No invitation token found. Please use the link from your email.'); return }
    apiFetch<{ email: string; fullName: string }>(`/auth/invite-info?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch(e => setInfoErr(e instanceof Error ? e.message : 'Invalid or expired invitation link.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true); setError('')
    try {
      await apiFetch('/auth/accept-invite', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      window.location.href = '/dashboard'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to activate account. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">
            🔑
          </div>
          <h1 className="text-xl font-bold text-gray-900">Accept Invitation</h1>
          <p className="text-sm text-gray-500 mt-1">Set your password to activate your account</p>
        </div>

        {infoErr ? (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
            {infoErr}
          </div>
        ) : !info ? (
          <div className="text-center text-sm text-gray-400 py-4">Verifying invitation…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-0.5">
              <p className="text-xs text-gray-500">Signing in as</p>
              <p className="text-sm font-semibold text-gray-800">{info.fullName}</p>
              <p className="text-xs text-gray-500">{info.email}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Activating…' : 'Activate Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <AcceptInviteForm />
    </Suspense>
  )
}
