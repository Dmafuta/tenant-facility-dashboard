'use client'
import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2, Lock, Mail, Eye, EyeOff, ShieldCheck, KeyRound,
  Globe2, CheckCircle2, ArrowRight, LifeBuoy,
  ScrollText, AlertTriangle, BarChart3, Building, Users, Workflow,
  Sparkles,
} from 'lucide-react'
import { loginWithPassword, sendOtp } from '@/lib/api/auth'

export default function LoginPage() {
  const router = useRouter()
  const [showPwd,   setShowPwd]   = useState(false)
  const [mode,      setMode]      = useState<'password' | 'sso'>('password')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicMode, setMagicMode] = useState(false)

  // Auto-navigate to verify page 1.5s after sign-in code is sent
  useEffect(() => {
    if (!magicSent) return
    const t = setTimeout(() => {
      router.push(`/verify?email=${encodeURIComponent(email)}`)
    }, 1500)
    return () => clearTimeout(t)
  }, [magicSent, email, router])

  async function onPasswordSubmit(e: FormEvent) {
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
    <div className="min-h-screen flex flex-col bg-steel-50 font-body text-steel-500">
      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-12 px-6 py-12 lg:grid-cols-[1.05fr_minmax(0,460px)] lg:gap-16 lg:py-16">

          {/* ── LEFT — brand + narrative ──────────────────────────── */}
          <section className="flex flex-col justify-between lg:-translate-x-[20%] lg:transform">
            <div>
              {/* Brand */}
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-600 font-heading text-base font-bold text-white">
                  G
                </div>
                <div className="leading-tight">
                  <p className="font-heading text-base font-bold tracking-tight text-steel-900">
                    Great Wall Gardens
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-steel-400">
                    Property Operations Cloud
                  </p>
                </div>
              </div>

              {/* Hero copy */}
              <div className="mt-12 max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Enterprise property management
                </p>
                <h1 className="mt-3 font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-steel-900 sm:text-5xl">
                  Every property, lease and resident — under one auditable roof.
                </h1>
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-steel-500">
                  Great Wall Gardens gives operators a single source of truth for portfolios,
                  leases, maintenance, compliance and finance — with tenant-isolated data and
                  an immutable audit trail baked into every action.
                </p>
              </div>

              {/* Value bullets */}
              <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
                <ValueItem
                  icon={<Building className="size-4" />}
                  title="Portfolio to unit"
                  body="Model buildings, units, leases and residents with true multi-entity accounting."
                />
                <ValueItem
                  icon={<Workflow className="size-4" />}
                  title="Operational workflows"
                  body="Maintenance, inspections, notices and visitor access — automated end-to-end."
                />
                <ValueItem
                  icon={<Users className="size-4" />}
                  title="Resident experience"
                  body="Self-service requests, engagement, votes and communications in one place."
                />
                <ValueItem
                  icon={<BarChart3 className="size-4" />}
                  title="Financial control"
                  body="Rent roll, arrears, service charges and reporting with GL-grade integrity."
                />
              </div>
            </div>

            {/* Trust footer */}
            <div className="mt-14 max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-steel-400">
                Trusted controls
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <TrustBadge label="SOC 2 Type II" />
                <TrustBadge label="ISO 27001" />
                <TrustBadge label="GDPR" />
                <TrustBadge label="WCAG 2.2 AA" />
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[11px] text-steel-500">
                <Lock className="size-3 text-emerald-700" />
                TLS 1.3 in transit · AES-256 at rest · Tenant-isolated data · Immutable audit chain
              </p>
            </div>
          </section>

          {/* ── RIGHT — login console ────────────────────────────── */}
          <section className="lg:translate-x-[8%] lg:pt-24">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Secure workspace access
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-steel-900">
                Sign in to your portfolio
              </h2>
              <p className="mt-1.5 text-sm text-steel-400">
                Access is logged and monitored under your workspace audit policy.
              </p>
            </div>

            {/* Workspace */}
            <div className="mb-5">
              <label className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-steel-700">Workspace</span>
                <span className="text-[10px] uppercase tracking-widest text-steel-400">Required</span>
              </label>
              <div className="flex items-stretch rounded-md ring-1 ring-steel-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600/40 transition">
                <div className="grid place-items-center pl-3 pr-2 text-steel-400">
                  <Building2 className="size-4" />
                </div>
                <input
                  type="text"
                  defaultValue="great-wall-gardens"
                  spellCheck={false}
                  autoComplete="organization"
                  className="flex-1 bg-transparent py-2.5 text-sm text-steel-900 outline-none placeholder:text-steel-300"
                  placeholder="your-estate"
                />
                <span className="grid place-items-center border-l border-steel-200 px-3 text-xs font-mono text-steel-400">
                  .greatwallgardens.estate
                </span>
              </div>
            </div>

            {/* Method toggle */}
            <div className="mb-5 grid grid-cols-2 rounded-md bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => { setMode('password'); setMagicMode(false); setMagicSent(false); setError('') }}
                className={
                  'inline-flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ' +
                  (mode === 'password' ? 'bg-white text-steel-900 shadow-sm ring-1 ring-steel-200' : 'text-steel-500 hover:text-steel-900')
                }
              >
                <Mail className="size-3.5" /> Email &amp; password
              </button>
              <button
                type="button"
                onClick={() => { setMode('sso'); setError('') }}
                className={
                  'inline-flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ' +
                  (mode === 'sso' ? 'bg-white text-steel-900 shadow-sm ring-1 ring-steel-200' : 'text-steel-500 hover:text-steel-900')
                }
              >
                <KeyRound className="size-3.5" /> Enterprise SSO
              </button>
            </div>

            {/* ── Password / Magic link form ── */}
            {mode === 'password' && (
              <form className="space-y-4" onSubmit={onPasswordSubmit}>
                {!magicMode ? (
                  <>
                    <FormField label="Work email" hint="Use your organisation-issued email">
                      <div className="flex items-stretch rounded-md ring-1 ring-steel-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600/40">
                        <div className="grid place-items-center pl-3 pr-2 text-steel-400">
                          <Mail className="size-4" />
                        </div>
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@greatwallgardens.estate"
                          className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-steel-900 outline-none placeholder:text-steel-300"
                        />
                      </div>
                    </FormField>

                    <FormField
                      label="Password"
                      right={
                        <Link
                          href="/reset-password"
                          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                        >
                          Forgot password?
                        </Link>
                      }
                    >
                      <div className="flex items-stretch rounded-md ring-1 ring-steel-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600/40">
                        <div className="grid place-items-center pl-3 pr-2 text-steel-400">
                          <Lock className="size-4" />
                        </div>
                        <input
                          type={showPwd ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="flex-1 bg-transparent py-2.5 text-sm text-steel-900 outline-none placeholder:text-steel-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(v => !v)}
                          className="px-3 text-steel-400 hover:text-steel-700"
                          aria-label={showPwd ? 'Hide password' : 'Show password'}
                        >
                          {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </FormField>

                  </>
                ) : (
                  /* Magic link mode */
                  <>
                    <FormField label="Work email" hint="We'll email you a 6-digit sign-in code — no password needed">
                      <div className="flex items-stretch rounded-md ring-1 ring-steel-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600/40">
                        <div className="grid place-items-center pl-3 pr-2 text-steel-400">
                          <Mail className="size-4" />
                        </div>
                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@greatwallgardens.estate"
                          className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-steel-900 outline-none placeholder:text-steel-300"
                        />
                      </div>
                    </FormField>
                  </>
                )}

                {/* Magic sent confirmation */}
                {magicSent && (
                  <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-[11px] text-emerald-800">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                    <p>Code sent to <strong>{email}</strong> — redirecting you now…</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[11px] text-red-800">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                {!magicSent && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? (magicMode ? 'Sending code…' : 'Signing in…')
                      : (magicMode ? 'Send sign-in code' : 'Continue')}
                    {!loading && <ArrowRight className="size-4" />}
                  </button>
                )}

                {/* Magic link toggle */}
                <p className="text-center text-[11px] text-steel-400">
                  {magicMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMagicMode(false); setMagicSent(false); setError('') }}
                        className="font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        Use password instead
                      </button>
                    </>
                  ) : (
                    <>
                      No password?{' '}
                      <button
                        type="button"
                        onClick={() => { setMagicMode(true); setError('') }}
                        className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <Sparkles className="size-3" /> Email me a code
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}

            {/* ── Enterprise SSO — coming soon ── */}
            {mode === 'sso' && (
              <div className="space-y-4">
                <div className="rounded-md border border-dashed border-steel-300 bg-white/60 p-5 text-center text-[11px] text-steel-500">
                  <ShieldCheck className="mx-auto mb-3 size-8 text-emerald-700 opacity-60" />
                  <p className="font-semibold text-steel-700 mb-1">Enterprise SSO — Coming soon</p>
                  <p className="leading-relaxed">
                    SAML 2.0 &amp; OIDC support (Okta, Azure AD, Google Workspace) is in development.
                    Contact your administrator to be notified when it&apos;s available.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('password'); setError('') }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-steel-200 bg-white py-2.5 text-sm font-semibold text-steel-700 transition hover:bg-steel-50"
                >
                  ← Sign in with password instead
                </button>
              </div>
            )}

            {/* Request access */}
            <p className="mt-6 text-xs text-steel-400">
              New to the platform?{' '}
              <a href="mailto:admin@greatwallgardens.estate" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Request workspace access
              </a>
              {' '}· Existing users can be added by an admin.
            </p>

            {/* Security notice */}
            <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                This is a private system. Unauthorised use is prohibited and may result in civil or criminal action.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-950/5 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-5">
          <div className="flex flex-col gap-3 text-[11px] text-steel-400 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-steel-500">© {new Date().getFullYear()} Great Wall Gardens</span>
              <a href="#" className="hover:text-steel-700">Terms of service</a>
              <a href="#" className="hover:text-steel-700">Privacy</a>
              <a href="#" className="hover:text-steel-700">DPA</a>
              <a href="#" className="hover:text-steel-700">Acceptable use</a>
              <a href="#" className="hover:text-steel-700">Cookies</a>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative grid size-1.5 place-items-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative size-1.5 rounded-full bg-emerald-600" />
                </span>
                All systems operational
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="size-3.5" /> East Africa · Nairobi
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LifeBuoy className="size-3.5" /> support@greatwallgardens.estate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ScrollText className="size-3.5" /> status.greatwallgardens.estate
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FormField({
  label, hint, right, children,
}: { label: string; hint?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold text-steel-700">{label}</label>
        {right}
      </div>
      {children}
      {hint && <p className="mt-1 text-[10px] text-steel-400">{hint}</p>}
    </div>
  )
}

function TrustBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-steel-200 bg-white px-2 py-1.5">
      <CheckCircle2 className="size-3.5 text-emerald-700" />
      <span className="text-[11px] font-semibold text-steel-700">{label}</span>
    </div>
  )
}

function ValueItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15">
        {icon}
      </div>
      <div>
        <p className="font-heading text-sm font-semibold text-steel-900">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-steel-500">{body}</p>
      </div>
    </div>
  )
}
