'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import {
  getAssignmentSummary, assignBlock, clearBlock, getReaders,
  type PhaseSummary, type BlockSummary, type AssignmentUser,
} from '@/lib/api/assignments'

function progressBar(assigned: number, total: number) {
  const pct = total === 0 ? 0 : Math.round((assigned / total) * 100)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-surface-border dark:bg-dark-border overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-success' : 'bg-primary-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-text-muted whitespace-nowrap">{assigned}/{total}</span>
    </div>
  )
}

interface BlockRowProps {
  block: BlockSummary
  period: string
  readers: AssignmentUser[]
  onRefresh: () => void
}

function BlockRow({ block, period, readers, onRefresh }: BlockRowProps) {
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Current assignment: if a single reader covers the whole block show that; otherwise show "Multiple"
  const primaryReader = block.readers.length === 1 ? block.readers[0] : null
  const currentReaderId = primaryReader?.reader_user_id ?? ''

  async function handleAssign(e: React.ChangeEvent<HTMLSelectElement>) {
    const readerId = e.target.value
    if (!readerId) return
    const reader = readers.find(r => r.id === readerId)
    if (!reader) return
    setSaving(true)
    setError(null)
    try {
      await assignBlock({
        billing_period: period,
        block: block.block,
        reader_user_id: readerId,
        reader_name: reader.full_name,
      })
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    setClearing(true)
    setError(null)
    try {
      await clearBlock(period, block.block)
      onRefresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clear')
    } finally {
      setClearing(false)
    }
  }

  const isFullyAssigned = block.assigned_meters === block.total_meters && block.total_meters > 0
  const isPartial = block.assigned_meters > 0 && block.assigned_meters < block.total_meters

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 border-b border-surface-border dark:border-dark-border last:border-0">
      {/* Block label */}
      <div className="flex items-center gap-2 min-w-[90px]">
        <span className="font-semibold text-sm text-text">Block {block.block}</span>
        {isFullyAssigned && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-success/10 text-success">Full</span>
        )}
        {isPartial && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning/10 text-warning">Partial</span>
        )}
      </div>

      {/* Progress */}
      <div className="flex-1 min-w-[120px]">
        {progressBar(block.assigned_meters, block.total_meters)}
        {block.readers.length > 1 && (
          <p className="text-[10px] text-text-muted mt-0.5">
            {block.readers.map(r => r.reader_name).join(' · ')}
          </p>
        )}
      </div>

      {/* Reader select */}
      <div className="flex items-center gap-2">
        <select
          className={cn(
            'text-sm rounded-lg border px-2 py-1.5 bg-surface dark:bg-dark-surface text-text',
            'border-surface-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-primary-500',
            saving && 'opacity-50 cursor-not-allowed'
          )}
          value={currentReaderId}
          onChange={handleAssign}
          disabled={saving || block.total_meters === 0}
        >
          <option value="">
            {block.readers.length > 1 ? 'Multiple readers…' : block.total_meters === 0 ? 'No meters' : 'Assign reader…'}
          </option>
          {readers.map(r => (
            <option key={r.id} value={r.id}>{r.full_name}</option>
          ))}
        </select>

        {block.assigned_meters > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="text-xs text-text-muted hover:text-danger transition-colors disabled:opacity-50"
            title="Clear assignments for this block"
          >
            {clearing ? '…' : 'Clear'}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-danger w-full sm:w-auto">{error}</p>}
    </div>
  )
}

interface PhaseCardProps {
  phase: PhaseSummary
  period: string
  readers: AssignmentUser[]
  onRefresh: () => void
}

