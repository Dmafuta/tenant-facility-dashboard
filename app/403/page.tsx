import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-surface dark:bg-dark-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow">G</div>
          <span className="text-base font-semibold text-text">Green Valley Estate</span>
        </div>

        {/* Illustration */}
        <div className="mx-auto mb-6 w-40 h-40 rounded-3xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
            {/* Lock body */}
            <rect x="30" y="56" width="60" height="46" rx="8" fill="#fee2e2" stroke="#fca5a5" strokeWidth="2" />
            {/* Lock shackle */}
            <path d="M42 56V42a18 18 0 0 1 36 0v14" stroke="#fca5a5" strokeWidth="5" strokeLinecap="round" fill="none" />
            {/* Keyhole */}
            <circle cx="60" cy="77" r="7" fill="#ef4444" opacity="0.7" />
            <rect x="57" y="77" width="6" height="10" rx="2" fill="#ef4444" opacity="0.7" />
            {/* X badge */}
            <circle cx="94" cy="28" r="18" fill="#ef4444" />
            <path d="M87 21l14 14M101 21L87 35" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <p className="text-8xl font-black text-red-500 tracking-tight leading-none mb-4">403</p>
        <h1 className="text-xl font-semibold text-text mb-2">Access denied</h1>
        <p className="text-sm text-text-muted mb-2 leading-relaxed max-w-xs mx-auto">
          You don&apos;t have the required clearance to access this area. This incident has been logged.
        </p>
        <p className="text-xs text-text-muted mb-8">
          If you need access, contact your facility administrator.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm font-medium hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          >
            Request Access
          </Link>
        </div>

        <p className="mt-10 text-xs text-text-muted">
          Green Valley Estate · Access Control System
        </p>
      </div>
    </div>
  )
}
