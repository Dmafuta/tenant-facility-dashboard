'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Building2, Lock, Mail, Eye, EyeOff, ShieldCheck, KeyRound,
  Fingerprint, CheckCircle2, ArrowRight, LifeBuoy, ScrollText,
  AlertTriangle, BarChart3, Building, Users, Workflow, Globe2,
  Sparkles,
} from 'lucide-react'
import { loginWithPassword, sendOtp } from '@/lib/api/auth'

export default function LoginPage() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [mode,         setMode]         = useState<'password' | 'magic'>('password')
  const [magicSent,    setMagicSent]    = useState(false)
  const [error,        setError]        = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'magic') {
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

          {/* ── LEFT — brand + narrative ─────────────────────────────── */}
          <section className="flex flex-col justify-between">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-emerald-600 font-heading text-base font-bold text-white">
                  G
                </div>
                <div className="leading-tight">
                  <p className="font-heading text-base font-bold tracking-tight text-steel-900">
                    Great Wall Gardens
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-steel-400">
                    Facility Operations Platform
                  </p>
                </div>
              </div>

              {/* Hero copy */}
              <div className="mt-12 max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Estate management
                </p>
                <h1 className="mt-3 font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-steel-900 sm:text-5xl">
                  Every property, lease and resident — under one roof.
                </h1>
                <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-steel-500">
                  Manage units, tenants, utilities, maintenance, compliance and finance
                  — with an immutable audit trail baked into every action.
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
                  body="Self-service requests, engagement, and communications in one place."
                />
                <ValueItem
                  icon={<BarChart3 className="size-4" />}
                  title="Financial control"
                  body="Rent roll, arrears, service charges and reporting with GL-grade integrity."
                />
              </div>
            </div>

            {/* Trust footer under narrative */}
            <div className="mt-14 max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-steel-400">
                Trusted controls
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <TrustBadge label="Two-factor auth" />
                <TrustBadge label="GDPR" />
                <TrustBadge label="AES-256 encrypted" />
                <TrustBadge label="Immutable audit" />
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-[11px] text-steel-500">
                <Lock className="size-3 text-emerald-700" />
                TLS 1.3 in transit · AES-256 at rest · Immutable audit chain
              </p>
            </div>
          </section>

          {/* ── RIGHT — sign-in console ──────────────────────────────── */}
          <section className="lg:pt-24">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Secure workspace access
              </p>
              <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-steel-900">
                Sign in to your portal
              </h2>
              <p className="mt-1.5 text-sm text-steel-400">
                Access is logged and monitored under the estate audit policy.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="mb-5 grid grid-cols-2 rounded-md bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => { setMode('password'); setMagicSent(false); setError('') }}
                className={
                  'inline-flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ' +
                  (mode === 'password'
                    ? 'bg-white text-steel-900 shadow-sm ring-1 ring-steel-200'
                    : 'text-steel-500 hover:text-steel-900')
                }
              >
                <Mail className="size-3.5" /> Email &amp; password
              </button>
              <button
                type="button"
                onClick={() => { setMode('magic'); setMagicSent(false); setError('') }}
                className={
                  'inline-flex items-center justify-center gap-1.5 rounded py-1.5 text-xs font-semibold transition ' +
                  (mode === 'magic'
                    ? 'bg-white text-steel-900 shadow-sm ring-1 ring-steel-200'
                    : 'text-steel-500 hover:text-steel-900')
                }
              >
                <Sparkles className="size-3.5" /> Magic link
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <FormField label="Work email">
                <div className="flex items-stretch rounded-md ring-1 ring-steel-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600/40 transition">
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

              {/* Password */}
              {mode === 'password' && (
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
                  <div className="flex items-stretch rounded-md ring-1 ring-steel-200 bg-white focus-within:ring-2 focus-within:ring-emerald-600/40 transition">
                    <div className="grid place-items-center pl-3 pr-2 text-steel-400">
                      <Lock className="size-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="flex-1 bg-transparent py-2.5 text-sm text-steel-900 outline-none placeholder:text-steel-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="px-3 text-steel-400 hover:text-steel-700"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormField>
              )}

              {/* Magic link hint */}
              {mode === 'magic' && !magicSent && (
                <p className="text-[12px] leading-relaxed text-steel-400">
                  We'll email you a one-time sign-in code — no password needed.
                </p>
              )}

              {/* Magic sent confirmation */}
              {magicSent && (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-[12px] text-emerald-800">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                  <p>
                    Code sent — check your inbox, then{' '}
                    <Link
                      href={`/verify?email=${encodeURIComponent(email)}`}
                      className="font-semibold underline"
                    >
                      enter it here
                    </Link>.
                  </p>
                </div>
              )}

              {/* Remember me + MFA */}
              {mode === 'password' && (
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-steel-500 cursor-pointer">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-steel-300 text-emerald-600 focus:ring-emerald-600/40"
                    />
                    Keep me signed in
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-steel-400">
                    <Fingerprint className="size-3" /> MFA protected
                  </span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[12px] text-red-800">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              {!magicSent && (
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? (mode === 'magic' ? 'Sending code…' : 'Signing in…')
                    : (mode === 'magic' ? 'Send magic link' : 'Continue')}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              )}
            </form>

            {/* Security notice */}
            <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[11px] text-amber-900">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <p>
                This is a private system. Unauthorized use is prohibited and may result in civil or criminal action.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-950/5 bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-5">
          <div className="flex flex-col gap-3 text-[11px] text-steel-400 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-semibold text-steel-500">© {new Date().getFullYear()} Great Wall Gardens</span>
              <a href="#" className="hover:text-steel-700">Terms</a>
              <a href="#" className="hover:text-steel-700">Privacy</a>
              <a href="#" className="hover:text-steel-700">Acceptable use</a>
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
                <ShieldCheck className="size-3.5" /> 2FA protected
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FormField({
  label, right, children,
}: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-semibold text-steel-700">{label}</label>
        {right}
      </div>
      {children}
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
