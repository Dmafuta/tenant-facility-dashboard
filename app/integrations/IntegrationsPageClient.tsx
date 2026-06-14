'use client'

import { useState } from 'react'
import { INTEGRATION_PROVIDERS } from '@/lib/mock-data'
import type {
  IntegrationProvider,
  IntegrationCategory,
  ProviderKey,
} from '@/lib/types'

// ─── Category metadata ───────────────────────────────────────────────────────
const CATEGORY_META: Record<IntegrationCategory, { label: string; icon: string; description: string; color: string }> = {
  mpesa:    { label: 'M-Pesa',    icon: '💚', description: 'Receive rent & charges via Safaricom M-Pesa Daraja API', color: 'green' },
  sms:      { label: 'SMS',       icon: '💬', description: 'Send text notifications to tenants via SMS gateway', color: 'blue' },
  whatsapp: { label: 'WhatsApp',  icon: '📱', description: 'Rich messaging, templates & documents over WhatsApp', color: 'emerald' },
  telegram: { label: 'Telegram',  icon: '✈️',  description: 'Instant management alerts and bot commands', color: 'sky' },
  email:    { label: 'Email',     icon: '📧', description: 'Transactional and bulk email delivery', color: 'violet' },
}

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  mpesa_daraja:   'Safaricom Daraja API',
  africas_talking: "Africa's Talking",
  twilio:         'Twilio',
  vonage:         'Vonage (Nexmo)',
  whatsapp_meta:  'Meta Cloud API',
  telegram:       'Telegram',
  sendgrid:       'SendGrid',
}

const STATUS_BADGE: Record<IntegrationProvider['status'], { label: string; classes: string }> = {
  connected:    { label: 'Connected',    classes: 'bg-green-100 text-green-700' },
  disconnected: { label: 'Not connected', classes: 'bg-gray-100 text-gray-500' },
  error:        { label: 'Error',        classes: 'bg-red-100 text-red-700' },
  testing:      { label: 'Testing…',    classes: 'bg-amber-100 text-amber-700' },
}

// ─── Config field renderers ──────────────────────────────────────────────────
function ConfigField({
  label, value, secret = false, hint,
}: { label: string; value: string; secret?: boolean; hint?: string }) {
  const [show, setShow] = useState(false)
  const display = secret && !show ? '•'.repeat(Math.min(value.length, 32)) : value
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={display || '(not set)'}
          className="flex-1 rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-mono text-gray-700"
        />
        {secret && value && (
          <button
            onClick={() => setShow(s => !s)}
            className="text-xs text-teal-600 hover:underline whitespace-nowrap"
          >
            {show ? 'Hide' : 'Reveal'}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function MpesaConfigPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'mpesa_daraja' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="Environment" value={config.environment} />
      <ConfigField label="Shortcode Type" value={config.shortcode_type} />
      <ConfigField label="Shortcode (Paybill / Till)" value={config.shortcode} />
      <ConfigField label="Account Reference" value={config.account_reference} hint='Shown to payer on M-Pesa prompt, e.g. "RENT"' />
      <ConfigField label="Consumer Key" value={config.consumer_key} secret />
      <ConfigField label="Consumer Secret" value={config.consumer_secret} secret />
      <ConfigField label="Passkey" value={config.passkey} secret />
      <ConfigField label="STK Push Callback URL" value={config.callback_url} />
      <ConfigField label="C2B Confirmation URL" value={config.c2b_confirmation_url} />
      <ConfigField label="C2B Validation URL" value={config.c2b_validation_url} />
    </div>
  )
}

function ATConfigPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'africas_talking' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="Environment" value={config.environment} />
      <ConfigField label="Username" value={config.username} />
      <ConfigField label="API Key" value={config.api_key} secret />
      <ConfigField label="Sender ID" value={config.sender_id || ''} hint="Alphanumeric sender — requires Safaricom/AT approval" />
    </div>
  )
}

function TwilioConfigPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'twilio' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="Account SID" value={config.account_sid} />
      <ConfigField label="Auth Token" value={config.auth_token} secret />
      <ConfigField label="From Number" value={config.from_number} />
      {config.whatsapp_number && (
        <ConfigField label="WhatsApp Number" value={config.whatsapp_number} />
      )}
    </div>
  )
}

function VonageConfigPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'vonage' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="API Key" value={config.api_key} secret />
      <ConfigField label="API Secret" value={config.api_secret} secret />
      <ConfigField label="Sender Name" value={config.from_name} />
    </div>
  )
}

function WhatsAppMetaPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'whatsapp_meta' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="Phone Number ID" value={config.phone_number_id} />
      <ConfigField label="WhatsApp Business Account ID" value={config.waba_id} />
      <ConfigField label="Access Token" value={config.access_token} secret />
      <ConfigField label="Webhook Verify Token" value={config.verify_token} secret />
      <ConfigField label="Webhook URL" value={config.webhook_url} />
    </div>
  )
}

function TelegramConfigPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'telegram' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="Bot Token" value={config.bot_token} secret />
      <ConfigField label="Bot Username" value={config.bot_username} />
      <ConfigField label="Management Chat ID" value={config.management_chat_id || ''} hint="Telegram group/channel ID for management alerts" />
      <ConfigField label="Webhook URL" value={config.webhook_url || ''} />
    </div>
  )
}

function SendGridConfigPanel({ config }: { config: Extract<IntegrationProvider['config'], { provider: 'sendgrid' }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ConfigField label="API Key" value={config.api_key} secret />
      <ConfigField label="From Email" value={config.from_email} />
      <ConfigField label="From Name" value={config.from_name} />
      <ConfigField label="Reply-To" value={config.reply_to || ''} />
    </div>
  )
}

function renderConfigPanel(provider: IntegrationProvider) {
  const c = provider.config
  switch (c.provider) {
    case 'mpesa_daraja':   return <MpesaConfigPanel config={c} />
    case 'africas_talking': return <ATConfigPanel config={c} />
    case 'twilio':          return <TwilioConfigPanel config={c} />
    case 'vonage':          return <VonageConfigPanel config={c} />
    case 'whatsapp_meta':  return <WhatsAppMetaPanel config={c} />
    case 'telegram':        return <TelegramConfigPanel config={c} />
    case 'sendgrid':        return <SendGridConfigPanel config={c} />
  }
}

