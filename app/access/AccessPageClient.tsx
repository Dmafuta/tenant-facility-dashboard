'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CanDo } from '@/components/ui/CanDo'
import { ENTRY_POINTS, ACCESS_DEVICES, ACCESS_LOG, ACCESS_RULES, PEOPLE } from '@/lib/mock-data'
import type { EntryPoint, AccessDevice, AccessLogEntry, AccessRule, EntryPointType, AccessDeviceType, AccessDeviceStatus } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<EntryPointType, string> = {
  pedestrian: '🚶', vehicle: '🚗', service: '🔧', emergency: '🚨', mixed: '🔀',
}

const EP_STATUS_CLASS: Record<string, string> = {
  active:      'bg-success/10 text-success border border-success/20',
  locked:      'bg-warning/10 text-warning border border-warning/20',
  fault:       'bg-danger/10 text-danger border border-danger/20',
  maintenance: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
}

const DEV_TYPE_LABEL: Record<AccessDeviceType, string> = {
  biometric_fingerprint: 'Fingerprint',
  biometric_face:        'Face Recognition',
  rfid_reader:           'RFID Reader',
  anpr_camera:           'ANPR Camera',
  intercom:              'Intercom',
  boom_gate_controller:  'Boom Controller',
  magloc_controller:     'Mag-Lock',
  keypad:                'Keypad',
}

const DEV_TYPE_ICON: Record<AccessDeviceType, string> = {
  biometric_fingerprint: '👆',
  biometric_face:        '🤖',
  rfid_reader:           '📡',
  anpr_camera:           '📷',
  intercom:              '📞',
  boom_gate_controller:  '🚧',
  magloc_controller:     '🔒',
  keypad:                '⌨️',
}

