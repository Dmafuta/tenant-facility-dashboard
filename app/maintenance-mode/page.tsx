export default function MaintenanceModePage() {
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
            {/* Wrench */}
            <path d="M78 18a22 22 0 0 0-20.5 29.9L22 83.5A8.5 8.5 0 1 0 34 95.5L69.6 60A22 22 0 0 0 78 18zm0 8a14 14 0 0 1 5.5 1.1L73 37.6l2.8 6.8 7.6 2.8 10.5-10.5A14 14 0 1 1 78 26z" fill="#0d9488" opacity="0.8" />
            {/* Sparkles */}
            <circle cx="96" cy="80" r="5" fill="#0d9488" opacity="0.4" />
            <circle cx="106" cy="68" r="3" fill="#0d9488" opacity="0.3" />
            <circle cx="88" cy="92" r="3" fill="#0d9488" opacity="0.3" />
            <circle cx="30" cy="30" r="4" fill="#0d9488" opacity="0.25" />
            <circle cx="20" cy="44" r="2.5" fill="#0d9488" opacity="0.2" />
          </svg>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          Scheduled Maintenance
        </div>

        <h1 className="text-2xl font-bold text-text mb-3">We&apos;re tuning things up</h1>
        <p className="text-sm text-text-muted leading-relaxed mb-8 max-w-sm mx-auto">
          Green Valley Estate portal is undergoing scheduled maintenance to improve your experience.
          We&apos;ll be back shortly.
        </p>

        {/* Estimated time card */}
        <div className="bg-surface-muted dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-2xl p-5 mb-8 text-left">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Estimated timeline</p>
          <div className="space-y-3">
            {[
              { label: 'Started',            value: 'Today, 02:00 AM EAT',   done: true  },
              { label: 'Database migration', value: 'In progress…',           done: false, active: true },
              { label: 'Service restart',    value: 'Pending',                done: false },
              { label: 'Back online',        value: 'Est. Today, 04:00 AM',  done: false },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                  ${item.done   ? 'bg-success/15 text-success' : ''}
                  ${item.active ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 ring-2 ring-primary-400 ring-offset-1' : ''}
                  ${!item.done && !item.active ? 'bg-surface-border dark:bg-dark-border text-text-muted' : ''}
                `}>
                  {item.done ? '✓' : item.active ? '…' : '·'}
                </div>
                <div className="flex-1 flex justify-between gap-2">
                  <span className={`text-sm font-medium ${item.active ? 'text-primary-600 dark:text-primary-400' : 'text-text'}`}>{item.label}</span>
                  <span className="text-xs text-text-muted">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <p className="text-sm text-text-muted">
          Urgent matters? Call the facility office:{' '}
          <a href="tel:+254700000000" className="text-primary-600 font-medium hover:underline">+254 700 000 000</a>
        </p>

        <p className="mt-8 text-xs text-text-muted">
          Green Valley Estate · Portal v2.0
        </p>
      </div>
    </div>
  )
}
