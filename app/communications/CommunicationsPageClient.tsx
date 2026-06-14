'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { FACILITY_MESSAGES, INTEGRATION_PROVIDERS } from '@/lib/mock-data'
import type { FacilityMessage, IntegrationCategory } from '@/lib/types'

// ── Provider helpers ──────────────────────────────────────────────────────────

const CHANNEL_CATEGORY_MAP: Record<string, IntegrationCategory> = {
  sms: 'sms',
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  email: 'email',
}

function getActiveProvider(channel: string) {
  const category = CHANNEL_CATEGORY_MAP[channel]
  if (!category) return null
  return INTEGRATION_PROVIDERS.find(p => p.category === category && p.is_active && p.status === 'connected') ?? null
}

const PROVIDER_SHORT: Record<string, string> = {
  africas_talking: "Africa's Talking",
  twilio: 'Twilio',
  vonage: 'Vonage',
  whatsapp_meta: 'Meta',
  telegram: 'Telegram',
  sendgrid: 'SendGrid',
  mpesa_daraja: 'Daraja',
}

function ChannelProviderPill({ channel }: { channel: string }) {
  const provider = getActiveProvider(channel)
  if (!provider) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-red-200 px-2 py-0.5 text-xs text-red-500">
        {channel} · not connected
      </span>
    )
  }
  const icons: Record<string, string> = { sms: '💬', whatsapp: '📱', telegram: '✈️', email: '📧', in_app: '🔔' }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs text-teal-700">
      {icons[channel] ?? '•'} {channel} · {PROVIDER_SHORT[provider.provider] ?? provider.provider}
    </span>
  )
}



function statusBadge(status: FacilityMessage['status']) {
  const map: Record<string, 'default'|'warning'|'success'|'danger'|'blue'> = {
    draft: 'default', sending: 'warning', sent: 'success', failed: 'danger', partial: 'warning'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function channelBadge(channel: string) {
  const map: Record<string, 'default'|'blue'|'success'|'warning'> = {
    sms: 'blue', email: 'success', in_app: 'default', whatsapp: 'warning'
  }
  return <Badge key={channel} variant={map[channel] ?? 'default'}>{channel}</Badge>
}

function audienceLabel(type: FacilityMessage['audience_type'], filter?: string) {
  const labels: Record<string, string> = {
    all_residents: 'All Residents', all_owners: 'All Owners', all_tenants: 'All Tenants',
    block: `Block: ${filter ?? ''}`, floor: `Floor ${filter ?? ''}`,
    unit: `Unit ${filter ?? ''}`, staff_only: 'Staff Only'
  }
  return labels[type] ?? type
}

function ComposePane({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-surface dark:bg-dark-surface rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-surface-border dark:border-dark-border">
          <h3 className="text-base font-semibold text-text">New Broadcast Message</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-text-muted">Subject</label>
            <input className="mt-1 w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Message subject…" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Audience</label>
            <select className="mt-1 w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>All Residents</option>
              <option>All Owners</option>
              <option>All Tenants</option>
              <option>Block A</option>
              <option>Block B</option>
              <option>Block C</option>
              <option>Staff Only</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Channels</label>
            <div className="flex gap-3 mt-1.5">
              {['SMS','Email','In-App'].map(ch => (
                <label key={ch} className="flex items-center gap-1.5 text-sm text-text cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  {ch}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Message</label>
            <textarea rows={4} className="mt-1 w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Write your message…" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-hover">Cancel</button>
            <button className="px-4 py-2 text-sm font-medium bg-surface text-text-muted border border-surface-border dark:border-dark-border rounded-lg hover:bg-surface-hover">Save Draft</button>
            <button className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Send Now</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommunicationsPageClient() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<FacilityMessage | null>(null)
  const [composing, setComposing] = useState(false)

  const filtered = FACILITY_MESSAGES.filter(m =>
    m.subject.toLowerCase().includes(search.toLowerCase())
  )

  const totalSent = FACILITY_MESSAGES.filter(m => m.status === 'sent').length
  const totalRecipients = FACILITY_MESSAGES.filter(m => m.status === 'sent').reduce((acc, m) => acc + m.recipient_count, 0)
  const drafts = FACILITY_MESSAGES.filter(m => m.status === 'draft').length

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Communications" subtitle="Broadcast messages and resident announcements" />

        {composing && <ComposePane onClose={() => setComposing(false)} />}

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Messages Sent',    value: totalSent,       color: 'text-green-600' },
            { label: 'Total Recipients', value: totalRecipients, color: 'text-blue-600' },
            { label: 'Drafts',           value: drafts,          color: 'text-text-muted' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
          <div className="flex items-center">
            <button onClick={() => setComposing(true)} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
              + New Message
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* list */}
          <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
            <div className="p-3 border-b border-surface-border dark:border-dark-border">
              <SearchInput value={search} onChange={setSearch} placeholder="Search messages…" />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(m => (
                <button key={m.id} onClick={() => setSelected(m)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === m.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-text truncate flex-1 mr-2">{m.subject}</span>
                    {statusBadge(m.status)}
                  </div>
                  <p className="text-xs text-text-muted">{audienceLabel(m.audience_type, m.audience_filter)}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {m.channels.map(c => channelBadge(c))}
                    <span className="text-xs text-text-muted">{m.recipient_count} recipients</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a message to view</div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text">{selected.subject}</h2>
                    <p className="text-sm text-text-muted">{audienceLabel(selected.audience_type, selected.audience_filter)} · {selected.recipient_count} recipients</p>
                  </div>
                  <div className="flex gap-1.5">{statusBadge(selected.status)}</div>
                </div>

                {/* stats */}
                {selected.delivery_stats && selected.status === 'sent' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Sent',      value: selected.delivery_stats.sent },
                      { label: 'Delivered', value: selected.delivery_stats.delivered },
                      { label: 'Read',      value: selected.delivery_stats.read ?? '—' },
                      { label: 'Failed',    value: selected.delivery_stats.failed },
                    ].map(s => (
                      <div key={s.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-text">{s.value}</p>
                        <p className="text-xs text-text-muted">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                    <p className="text-xs text-text-muted">Channels</p>
                    <div className="flex flex-wrap gap-1 mt-1">{selected.channels.map(c => channelBadge(c))}</div>
                  </div>
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                    <p className="text-xs text-text-muted">Created By / Sent At</p>
                    <p className="text-sm font-medium text-text">{selected.created_by}</p>
                    {selected.sent_at && <p className="text-xs text-text-muted">{selected.sent_at.replace('T',' ')}</p>}
                  </div>
                </div>

                <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                  <p className="text-xs font-semibold text-text-muted mb-2">Message Body</p>
                  <p className="text-sm text-text whitespace-pre-line leading-relaxed">{selected.body}</p>
                </div>

                {selected.status === 'draft' && (
                  <div className="flex gap-2">
                    <button className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Send Now</button>
                    <button className="px-4 py-1.5 text-sm font-medium bg-surface border border-surface-border dark:border-dark-border text-text-muted rounded-lg hover:bg-surface-hover">Edit</button>
                    <button className="px-4 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Discard</button>
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
