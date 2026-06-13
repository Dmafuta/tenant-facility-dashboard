import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface dark:bg-dark-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow">G</div>
          <span className="text-base font-semibold text-text">Green Valley Estate</span>
        </div>

        {/* Illustration */}
        <div className="mx-auto mb-6 w-40 h-40 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
            <rect x="20" y="38" width="80" height="74" rx="4" fill="#e2e8f0" />
            <rect x="28" y="46" width="64" height="58" rx="2" fill="white" />
            <rect x="36" y="54" width="18" height="14" rx="2" fill="#bfdbfe" />
            <rect x="66" y="54" width="18" height="14" rx="2" fill="#bfdbfe" />
            <rect x="36" y="78" width="18" height="14" rx="2" fill="#bfdbfe" />
            <rect x="66" y="78" width="18" height="14" rx="2" fill="#bfdbfe" />
            <rect x="50" y="96" width="20" height="16" rx="2" fill="#cbd5e1" />
            <circle cx="92" cy="28" r="20" fill="#0d9488" />
            <text x="92" y="36" textAnchor="middle" fontSize="22" fontWeight="800" fill="white">?</text>
          </svg>
        </div>

        <p className="text-8xl font-black text-primary-600 tracking-tight leading-none mb-4">404</p>
        <h1 className="text-xl font-semibold text-text mb-2">This unit doesn&apos;t exist</h1>
        <p className="text-sm text-text-muted mb-8 leading-relaxed max-w-xs mx-auto">
          The page you&apos;re looking for may have been moved, deleted, or never existed in this facility.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/property"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm font-medium hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors"
          >
            View Properties
          </Link>
        </div>

        <p className="mt-10 text-xs text-text-muted">
          If you believe this is a mistake, contact your system administrator.
        </p>
      </div>
    </div>
  )
}
