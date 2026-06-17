import { Suspense } from 'react'
import { ConsentForm } from './ConsentForm'

export const metadata = { title: 'Credit Check Consent' }

export default function CrbConsentPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 w-full max-w-lg text-center">
          <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      }>
        <ConsentForm />
      </Suspense>
    </div>
  )
}
