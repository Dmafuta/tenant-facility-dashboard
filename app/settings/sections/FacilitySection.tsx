'use client'
import React, { useState, useMemo } from 'react'
import { Building2, Car, User, Wrench, AlertTriangle, Plus, Info, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ENTRY_POINTS } from '@/lib/mock-data'
import type { EntryPoint, EntryPointType, EntryPointDirection } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Type icons ────────────────────────────────────────────────────────────────
const TYPE_ICON: Record<EntryPointType, React.ComponentType<{ className?: string }>> = {
  vehicle:    Car,
  pedestrian: User,
  service:    Wrench,
  emergency:  AlertTriangle,
  mixed:      Building2,
}

const TYPE_TINT: Record<EntryPointType, string> = {
  vehicle:    'text-rose-600 bg-rose-50',
  pedestrian: 'text-amber-600 bg-amber-50',
  service:    'text-slate-600 bg-slate-100',
  emergency:  'text-red-600 bg-red-50',
  mixed:      'text-violet-600 bg-violet-50',
}

const TYPE_LABEL: Record<EntryPointType, string> = {
  vehicle:    'Vehicle',
  pedestrian: 'Pedestrian',
  service:    'Service',
  emergency:  'Emergency',
  mixed:      'Mixed',
}

const DIRECTION_LABEL: Record<EntryPointDirection, string> = {
  entry: 'Entry only',
  exit:  'Exit only',
  both:  'Entry & Exit',
}

// ── Pills ─────────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active:      { label: 'Active',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    fault:       { label: 'Fault',        cls: 'bg-red-50 text-red-700 border-red-200' },
    inactive:    { label: 'Inactive',     cls: 'bg-surface text-text-muted border-surface-border dark:border-dark-border' },
    locked:      { label: 'Locked',       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    maintenance: { label: 'Maintenance',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-surface text-text-muted border-surface-border' }
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', s.cls)}>
      {s.label}
    </span>
  )
}

function ModePill({ manned }: { manned: boolean }) {
  return manned
    ? <span className="text-xs text-text-muted">Manned</span>
    : <span className="text-xs text-emerald-700">Automated</span>
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' | 'danger' }) {
  const cls = tone === 'success' ? 'text-emerald-600' : tone === 'danger' ? 'text-red-600' : 'text-text'
  return (
    <div className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card px-4 py-4 text-center">
      <div className={cn('text-2xl font-semibold tabular-nums', cls)}>{value}</div>
      <div className="mt-0.5 text-xs text-text-muted">{label}</div>
    </div>
  )
}

// ── DetailItem ────────────────────────────────────────────────────────────────
function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-sm text-text">{value}</div>
    </div>
  )
}

// ── Add Entry Point Modal ─────────────────────────────────────────────────────
function AddEntryPointModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Add Entry Point</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
            <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Main Vehicle Gate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="vehicle">Vehicle</option>
                <option value="pedestrian">Pedestrian</option>
                <option value="service">Service</option>
                <option value="emergency">Emergency</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Direction</label>
              <select className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="both">Entry &amp; Exit</option>
                <option value="entry">Entry only</option>
                <option value="exit">Exit only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Location description</label>
            <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. North perimeter, facing Ngong Road" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="always_open" className="accent-primary-600" />
            <label htmlFor="always_open" className="text-sm text-text">Always open (24/7)</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Opens</label>
              <input type="time" defaultValue="06:00" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Closes</label>
              <input type="time" defaultValue="22:00" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="manned" className="accent-primary-600" />
            <label htmlFor="manned" className="text-sm text-text">Requires staff (manned gate)</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <textarea className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text h-16 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { onClose() }}>Add Entry Point</Button>
        </div>
      </div>
    </div>
  )
}

