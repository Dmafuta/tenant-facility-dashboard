'use client'
import Link from 'next/link'
import {
  ShieldCheck, Radio, Activity, Globe2, Building2, UserRound,
  Command, BadgeCheck, FileLock2, ScrollText, LifeBuoy, BookOpen,
  Gauge, CircleDot,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Sticky status bar                                                    */
/* ------------------------------------------------------------------ */

function Chip({
  icon: Icon, label, value, tone = 'default', title,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string; value: string; tone?: 'default' | 'success' | 'warn' | 'info'; title?: string
}) {
  const toneClass =
    tone === 'success' ? 'text-emerald-500'
    : tone === 'warn' ? 'text-amber-500'
    : tone === 'info' ? 'text-sky-500'
    : 'text-steel-400'
  return (
    <div
      title={title ?? `${label}: ${value}`}
      className="flex items-center gap-1.5 whitespace-nowrap px-2.5 h-full border-r border-zinc-950/5 last:border-r-0"
    >
      <Icon className={'h-3.5 w-3.5 ' + toneClass} />
      <span className="text-[10.5px] uppercase tracking-wider text-steel-400">{label}</span>
      <span className="text-[11px] font-medium tabular-nums text-steel-700">{value}</span>
    </div>
  )
}

export function StatusBar() {
  return (
    <div
      role="status"
      aria-label="System status"
      className="shrink-0 h-7 border-t border-zinc-950/5 bg-white/95 backdrop-blur"
    >
      <div className="flex h-full items-center overflow-x-auto text-xs">
        <Chip icon={Building2} label="Scope" value="Great Wall Gardens · All properties" />
        <Chip icon={BadgeCheck} label="Env" value="Production" tone="success" />
        <Chip icon={Globe2} label="Region" value="af-east-1 · Nairobi" tone="info" />
        <Chip icon={ShieldCheck} label="Audit" value="Verified" tone="success" />
        <Chip icon={FileLock2} label="ABAC" value="v1 · active" tone="success" />
        <Chip icon={Radio} label="Realtime" value="Connected" tone="success" />
        <Chip icon={Activity} label="Jobs" value="Idle" tone="info" />
        <div className="flex-1" />
        <Chip icon={UserRound} label="Signed in" value="FacilityOS" />
        <div className="flex items-center gap-1 px-2.5 text-[11px] text-steel-400">
          <Command className="h-3.5 w-3.5" />
          <kbd className="rounded border border-zinc-950/10 bg-steel-50/60 px-1 font-mono text-[10px]">⌘K</kbd>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Compliance footer                                                    */
/* ------------------------------------------------------------------ */

const APP_VERSION = '2026.7'

export function ComplianceFooter() {
  return (
    <footer className="border-t border-zinc-950/5 bg-steel-50/40">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-heading text-sm font-semibold text-steel-900">FacilityOS</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-steel-500">
              Property operations platform for Great Wall Gardens. ABAC-enforced, audit-signed.
            </p>
            <div className="mt-3 space-y-1 text-[11px] text-steel-400">
              <div>
                <span>Version</span>{' '}
                <span className="font-mono text-steel-600">{APP_VERSION}</span>
              </div>
              <div>
                <span>East Africa · Nairobi (UTC+03:00)</span>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">
              Compliance
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['SOC 2 Type II', 'ISO 27001', 'GDPR', 'WCAG 2.1 AA'].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-950/5 bg-white px-2 py-0.5 text-[10.5px] font-medium text-steel-700"
                >
                  <BadgeCheck className="h-3 w-3 text-emerald-500" />
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-steel-400">
              <CircleDot className="h-3 w-3 text-emerald-500" />
              <span>All systems operational</span>
              <Link href="/audit" className="ml-auto text-emerald-700 hover:underline">
                Audit trail →
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">Resources</div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {[
                { icon: BookOpen, label: 'Documentation', href: '#' },
                { icon: ScrollText, label: 'Changelog', href: '#' },
                { icon: Gauge, label: 'Status page', href: '#' },
                { icon: LifeBuoy, label: 'Support', href: 'mailto:admin@greatwallgardens.estate' },
              ].map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="flex items-center gap-2 text-steel-500 transition-colors hover:text-steel-900"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">Legal</div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {['Terms of Service', 'Privacy Policy', 'Data Processing Addendum', 'Cookie Preferences'].map((l) => (
                <li key={l}>
                  <a href="#" className="text-steel-500 transition-colors hover:text-steel-900">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-zinc-950/5 pt-4 text-[11px] text-steel-400 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Great Wall Gardens · Powered by FacilityOS. All rights reserved.</div>
          <div className="flex items-center gap-3">
            <span>Timezone: Africa/Nairobi (UTC+03:00)</span>
            <span className="opacity-40">·</span>
            <span>Language: English (EN)</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
