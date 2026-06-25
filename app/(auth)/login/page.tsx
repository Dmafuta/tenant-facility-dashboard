'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Mail, Lock, ArrowRight, Eye, EyeOff,
  Building2, Wrench, Sparkles, ShieldCheck,
  Thermometer, Lightbulb, KeyRound, ClipboardList,
  Leaf, Wifi, Droplets, Fan,
} from 'lucide-react'
import { loginWithPassword, sendOtp } from '@/lib/api/auth'

export default function LoginPage() {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPassword,setShowPassword]= useState(false)
  const [loading,     setLoading]     = useState(false)
  const [magicMode,   setMagicMode]   = useState(false)
  const [magicSent,   setMagicSent]   = useState(false)
  const [error,       setError]       = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (magicMode) {
        await sendOtp(email)
        setMagicSent(true)
      } else {
        const result = await loginWithPassword(email, password)
        if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
          const params = new URLSearchParams({
            email:         result.email,
            channel:       '2fa',
            maskedContact: result.maskedContact,
          })
          window.location.href = `/verify?${params.toString()}`
        } else {
          window.location.href = '/'
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--brand-surface)] text-[var(--brand-ink)]">
      <EdgeDecor />

      {/* Top brand bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[var(--brand)] text-white grid place-items-center font-bold text-base shadow-[0_4px_14px_-2px_oklch(0.62_0.12_175_/_0.45)]">
            G
          </div>
          <span className="font-semibold tracking-tight">Great Wall Gardens</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--brand-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--brand)] animate-pulse" />
          All facility systems operational
        </div>
      </header>

      {/* Centered form */}
      <main className="relative z-10 flex items-center justify-center px-6 py-10 sm:py-16">
        <div className="w-full max-w-[400px]">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-[11px] font-medium text-[var(--brand-strong)] tracking-wide uppercase">
            <Building2 className="h-3 w-3" />
            Facility Management
          </div>

          <h1 className="mt-5 text-[34px] leading-[1.1] font-bold tracking-tight">
            Welcome back.
            <br />
            <span className="text-[var(--brand-strong)]">Run the building.</span>
          </h1>
          <p className="mt-3 text-[15px] text-[var(--brand-muted)]">
            Sign in to manage work orders, tenants, assets and operations across the estate.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <Field
              id="email"
              label="Email address"
              icon={<Mail className="h-4 w-4" />}
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              placeholder="you@greatwallgardens.estate"
            />

            {!magicMode && (
              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium">
                    Password
                  </label>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/reset-password"
                      className="text-xs font-medium text-[var(--brand-strong)] hover:underline"
                    >
                      Forgot password?
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setMagicMode(true); setMagicSent(false); setError('') }}
                      className="text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-strong)] hover:underline"
                    >
                      Send magic link
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--brand-muted)]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full h-12 pl-10 pr-10 rounded-xl border border-[var(--brand-border)] bg-white/80 backdrop-blur text-sm placeholder:text-[var(--brand-muted)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {magicMode && (
              <div className="flex items-start justify-between text-xs text-[var(--brand-muted)]">
                <span className="leading-relaxed">
                  We'll email you a one-time code to sign in instantly — no password needed.
                </span>
                <button
                  type="button"
                  onClick={() => { setMagicMode(false); setMagicSent(false); setError('') }}
                  className="ml-3 shrink-0 font-medium text-[var(--brand-strong)] hover:underline"
                >
                  Use password
                </button>
              </div>
            )}

            {magicSent && (
              <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand-soft)]/60 px-4 py-3 text-sm text-[var(--brand-strong)]">
                Code sent — check your inbox then{' '}
                <Link
                  href={`/verify?email=${encodeURIComponent(email)}`}
                  className="font-semibold underline"
                >
                  enter it here
                </Link>.
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {!magicSent && (
              <button
                type="submit"
                disabled={loading}
                className="group w-full h-12 mt-2 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_10px_24px_-10px_oklch(0.62_0.12_175_/_0.65)] transition hover:bg-[var(--brand-strong)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? magicMode ? 'Sending code…' : 'Signing in…'
                  : magicMode ? 'Send Code' : 'Sign in to dashboard'}
                {!loading && (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            )}
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6 text-xs text-[var(--brand-muted)]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Protected by two-factor authentication
        </div>
        <div className="hidden sm:block">© {new Date().getFullYear()} Great Wall Gardens</div>
      </footer>
    </div>
  )
}

