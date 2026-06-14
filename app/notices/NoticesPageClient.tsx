'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { NOTICES, NOTICE_TEMPLATES } from '@/lib/mock-data'
import type { Notice } from '@/lib/types'

function noticeTypeBadge(type: Notice['notice_type']) {
  const map: Record<string, 'danger'|'warning'|'default'|'blue'|'orange'> = {
    arrears_demand: 'danger', breach_notice: 'warning', notice_to_vacate: 'danger',
    rent_increase: 'orange', lease_renewal: 'blue', maintenance_notice: 'default',
    general_notice: 'default', eviction_notice: 'danger'
  }
  return <Badge variant={map[type] ?? 'default'}>{type.replace(/_/g,' ')}</Badge>
}

function noticeStatusBadge(status: Notice['status']) {
  const map: Record<string, 'default'|'blue'|'success'|'warning'|'danger'> = {
    draft: 'default', sent: 'blue', acknowledged: 'success',
    disputed: 'warning', expired: 'default', withdrawn: 'danger'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function deliveryMethodIcon(method: string) {
  const map: Record<string, string> = { email: '📧', sms: '💬', hand_delivered: '🤝', posted: '✉️' }
  return map[method] ?? '📨'
}

function NoticesList() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Notice | null>(null)

  const filtered = NOTICES.filter(n =>
    n.person_name.toLowerCase().includes(search.toLowerCase()) ||
    n.unit_label.toLowerCase().includes(search.toLowerCase()) ||
    n.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border flex items-center gap-2 flex-shrink-0">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search notices…" />
          </div>
          <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 whitespace-nowrap">
            + New Notice
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(n => (
            <button key={n.id} onClick={() => setSelected(n)}
              className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === n.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium text-text truncate flex-1 mr-2">{n.subject}</span>
                {noticeStatusBadge(n.status)}
              </div>
              <p className="text-xs text-text-muted">{n.person_name} · {n.unit_label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {noticeTypeBadge(n.notice_type)}
                <span className="text-xs text-text-muted">{n.created_date}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="py-8 text-sm text-text-muted text-center">No notices found.</p>}
        </div>
      </div>

      <div className={cn('flex-1 flex flex-col', !selected && 'hidden lg:flex')}>
        {selected && (
          <div className="lg:hidden flex items-center px-4 pt-3 pb-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              Back to list
            </button>
          </div>
        )}
        {!selected ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a notice to view</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text">{selected.subject}</h2>
                <p className="text-sm text-text-muted">{selected.person_name} · {selected.unit_label}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {noticeTypeBadge(selected.notice_type)}
                {noticeStatusBadge(selected.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Created', value: selected.created_date },
                { label: 'Created By', value: selected.created_by },
                ...(selected.sent_date ? [{ label: 'Sent', value: selected.sent_date }] : []),
                ...(selected.response_deadline ? [{ label: 'Response Deadline', value: selected.response_deadline }] : []),
                ...(selected.acknowledged_date ? [{ label: 'Acknowledged', value: selected.acknowledged_date }] : []),
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text">{f.value}</p>
                </div>
              ))}
            </div>

            {/* body */}
            <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
              <p className="text-xs font-semibold text-text-muted mb-2">Notice Body</p>
              <p className="text-sm text-text whitespace-pre-line leading-relaxed">{selected.body}</p>
            </div>

            {/* delivery */}
            {selected.delivery.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted mb-2">Delivery Channels</p>
                <div className="space-y-2">
                  {selected.delivery.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg px-3 py-2">
                      <span className="text-base">{deliveryMethodIcon(d.method)}</span>
                      <div className="flex-1">
                        <span className="text-sm text-text capitalize">{d.method.replace('_',' ')}</span>
                        {d.delivered_to && <p className="text-xs text-text-muted">{d.delivered_to}</p>}
                      </div>
                      {d.acknowledged_at ? (
                        <Badge variant="success">Acknowledged</Badge>
                      ) : d.failed ? (
                        <Badge variant="danger">Failed</Badge>
                      ) : d.delivered_at ? (
                        <Badge variant="blue">Delivered</Badge>
                      ) : (
                        <Badge variant="default">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === 'draft' && (
              <div className="flex gap-2">
                <button className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Send Notice</button>
                <button className="px-4 py-1.5 text-sm font-medium bg-surface text-text-muted border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-hover">Edit</button>
              </div>
            )}

            {selected.notes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplatesTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Notice Templates</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">+ New Template</button>
      </div>
      <div className="space-y-3">
        {NOTICE_TEMPLATES.map(t => (
          <div key={t.id} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-text">{t.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{t.subject}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.variables.map(v => (
                    <span key={v} className="text-[10px] font-mono bg-surface-hover dark:bg-dark-hover border border-surface-border dark:border-dark-border rounded px-1.5 py-0.5 text-text-muted">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0 ml-3">
                {noticeTypeBadge(t.notice_type)}
                <Badge variant={t.active ? 'success' : 'default'}>{t.active ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NoticesPageClient() {
  const sent = NOTICES.filter(n => n.status === 'sent').length
  const draft = NOTICES.filter(n => n.status === 'draft').length
  const acknowledged = NOTICES.filter(n => n.status === 'acknowledged').length
  const disputed = NOTICES.filter(n => n.status === 'disputed').length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Notices" subtitle="Formal notices, demand letters and compliance communications" />

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Sent',         value: sent,         color: 'text-blue-600' },
            { label: 'Draft',        value: draft,        color: 'text-text-muted' },
            { label: 'Acknowledged', value: acknowledged, color: 'text-green-600' },
            { label: 'Disputed',     value: disputed,     color: 'text-red-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="notices" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="notices">All Notices</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="notices"   className="flex flex-1 overflow-hidden min-h-0 mt-0"><NoticesList /></TabsContent>
          <TabsContent value="templates" className="flex flex-1 overflow-hidden min-h-0 mt-0"><TemplatesTab /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
