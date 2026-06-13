'use client'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Critical Error - Green Valley Estate</title>
        <style dangerouslySetInnerHTML={{ __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
          .wrap { max-width: 420px; width: 100%; text-align: center; }
          .logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 2.5rem; }
          .logo-icon { width: 36px; height: 36px; border-radius: 10px; background: #0d9488; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; }
          .logo-name { font-size: 15px; font-weight: 600; }
          .icon-box { width: 140px; height: 140px; border-radius: 24px; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; }
          .code { font-size: 72px; font-weight: 900; color: #ef4444; line-height: 1; margin-bottom: 1rem; letter-spacing: -2px; }
          h1 { font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem; }
          p { font-size: 0.875rem; color: #64748b; margin-bottom: 2rem; line-height: 1.6; }
          .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 22px; border-radius: 12px; background: #0d9488; color: white; font-size: 0.875rem; font-weight: 500; border: none; cursor: pointer; }
          .btn:hover { background: #0f766e; }
          .hint { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; }
        `}} />
      </head>
      <body>
        <div className="wrap">
          <div className="logo">
            <div className="logo-icon">G</div>
            <span className="logo-name">Green Valley Estate</span>
          </div>
          <div className="icon-box">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" width="110" height="110">
              <circle cx="60" cy="60" r="44" fill="#fee2e2" stroke="#fca5a5" strokeWidth="2" />
              <path d="M44 44L76 76M76 44L44 76" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />
              <circle cx="94" cy="26" r="18" fill="#ef4444" />
              <text x="94" y="33" textAnchor="middle" fontSize="18" fontWeight="700" fill="white">!</text>
            </svg>
          </div>
          <div className="code">500</div>
          <h1>Critical system error</h1>
          <p>A fatal error occurred that prevented the application from loading. Please reload to try again.</p>
          <button className="btn" onClick={reset}>Reload Application</button>
          <p className="hint">If this keeps happening, contact your system administrator.</p>
        </div>
      </body>
    </html>
  )
}