// ── Reusable field ────────────────────────────────────────────────────────────

function Field({
  id, label, icon, type, value, onChange, placeholder, autoComplete,
}: {
  id: string
  label: string
  icon: React.ReactNode
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1.5">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          required
          value={value}
          autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-10 pr-3 rounded-xl border border-[var(--brand-border)] bg-white/80 backdrop-blur text-sm placeholder:text-[var(--brand-muted)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-ring)]"
        />
      </div>
    </div>
  )
}

// ── Edge decoration ───────────────────────────────────────────────────────────

function EdgeDecor() {
  return (
    <>
      {/* Soft glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-[var(--brand-soft)] blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-[oklch(0.94_0.05_200)] blur-3xl opacity-70" />

      {/* Faint blueprint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(0.85 0.02 200 / 0.35) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.85 0.02 200 / 0.35) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse at center, transparent 0%, transparent 35%, black 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, transparent 0%, transparent 35%, black 100%)',
        }}
      />

      {/* Left edge: building skyline */}
      <div className="pointer-events-none hidden md:block absolute left-0 top-0 bottom-0 w-[260px]">
        <svg viewBox="0 0 260 900" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skyFade" x1="0" x2="1">
              <stop offset="0" stopColor="oklch(0.66 0.115 175)" stopOpacity="0.18" />
              <stop offset="1" stopColor="oklch(0.66 0.115 175)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="260" height="900" fill="url(#skyFade)" />
          <g fill="oklch(0.55 0.07 200 / 0.18)" stroke="oklch(0.45 0.06 210 / 0.45)" strokeWidth="1">
            <rect x="10"  y="520" width="60" height="380" />
            <rect x="78"  y="430" width="44" height="470" />
            <rect x="128" y="560" width="52" height="340" />
            <rect x="188" y="470" width="40" height="430" />
          </g>
          <g fill="oklch(0.66 0.115 175 / 0.55)">
            {Array.from({ length: 28 }).map((_, i) => {
              const cols = [20, 35, 50, 88, 100, 138, 152, 166, 196, 210]
              const x = cols[i % cols.length]
              const y = 540 + Math.floor(i / cols.length) * 28
              return <rect key={i} x={x} y={y} width="8" height="10" rx="1" />
            })}
          </g>
        </svg>
        <FloatChip className="absolute top-[22%] left-4"  icon={<Thermometer className="h-3.5 w-3.5" />} label="HVAC"     value="72°F"   />
        <FloatChip className="absolute top-[42%] left-8"  icon={<Lightbulb   className="h-3.5 w-3.5" />} label="Lighting" value="84%"    />
        <FloatChip className="absolute top-[62%] left-3"  icon={<Droplets    className="h-3.5 w-3.5" />} label="Water"    value="Normal" />
      </div>

      {/* Right edge: operations panel */}
      <div className="pointer-events-none hidden lg:block absolute right-0 top-0 bottom-0 w-[280px]">
        <svg viewBox="0 0 280 900" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rightFade" x1="1" x2="0">
              <stop offset="0" stopColor="oklch(0.66 0.115 175)" stopOpacity="0.16" />
              <stop offset="1" stopColor="oklch(0.66 0.115 175)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="280" height="900" fill="url(#rightFade)" />
          <line x1="40" y1="80" x2="40" y2="820" stroke="oklch(0.66 0.115 175 / 0.4)" strokeWidth="1.5" strokeDasharray="2 6" />
          {[140, 280, 420, 560, 700].map((y, i) => (
            <g key={i}>
              <circle cx="40" cy={y} r="6"   fill="white" stroke="oklch(0.66 0.115 175)" strokeWidth="1.5" />
              <circle cx="40" cy={y} r="2.5" fill="oklch(0.66 0.115 175)" />
            </g>
          ))}
        </svg>
        <RightTicker className="absolute top-[14%] right-6"  icon={<Wrench        className="h-3.5 w-3.5" />} title="Work order #4821"  sub="Block C · Elevator service" tone="warn" />
        <RightTicker className="absolute top-[30%] right-10" icon={<Sparkles      className="h-3.5 w-3.5" />} title="Cleaning complete" sub="Lobby · Tower A"             tone="ok"   />
        <RightTicker className="absolute top-[48%] right-4"  icon={<ClipboardList className="h-3.5 w-3.5" />} title="Inspection due"    sub="Fire panel · 3 days"        tone="info" />
        <RightTicker className="absolute top-[66%] right-8"  icon={<KeyRound      className="h-3.5 w-3.5" />} title="Access granted"    sub="Vendor · Gate 2"            tone="ok"   />
        <RightTicker className="absolute top-[82%] right-12" icon={<Fan           className="h-3.5 w-3.5" />} title="AHU-04 tuned"      sub="−0.4 kWh / hr"              tone="info" />
      </div>

      {/* Bottom stats pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 hidden sm:flex justify-center">
        <div className="flex items-center gap-5 rounded-full border border-[var(--brand-border)] bg-white/70 backdrop-blur px-5 py-2 text-[11px] text-[var(--brand-muted)] shadow-sm">
          <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-[var(--brand)]" /> 12 buildings</span>
          <span className="h-3 w-px bg-[var(--brand-border)]" />
          <span className="flex items-center gap-1.5"><Wrench    className="h-3.5 w-3.5 text-[var(--brand)]" /> 38 open WOs</span>
          <span className="h-3 w-px bg-[var(--brand-border)]" />
          <span className="flex items-center gap-1.5"><Leaf      className="h-3.5 w-3.5 text-[var(--brand)]" /> 22% energy saved</span>
          <span className="h-3 w-px bg-[var(--brand-border)]" />
          <span className="flex items-center gap-1.5"><Wifi      className="h-3.5 w-3.5 text-[var(--brand)]" /> Sensors online</span>
        </div>
      </div>
    </>
  )
}

// ── FloatChip ─────────────────────────────────────────────────────────────────

function FloatChip({ className, icon, label, value }: {
  className?: string
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border border-[var(--brand-border)] bg-white/80 backdrop-blur px-3 py-2 shadow-[0_8px_20px_-12px_rgba(16,24,40,0.15)] ${className ?? ''}`}>
      <div className="h-6 w-6 rounded-md bg-[var(--brand-soft)] grid place-items-center text-[var(--brand-strong)]">
        {icon}
      </div>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-[var(--brand-muted)]">{label}</div>
        <div className="text-xs font-semibold text-[var(--brand-ink)]">{value}</div>
      </div>
    </div>
  )
}

// ── RightTicker ───────────────────────────────────────────────────────────────

function RightTicker({ className, icon, title, sub, tone }: {
  className?: string
  icon: React.ReactNode
  title: string
  sub: string
  tone: 'ok' | 'warn' | 'info'
}) {
  const dot =
    tone === 'ok'   ? 'bg-[oklch(0.72_0.14_155)]' :
    tone === 'warn' ? 'bg-[oklch(0.78_0.15_70)]'  :
                      'bg-[var(--brand)]'
  return (
    <div className={`w-[230px] rounded-xl border border-[var(--brand-border)] bg-white/85 backdrop-blur px-3 py-2.5 shadow-[0_10px_24px_-14px_rgba(16,24,40,0.18)] ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-[var(--brand-soft)] grid place-items-center text-[var(--brand-strong)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-[var(--brand-ink)] truncate">{title}</div>
          <div className="text-[11px] text-[var(--brand-muted)] truncate">{sub}</div>
        </div>
        <span className={`h-2 w-2 rounded-full ${dot}`} />
      </div>
    </div>
  )
}
