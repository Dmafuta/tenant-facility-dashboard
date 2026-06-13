export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-surface dark:bg-dark-surface flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-lg shadow">G</div>
          <span className="text-base font-semibold text-text">Green Valley Estate</span>
        </div>

        {/* Illustration */}
        <div className="mx-auto mb-6 w-40 h-40 rounded-3xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-28">
            {/* Rocket */}
            <path d="M60 16c0 0-24 20-24 48h48C84 36 60 16 60 16z" fill="#0d9488" opacity="0.8" />
            <rect x="50" y="64" width="20" height="18" rx="2" fill="#0d9488" opacity="0.9" />
            {/* Fins */}
            <path d="M50 70L36 82h14V70z" fill="#0d9488" opacity="0.5" />
            <path d="M70 70l14 12H70V70z" fill="#0d9488" opacity="0.5" />
            {/* Window */}
            <circle cx="60" cy="46" r="9" fill="white" opacity="0.9" />
            <circle cx="60" cy="46" r="6" fill="#bfdbfe" />
            {/* Flame */}
            <ellipse cx="60" cy="86" rx="7" ry="10" fill="#f59e0b" opacity="0.7" />
            <ellipse cx="60" cy="90" rx="4" ry="6" fill="#fbbf24" opacity="0.9" />
            {/* Stars */}
            <circle cx="22" cy="28" r="2" fill="#0d9488" opacity="0.3" />
            <circle cx="96" cy="20" r="3" fill="#0d9488" opacity="0.25" />
            <circle cx="106" cy="50" r="2" fill="#0d9488" opacity="0.2" />
            <circle cx="16" cy="58" r="1.5" fill="#0d9488" opacity="0.2" />
          </svg>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold mb-5">
          🚀 In Development
        </div>

        <h1 className="text-2xl font-bold text-text mb-3">This feature is launching soon</h1>
        <p className="text-sm text-text-muted leading-relaxed mb-8 max-w-sm mx-auto">
          We&apos;re building something great for Green Valley Estate. This module will be available in an upcoming release.
        </p>

        {/* What to expect */}
        <div className="bg-surface-muted dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-5 mb-8 text-left">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">What&apos;s coming</p>
          <div className="space-y-2.5">
            {[
              'Full mobile-responsive experience',
              'Resident self-service portal',
              'Automated billing & M-Pesa integration',
              'Real-time notifications via SMS & email',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-[10px] font-bold flex-shrink-0">
                  ✓
                </div>
                <span className="text-sm text-text">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
        >
          ← Back to Dashboard
        </a>

        <p className="mt-10 text-xs text-text-muted">
          Green Valley Estate · Portal v2.0
        </p>
      </div>
    </div>
  )
}
