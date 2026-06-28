'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { getPeopleFromApi, type PersonData } from '@/lib/api/people'
import { getWsStatement, type WsStatementRow } from '@/lib/api/statement'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtReading(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('en-KE', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
}

function formatPeriod(period: string) {
  try {
    const [y, m] = period.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  } catch { return period }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return d }
}

function defaultFrom() {
  const d = new Date()
  d.setMonth(d.getMonth() - 11)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function defaultTo() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const STATUS_LABEL: Record<string, string> = {
  issued: 'Issued', partial: 'Partial', paid: 'Paid',
  written_off: 'Written Off', draft: 'Draft', voided: 'Voided',
}

// ── Statement table ───────────────────────────────────────────────────────────

function StatementTable({ rows, person }: { rows: WsStatementRow[]; person: PersonData }) {
  const totalBilled   = rows.reduce((s, r) => s + r.billed, 0)
  const totalPaid     = rows.reduce((s, r) => r.payments.reduce((ps, p) => ps + p.amount, 0) + s, 0)
  const closingBal    = rows.length > 0 ? (() => {
    const last = rows[rows.length - 1]
    let bal = last.amount_payable
    for (const p of last.payments) bal -= p.amount
    return bal
  })() : 0

  return (
    <div className="overflow-x-auto">
      {/* Print header — hidden on screen */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Water & Sewerage Statement</h1>
        <p className="text-sm mt-1">
          <strong>{person.first_name} {person.last_name}</strong>
          {person.home_unit_id && <span> · Unit: {person.home_unit_id}</span>}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <table className="w-full text-xs border-collapse min-w-[900px] print:min-w-0 print:text-[10px]">
        <thead>
          <tr className="bg-slate-700 text-white">
            {/* Billing section */}
            <th className="px-2 py-2 text-left font-semibold border border-slate-600 whitespace-nowrap">Period</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Prev Rdg</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Curr Rdg</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Consumed</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Water+Mngnt</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Sewerage</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Billed</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Bal b/f</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Amt Payable</th>
            {/* Ledger section */}
            <th className="px-2 py-2 text-left font-semibold border border-slate-600 whitespace-nowrap">Date</th>
            <th className="px-2 py-2 text-left font-semibold border border-slate-600 whitespace-nowrap">Mpesa Code</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Dr</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Cr</th>
            <th className="px-2 py-2 text-right font-semibold border border-slate-600 whitespace-nowrap">Bal c/f</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            let runningBal = row.amount_payable
            const isLastRow = ri === rows.length - 1

            return (
              <>
                {/* ── Billing row ─────────────────────────────────────────── */}
                <tr key={`${row.period}-bill`} className={cn(
                  'border-b border-slate-200',
                  ri % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/30' : 'bg-white dark:bg-slate-900/20'
                )}>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 font-semibold text-text whitespace-nowrap">
                    {formatPeriod(row.period)}
                    <span className={cn('ml-1.5 text-[9px] font-normal px-1 py-0.5 rounded-full', {
                      'bg-green-100 text-green-700': row.invoice_status === 'paid',
                      'bg-amber-100 text-amber-700': row.invoice_status === 'partial',
                      'bg-blue-100 text-blue-700':   row.invoice_status === 'issued',
                      'bg-purple-100 text-purple-700': row.invoice_status === 'written_off',
                      'bg-gray-100 text-gray-500':   !['paid','partial','issued','written_off'].includes(row.invoice_status),
                    })}>
                      {STATUS_LABEL[row.invoice_status] ?? row.invoice_status}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-mono">{fmtReading(row.prev_reading)}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-mono">{fmtReading(row.curr_reading)}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-mono">
                    {row.consumption != null ? `${fmtReading(row.consumption)} m³` : '—'}
                  </td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right">{fmt(row.water_mgmt_amount)}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right">{fmt(row.sewerage_amount)}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-semibold">{fmt(row.billed)}</td>
                  <td className={cn('px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right', row.bal_bf > 0 && 'text-red-600 font-medium')}>{fmt(row.bal_bf)}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-bold">{fmt(row.amount_payable)}</td>
                  {/* Ledger — billing row: Dr = billed, Bal c/f = amountPayable */}
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text-muted">—</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text-muted text-xs">{row.statement_no}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right text-red-600 font-medium">{fmt(row.billed)}</td>
                  <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text-muted">—</td>
                  <td className={cn('px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-semibold', runningBal > 0 ? 'text-red-600' : 'text-green-600')}>{fmt(runningBal)}</td>
                </tr>

                {/* ── Payment rows ─────────────────────────────────────────── */}
                {row.payments.map((p, pi) => {
                  runningBal -= p.amount
                  return (
                    <tr key={`${row.period}-pay-${pi}`} className={cn(
                      'border-b border-slate-100',
                      p.is_write_off
                        ? 'bg-purple-50 dark:bg-purple-900/10'
                        : 'bg-green-50 dark:bg-green-900/10'
                    )}>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text-muted text-[11px] italic pl-4">
                        {p.is_write_off ? 'Write-off' : 'Payment'}
                      </td>
                      <td colSpan={7} className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text-muted">
                        {p.notes && <span className="italic text-[10px]">{p.notes}</span>}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700"></td>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text whitespace-nowrap">{formatDate(p.date)}</td>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                        {p.reference_no ?? (p.is_write_off ? 'Write-off' : '—')}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-text-muted">—</td>
                      <td className={cn('px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-medium', p.is_write_off ? 'text-purple-600' : 'text-green-600')}>
                        {fmt(p.amount)}
                      </td>
                      <td className={cn('px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-right font-semibold', runningBal > 0 ? 'text-red-600' : 'text-green-600')}>
                        {fmt(runningBal)}
                      </td>
                    </tr>
                  )
                })}

                {/* Spacer between periods */}
                {!isLastRow && (
                  <tr key={`${row.period}-spacer`}><td colSpan={14} className="h-1 bg-slate-200 dark:bg-slate-700" /></tr>
                )}
              </>
            )
          })}
        </tbody>

        {/* Totals footer */}
        <tfoot>
          <tr className="bg-slate-800 text-white font-bold">
            <td className="px-2 py-2 border border-slate-600" colSpan={6}>Totals</td>
            <td className="px-2 py-2 border border-slate-600 text-right">{fmt(totalBilled)}</td>
            <td className="px-2 py-2 border border-slate-600"></td>
            <td className="px-2 py-2 border border-slate-600"></td>
            <td className="px-2 py-2 border border-slate-600" colSpan={3}></td>
            <td className="px-2 py-2 border border-slate-600 text-right text-green-300">{fmt(totalPaid)}</td>
            <td className={cn('px-2 py-2 border border-slate-600 text-right', closingBal > 0 ? 'text-red-300' : 'text-green-300')}>
              {fmt(closingBal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// ── Person picker ─────────────────────────────────────────────────────────────

function PersonPicker({ value, onChange }: { value: PersonData | null; onChange: (p: PersonData | null) => void }) {
  const [people, setPeople]   = useState<PersonData[]>([])
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getPeopleFromApi()
      .then(all => setPeople(all.filter(p => ['tenant','resident_owner'].includes(p.person_type))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = people.filter(p => {
    const name = `${p.first_name} ${p.last_name}`.toLowerCase()
    return name.includes(query.toLowerCase()) || (p.email ?? '').toLowerCase().includes(query.toLowerCase())
  }).slice(0, 20)

  function select(p: PersonData) {
    onChange(p)
    setQuery(`${p.first_name} ${p.last_name}`)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value ? (query || `${value.first_name} ${value.last_name}`) : query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name…"
        className="w-64 px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-72 bg-surface dark:bg-dark-card border border-surface-border dark:border-dark-border rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onMouseDown={() => select(p)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-surface-hover dark:hover:bg-dark-hover text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                {p.first_name[0]}{p.last_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text truncate">{p.first_name} {p.last_name}</p>
                <p className="text-xs text-text-muted truncate">{p.person_type} · {p.email ?? '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page (inner — uses useSearchParams) ──────────────────────────────────

function StatementsInner() {
  const searchParams = useSearchParams()
  const urlPersonId  = searchParams.get('personId')

  const [person,  setPerson]  = useState<PersonData | null>(null)
  const [from,    setFrom]    = useState(defaultFrom())
  const [to,      setTo]      = useState(defaultTo())
  const [rows,    setRows]    = useState<WsStatementRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Auto-load when personId comes from URL (People page link)
  useEffect(() => {
    if (!urlPersonId) return
    getPeopleFromApi().then(all => {
      const found = all.find(p => p.id === urlPersonId)
      if (found) { setPerson(found); triggerLoad(found.id) }
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPersonId])

  const triggerLoad = useCallback(async (personId?: string) => {
    const id = personId ?? person?.id
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await getWsStatement(id, from, to)
      setRows(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load statement.')
      setRows(null)
    } finally {
      setLoading(false)
    }
  }, [person, from, to])

  function handlePrint() { window.print() }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        <Topbar title="Resident W&S Statement" />

        <div className="flex-1 px-6 py-6 space-y-5">

          {/* ── Controls ─────────────────────────────────────────────────── */}
          <Card className="p-5 print:hidden">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Resident</label>
                <PersonPicker value={person} onChange={p => { setPerson(p); setRows(null) }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">From (Month)</label>
                <input
                  type="month"
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">To (Month)</label>
                <input
                  type="month"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-surface-border dark:border-dark-border bg-surface dark:bg-dark-card text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <button
                onClick={() => triggerLoad()}
                disabled={!person || loading}
                className="px-5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Loading…' : 'Load Statement'}
              </button>
              {rows && rows.length > 0 && (
                <button
                  onClick={handlePrint}
                  className="px-5 py-2 rounded-lg border border-surface-border dark:border-dark-border text-sm font-medium text-text hover:bg-surface-muted dark:hover:bg-dark-hover transition-colors flex items-center gap-2"
                >
                  🖨 Print / Save PDF
                </button>
              )}
            </div>
          </Card>

          {/* ── Error ──────────────────────────────────────────────────────── */}
          {error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
          )}

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {!rows && !loading && !error && (
            <Card className="py-20 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-semibold text-text">Select a resident to load their statement</p>
              <p className="text-sm text-text-muted mt-1">Water & Sewerage billing history will appear here</p>
            </Card>
          )}

          {rows && rows.length === 0 && !loading && (
            <Card className="py-16 text-center">
              <p className="text-3xl mb-3">💧</p>
              <p className="font-semibold text-text">No W&S invoices found</p>
              <p className="text-sm text-text-muted mt-1">No issued invoices for this resident in the selected period</p>
            </Card>
          )}

          {/* ── Statement ───────────────────────────────────────────────────── */}
          {rows && rows.length > 0 && person && (
            <Card className="p-0 overflow-hidden">
              {/* Statement header */}
              <div className="px-5 py-4 border-b border-surface-border dark:border-dark-border flex items-center justify-between print:hidden">
                <div>
                  <h3 className="font-semibold text-text">
                    {person.first_name} {person.last_name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatPeriod(from)} — {formatPeriod(to)} · {rows.length} billing period{rows.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">Closing Balance</p>
                    <p className={cn('text-lg font-bold', (() => {
                      const last = rows[rows.length - 1]
                      let bal = last.amount_payable
                      for (const p of last.payments) bal -= p.amount
                      return bal > 0 ? 'text-red-600' : 'text-green-600'
                    })())}>
                      KES {(() => {
                        const last = rows[rows.length - 1]
                        let bal = last.amount_payable
                        for (const p of last.payments) bal -= p.amount
                        return fmt(bal)
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <StatementTable rows={rows} person={person} />
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </DashboardLayout>
  )
}

export default function StatementsPage() {
  return (
    <Suspense fallback={null}>
      <StatementsInner />
    </Suspense>
  )
}
