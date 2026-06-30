'use client'

import { useState } from 'react'

type State = 'idle' | 'loading' | 'verified' | 'failed' | 'error'

export default function ResidentVerifyPage() {
  const [nationalId, setNationalId] = useState('')
  const [phone,      setPhone]      = useState('')
  const [state,      setState]      = useState<State>('idle')
  const [result,     setResult]     = useState<{ name: string; unitLabel: string } | null>(null)
  const [message,    setMessage]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nationalId.trim() || !phone.trim()) return

    setState('loading')
    setResult(null)
    setMessage('')

    try {
      const res = await fetch('/api/backend/public/tenant-verify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nationalId: nationalId.trim(), phone: phone.trim() }),
      })
      const json = await res.json() as { success: boolean; data?: { name: string; unitLabel: string }; message?: string }

      if (res.ok && json.success && json.data) {
        setResult(json.data)
        setState('verified')
      } else if (res.status === 404) {
        setState('failed')
      } else if (res.status === 429) {
        setMessage('Too many attempts. Please wait a moment and try again.')
        setState('error')
      } else {
        setMessage(json.message ?? 'Something went wrong. Please try again.')
        setState('error')
      }
    } catch {
      setMessage('Unable to reach the server. Please check your connection.')
      setState('error')
    }
  }

  function reset() {
    setNationalId('')
    setPhone('')
    setState('idle')
    setResult(null)
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Resident Verification</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your details to confirm your tenancy</p>
        </div>

        {/* Verified */}
        {state === 'verified' && result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Tenancy Confirmed</h2>
            <p className="text-green-700 font-semibold text-lg">{result.name}</p>
            <p className="text-gray-500 text-sm mt-1">Unit {result.unitLabel}</p>
            <button
              onClick={reset}
              className="mt-6 w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Verify another resident
            </button>
          </div>
        )}

        {/* Failed */}
        {state === 'failed' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Unable to Verify</h2>
            <p className="text-gray-500 text-sm mt-1">
              The details you entered do not match our records.<br />
              Please contact management for assistance.
            </p>
            <button
              onClick={reset}
              className="mt-6 w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Form */}
        {(state === 'idle' || state === 'loading' || state === 'error') && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                National ID Number
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
                placeholder="Enter your ID number"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 0712 345 678 or +254712345678"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                autoComplete="tel"
                required
              />
            </div>

            {message && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{message}</p>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || !nationalId.trim() || !phone.trim()}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {state === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Verifying…
                </span>
              ) : 'Verify Tenancy'}
            </button>

            <p className="text-xs text-gray-400 text-center pt-1">
              Your details are used only for verification and are not stored by this form.
            </p>
          </form>
        )}

      </div>
    </div>
  )
}