function PhaseCard({ phase, period, readers, onRefresh }: PhaseCardProps) {
  const [expanded, setExpanded] = useState(true)
  const pct = phase.total_meters === 0 ? 0 : Math.round((phase.assigned_meters / phase.total_meters) * 100)

  return (
    <Card className="overflow-hidden">
      {/* Phase header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-text">{phase.phase}</span>
          <span className="text-xs text-text-muted">{phase.blocks.length} block{phase.blocks.length !== 1 ? 's' : ''} · {phase.total_meters} meter{phase.total_meters !== 1 ? 's' : ''}</span>
          {pct === 100 && phase.total_meters > 0 && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success">All assigned</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28 hidden sm:block">
            {progressBar(phase.assigned_meters, phase.total_meters)}
          </div>
          <span className="text-text-muted text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Block rows */}
      {expanded && (
        <div className="border-t border-surface-border dark:border-dark-border">
          {phase.blocks.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">No meters in this phase.</p>
          ) : (
            phase.blocks.map(b => (
              <BlockRow
                key={b.block}
                block={b}
                period={period}
                readers={readers}
                onRefresh={onRefresh}
              />
            ))
          )}
        </div>
      )}
    </Card>
  )
}

interface ReaderSummaryRow {
  reader_user_id: string
  reader_name: string
  blocks: string[]
  total: number
  completed: number
  pending: number
}

function buildReaderSummary(phases: PhaseSummary[]): ReaderSummaryRow[] {
  const map = new Map<string, ReaderSummaryRow>()
  for (const phase of phases) {
    for (const block of phase.blocks) {
      for (const r of block.readers) {
        const existing = map.get(r.reader_user_id)
        if (existing) {
          if (!existing.blocks.includes(block.block)) existing.blocks.push(block.block)
          existing.total += r.meter_count
          existing.completed += r.completed
          existing.pending += r.pending
        } else {
          map.set(r.reader_user_id, {
            reader_user_id: r.reader_user_id,
            reader_name: r.reader_name,
            blocks: [block.block],
            total: r.meter_count,
            completed: r.completed,
            pending: r.pending,
          })
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.reader_name.localeCompare(b.reader_name))
}

export function AssignReadingsTab() {
  const defaultPeriod = new Date().toISOString().slice(0, 7)
  const [period, setPeriod]   = useState(defaultPeriod)
  const [phases, setPhases]   = useState<PhaseSummary[]>([])
  const [readers, setReaders] = useState<AssignmentUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAssignmentSummary(period)
      setPhases(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load assignment summary')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    getReaders()
      .then(setReaders)
      .catch(() => {/* non-fatal */})
  }, [])

  useEffect(() => { loadSummary() }, [loadSummary])

  const readerSummary = buildReaderSummary(phases)
  const totalMeters   = phases.reduce((s, p) => s + p.total_meters, 0)
  const totalAssigned = phases.reduce((s, p) => s + p.assigned_meters, 0)

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-muted whitespace-nowrap">Billing period</label>
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="text-sm rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-surface text-text px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <Button variant="outline" size="sm" onClick={loadSummary} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
        <div className="ml-auto text-sm text-text-muted">
          {totalAssigned} / {totalMeters} meters assigned
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger text-sm px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* Reader assignment summary */}
      {readerSummary.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-text mb-3">Assignment Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {readerSummary.map(r => (
              <div key={r.reader_user_id} className="rounded-lg border border-surface-border dark:border-dark-border p-3 space-y-1.5">
                <p className="text-sm font-medium text-text">{r.reader_name}</p>
                <p className="text-xs text-text-muted">Blocks: {r.blocks.sort().join(', ')}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-text">{r.total} meters</span>
                  {r.completed > 0 && <span className="text-success">{r.completed} done</span>}
                  {r.pending > 0   && <span className="text-text-muted">{r.pending} pending</span>}
                </div>
                {progressBar(r.completed, r.total)}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Phase cards */}
      {loading && phases.length === 0 ? (
        <div className="text-sm text-text-muted text-center py-10">Loading…</div>
      ) : phases.length === 0 ? (
        <div className="text-sm text-text-muted text-center py-10">No metered units found.</div>
      ) : (
        phases.map(phase => (
          <PhaseCard
            key={phase.phase}
            phase={phase}
            period={period}
            readers={readers}
            onRefresh={loadSummary}
          />
        ))
      )}

      {readers.length === 0 && !loading && (
        <p className="text-xs text-text-muted text-center">
          No meter readers found. Assign the Meter Reader, Bulk Meter Reader, or Field Technician role to staff members in HR.
        </p>
      )}
    </div>
  )
}