// ── FacilitySection ───────────────────────────────────────────────────────────
export function FacilitySection() {
  const [showAdd, setShowAdd] = useState(false)

  const totals = useMemo(() => ({
    total:  ENTRY_POINTS.length,
    active: ENTRY_POINTS.filter((e) => e.status === 'active').length,
    fault:  ENTRY_POINTS.filter((e) => e.status === 'fault').length,
    manned: ENTRY_POINTS.filter((e) => e.requires_staff).length,
  }), [])

  return (
    <div className="relative">
      {/* Header */}
      <div className="border-b border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface">
        <div className="mx-auto max-w-5xl px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-text">Facility setup</h2>
              <p className="mt-1 text-sm text-text-muted">Building structure, entry points, and physical access configuration.</p>
            </div>
            <Badge variant="default" className="gap-1.5">
              <Building2 className="h-3 w-3" />
              Great Wall Gardens
            </Badge>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-8 py-8 space-y-8">
        {/* Building details */}
        <section className="rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
          <header className="flex items-center justify-between border-b border-surface-border dark:border-dark-border px-6 py-4">
            <div>
              <h3 className="text-sm font-semibold text-text">Building details</h3>
              <p className="mt-0.5 text-xs text-text-muted">Core information about the property registered on the platform.</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </header>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Property name"    value="Great Wall Gardens" />
            <DetailItem label="Total units"      value="200+ units across multiple phases" />
            <DetailItem label="Phase structure"  value="Residential + Commercial" />
            <DetailItem label="Year built"       value="2019" />
            <DetailItem label="Plot number"      value="LR No. 209/14820" />
            <DetailItem label="Physical address" value="Nairobi, Kenya" />
          </div>
        </section>

        {/* Entry points */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-text">Entry points</h3>
              <p className="mt-0.5 text-xs text-text-muted">All gates and access points for this facility.</p>
            </div>
            <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add entry point
            </Button>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total"  value={totals.total}  tone="neutral" />
            <StatCard label="Active" value={totals.active} tone="success" />
            <StatCard label="Fault"  value={totals.fault}  tone="danger" />
            <StatCard label="Manned" value={totals.manned} tone="neutral" />
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-surface-border dark:border-dark-border bg-white dark:bg-dark-card">
            <div className="grid grid-cols-[minmax(220px,2fr)_100px_120px_110px_90px_110px_80px] items-center gap-4 border-b border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
              <div>Entry point</div>
              <div>Type</div>
              <div>Direction</div>
              <div>Hours</div>
              <div>Status</div>
              <div>Mode</div>
              <div className="text-right">Actions</div>
            </div>
            <ul className="divide-y divide-surface-border dark:divide-dark-border">
              {ENTRY_POINTS.map((ep) => {
                const Icon = TYPE_ICON[ep.type] ?? Building2
                const tint = TYPE_TINT[ep.type] ?? 'text-text-muted bg-surface'
                const hours = ep.operating_hours?.always_open
                  ? '24/7'
                  : `${ep.operating_hours?.open_time ?? '–'} – ${ep.operating_hours?.close_time ?? '–'}`
                return (
                  <li
                    key={ep.id}
                    className="grid grid-cols-[minmax(220px,2fr)_100px_120px_110px_90px_110px_80px] items-center gap-4 px-5 py-3 text-sm hover:bg-surface-hover/30 dark:hover:bg-dark-hover/30"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', tint)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-text">{ep.name}</div>
                        <div className="truncate text-xs text-text-muted">{ep.location_description ?? ''}</div>
                      </div>
                    </div>
                    <div className="text-sm text-text-muted">{TYPE_LABEL[ep.type] ?? ep.type}</div>
                    <div className="text-sm text-text-muted">{DIRECTION_LABEL[ep.direction] ?? ep.direction}</div>
                    <div className="text-sm text-text-muted tabular-nums">{hours}</div>
                    <div><StatusPill status={ep.status} /></div>
                    <div><ModePill manned={ep.requires_staff ?? false} /></div>
                    <div className="flex items-center justify-end gap-1">
                      <button className="px-2 py-1 text-xs text-text-muted hover:text-text rounded hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors">Edit</button>
                      <button className="px-2 py-1 text-xs text-danger hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Remove</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-surface-border dark:border-dark-border bg-surface-hover/40 dark:bg-dark-hover p-3 text-xs text-text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Devices (biometric readers, ANPR cameras, boom gate controllers) are managed from the{' '}
              <a href="/access-control" className="font-medium text-text underline underline-offset-2 hover:text-primary-600">
                Access Control
              </a>{' '}
              page.
            </p>
          </div>
        </section>
      </div>

      <AddEntryPointModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
