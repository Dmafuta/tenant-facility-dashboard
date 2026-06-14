'use client'
import { cn } from '@/lib/cn'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { SHORT_STAY_BOOKINGS } from '@/lib/mock-data'
import type { ShortStayBooking } from '@/lib/types'

function bookingStatusBadge(status: ShortStayBooking['status']) {
  const map: Record<string, 'default'|'blue'|'warning'|'success'|'danger'> = {
    enquiry: 'default', confirmed: 'blue', checked_in: 'success',
    checked_out: 'default', cancelled: 'danger', no_show: 'warning'
  }
  return <Badge variant={map[status] ?? 'default'}>{status.replace('_',' ')}</Badge>
}

function sourceBadge(source: ShortStayBooking['source']) {
  const map: Record<string, string> = {
    direct: '🏢', airbnb: '🏡', booking_com: '🌐', expedia: '✈️', agent: '👤', other: '❓'
  }
  return <span className="text-base">{map[source] ?? '❓'}</span>
}

function nightsBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function BookingCalendar() {
  // Simple timeline view of bookings for the current week
  const unitIds = [...new Set(SHORT_STAY_BOOKINGS.map(b => b.unit_id))]
  const days = ['10','11','12','13','14','15','16','17','18','19','20','21'].map(d => `2024-06-${d}`)

  function bookingForDay(unitId: string, day: string): ShortStayBooking | undefined {
    return SHORT_STAY_BOOKINGS.find(b =>
      b.unit_id === unitId && b.check_in_date <= day && b.check_out_date > day
    )
  }

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 text-blue-800 dark:text-blue-300',
    checked_in: 'bg-green-100 dark:bg-green-900/30 border-green-300 text-green-800 dark:text-green-300',
    checked_out: 'bg-gray-100 dark:bg-gray-800 border-gray-300 text-gray-600',
    cancelled: 'bg-red-100 dark:bg-red-900/30 border-red-300 text-red-800',
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-text-muted font-medium w-40">Unit</th>
              {days.map(d => (
                <th key={d} className={`px-2 py-2 text-center text-text-muted font-medium w-14 ${d === '2024-06-13' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-bold' : ''}`}>
                  {d.slice(-2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border dark:divide-dark-border">
            {unitIds.map(uid => {
              const unit = SHORT_STAY_BOOKINGS.find(b => b.unit_id === uid)
              return (
                <tr key={uid}>
                  <td className="px-3 py-2 text-text font-medium whitespace-nowrap">{unit?.unit_label}</td>
                  {days.map(day => {
                    const bk = bookingForDay(uid, day)
                    const isCheckIn = bk?.check_in_date === day
                    return (
                      <td key={day} className={`px-1 py-1 border border-surface-border dark:border-dark-border text-center ${day === '2024-06-13' ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}>
                        {bk ? (
                          <div className={`rounded text-[9px] py-0.5 px-1 border truncate max-w-[52px] ${statusColors[bk.status] ?? 'bg-surface'}`}
                            title={`${bk.guest_name} (${bk.status})`}>
                            {isCheckIn ? bk.guest_name.split(' ')[0] : '·'}
                          </div>
                        ) : (
                          <div className="h-5 text-text-muted">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BookingList() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ShortStayBooking | null>(null)

  const filtered = SHORT_STAY_BOOKINGS.filter(b =>
    b.guest_name.toLowerCase().includes(search.toLowerCase()) ||
    b.unit_label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      <div className={cn('flex-shrink-0 border-r border-surface-border dark:border-dark-border flex-col', selected ? 'hidden lg:flex lg:w-80' : 'flex w-full lg:w-80')}>
        <div className="p-3 border-b border-surface-border dark:border-dark-border">
          <SearchInput value={search} onChange={setSearch} placeholder="Search guest or unit…" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
          {filtered.map(b => (
            <button key={b.id} onClick={() => setSelected(b)}
              className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === b.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-text">{b.guest_name}</span>
                {bookingStatusBadge(b.status)}
              </div>
              <p className="text-xs text-text-muted">{b.unit_label}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                {sourceBadge(b.source)}
                <span>{b.check_in_date} → {b.check_out_date}</span>
                <span className="font-medium text-text">KES {b.total_amount.toLocaleString()}</span>
              </div>
            </button>
          ))}
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
          <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a booking to view</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">{selected.guest_name}</h2>
                <p className="text-sm text-text-muted">{selected.unit_label} · {selected.id}</p>
              </div>
              <div className="flex gap-1.5">{bookingStatusBadge(selected.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Check-in',   value: selected.check_in_date },
                { label: 'Check-out',  value: selected.check_out_date },
                { label: 'Nights',     value: `${selected.nights} nights` },
                { label: 'Guests',     value: `${selected.adults} adults${selected.children ? ` + ${selected.children} children` : ''}` },
                { label: 'Nightly Rate',   value: `KES ${selected.nightly_rate.toLocaleString()}` },
                { label: 'Total Amount',   value: `KES ${selected.total_amount.toLocaleString()}` },
                { label: 'Source',         value: selected.source.replace('_',' ') },
                ...(selected.source_reference ? [{ label: 'Reference', value: selected.source_reference }] : []),
              ].map(f => (
                <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted">{f.label}</p>
                  <p className="text-sm font-medium text-text capitalize">{f.value}</p>
                </div>
              ))}
            </div>

            {selected.special_requests && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Special Requests</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{selected.special_requests}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                <p className="text-xs text-text-muted">Guest Email</p>
                <p className="text-sm text-text">{selected.guest_email}</p>
              </div>
              <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                <p className="text-xs text-text-muted">Guest Phone</p>
                <p className="text-sm text-text">{selected.guest_phone}</p>
              </div>
            </div>

            {(selected.status === 'confirmed') && (
              <div className="flex gap-2">
                <button className="px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">Check In</button>
                <button className="px-4 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Cancel</button>
              </div>
            )}
            {(selected.status === 'checked_in') && (
              <button className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Check Out</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ShortStayPageClient() {
  const active = SHORT_STAY_BOOKINGS.filter(b => b.status === 'checked_in').length
  const upcoming = SHORT_STAY_BOOKINGS.filter(b => b.status === 'confirmed').length
  const revenue = SHORT_STAY_BOOKINGS.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + b.total_amount, 0)
  const avgNightly = Math.round(SHORT_STAY_BOOKINGS.filter(b => b.status !== 'cancelled').reduce((acc, b) => acc + b.nightly_rate, 0) / SHORT_STAY_BOOKINGS.filter(b => b.status !== 'cancelled').length)

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Short-Stay" subtitle="BnB and short-stay unit management" />

        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Currently Occupied', value: active,   color: 'text-green-600' },
            { label: 'Upcoming',           value: upcoming, color: 'text-blue-600' },
            { label: 'Avg Nightly Rate',   value: `KES ${avgNightly.toLocaleString()}`, color: 'text-primary-600' },
            { label: 'Total Revenue',      value: `KES ${revenue.toLocaleString()}`, color: 'text-text' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="bookings" className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="px-6 pt-3 border-b border-surface-border dark:border-dark-border flex-shrink-0">
            <TabsList>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="calendar">Calendar View</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="bookings"  className="flex flex-1 overflow-hidden min-h-0 mt-0"><BookingList /></TabsContent>
          <TabsContent value="calendar"  className="flex flex-col flex-1 overflow-hidden min-h-0 mt-0"><BookingCalendar /></TabsContent>
        </Tabs>
      </main>
    </DashboardLayout>
  )
}
