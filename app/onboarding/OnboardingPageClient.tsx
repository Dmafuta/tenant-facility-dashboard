'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { ONBOARDING_APPLICATIONS } from '@/lib/mock-data'
import type { OnboardingApplication, OnboardingStage } from '@/lib/types'

const STAGE_ORDER: OnboardingStage[] = [
  'applied','under_review','approved','lease_signing',
  'deposit_payment','move_in_inspection','key_handover','active',
]
const STAGE_LABELS: Record<OnboardingStage, string> = {
  applied: 'Applied',
  under_review: 'Under Review',
  approved: 'Approved',
  lease_signing: 'Lease Signing',
  deposit_payment: 'Deposit Payment',
  move_in_inspection: 'Move-In Inspection',
  key_handover: 'Key Handover',
  active: 'Active',
}
const STAGE_ICONS: Record<OnboardingStage, string> = {
  applied: '📝', under_review: '🔍', approved: '✅', lease_signing: '📋',
  deposit_payment: '💵', move_in_inspection: '🏠', key_handover: '🗝', active: '🎉',
}

function StageTimeline({ app }: { app: OnboardingApplication }) {
  const currentIdx = STAGE_ORDER.indexOf(app.current_stage)
  return (
    <div className="space-y-0">
      {STAGE_ORDER.map((stage, i) => {
        const record = app.stage_history.find(h => h.stage === stage)
        const isCompleted = !!record?.completed_at
        const isCurrent = stage === app.current_stage && !isCompleted
        const isFuture = i > currentIdx

        return (
          <div key={stage} className="flex gap-3">
            {/* connector */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 border-2 ${
                isCompleted ? 'bg-primary-500 border-primary-500 text-white' :
                isCurrent   ? 'bg-amber-400 border-amber-400 text-white' :
                              'bg-surface border-surface-border dark:border-dark-border text-text-muted dark:bg-dark-surface'
              }`}>
                {isCompleted ? '✓' : STAGE_ICONS[stage]}
              </div>
              {i < STAGE_ORDER.length - 1 && (
                <div className={`w-0.5 h-8 ${isCompleted ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`} />
              )}
            </div>
            {/* content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isFuture ? 'text-text-muted' : 'text-text'}`}>
                  {STAGE_LABELS[stage]}
                </span>
                {isCurrent && <Badge variant="warning">Current</Badge>}
                {isCompleted && <Badge variant="success">Done</Badge>}
              </div>
              {record?.completed_at && (
                <p className="text-xs text-text-muted mt-0.5">
                  {record.completed_at.split('T')[0]}
                  {record.completed_by ? ` · ${record.completed_by}` : ''}
                </p>
              )}
              {record?.notes && (
                <p className="text-xs text-text-muted italic mt-0.5">{record.notes}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function OnboardingPageClient() {
  const [selected, setSelected] = useState<OnboardingApplication | null>(
    ONBOARDING_APPLICATIONS[0] ?? null
  )

  const inProgress = ONBOARDING_APPLICATIONS.filter(a => a.status === 'in_progress')
  const completed  = ONBOARDING_APPLICATIONS.filter(a => a.status === 'completed')

  const stageIdx = selected ? STAGE_ORDER.indexOf(selected.current_stage) : -1
  const progress = selected ? Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100) : 0

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Onboarding" subtitle="Track new tenant applications through to move-in" />

        {/* KPIs */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'In Progress', value: inProgress.length, color: 'text-primary-600' },
            { label: 'Completed',   value: completed.length,  color: 'text-green-600' },
            { label: 'Avg Stages Done', value: `${Math.round(ONBOARDING_APPLICATIONS.filter(a=>a.status==='in_progress').reduce((acc,a)=> acc + a.stage_history.filter(h=>h.completed_at).length, 0) / Math.max(inProgress.length,1))}/${STAGE_ORDER.length}`, color: 'text-blue-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* list */}
          <div className="w-72 flex-shrink-0 border-r border-surface-border dark:border-dark-border flex flex-col overflow-y-auto">
            {inProgress.length > 0 && (
              <>
                <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">In Progress</p>
                {inProgress.map(app => {
                  const idx = STAGE_ORDER.indexOf(app.current_stage)
                  const pct = Math.round(((idx + 1) / STAGE_ORDER.length) * 100)
                  return (
                    <button key={app.id} onClick={() => setSelected(app)}
                      className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors border-b border-surface-border dark:border-dark-border ${selected?.id === app.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-text">{app.applicant_name}</span>
                        <span className="text-xs text-primary-600 font-semibold">{pct}%</span>
                      </div>
                      <p className="text-xs text-text-muted">{app.unit_label}</p>
                      <div className="mt-1.5 h-1.5 bg-surface-border dark:bg-dark-border rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {STAGE_LABELS[app.current_stage]}
                      </p>
                    </button>
                  )
                })}
              </>
            )}
            {completed.length > 0 && (
              <>
                <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Completed</p>
                {completed.map(app => (
                  <button key={app.id} onClick={() => setSelected(app)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors border-b border-surface-border dark:border-dark-border ${selected?.id === app.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-text">{app.applicant_name}</span>
                      <Badge variant="success">Done</Badge>
                    </div>
                    <p className="text-xs text-text-muted">{app.unit_label}</p>
                    <p className="text-xs text-text-muted">Moved in {app.target_move_in}</p>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm">Select an application</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text">{selected.applicant_name}</h2>
                    <p className="text-sm text-text-muted">{selected.unit_label} · Target move-in: {selected.target_move_in}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">{progress}%</p>
                    <p className="text-xs text-text-muted">Progress</p>
                  </div>
                </div>

                {/* progress bar */}
                <div className="h-2 bg-surface-border dark:bg-dark-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>

                {/* contact */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Email',  value: selected.applicant_email },
                    { label: 'Phone',  value: selected.applicant_phone },
                    { label: 'ID',     value: selected.national_id },
                    { label: 'Assigned', value: selected.assigned_to ?? 'Unassigned' },
                  ].map(f => (
                    <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                      <p className="text-xs text-text-muted">{f.label}</p>
                      <p className="text-sm font-medium text-text">{f.value}</p>
                    </div>
                  ))}
                </div>

                {/* stage timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-text mb-4">Stage Timeline</h3>
                  <StageTimeline app={selected} />
                </div>

                {/* next action */}
                {selected.status === 'in_progress' && (
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
                    <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-1">Next Action Required</p>
                    <p className="text-sm text-primary-800 dark:text-primary-300">
                      Complete: <strong>{STAGE_LABELS[selected.current_stage]}</strong>
                    </p>
                    <button className="mt-2 px-4 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 transition-colors">
                      Mark Stage Complete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
