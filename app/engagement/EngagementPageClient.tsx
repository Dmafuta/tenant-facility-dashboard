'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { ENGAGEMENTS } from '@/lib/mock-data'
import type { Engagement, EngagementResult } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(s: Engagement['status']) {
  const map: Record<string, string> = {
    open:      'bg-success/10 text-success',
    closed:    'bg-surface-border text-text-muted',
    draft:     'bg-warning/10 text-warning',
    cancelled: 'bg-danger/10 text-danger',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide', map[s])}>
      {s === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
      {s}
    </span>
  )
}

function eligibleLabel(e: Engagement['eligible']): string {
  const m: Record<string, string> = {
    owners:        'Homeowners only',
    tenants:       'Tenants only',
    all_residents: 'All residents',
    staff:         'Staff only',
  }
  return m[e] ?? e
}

function daysLeft(closes_at: string): string {
  const diff = new Date(closes_at).getTime() - Date.now()
  if (diff < 0) return 'Closed'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days === 1 ? '1 day left' : `${days} days left`
}

// ── ResultBar ──────────────────────────────────────────────────────────────

function ResultBar({ result, isVote, winning }: { result: EngagementResult; isVote: boolean; winning: boolean }) {
  const pct = isVote ? (result.weighted_percent ?? result.percent) : result.percent
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={cn('font-medium', winning ? 'text-primary-600 dark:text-primary-400' : 'text-text')}>
          {result.label}
        </span>
        <span className="text-text-muted">{result.count} · {pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-border dark:bg-dark-border overflow-hidden">
        <div
          className={cn('h-2 rounded-full transition-all duration-700', winning ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border border border-text-muted/20')}
          style={{ width: `${pct}%`, backgroundColor: winning ? undefined : '#94a3b8' }}
        />
      </div>
    </div>
  )
}

// ── EngagementCard ─────────────────────────────────────────────────────────

function EngagementCard({ item }: { item: Engagement }) {
  const [expanded, setExpanded] = useState(false)
  const hasResults = item.results && item.results.length > 0
  const participation = item.total_eligible && item.total_responses !== undefined
    ? Math.round((item.total_responses / item.total_eligible) * 100)
    : null
  const quorumMet = item.quorum_percent && participation !== null
    ? participation >= item.quorum_percent
    : null

  const winningOptionId = hasResults
    ? item.results!.reduce((a, b) => (a.percent > b.percent ? a : b)).option_id
    : null

  const typeIcon = { vote: '🗳️', poll: '📊', feedback: '💬' }[item.type]
  const typeLabel = { vote: 'Formal Vote', poll: 'Poll', feedback: 'Feedback' }[item.type]

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-base">{typeIcon}</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{typeLabel}</span>
              {statusBadge(item.status)}
              {item.is_anonymous && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-medium">🔒 Anonymous</span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-text leading-snug">{item.title}</h3>
          </div>
          {item.passed !== undefined && (
            <span className={cn('flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg', item.passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
              {item.passed ? '✓ Passed' : '✗ Failed'}
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-3">
          <span>👥 {eligibleLabel(item.eligible)}</span>
          {item.vote_weight === 'by_share_percent' && <span>⚖ Weighted by ownership %</span>}
          {item.quorum_percent && <span>Quorum: {item.quorum_percent}%</span>}
          <span>{item.status === 'open' ? daysLeft(item.closes_at) : `Closed ${item.closes_at.slice(0, 10)}`}</span>
        </div>

        {/* Participation */}
        {participation !== null && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Participation: {item.total_responses}/{item.total_eligible}</span>
              <span className={cn(quorumMet === true ? 'text-success font-medium' : quorumMet === false ? 'text-warning font-medium' : '')}>
                {participation}%{quorumMet === true ? ' · Quorum met ✓' : quorumMet === false ? ' · Below quorum' : ''}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-border dark:bg-dark-border overflow-hidden">
              <div
                className={cn('h-1.5 rounded-full', quorumMet ? 'bg-success' : 'bg-warning')}
                style={{ width: `${Math.min(participation, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Resolution text (votes) */}
        {item.resolution_text && (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover border-l-4 border-primary-500 text-xs text-text-muted italic mb-3">
            {item.resolution_text}
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-2">
            {item.results!.map(r => (
              <ResultBar
                key={r.option_id}
                result={r}
                isVote={item.type === 'vote'}
                winning={r.option_id === winningOptionId}
              />
            ))}
          </div>
        )}

        {/* Open text feedback placeholder */}
        {item.type === 'feedback' && !item.options && item.total_responses !== undefined && item.total_responses > 0 && (
          <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover text-xs text-text-muted">
            {item.total_responses} anonymous response{item.total_responses !== 1 ? 's' : ''} received.
            Individual responses are not shown to protect anonymity.
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-muted dark:bg-dark-hover border-t border-surface-border dark:border-dark-border">
        <span className="text-xs text-text-muted">Opens {item.opens_at.slice(0, 10)}</span>
        <div className="flex gap-2">
          {item.status === 'open' && item.description && (
            <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              {expanded ? 'Less' : 'Details'}
            </button>
          )}
          {item.status === 'open' && (
            <CanDo action="write" resource={{ type: 'person' }}>
              <Button size="sm" variant="primary">
                {item.type === 'vote' ? 'Cast Vote' : item.type === 'poll' ? 'Respond' : 'Give Feedback'}
              </Button>
            </CanDo>
          )}
          {item.status === 'draft' && (
            <CanDo action="write" resource={{ type: 'system_config' }}>
              <Button size="sm" variant="outline">Open for Responses</Button>
            </CanDo>
          )}
        </div>
      </div>

      {expanded && item.description && (
        <div className="px-4 pb-4 pt-2 text-xs text-text-muted border-t border-surface-border dark:border-dark-border">
          {item.description}
        </div>
      )}
    </Card>
  )
}

// ── Create Engagement Modal ────────────────────────────────────────────────

function CreateEngagementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<'poll' | 'vote' | 'feedback'>('poll')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Create Engagement</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { value: 'poll',     icon: '📊', label: 'Poll',         desc: 'Quick question, named responses' },
            { value: 'vote',     icon: '🗳️', label: 'Formal Vote',  desc: 'Weighted, quorum, binding'       },
            { value: 'feedback', icon: '💬', label: 'Feedback',     desc: 'Anonymous, open or structured'   },
          ] as const).map(t => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                'p-3 rounded-xl border-2 text-left transition-colors',
                type === t.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-surface-border dark:border-dark-border hover:border-primary-300'
              )}
            >
              <p className="text-xl mb-1">{t.icon}</p>
              <p className="text-xs font-semibold text-text">{t.label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <input className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm" placeholder="Title…" />
          <textarea className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm h-20 resize-none" placeholder="Description (optional)…" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Opens</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Closes</label>
              <input type="date" className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Who can respond</label>
            <select className="w-full px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-text text-sm">
              <option value="owners">Homeowners only</option>
              <option value="tenants">Tenants only</option>
              <option value="all_residents">All residents</option>
            </select>
          </div>
          {type === 'vote' && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-medium">Formal vote options</p>
              <p>Votes will be weighted by ownership share %. Quorum and resolution text can be set after creation.</p>
            </div>
          )}
          {type === 'feedback' && (
            <div className="flex items-center gap-2 text-sm">
              <input type="checkbox" id="anon" defaultChecked className="accent-primary-600" />
              <label htmlFor="anon" className="text-text-muted text-xs">Make responses fully anonymous (recommended)</label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { alert('Engagement created (demo)'); onClose() }}>Create as Draft</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function EngagementPageClient() {
  const [showCreate, setShowCreate] = useState(false)

  const votes    = useMemo(() => ENGAGEMENTS.filter(e => e.type === 'vote'), [])
  const polls    = useMemo(() => ENGAGEMENTS.filter(e => e.type === 'poll'), [])
  const feedback = useMemo(() => ENGAGEMENTS.filter(e => e.type === 'feedback'), [])

  const stats = useMemo(() => ({
    open:   ENGAGEMENTS.filter(e => e.status === 'open').length,
    closed: ENGAGEMENTS.filter(e => e.status === 'closed').length,
    draft:  ENGAGEMENTS.filter(e => e.status === 'draft').length,
    totalResponses: ENGAGEMENTS.reduce((s, e) => s + (e.total_responses ?? 0), 0),
  }), [])

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* Header action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {[
            { label: 'Open',      value: stats.open,           color: 'text-success'     },
            { label: 'Closed',    value: stats.closed,         color: 'text-text-muted'  },
            { label: 'Draft',     value: stats.draft,          color: 'text-warning'     },
            { label: 'Responses', value: stats.totalResponses, color: 'text-primary-600' },
          ].map(s => (
            <Card key={s.label} className="px-4 py-2 flex items-center gap-2">
              <span className={cn('text-xl font-bold', s.color)}>{s.value}</span>
              <span className="text-xs text-text-muted">{s.label}</span>
            </Card>
          ))}
        </div>
        <CanDo action="write" resource={{ type: 'system_config' }}>
          <Button onClick={() => setShowCreate(true)}>+ New Engagement</Button>
        </CanDo>
      </div>

      <Tabs defaultValue="votes">
        <TabsList>
          <TabsTrigger value="votes">Votes ({votes.length})</TabsTrigger>
          <TabsTrigger value="polls">Polls ({polls.length})</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="votes">
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-400">
              <strong>Formal votes</strong> are binding resolutions. Responses can be weighted by ownership share %.
              A quorum must be met for the result to be valid. All votes are named — no anonymity.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {votes.map(e => <EngagementCard key={e.id} item={e} />)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="polls">
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-surface-muted dark:bg-dark-hover text-xs text-text-muted">
              Polls are informal and advisory. Responses are named — management can see who voted for what.
              Results are visible as votes come in.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {polls.map(e => <EngagementCard key={e.id} item={e} />)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <div className="space-y-4 mt-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-400">
              <strong>🔒 Truly anonymous.</strong> We store only a one-way hash of your identity to prevent duplicate submissions.
              Management sees aggregate results only — individual responses are never linked to a person.
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {feedback.map(e => <EngagementCard key={e.id} item={e} />)}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <CreateEngagementModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
