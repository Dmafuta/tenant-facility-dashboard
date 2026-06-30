'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getIntegrations, saveEmailIntegration, saveAfricasTalkingIntegration,
  saveAfrinetIntegration,
  saveMpesaIntegration, saveTelegramIntegration, savePremblyIntegration,
  testEmailIntegration, testSmsIntegration, testTelegramIntegration, testMpesaIntegration,
  listMpesaAccounts, createMpesaAccount, updateMpesaAccount, deleteMpesaAccount,
  setDefaultMpesaAccount, testMpesaAccount, registerC2bUrls,
  type IntegrationSettings, type MpesaAccount,
} from '@/lib/api/settings'
import { PhoneInput } from '@/components/ui/PhoneInput'

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder, hint, sensitive, alreadySet,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  hint?: string
  sensitive?: boolean
  alreadySet?: boolean
}) {
  const [show, setShow] = useState(false)
  const inputType = sensitive && !show ? 'password' : 'text'
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
        {alreadySet && (
          <span className="ml-1.5 text-green-600 font-normal">● set</span>
        )}
      </label>
      <div className="flex gap-1.5">
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={alreadySet ? 'Leave blank to keep current value' : (placeholder ?? '')}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        {sensitive && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
      ${configured ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-green-500' : 'bg-gray-400'}`} />
      {configured ? 'Configured' : 'Not configured'}
    </span>
  )
}

function SaveBtn({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
    </button>
  )
}

function TestResult({ result, onClear }: { result: string | null; onClear: () => void }) {
  if (!result) return null
  const ok = result.startsWith('Test') || result.includes('sent') || result.includes('working')
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      <span className="shrink-0">{ok ? '✓' : '✗'}</span>
      <span className="flex-1">{result}</span>
      <button onClick={onClear} className="text-gray-400 hover:text-gray-600">×</button>
    </div>
  )
}

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-gray-900">{title}</span>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-5">{children}</div>}
    </div>
  )
}

// ── Email card ────────────────────────────────────────────────────────────────

