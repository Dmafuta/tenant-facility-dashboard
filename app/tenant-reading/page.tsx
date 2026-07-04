'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const BACKEND = process.env.NEXT_PUBLIC_APP_URL ?? ''

export default function TenantReadingPage() {
  const params       = useSearchParams()
  const meterToken   = params.get('m') ?? ''

  const [billingPeriod, setBillingPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [currentValue, setCurrentValue]   = useState('')
  const [notes, setNotes]                 = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [success, setSuccess]             = useState(false)
  const [error, setError]                 = useState('')

  // Warn if no meter token provided
  const noToken = !meterToken

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentValue || isNaN(Number(currentValue))) {
      setError('Please enter a valid meter reading.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/backend/public/self-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meter_token:    meterToken,
          current_value:  Number(currentValue),
          billing_period: billingPeriod,
          notes:          notes || undefined,
        }),
      })
      const json = await res.json() as { message?: string; data?: { message?: string } }
      if (!res.ok) {
        setError((json as { message?: string }).message ?? 'Failed to submit reading.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Reading Submitted</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Thank you! Your meter reading has been received and will appear on your next bill after review.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Submit Meter Reading</h1>
        <p className="text-sm text-gray-500 mb-5">
          Enter the current reading shown on your meter.
        </p>

        {noToken && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3 mb-4">
            No meter linked. Please scan the QR code on your meter.
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-3 mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Billing Period</label>
            <input
              type="month"
              value={billingPeriod}
              onChange={e => setBillingPeriod(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Current Reading</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={currentValue}
              onChange={e => setCurrentValue(e.target.value)}
              placeholder="0.000"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-3xl font-bold text-center text-gray-900 focus:outline-none focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. meter showing error, hard to read..."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-green-500 resize-none"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || noToken}
            className="w-full bg-green-600 text-white rounded-xl py-4 font-semibold text-base disabled:opacity-50 hover:bg-green-700 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Reading'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Your reading will be reviewed before billing. For emergencies call the facility office.
        </p>
      </div>
    </div>
  )
}
