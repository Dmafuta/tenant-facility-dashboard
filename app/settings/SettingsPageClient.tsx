'use client'
import { useState, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IntegrationsPageClient } from '@/app/integrations/IntegrationsPageClient'
import { ENTRY_POINTS } from '@/lib/mock-data'
import type { EntryPoint, EntryPointType, EntryPointDirection } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── General Settings ──────────────────────────────────────────────────────────
function GeneralSettings() {
  const [name, setName] = useState('Green Valley Estate')
  const [email, setEmail] = useState('management@greenvalley.co.ke')
  const [phone, setPhone] = useState('+254 20 123 4567')
  const [currency, setCurrency] = useState('KES')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [saved, setSaved] = useState(false)
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="p-6 max-w-xl space-y-5">
      <h3 className="text-sm font-semibold text-text">Property Information</h3>
      {[
        { label: 'Property Name', value: name, onChange: setName, type: 'text' },
        { label: 'Management Email', value: email, onChange: setEmail, type: 'email' },
        { label: 'Contact Phone', value: phone, onChange: setPhone, type: 'text' },
      ].map(f => (
        <div key={f.label}>
          <label className="block text-xs font-medium text-text-muted mb-1">{f.label}</label>
          <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="KES">KES — Kenyan Shilling</option>
            <option value="USD">USD — US Dollar</option>
            <option value="UGX">UGX — Ugandan Shilling</option>
            <option value="TZS">TZS — Tanzanian Shilling</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="Africa/Nairobi">Africa/Nairobi (EAT +3)</option>
            <option value="Africa/Lagos">Africa/Lagos (WAT +1)</option>
            <option value="Africa/Johannesburg">Africa/Johannesburg (SAST +2)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>
      <button onClick={save}
        className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
        {saved ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Billing Settings ──────────────────────────────────────────────────────────
function BillingSettings() {
  const [rentDue, setRentDue] = useState('1')
  const [graceDays, setGraceDays] = useState('5')
  const [lateFee, setLateFee] = useState('2.0')
  const [depositMonths, setDepositMonths] = useState('2')
  const [saved, setSaved] = useState(false)

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text mb-4">Rent & Payment Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Rent Due Day', sublabel: 'Day of month rent is due', value: rentDue, onChange: setRentDue, suffix: 'th of month' },
            { label: 'Grace Period', sublabel: 'Days before late fees apply', value: graceDays, onChange: setGraceDays, suffix: 'days' },
            { label: 'Late Fee Rate', sublabel: 'Per week after grace period', value: lateFee, onChange: setLateFee, suffix: '% per week' },
            { label: 'Deposit Months', sublabel: 'Security deposit requirement', value: depositMonths, onChange: setDepositMonths, suffix: 'months rent' },
          ].map(f => (
            <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
              <label className="block text-xs font-medium text-text-muted mb-0.5">{f.label}</label>
              <p className="text-[10px] text-text-muted mb-2">{f.sublabel}</p>
              <div className="flex items-center gap-2">
                <input type="number" value={f.value} onChange={e => f.onChange(e.target.value)}
                  className="w-16 px-2 py-1 text-sm border border-surface-border dark:border-dark-border rounded bg-surface dark:bg-dark-surface text-text focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <span className="text-xs text-text-muted">{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Service Charge Settings</h3>
        <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4 space-y-3">
          {[
            { label: 'Enable Service Charge', desc: 'Bill monthly service charge alongside rent', on: true },
            { label: 'Auto-generate Monthly Charges', desc: 'Automatically create rent + service charges on 1st', on: true },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text">{s.label}</p>
                <p className="text-xs text-text-muted">{s.desc}</p>
              </div>
              <div className={`w-10 h-5 rounded-full relative cursor-pointer ${s.on ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow ${s.on ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
        {saved ? '✓ Saved' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── Notification Settings ─────────────────────────────────────────────────────
function NotificationSettings() {
  const settings = [
    { category: 'Financial', items: [
      { label: 'Rent overdue reminder', desc: 'Alert when rent is unpaid after grace period', channels: ['email', 'sms'], enabled: true },
      { label: 'Payment received', desc: 'Notify when a payment is logged', channels: ['email'], enabled: true },
      { label: 'Arrears escalation', desc: 'Alert when arrears exceed 2 months', channels: ['email', 'sms'], enabled: false },
    ]},
    { category: 'Maintenance', items: [
      { label: 'New work order', desc: 'Notify supervisor of new maintenance request', channels: ['email'], enabled: true },
      { label: 'Work order overdue', desc: 'Alert when open work order is 7+ days old', channels: ['email'], enabled: true },
      { label: 'Preventive maintenance due', desc: 'Reminder 7 days before scheduled task', channels: ['email'], enabled: true },
    ]},
    { category: 'Compliance', items: [
      { label: 'Breach recorded', desc: 'Alert when a new breach is logged', channels: ['email'], enabled: true },
      { label: 'Document expiry (30 days)', desc: 'Alert when certificate or contract nears expiry', channels: ['email'], enabled: true },
    ]},
    { category: 'Utilities', items: [
      { label: 'Water loss alert', desc: 'Notify when water loss exceeds 10%', channels: ['email', 'sms'], enabled: true },
      { label: 'Meter reading due', desc: 'Monthly reminder to capture meter readings', channels: ['email'], enabled: false },
    ]},
  ]
  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {settings.map(section => (
        <div key={section.category}>
          <h3 className="text-sm font-semibold text-text mb-3">{section.category}</h3>
          <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden divide-y divide-surface-border dark:divide-dark-border">
            {section.items.map(item => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3 gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                  <div className="flex gap-1 mt-1">
                    {item.channels.map(c => (
                      <span key={c} className="text-[10px] font-semibold uppercase bg-surface-hover dark:bg-dark-hover border border-surface-border dark:border-dark-border rounded px-1.5 py-0.5 text-text-muted">{c}</span>
                    ))}
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative cursor-pointer flex-shrink-0 ${item.enabled ? 'bg-primary-500' : 'bg-surface-border dark:bg-dark-border'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-all ${item.enabled ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Users & Permissions ───────────────────────────────────────────────────────
function UsersSettings() {
  const USERS = [
    { name: 'Jane Karimi',        email: 'jane@greenvalley.co.ke',   role: 'Facility Manager',      status: 'active', last_login: '2024-06-13' },
    { name: 'James Mwenye',       email: 'james.m@greenvalley.co.ke', role: 'Maintenance Supervisor', status: 'active', last_login: '2024-06-12' },
    { name: 'Gate Officer John',  email: 'john.gate@greenvalley.co.ke', role: 'Gate Security',       status: 'active', last_login: '2024-06-13' },
    { name: 'Gate Officer Mary',  email: 'mary.gate@greenvalley.co.ke', role: 'Gate Security',       status: 'active', last_login: '2024-06-12' },
    { name: 'Admin',              email: 'admin@greenvalley.co.ke',  role: 'System Administrator',   status: 'active', last_login: '2024-06-09' },
  ]
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">System Users</h3>
        <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">+ Invite User</button>
      </div>
      <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover dark:bg-dark-hover">
            <tr>
              {['Name','Email','Role','Status','Last Login',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {USERS.map(u => (
              <tr key={u.email} className="hover:bg-surface-hover dark:hover:bg-dark-hover">
                <td className="px-4 py-3 text-text font-medium">{u.name}</td>
                <td className="px-4 py-3 text-text-muted">{u.email}</td>
                <td className="px-4 py-3"><Badge variant="blue">{u.role}</Badge></td>
                <td className="px-4 py-3"><Badge variant="success">{u.status}</Badge></td>
                <td className="px-4 py-3 text-text-muted">{u.last_login}</td>
                <td className="px-4 py-3"><button className="text-xs text-primary-600 hover:underline">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Facility Setup — Entry Points ─────────────────────────────────────────────

const TYPE_ICON: Record<EntryPointType, string> = {
  pedestrian: '🚶',
  vehicle:    '🚗',
  service:    '🔧',
  emergency:  '🚨',
  mixed:      '🔀',
}

const STATUS_CLASS: Record<string, string> = {
  active:      'bg-success/10 text-success',
  locked:      'bg-warning/10 text-warning',
  fault:       'bg-danger/10 text-danger',
  maintenance: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
}

const DIRECTION_LABEL: Record<EntryPointDirection, string> = {
  entry: 'Entry only',
  exit:  'Exit only',
  both:  'Entry & Exit',
}

function EntryPointRow({ ep, onEdit }: { ep: EntryPoint; onEdit: (ep: EntryPoint) => void }) {
  return (
    <tr className="hover:bg-surface-hover dark:hover:bg-dark-hover">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{TYPE_ICON[ep.type]}</span>
          <div>
            <p className="text-sm font-medium text-text">{ep.name}</p>
            {ep.location_description && <p className="text-xs text-text-muted">{ep.location_description}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted capitalize">{ep.type}</td>
      <td className="px-4 py-3 text-xs text-text-muted">{DIRECTION_LABEL[ep.direction]}</td>
      <td className="px-4 py-3 text-xs text-text-muted">
        {ep.operating_hours.always_open
          ? '24/7'
          : `${ep.operating_hours.open_time} – ${ep.operating_hours.close_time}`}
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded capitalize', STATUS_CLASS[ep.status])}>
          {ep.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-[11px] px-2 py-0.5 rounded', ep.requires_staff ? 'bg-surface-muted text-text-muted' : 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400')}>
          {ep.requires_staff ? 'Manned' : 'Automated'}
        </span>
      </td>
      <td className="px-4 py-3">
        <button onClick={() => onEdit(ep)} className="text-xs text-primary-600 hover:underline mr-3">Edit</button>
        <button className="text-xs text-danger hover:underline">Remove</button>
      </td>
    </tr>
  )
}

function AddEntryPointModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">Add Entry Point</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
            <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Main Vehicle Gate" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text">
                <option value="vehicle">Vehicle</option>
                <option value="pedestrian">Pedestrian</option>
                <option value="service">Service</option>
                <option value="emergency">Emergency</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Direction</label>
              <select className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text">
                <option value="both">Entry & Exit</option>
                <option value="entry">Entry only</option>
                <option value="exit">Exit only</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Location Description</label>
            <input className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text" placeholder="e.g. North perimeter, facing Ngong Road" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="always_open" className="accent-primary-600" />
            <label htmlFor="always_open" className="text-sm text-text">Always open (24/7)</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Opens</label>
              <input type="time" defaultValue="06:00" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Closes</label>
              <input type="time" defaultValue="22:00" className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="manned" className="accent-primary-600" />
            <label htmlFor="manned" className="text-sm text-text">Requires staff (manned gate)</label>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes (optional)</label>
            <textarea className="w-full px-3 py-2 text-sm border border-surface-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-card text-text h-16 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text">Cancel</button>
          <button onClick={() => { alert('Entry point added (demo)'); onClose() }}
            className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Add Entry Point
          </button>
        </div>
      </div>
    </div>
  )
}

function FacilitySetupSettings() {
  const [showAdd, setShowAdd] = useState(false)
  const [editEp, setEditEp] = useState<EntryPoint | null>(null)

  const stats = useMemo(() => ({
    total:      ENTRY_POINTS.length,
    active:     ENTRY_POINTS.filter(e => e.status === 'active').length,
    fault:      ENTRY_POINTS.filter(e => e.status === 'fault').length,
    manned:     ENTRY_POINTS.filter(e => e.requires_staff).length,
  }), [])

  return (
    <div className="p-6 space-y-6">
      {/* Building info summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text">Building Details</h3>
          <button className="text-xs text-primary-600 hover:underline">Edit</button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          {[
            { label: 'Property Name',   value: 'Green Valley Estate' },
            { label: 'Total Units',     value: '24 units across 3 blocks' },
            { label: 'Floors',          value: '6 floors per block' },
            { label: 'Year Built',      value: '2018' },
            { label: 'Plot Number',     value: 'L.R No. 209/12476' },
            { label: 'Physical Address',value: 'Ngong Road, Nairobi' },
          ].map(f => (
            <div key={f.label}>
              <p className="text-text-muted mb-0.5">{f.label}</p>
              <p className="font-medium text-text">{f.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Entry Points */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text">Entry Points</h3>
            <p className="text-xs text-text-muted mt-0.5">All gates and access points for this facility. Referenced across Visitors, Vehicles and Access Control.</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            + Add Entry Point
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',    value: stats.total,   color: 'text-text' },
            { label: 'Active',   value: stats.active,  color: 'text-success' },
            { label: 'Fault',    value: stats.fault,   color: 'text-danger' },
            { label: 'Manned',   value: stats.manned,  color: 'text-text-muted' },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-text-muted">{s.label}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover dark:bg-dark-hover">
              <tr>
                {['Entry Point','Type','Direction','Hours','Status','Mode',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border dark:divide-dark-border">
              {ENTRY_POINTS.map(ep => (
                <EntryPointRow key={ep.id} ep={ep} onEdit={setEditEp} />
              ))}
            </tbody>
          </table>
        </Card>

        <p className="text-xs text-text-muted mt-2">
          💡 Devices (biometric readers, ANPR cameras, boom gate controllers) are managed from the <strong>Access Control</strong> page.
        </p>
      </div>

      <AddEntryPointModal open={showAdd} onClose={() => setShowAdd(false)} />
      {editEp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditEp(null)} />
          <div className="relative z-10 bg-surface dark:bg-dark-surface rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text">Edit — {editEp.name}</h2>
              <button onClick={() => setEditEp(null)} className="text-text-muted hover:text-text text-lg">✕</button>
            </div>
            <p className="text-sm text-text-muted mb-4">Edit form mirrors the Add form. Implementation will pre-populate all fields.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditEp(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text">Cancel</button>
              <button onClick={() => { alert('Changes saved (demo)'); setEditEp(null) }}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SettingsPageClient() {
  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Settings" subtitle="Property configuration, billing rules and user management" />
        <Tabs defaultValue="general" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="facility">Facility Setup</TabsTrigger>
              <TabsTrigger value="billing">Billing & Payments</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="users">Users & Roles</TabsTrigger>
              <TabsTrigger value="integrations">🔌 Integrations</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="general"       className="flex-1 overflow-y-auto mt-0"><GeneralSettings /></TabsContent>
          <TabsContent value="facility"      className="flex-1 overflow-y-auto mt-0"><FacilitySetupSettings /></TabsContent>
          <TabsContent value="billing"       className="flex-1 overflow-y-auto mt-0"><BillingSettings /></TabsContent>
          <TabsContent value="notifications" className="flex-1 overflow-y-auto mt-0"><NotificationSettings /></TabsContent>
          <TabsContent value="users"         className="flex-1 overflow-y-auto mt-0"><UsersSettings /></TabsContent>
          <TabsContent value="integrations"  className="flex-1 overflow-y-auto mt-0"><IntegrationsPageClient /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