const DEV_STATUS_DOT: Record<AccessDeviceStatus, string> = {
  online:      'bg-success',
  offline:     'bg-danger',
  fault:       'bg-warning',
  maintenance: 'bg-blue-500',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Gate Card (core — all plans) ───────────────────────────────────────────────

function GateCard({ ep, devices }: { ep: EntryPoint; devices: AccessDevice[] }) {
  const [showLog, setShowLog] = useState(false)
  const epLog = useMemo(() => ACCESS_LOG.filter(l => l.entry_point_id === ep.id), [ep.id])
  const onlineCount  = devices.filter(d => d.status === 'online').length
  const faultCount   = devices.filter(d => d.status === 'offline' || d.status === 'fault').length

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{TYPE_ICON[ep.type]}</span>
            <div>
              <p className="text-sm font-semibold text-text">{ep.name}</p>
              {ep.location_description && <p className="text-xs text-text-muted">{ep.location_description}</p>}
            </div>
          </div>
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded capitalize flex-shrink-0', EP_STATUS_CLASS[ep.status])}>
            {ep.status === 'active' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />}
            {ep.status}
          </span>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-3">
          <span className="capitalize">{ep.direction === 'both' ? 'Entry & Exit' : ep.direction + ' only'}</span>
          <span>{ep.operating_hours.always_open ? '24 / 7' : `${ep.operating_hours.open_time} – ${ep.operating_hours.close_time}`}</span>
          <span>{ep.requires_staff ? '👮 Manned' : '🤖 Automated'}</span>
        </div>

        {/* Device summary (premium hint when no devices) */}
        {devices.length > 0 ? (
          <div className="flex items-center gap-3 text-xs mb-3">
            <span className="text-text-muted">{devices.length} device{devices.length !== 1 ? 's' : ''}</span>
            {onlineCount > 0 && <span className="text-success">● {onlineCount} online</span>}
            {faultCount > 0  && <span className="text-danger">● {faultCount} offline/fault</span>}
          </div>
        ) : (
          <div className="text-xs text-text-muted mb-3 italic">No devices connected — add hardware from the Devices tab</div>
        )}

        {/* Recent activity */}
        {epLog.length > 0 && (
          <div className="space-y-1">
            {epLog.slice(0, showLog ? epLog.length : 2).map(log => (
              <div key={log.id} className={cn(
                'flex items-center justify-between text-xs px-2 py-1 rounded',
                log.result === 'granted' ? 'bg-success/5' : 'bg-danger/5'
              )}>
                <span className={log.result === 'granted' ? 'text-success' : 'text-danger'}>
                  {log.direction === 'in' ? '→' : '←'} {log.result}
                </span>
                <span className="text-text-muted">{timeAgo(log.timestamp)}</span>
              </div>
            ))}
            {epLog.length > 2 && (
              <button onClick={() => setShowLog(s => !s)} className="text-xs text-primary-600 hover:underline">
                {showLog ? 'Show less' : `+${epLog.length - 2} more events`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-muted dark:bg-dark-hover border-t border-surface-border dark:border-dark-border">
        <span className="text-xs text-text-muted">{epLog.length} events today</span>
        <div className="flex gap-2">
          <CanDo action="write" resource={{ type: 'person' }}>
            <Button size="sm" variant="outline">Manual Log</Button>
          </CanDo>
          {(ep.status === 'active') && (
            <CanDo action="staff.onboard" resource={{ type: 'system_config' }}>
              <Button size="sm" variant="ghost">Lock Gate</Button>
            </CanDo>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── Devices Tab (premium) ──────────────────────────────────────────────────────

function DeviceRow({ device, epName }: { device: AccessDevice; epName: string }) {
  return (
    <tr className="hover:bg-surface-hover dark:hover:bg-dark-hover">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{DEV_TYPE_ICON[device.device_type]}</span>
          <div>
            <p className="text-sm font-medium text-text">{device.name}</p>
            <p className="text-xs text-text-muted">{epName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{DEV_TYPE_LABEL[device.device_type]}</td>
      <td className="px-4 py-3">
        <p className="text-xs font-medium text-text">{device.make} {device.model}</p>
        {device.serial_number && <p className="text-[11px] text-text-muted">{device.serial_number}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-text-muted">{device.ip_address ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-text-muted">{device.firmware_version ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', DEV_STATUS_DOT[device.status])} />
          <span className="text-xs capitalize text-text">{device.status}</span>
        </div>
        {device.last_heartbeat && (
          <p className="text-[11px] text-text-muted">{timeAgo(device.last_heartbeat)}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <button className="text-xs text-primary-600 hover:underline mr-3">Configure</button>
        <button className="text-xs text-text-muted hover:text-text">Test</button>
      </td>
    </tr>
  )
}

// ── Access Log Tab ─────────────────────────────────────────────────────────────

function AccessLogTab() {
  const [filter, setFilter] = useState<'all' | 'granted' | 'denied'>('all')
  const personMap = useMemo(() => new Map(PEOPLE.map(p => [p.id, p])), [])
  const epMap     = useMemo(() => new Map(ENTRY_POINTS.map(e => [e.id, e])), [])

  const filtered = useMemo(() =>
    ACCESS_LOG.filter(l => filter === 'all' || l.result === filter)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [filter]
  )

  const METHOD_LABEL: Record<string, string> = {
    biometric: 'Biometric', rfid: 'RFID', anpr: 'ANPR', manual: 'Manual',
    intercom_buzz: 'Intercom', mobile_qr: 'Mobile QR',
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {(['all', 'granted', 'denied'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors',
              filter === f ? 'bg-primary-600 text-white' : 'bg-surface-muted dark:bg-dark-hover text-text-muted hover:text-text')}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-muted">{filtered.length} events</span>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover dark:bg-dark-hover">
            <tr>
              {['Time','Entry Point','Person / Visitor','Method','Direction','Result','Notes'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {filtered.map(log => {
              const ep     = epMap.get(log.entry_point_id)
              const person = log.person_id ? personMap.get(log.person_id) : undefined
              const label  = person ? `${person.first_name} ${person.last_name}` : log.visitor_id ? 'Visitor' : 'Unknown'
              return (
                <tr key={log.id} className={cn('hover:bg-surface-hover dark:hover:bg-dark-hover', log.result === 'denied' ? 'bg-danger/5' : '')}>
                  <td className="px-4 py-3 text-xs text-text-muted whitespace-nowrap">{log.timestamp.slice(11, 16)}</td>
                  <td className="px-4 py-3 text-xs text-text">{ep?.name ?? log.entry_point_id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-text">{label}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{METHOD_LABEL[log.method] ?? log.method}</td>
                  <td className="px-4 py-3 text-xs text-text-muted capitalize">{log.direction === 'in' ? '→ In' : '← Out'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded capitalize',
                      log.result === 'granted' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                      {log.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{log.notes ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Access Rules Tab (premium) ─────────────────────────────────────────────────

function AccessRulesTab() {
  const epMap = useMemo(() => new Map(ENTRY_POINTS.map(e => [e.id, e])), [])

  const APPLIES_LABEL: Record<string, string> = {
    all_residents: 'All residents', owners: 'Homeowners', tenants: 'Tenants',
    staff: 'Staff', specific_units: 'Specific units', specific_persons: 'Specific persons',
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Access Rules</p>
          <p className="text-xs text-text-muted mt-0.5">Automated rules define who can use which gates and when. Overrides require manual gate officer action.</p>
        </div>
        <CanDo action="write" resource={{ type: 'system_config' }}>
          <Button>+ New Rule</Button>
        </CanDo>
      </div>

      <div className="space-y-3">
        {ACCESS_RULES.map(rule => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-text">{rule.name}</p>
                  <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded', rule.is_active ? 'bg-success/10 text-success' : 'bg-surface-border text-text-muted')}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-text-muted">
                  <span>👥 {APPLIES_LABEL[rule.applies_to]}</span>
                  <span>🕒 {rule.operating_hours.always_open ? '24/7' : `${rule.operating_hours.open_time} – ${rule.operating_hours.close_time}`}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rule.entry_point_ids.map(id => {
                    const ep = epMap.get(id)
                    return (
                      <span key={id} className="text-[11px] px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
                        {TYPE_ICON[ep?.type ?? 'mixed']} {ep?.name ?? id}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="text-xs text-primary-600 hover:underline">Edit</button>
                <button className="text-xs text-danger hover:underline">Delete</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function AccessPageClient() {
  const devicesByGate = useMemo(() =>
    ACCESS_DEVICES.reduce<Record<string, AccessDevice[]>>((acc, d) => {
      if (!acc[d.entry_point_id]) acc[d.entry_point_id] = []
      acc[d.entry_point_id].push(d)
      return acc
    }, {}),
    []
  )

  const epMap = useMemo(() => new Map(ENTRY_POINTS.map(e => [e.id, e])), [])

  const stats = useMemo(() => ({
    gates:      ENTRY_POINTS.length,
    active:     ENTRY_POINTS.filter(e => e.status === 'active').length,
    faults:     ENTRY_POINTS.filter(e => e.status === 'fault').length + ACCESS_DEVICES.filter(d => d.status === 'offline' || d.status === 'fault').length,
    todayEvents: ACCESS_LOG.length,
    denied:     ACCESS_LOG.filter(l => l.result === 'denied').length,
    onlineDevices: ACCESS_DEVICES.filter(d => d.status === 'online').length,
  }), [])

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Gates',           value: stats.gates,        color: 'text-text' },
          { label: 'Active',          value: stats.active,       color: 'text-success' },
          { label: 'Faults',          value: stats.faults,       color: stats.faults > 0 ? 'text-danger' : 'text-text-muted' },
          { label: "Today's Events",  value: stats.todayEvents,  color: 'text-text' },
          { label: 'Denied',          value: stats.denied,       color: stats.denied > 0 ? 'text-warning' : 'text-text-muted' },
          { label: 'Devices Online',  value: `${stats.onlineDevices}/${ACCESS_DEVICES.length}`, color: 'text-primary-600' },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      {stats.faults > 0 && (
        <div className="p-3 rounded-lg bg-danger/5 border border-danger/20 text-xs text-danger">
          ⚠ {stats.faults} fault{stats.faults !== 1 ? 's' : ''} detected across gates and devices. Review the Devices tab and Settings → Facility Setup.
        </div>
      )}

      <Tabs defaultValue="gates">
        <TabsList>
          <TabsTrigger value="gates">Gates ({ENTRY_POINTS.length})</TabsTrigger>
          <TabsTrigger value="log">Access Log ({ACCESS_LOG.length})</TabsTrigger>
          <TabsTrigger value="devices">Devices ({ACCESS_DEVICES.length})</TabsTrigger>
          <TabsTrigger value="rules">Access Rules ({ACCESS_RULES.length})</TabsTrigger>
        </TabsList>

        {/* Gates — all plans */}
        <TabsContent value="gates">
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {ENTRY_POINTS.map(ep => (
              <GateCard key={ep.id} ep={ep} devices={devicesByGate[ep.id] ?? []} />
            ))}
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Entry points are configured in <strong>Settings → Facility Setup</strong>. Add or rename gates there.
          </p>
        </TabsContent>

        {/* Log — all plans */}
        <TabsContent value="log">
          <AccessLogTab />
        </TabsContent>

        {/* Devices — premium feature */}
        <TabsContent value="devices">
          <div className="mt-4 space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-700 dark:text-indigo-400">
              <strong>Premium — Device Integration.</strong> Connect biometric readers, ANPR cameras, boom gate controllers and more. The platform polls each device for heartbeats every 60 seconds.
            </div>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover dark:bg-dark-hover">
                  <tr>
                    {['Device','Type','Make & Model','IP Address','Firmware','Status',''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                  {ACCESS_DEVICES.map(dev => (
                    <DeviceRow key={dev.id} device={dev} epName={epMap.get(dev.entry_point_id)?.name ?? dev.entry_point_id} />
                  ))}
                </tbody>
              </table>
            </Card>
            <CanDo action="write" resource={{ type: 'system_config' }}>
              <Button variant="outline">+ Add Device</Button>
            </CanDo>
          </div>
        </TabsContent>

        {/* Rules — premium feature */}
        <TabsContent value="rules">
          <AccessRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
