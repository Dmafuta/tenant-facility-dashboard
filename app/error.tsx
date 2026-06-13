'use client'
import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-surface dark:bg-dark-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow">G</div>
          <span className="text-base font-semibold text-text">Green Valley Estate</span>
        </div>

        {/* Illustration */}
        <div className="mx-auto mb-6 w-40 h-40 rounded-3xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
            <path d="M60 18L106 98H14L60 18Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />
            <rect x="57" y="48" width="6" height="26" rx="3" fill="#d97706" />
            <circle cx="60" cy="83" r="4" fill="#d97706" />
            <circle cx="96" cy="28" r="18" fill="#f59e0b" />
            <text x="96" y="36" textAnchor="middle" fontSize="20" fill="white">!</text>
          </svg>
        </div>

        <p className="text-8xl font-black text-amber-500 tracking-tight leading-none mb-4">500</p>
        <h1 className="text-xl font-semibold text-text mb-2">Something went wrong</h1>
        <p className="text-sm text-text-muted mb-2 leading-relaxed max-w-xs mx-auto">
          An unexpected error occurred on the server. Our team has been notified.
        </p>
        {error.digest && (
          <p className="text-xs text-text-muted mb-6 font-mono bg-surface-muted dark:bg-dark-hover px-3 py-1.5 rounded-lg inline-block">
            Error ID: {error.digest}
          </p>
        )}
        {!error.digest && <div className="mb-6" />}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors shadow-sm"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm font-medium hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          >
            Go to Dashboard
          </a>
        </div>

        <p className="mt-10 text-xs text-text-muted">
          Persistent issues? Contact your system administrator.
        </p>
      </div>
    </div>
  )
}