// ─── Provider Card ───────────────────────────────────────────────────────────
function ProviderCard({
  provider,
  isExpanded,
  onToggle,
  onSetActive,
  onTest,
  onDisconnect,
}: {
  provider: IntegrationProvider
  isExpanded: boolean
  onToggle: () => void
  onSetActive: () => void
  onTest: () => void
  onDisconnect: () => void
}) {
  const badge = STATUS_BADGE[provider.status]
  const isConnected = provider.status === 'connected'

  return (
    <div className={`rounded-lg border bg-white overflow-hidden transition-all ${provider.is_active ? 'border-teal-300 ring-1 ring-teal-200' : 'border-gray-200'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{PROVIDER_LABELS[provider.provider]}</span>
            {provider.is_active && (
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">Active</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500' : provider.status === 'error' ? 'bg-red-500' : 'bg-gray-400'}`} />
              {badge.label}
            </span>
            {provider.last_tested_at && (
              <span className="text-xs text-gray-400">
                Tested {new Date(provider.last_tested_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && !provider.is_active && (
            <button
              onClick={onSetActive}
              className="rounded px-2.5 py-1 text-xs font-medium text-teal-700 border border-teal-200 hover:bg-teal-50"
            >
              Set as Default
            </button>
          )}
          {isConnected && (
            <button
              onClick={onTest}
              className="rounded px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
            >
              Test
            </button>
          )}
          {isConnected ? (
            <button
              onClick={onDisconnect}
              className="rounded px-2.5 py-1 text-xs font-medium text-red-600 border border-red-100 hover:bg-red-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              className="rounded px-2.5 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700"
            >
              Connect
            </button>
          )}
          <button
            onClick={onToggle}
            className="rounded p-1 text-gray-400 hover:text-gray-600"
            title={isExpanded ? 'Collapse' : 'Configure'}
          >
            <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error bar */}
      {provider.last_error && (
        <div className="mx-4 mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {provider.last_error}
        </div>
      )}

      {/* Expanded config panel */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuration</span>
            <button className="text-xs font-medium text-teal-600 hover:underline">Edit</button>
          </div>
          {renderConfigPanel(provider)}
        </div>
      )}
    </div>
  )
}

// ─── Category Section ────────────────────────────────────────────────────────
function CategorySection({
  category,
  providers,
  expandedId,
  setExpandedId,
  onSetActive,
  onTest,
  onDisconnect,
}: {
  category: IntegrationCategory
  providers: IntegrationProvider[]
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  onSetActive: (id: string) => void
  onTest: (id: string) => void
  onDisconnect: (id: string) => void
}) {
  const meta = CATEGORY_META[category]
  const connectedCount = providers.filter(p => p.status === 'connected').length

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-3 bg-gray-50 px-5 py-4 border-b border-gray-100">
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{meta.label}</h3>
            <span className="text-xs text-gray-400">
              {connectedCount}/{providers.length} connected
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 hover:border-teal-400 hover:text-teal-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Provider
        </button>
      </div>

      {/* Provider cards */}
      <div className="divide-y divide-gray-100">
        {providers.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            isExpanded={expandedId === p.id}
            onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
            onSetActive={() => onSetActive(p.id)}
            onTest={() => onTest(p.id)}
            onDisconnect={() => onDisconnect(p.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export function IntegrationsPageClient() {
  const [providers, setProviders] = useState<IntegrationProvider[]>(INTEGRATION_PROVIDERS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleSetActive = (id: string) => {
    const target = providers.find(p => p.id === id)
    if (!target) return
    setProviders(prev =>
      prev.map(p =>
        p.category === target.category
          ? { ...p, is_active: p.id === id }
          : p
      )
    )
    showToast(`${PROVIDER_LABELS[target.provider]} is now the active ${CATEGORY_META[target.category].label} provider.`)
  }

  const handleTest = (id: string) => {
    const target = providers.find(p => p.id === id)
    if (!target) return
    setProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'testing' } : p))
    setTimeout(() => {
      setProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'connected', last_tested_at: new Date().toISOString() } : p))
      showToast(`✓ ${PROVIDER_LABELS[target.provider]} connection test passed.`)
    }, 1800)
  }

  const handleDisconnect = (id: string) => {
    const target = providers.find(p => p.id === id)
    if (!target) return
    setProviders(prev => prev.map(p => p.id === id ? { ...p, status: 'disconnected', is_active: false } : p))
    showToast(`${PROVIDER_LABELS[target.provider]} disconnected.`)
  }

  // Group by category in defined order
  const categoryOrder: IntegrationCategory[] = ['mpesa', 'sms', 'whatsapp', 'telegram', 'email']
  const grouped = categoryOrder.reduce<Record<IntegrationCategory, IntegrationProvider[]>>(
    (acc, cat) => {
      acc[cat] = providers.filter(p => p.category === cat)
      return acc
    },
    {} as Record<IntegrationCategory, IntegrationProvider[]>
  )

  const totalConnected = providers.filter(p => p.status === 'connected').length
  const totalProviders = providers.length

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
        {/* Summary banner */}
        <div className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {totalConnected} of {totalProviders} integrations connected
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Each category can have multiple providers configured — one is active at a time. Switch providers without losing saved credentials.
            </p>
          </div>
          <div className="flex gap-6 text-center">
            {categoryOrder.map(cat => {
              const ps = grouped[cat]
              const active = ps.find(p => p.is_active && p.status === 'connected')
              return (
                <div key={cat} className="flex flex-col items-center">
                  <span className="text-lg">{CATEGORY_META[cat].icon}</span>
                  <span className="text-xs font-medium text-gray-700">{CATEGORY_META[cat].label}</span>
                  <span className={`text-xs ${active ? 'text-green-600' : 'text-gray-400'}`}>
                    {active ? '● Active' : '○ None'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info: multi-provider explanation */}
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-800">
          <strong>Multi-provider support:</strong> You can configure multiple providers in each category (e.g. both Africa&apos;s Talking and Twilio for SMS). Only the <strong>Active</strong> provider is used when sending — switch at any time without re-entering credentials.
        </div>

        {/* Category sections */}
        {categoryOrder.map(cat => (
          <CategorySection
            key={cat}
            category={cat}
            providers={grouped[cat]}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onSetActive={handleSetActive}
            onTest={handleTest}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>
    </main>
  )
}