function EmailCard({ initial, onSave }: { initial: IntegrationSettings['email']; onSave: (s: IntegrationSettings) => void }) {
  const [form, setForm] = useState({
    host: initial.host, port: initial.port, username: initial.username,
    password: '', fromName: initial.fromName,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        host: form.host, port: form.port, username: form.username, fromName: form.fromName,
      }
      if (form.password) payload.password = form.password
      const updated = await saveEmailIntegration(payload)
      onSave(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    if (!testEmail) return
    setTesting(true)
    setResult(null)
    try {
      const msg = await testEmailIntegration(testEmail)
      setResult(typeof msg === 'string' ? msg : 'Test email sent!')
    } catch (e: any) {
      setResult('Failed: ' + (e?.message ?? 'Unknown error'))
    } finally { setTesting(false) }
  }

  return (
    <Card icon="📧" title={`Email (SMTP) — ${initial.configured ? 'Configured' : 'Not configured'}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">Outbound email via Zoho, Gmail, SendGrid SMTP or any mail server.</p>
        <StatusBadge configured={initial.configured} />
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="SMTP Host" value={form.host} onChange={f('host')} placeholder="smtp.zoho.com" />
          <Field label="Port" value={form.port} onChange={f('port')} placeholder="587" />
        </div>
        <Field label="Username / From Address" value={form.username} onChange={f('username')} placeholder="noreply@yourdomain.com" />
        <Field label="Password / App Password" value={form.password} onChange={f('password')} sensitive alreadySet={initial.password === '***'} />
        <Field label="From Name" value={form.fromName} onChange={f('fromName')} placeholder="FacilityOS" />
        <div className="flex justify-end pt-2">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </form>
      {/* Test section */}
      <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 mb-2">Send a test email</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !testEmail}
            className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>
        <TestResult result={result} onClear={() => setResult(null)} />
      </div>
    </Card>
  )
}

// ── Africa's Talking card ─────────────────────────────────────────────────────

function AfricasTalkingCard({ initial, onSave }: { initial: IntegrationSettings['africastalking']; onSave: (s: IntegrationSettings) => void }) {
  const [form, setForm] = useState({
    username: initial.username, apiKey: '', senderId: initial.senderId, environment: initial.environment || 'sandbox',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [result, setResult] = useState<string | null>(null)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        username: form.username, senderId: form.senderId, environment: form.environment,
      }
      if (form.apiKey) payload.apiKey = form.apiKey
      const updated = await saveAfricasTalkingIntegration(payload)
      onSave(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    if (!testPhone) return
    setTesting(true)
    setResult(null)
    try {
      const msg = await testSmsIntegration(testPhone)
      setResult(typeof msg === 'string' ? msg : 'SMS sent!')
    } catch (e: any) {
      setResult('Failed: ' + (e?.message ?? 'Unknown error'))
    } finally { setTesting(false) }
  }

  return (
    <Card icon="💬" title={`Africa's Talking (SMS) — ${initial.configured ? 'Configured' : 'Not configured'}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">Send SMS notifications and OTPs via Africa's Talking gateway.</p>
        <StatusBadge configured={initial.configured} />
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username" value={form.username} onChange={f('username')} placeholder="sandbox" />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Environment</label>
            <select value={form.environment} onChange={e => f('environment')(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>
        <Field label="API Key" value={form.apiKey} onChange={f('apiKey')} sensitive alreadySet={initial.apiKey === '***'} />
        <Field label="Sender ID" value={form.senderId} onChange={f('senderId')} placeholder="FacilityOS"
          hint="Alphanumeric sender ID — requires Africa's Talking approval for production" />
        <div className="flex justify-end pt-2">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </form>
      <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 mb-2">Send a test SMS</p>
        <div className="flex gap-2">
          <PhoneInput value={testPhone} onChange={setTestPhone} className="flex-1" />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !testPhone}
            className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            {testing ? 'Sending…' : 'Send Test SMS'}
          </button>
        </div>
        <TestResult result={result} onClear={() => setResult(null)} />
      </div>
    </Card>
  )
}

// ── Afrinet card ─────────────────────────────────────────────────────────────

function AfrinetCard({ initial, onSave }: { initial: IntegrationSettings['afrinet']; onSave: (s: IntegrationSettings) => void }) {
  const [form, setForm] = useState({
    apiKey: '', partnerId: initial.partnerId, shortcode: initial.shortcode, baseUrl: initial.baseUrl,
    provider: 'afrinet',
  })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [testing, setTesting] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [result, setResult]   = useState<string | null>(null)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        partnerId: form.partnerId, shortcode: form.shortcode,
        baseUrl: form.baseUrl, provider: 'afrinet',
      }
      if (form.apiKey) payload.apiKey = form.apiKey
      const updated = await saveAfrinetIntegration(payload)
      onSave(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    if (!testPhone) return
    setTesting(true)
    setResult(null)
    try {
      const msg = await testSmsIntegration(testPhone)
      setResult(typeof msg === 'string' ? msg : 'SMS sent!')
    } catch (e: any) {
      setResult('Failed: ' + (e?.message ?? 'Unknown error'))
    } finally { setTesting(false) }
  }

  return (
    <Card icon="📡" title={`Afrinet Bulk SMS — ${initial.configured ? 'Configured' : 'Not configured'}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">Send SMS notifications via Afrinet Telecom (Kenya). Saving this card sets Afrinet as the active SMS provider.</p>
        <StatusBadge configured={initial.configured} />
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="API Key" value={form.apiKey} onChange={f('apiKey')} sensitive alreadySet={initial.apiKey === '***'} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Partner ID" value={form.partnerId} onChange={f('partnerId')} placeholder="Your partner ID" />
          <Field label="Shortcode / Sender ID" value={form.shortcode} onChange={f('shortcode')} placeholder="e.g. FacilityOS" />
        </div>
        <Field label="Base URL" value={form.baseUrl} onChange={f('baseUrl')} placeholder="https://sms.imarabiz.com/api/services"
          hint="Leave blank to use the default Afrinet endpoint" />
        <div className="flex justify-end pt-2">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </form>
      <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 mb-2">Send a test SMS via Afrinet</p>
        <div className="flex gap-2">
          <PhoneInput value={testPhone} onChange={setTestPhone} className="flex-1" />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !testPhone || !initial.configured}
            className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            {testing ? 'Sending…' : 'Send Test SMS'}
          </button>
        </div>
        <TestResult result={result} onClear={() => setResult(null)} />
      </div>
    </Card>
  )
}

// ── MPesa Account Form (create / edit) ────────────────────────────────────────

const BLANK_ACCOUNT_FORM = {
  name: '', shortcode: '', accountReference: '', passkey: '',
  consumerKey: '', consumerSecret: '', initiatorName: '',
  securityCredential: '', callbackUrl: '', b2cResultUrl: '', b2cTimeoutUrl: '',
  environment: 'sandbox',
}

function MpesaAccountForm({
  initial, onDone, onCancel,
}: {
  initial?: MpesaAccount
  onDone: (a: MpesaAccount) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial ? {
    name: initial.name, shortcode: initial.shortcode,
    accountReference: initial.accountReference ?? '',
    passkey: '', consumerKey: '', consumerSecret: '',
    initiatorName: initial.initiatorName ?? '',
    securityCredential: '', callbackUrl: initial.callbackUrl ?? '',
    b2cResultUrl: initial.b2cResultUrl ?? '', b2cTimeoutUrl: initial.b2cTimeoutUrl ?? '',
    environment: initial.environment ?? 'sandbox',
  } : { ...BLANK_ACCOUNT_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        name: form.name, shortcode: form.shortcode,
        accountReference: form.accountReference,
        initiatorName: form.initiatorName,
        callbackUrl: form.callbackUrl, b2cResultUrl: form.b2cResultUrl,
        b2cTimeoutUrl: form.b2cTimeoutUrl, environment: form.environment,
      }
      if (form.passkey)            payload.passkey = form.passkey
      if (form.consumerKey)        payload.consumerKey = form.consumerKey
      if (form.consumerSecret)     payload.consumerSecret = form.consumerSecret
      if (form.securityCredential) payload.securityCredential = form.securityCredential
      const result = initial
        ? await updateMpesaAccount(initial.id, payload)
        : await createMpesaAccount(payload)
      onDone(result)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-semibold text-gray-800">{initial ? 'Edit' : 'Add'} Paybill Account</h4>
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Account Name *" value={form.name} onChange={f('name')} placeholder="e.g. Block A Rent" />
        <Field label="Shortcode (Paybill/Till) *" value={form.shortcode} onChange={f('shortcode')} placeholder="174379" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account Reference" value={form.accountReference} onChange={f('accountReference')} placeholder="RENT"
          hint="Shown to payer on phone" />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Environment</label>
          <select value={form.environment} onChange={e => f('environment')(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
          </select>
        </div>
      </div>
      <Field label="LipaNaMpesa Passkey" value={form.passkey} onChange={f('passkey')} sensitive
        alreadySet={initial?.passkey === '***'} />

      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-teal-600 hover:text-teal-700 list-none flex items-center gap-1">
          <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Own Daraja credentials (optional — leave blank to use global credentials)
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Consumer Key" value={form.consumerKey} onChange={f('consumerKey')} sensitive alreadySet={initial?.consumerKey === '***'} />
            <Field label="Consumer Secret" value={form.consumerSecret} onChange={f('consumerSecret')} sensitive alreadySet={initial?.consumerSecret === '***'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="B2C Initiator Name" value={form.initiatorName} onChange={f('initiatorName')} />
            <Field label="B2C Security Credential" value={form.securityCredential} onChange={f('securityCredential')} sensitive alreadySet={initial?.securityCredential === '***'} />
          </div>
          <Field label="STK Callback URL" value={form.callbackUrl} onChange={f('callbackUrl')} placeholder="https://yourdomain.com/api/pay/notify" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="B2C Result URL" value={form.b2cResultUrl} onChange={f('b2cResultUrl')} />
            <Field label="B2C Timeout URL" value={form.b2cTimeoutUrl} onChange={f('b2cTimeoutUrl')} />
          </div>
        </div>
      </details>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Update' : 'Add Account'}
        </button>
      </div>
    </form>
  )
}

// ── Register C2B Modal ────────────────────────────────────────────────────────

function deriveC2bUrls(callbackUrl: string | undefined) {
  if (!callbackUrl) return { confirmationUrl: '', validationUrl: '' }
  const base = callbackUrl.replace(/\/api\/.*$/, '')
  return {
    confirmationUrl: base + '/api/pay/confirm',
    validationUrl:   base + '/api/pay/validate',
  }
}

function RegisterC2bModal({
  account, onClose,
}: {
  account: MpesaAccount
  onClose: () => void
}) {
  const derived = deriveC2bUrls(account.callbackUrl ?? undefined)
  const [confirmationUrl, setConfirmationUrl] = useState(derived.confirmationUrl)
  const [validationUrl,   setValidationUrl]   = useState(derived.validationUrl)
  const [responseType,    setResponseType]    = useState('Completed')
  const [registering,     setRegistering]     = useState(false)
  const [result,          setResult]          = useState<string | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  async function handleRegister() {
    if (!confirmationUrl.trim() || !validationUrl.trim()) {
      setError('Both URLs are required.')
      return
    }
    setRegistering(true); setError(null); setResult(null)
    try {
      const msg = await registerC2bUrls({
        account_id:       account.id,
        confirmation_url: confirmationUrl.trim(),
        validation_url:   validationUrl.trim(),
        response_type:    responseType,
      })
      setResult(msg)
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed')
    } finally { setRegistering(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Register C2B URLs</h3>
            <p className="text-xs text-gray-500 mt-0.5">Shortcode: <strong>{account.shortcode}</strong> · {account.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {result ? (
          <div className="px-5 py-8 text-center space-y-3">
            <div className="text-3xl">{result.toLowerCase().includes('success') ? '✅' : '⚠️'}</div>
            <p className="text-sm font-medium text-gray-900">{result}</p>
            <p className="text-xs text-gray-400">Safaricom may take a few minutes to activate the new URLs.</p>
            <button onClick={onClose} className="mt-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Close
            </button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800">
              These URLs will be registered with Safaricom Daraja. Tenants who pay your paybill will trigger the confirmation URL, which auto-reconciles their charge.
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Confirmation URL <span className="text-red-400">*</span></label>
              <input
                value={confirmationUrl}
                onChange={e => setConfirmationUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="https://yourdomain.com/api/pay/confirm"
              />
              <p className="text-xs text-gray-400">Called by Safaricom after payment succeeds.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Validation URL <span className="text-red-400">*</span></label>
              <input
                value={validationUrl}
                onChange={e => setValidationUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="https://yourdomain.com/api/pay/validate"
              />
              <p className="text-xs text-gray-400">Called before payment is accepted. Leave as-is unless you need custom validation.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Response Type</label>
              <select
                value={responseType}
                onChange={e => setResponseType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="Completed">Completed — process payment even if validation URL is unreachable</option>
                <option value="Cancelled">Cancelled — reject payment if validation URL is unreachable</option>
              </select>
              <p className="text-xs text-gray-400">
                <strong>Recommended: Completed</strong> — prevents payments being rejected due to temporary server downtime.
              </p>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleRegister}
                disabled={registering}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {registering ? 'Registering…' : '💚 Register with Safaricom'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MPesa Accounts List ───────────────────────────────────────────────────────

function MpesaAccountsList() {
  const [accounts, setAccounts]   = useState<MpesaAccount[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<MpesaAccount | 'new' | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [testingId, setTestingId] = useState<string | null>(null)
  const [result, setResult]       = useState<string | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)
  const [registerTarget, setRegisterTarget] = useState<MpesaAccount | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    listMpesaAccounts().then(setAccounts).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSetDefault = async (id: string) => {
    const updated = await setDefaultMpesaAccount(id)
    setAccounts(updated)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteMpesaAccount(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
    } finally { setDeletingId(null) }
  }

  const handleTest = async (id: string) => {
    if (!testPhone) return
    setTestingId(id)
    setResult(null)
    try {
      const res = await testMpesaAccount(id, testPhone)
      setResult(res.accepted ? `✓ STK push sent! ${res.customerMessage ?? ''}` : `✗ Failed: ${res.customerMessage}`)
    } catch (e: any) {
      setResult('✗ ' + (e?.message ?? 'Error'))
    } finally { setTestingId(null) }
  }

  const handleDone = (saved: MpesaAccount) => {
    setAccounts(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      return idx >= 0 ? prev.map(a => a.id === saved.id ? saved : a) : [...prev, saved]
    })
    setEditing(null)
  }

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading accounts…</div>

  return (
    <div className="space-y-3">
      {registerTarget && (
        <RegisterC2bModal account={registerTarget} onClose={() => setRegisterTarget(null)} />
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Paybill Accounts</p>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1 rounded-lg border border-dashed border-teal-300 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Paybill
        </button>
      </div>

      {accounts.length === 0 && editing !== 'new' && (
        <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400">
          No paybill accounts configured yet.<br />
          <button onClick={() => setEditing('new')} className="mt-1 text-teal-600 hover:underline">
            Add your first account →
          </button>
        </div>
      )}

      {/* Account rows */}
      {accounts.map(account => (
        <div key={account.id}>
          {editing === account ? (
            <MpesaAccountForm initial={account} onDone={handleDone} onCancel={() => setEditing(null)} />
          ) : (
            <div className={`rounded-lg border px-4 py-3 ${account.isDefault ? 'border-teal-300 bg-teal-50/40' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{account.name}</span>
                    {account.isDefault && (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">Default</span>
                    )}
                    {!account.active && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
                    )}
                    {account.hasOwnCredentials && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Own Daraja App</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span>Shortcode: <strong className="text-gray-700">{account.shortcode}</strong></span>
                    {account.accountReference && <span>Ref: <strong className="text-gray-700">{account.accountReference}</strong></span>}
                    <span className={`capitalize ${account.environment === 'production' ? 'text-green-600' : 'text-amber-600'}`}>
                      {account.environment}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {!account.isDefault && (
                    <button onClick={() => handleSetDefault(account.id)}
                      className="rounded px-2 py-1 text-xs text-teal-700 border border-teal-200 hover:bg-teal-50">
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => setRegisterTarget(account)}
                    title="Register C2B confirmation & validation URLs with Safaricom Daraja"
                    className="rounded px-2 py-1 text-xs text-emerald-700 border border-emerald-200 hover:bg-emerald-50">
                    💚 Register C2B
                  </button>
                  <button onClick={() => setEditing(account)}
                    className="rounded px-2 py-1 text-xs text-gray-600 border border-gray-200 hover:bg-gray-50">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={deletingId === account.id}
                    className="rounded px-2 py-1 text-xs text-red-600 border border-red-100 hover:bg-red-50 disabled:opacity-50">
                    {deletingId === account.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add form */}
      {editing === 'new' && (
        <MpesaAccountForm onDone={handleDone} onCancel={() => setEditing(null)} />
      )}

      {/* Test section */}
      {accounts.length > 0 && (
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">Test STK Push per account (sends KES 1 prompt)</p>
          <div className="flex gap-2">
            <PhoneInput value={testPhone} onChange={setTestPhone} className="flex-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            {accounts.filter(a => a.active).map(account => (
              <button key={account.id}
                onClick={() => handleTest(account.id)}
                disabled={!testPhone || testingId !== null}
                className="rounded-lg border border-teal-200 px-3 py-1 text-xs text-teal-700 hover:bg-teal-50 disabled:opacity-50">
                {testingId === account.id ? 'Sending…' : `Test "${account.name}"`}
              </button>
            ))}
          </div>
          {result && <TestResult result={result} onClear={() => setResult(null)} />}
        </div>
      )}
    </div>
  )
}

// ── MPesa card ────────────────────────────────────────────────────────────────

function MpesaCard({ initial, onSave }: { initial: IntegrationSettings['mpesa']; onSave: (s: IntegrationSettings) => void }) {
  const [form, setForm] = useState({
    consumerKey: '', consumerSecret: '',
    initiatorName: initial.initiatorName,
    securityCredential: '', callbackUrl: initial.callbackUrl,
    b2cResultUrl: initial.b2cResultUrl, b2cTimeoutUrl: initial.b2cTimeoutUrl,
    environment: initial.environment || 'sandbox',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        initiatorName: form.initiatorName,
        callbackUrl: form.callbackUrl, b2cResultUrl: form.b2cResultUrl,
        b2cTimeoutUrl: form.b2cTimeoutUrl, environment: form.environment,
      }
      if (form.consumerKey)        payload.consumerKey = form.consumerKey
      if (form.consumerSecret)     payload.consumerSecret = form.consumerSecret
      if (form.securityCredential) payload.securityCredential = form.securityCredential
      const updated = await saveMpesaIntegration(payload)
      onSave(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <Card icon="💚" title={`M-Pesa Daraja — ${initial.configured ? 'Configured' : 'Not configured'}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">Collect rent and charges via Safaricom Daraja API (STK Push + B2C).</p>
        <StatusBadge configured={initial.configured} />
      </div>

      {/* Global Daraja credentials (shared across all paybill accounts unless overridden) */}
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Global Daraja Credentials
          <span className="ml-1.5 font-normal normal-case text-gray-400">— used by all accounts unless each account has its own</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Consumer Key" value={form.consumerKey} onChange={f('consumerKey')} sensitive alreadySet={initial.consumerKey === '***'} />
          <Field label="Consumer Secret" value={form.consumerSecret} onChange={f('consumerSecret')} sensitive alreadySet={initial.consumerSecret === '***'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="B2C Initiator Name" value={form.initiatorName} onChange={f('initiatorName')} placeholder="testapi" />
          <Field label="B2C Security Credential" value={form.securityCredential} onChange={f('securityCredential')} sensitive alreadySet={initial.securityCredential === '***'} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Default Environment</label>
          <select value={form.environment} onChange={e => f('environment')(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="sandbox">Sandbox (sandbox.safaricom.co.ke)</option>
            <option value="production">Production (api.safaricom.co.ke)</option>
          </select>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
          Callback URLs must be publicly reachable. Use <strong>ngrok</strong> in development.
        </div>
        <Field label="Default STK Push Callback URL" value={form.callbackUrl} onChange={f('callbackUrl')} placeholder="https://yourdomain.com/api/pay/notify" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default B2C Result URL" value={form.b2cResultUrl} onChange={f('b2cResultUrl')} placeholder="https://yourdomain.com/api/pay/disburse" />
          <Field label="Default B2C Timeout URL" value={form.b2cTimeoutUrl} onChange={f('b2cTimeoutUrl')} placeholder="https://yourdomain.com/api/pay/disburse-timeout" />
        </div>
        <div className="flex justify-end pt-1">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </form>

      {/* Paybill accounts */}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <MpesaAccountsList />
      </div>
    </Card>
  )
}

// ── Telegram card ─────────────────────────────────────────────────────────────

function TelegramCard({ initial, onSave }: { initial: IntegrationSettings['telegram']; onSave: (s: IntegrationSettings) => void }) {
  const [form, setForm] = useState({ botToken: '', chatId: initial.chatId })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [testing, setTesting] = useState(false)
  const [testChatId, setTestChatId] = useState('')
  const [result, setResult]   = useState<string | null>(null)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = { chatId: form.chatId }
      if (form.botToken) payload.botToken = form.botToken
      const updated = await saveTelegramIntegration(payload)
      onSave(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    try {
      const msg = await testTelegramIntegration(testChatId || undefined)
      setResult(typeof msg === 'string' ? msg : 'Message sent!')
    } catch (e: any) {
      setResult('Failed: ' + (e?.message ?? 'Unknown error'))
    } finally { setTesting(false) }
  }

  return (
    <Card icon="✈️" title={`Telegram Bot — ${initial.configured ? 'Configured' : 'Not configured'}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">Send instant management alerts and system notifications via Telegram Bot.</p>
        <StatusBadge configured={initial.configured} />
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 mb-4">
        Create a bot with <strong>@BotFather</strong> → get the token. Add the bot to your management group and get the Chat ID using <code>@userinfobot</code>.
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Bot Token" value={form.botToken} onChange={f('botToken')} sensitive alreadySet={initial.botToken === '***'} placeholder="123456:ABC-DEF1234..." />
        <Field label="Default Chat ID (admin group)" value={form.chatId} onChange={f('chatId')} placeholder="-1001234567890"
          hint="ID of the group or channel where system alerts are sent" />
        <div className="flex justify-end pt-2">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </form>
      <div className="mt-5 border-t border-gray-100 pt-4 space-y-2">
        <p className="text-xs font-medium text-gray-500 mb-2">Send a test message</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={testChatId}
            onChange={e => setTestChatId(e.target.value)}
            placeholder="Chat ID (blank = use default)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="rounded-lg border border-teal-200 px-3 py-1.5 text-sm text-teal-700 hover:bg-teal-50 disabled:opacity-50"
          >
            {testing ? 'Sending…' : 'Send Test'}
          </button>
        </div>
        <TestResult result={result} onClear={() => setResult(null)} />
      </div>
    </Card>
  )
}

// ── Prembly Identity Verification ────────────────────────────────────────────

function PremblCard({ initial, onSave }: { initial: IntegrationSettings['prembly']; onSave: (s: IntegrationSettings) => void }) {
  const [form, setForm] = useState({ apiKey: '', appId: initial.appId ?? '', environment: initial.environment ?? 'sandbox' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: Record<string, string> = { appId: form.appId, environment: form.environment }
      if (form.apiKey) payload.apiKey = form.apiKey
      const updated = await savePremblyIntegration(payload)
      onSave(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <Card icon="🪪" title={`Identity Verification (Prembly) — ${initial.configured ? 'Configured' : 'Not configured'}`}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">KYC verification — national ID lookup, passport scan, and document OCR via Prembly IdentityPass.</p>
        <StatusBadge configured={initial.configured} />
      </div>
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 mb-4">
        Sign up at <strong>app.prembly.com</strong> → create an app → copy the <strong>App ID</strong> and <strong>API Key</strong> from the dashboard. Use <em>Sandbox</em> for testing.
      </div>
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="API Key" value={form.apiKey} onChange={f('apiKey')} sensitive alreadySet={initial.apiKey === '***'} placeholder="pk_live_..." />
        <Field label="App ID" value={form.appId} onChange={f('appId')} placeholder="your-app-id" />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Environment</label>
          <select
            value={form.environment}
            onChange={e => setForm(p => ({ ...p, environment: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="sandbox">Sandbox (testing)</option>
            <option value="production">Production</option>
          </select>
        </div>
        <div className="flex justify-end pt-2">
          <SaveBtn loading={saving} saved={saved} />
        </div>
      </form>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function IntegrationsPageClient() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getIntegrations()
      .then(setSettings)
      .catch(e => setError(e?.message ?? 'Failed to load integration settings'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading integrations…</div>
  if (error)   return <div className="p-8 text-sm text-red-500">{error}</div>
  if (!settings) return null

  const handleSave = (updated: IntegrationSettings) => setSettings(updated)

  const configured = [
    settings.email.configured,
    settings.africastalking.configured,
    settings.afrinet.configured,
    settings.mpesa.configured,
    settings.telegram.configured,
    settings.prembly.configured,
  ].filter(Boolean).length

  return (
    <div className="p-6 max-w-3xl space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-4 rounded-xl bg-white border border-gray-200 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{configured} of 5 integrations configured</p>
          <p className="text-xs text-gray-500 mt-0.5">Credentials are stored securely in the database and never exposed in plaintext.</p>
        </div>
        <div className="ml-auto flex gap-3">
          {[
            { icon: '📧', label: 'Email',    ok: settings.email.configured },
            { icon: '💬', label: 'SMS (AT)',    ok: settings.africastalking.configured },
            { icon: '📡', label: 'SMS (Afrinet)', ok: settings.afrinet.configured },
            { icon: '💚', label: 'M-Pesa',   ok: settings.mpesa.configured },
            { icon: '✈️',  label: 'Telegram', ok: settings.telegram.configured },
            { icon: '🪪',  label: 'KYC',      ok: settings.prembly.configured },
          ].map(({ icon, label, ok }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-base">{icon}</span>
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>{ok ? '●' : '○'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <EmailCard          initial={settings.email}          onSave={handleSave} />
      <AfricasTalkingCard initial={settings.africastalking} onSave={handleSave} />
      <AfrinetCard        initial={settings.afrinet}        onSave={handleSave} />
      <MpesaCard          initial={settings.mpesa}          onSave={handleSave} />
      <TelegramCard       initial={settings.telegram}       onSave={handleSave} />
      <PremblCard         initial={settings.prembly}        onSave={handleSave} />
    </div>
  )
}
