'use client'
import { useState, useEffect, useCallback } from 'react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { getPaymentsLedger, type PaymentLedgerRow, type PaymentLedgerPage } from '@/lib/api/invoices'

const PAGE_SIZE = 50

const fmt = (n: number) =>
  `KES ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const METHOD_LABELS: Record<string, string> = {
  mpesa:        'M-Pesa',
  bank:         'Bank',
  cash:         'Cash',
  credit_note:  'Credit Note',
  credit:       'Credit',
  adjustment:   'Adjustment',
}

function methodBadge(method: string | null) {
  const label = method ? (METHOD_LABELS[method] ?? method) : '—'
  const color =
    method === 'mpesa'       ? 'bg-green-100 text-green-700' :
    method === 'bank'        ? 'bg-blue-100 text-blue-700' :
    method === 'cash'        ? 'bg-amber-100 text-amber-700' :
    method === 'credit_note' ? 'bg-purple-100 text-purple-700' :
    method === 'adjustment'  ? 'bg-gray-100 text-gray-600' :
                               'bg-gray-100 text-gray-500'
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{label}</span>
}

function allocBadge(invoiceId: string | null) {
  return invoiceId
    ? <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700">Allocated</span>
    : <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Unallocated</span>
}

function catBadge(code: string) {
  const color =
    code === 'WS' ? 'bg-blue-100 text-blue-700' :
    code === 'SC' ? 'bg-indigo-100 text-indigo-700' :
    code === 'OT' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-500'
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${color}`}>{code}</span>
}

interface Props {
  defaultCategory?: string
}

export function PaymentsLedgerTab({ defaultCategory }: Props) {
  const [data,      setData]      = useState<PaymentLedgerPage | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  // Filters
  const [category,  setCategory]  = useState(defaultCategory ?? 'all')
  const [allocated, setAllocated] = useState<'all' | 'true' | 'false'>('all')
  const [search,    setSearch]    = useState('')
  const [fromDate,  setFromDate]  = useState('')
  const [toDate,    setToDate]    = useState('')
  const [page,      setPage]      = useState(0)

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      const result = await getPaymentsLedger({
        categoryCode: category === 'all' ? undefined : category,
        allocated:    allocated,
        search:       search || undefined,
        fromDate:     fromDate || undefined,
        toDate:       toDate   || undefined,
        page:         p,
        size:         PAGE_SIZE,
      })
      setData(result)
      setPage(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [category, allocated, search, fromDate, toDate])

  useEffect(() => { load(0) }, [load])

  const rows   = data?.content ?? []
  const total  = data?.totalElements ?? 0
  const pages  = data?.totalPages ?? 1
  const amount = data?.totalAmount ?? 0

  // KPIs derived from current page (summary from backend total)
  const allocatedCount   = rows.filter(r => r.invoice_id).length
  const unallocatedCount = rows.filter(r => !r.invoice_id).length

  return (
    <div className="space-y-5">

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-text-muted">Total Payments</p>
          <p className="text-2xl font-bold text-text mt-1">{total.toLocaleString()}</p>
          <p className="text-xs text-text-muted mt-0.5">matching filters</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">Total Amount</p>
          <p className="text-xl font-bold text-teal-700 mt-1">{fmt(amount)}</p>
          <p className="text-xs text-text-muted mt-0.5">across all pages</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">Allocated (this page)</p>
          <p className="text-xl font-bold text-green-700 mt-1">{allocatedCount}</p>
          <p className="text-xs text-text-muted mt-0.5">linked to invoice</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-text-muted">Unallocated (this page)</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{unallocatedCount}</p>
          <p className="text-xs text-text-muted mt-0.5">pending allocation</p>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-48">
          <label className="block text-xs text-text-muted mb-1">Category</label>
          <Select
            value={category}
            onChange={setCategory}
            options={[
              { value: 'all', label: 'All categories' },
              { value: 'WS',  label: 'Water & Sewer' },
              { value: 'SC',  label: 'Service Charge' },
              { value: 'OT',  label: 'Other' },
            ]}
          />
        </div>
        <div className="w-44">
          <label className="block text-xs text-text-muted mb-1">Status</label>
          <Select
            value={allocated}
            onChange={v => setAllocated(v as 'all' | 'true' | 'false')}
            options={[
              { value: 'all',   label: 'All' },
              { value: 'true',  label: 'Allocated' },
              { value: 'false', label: 'Unallocated' },
            ]}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <SearchInput
            placeholder="Unit label or reference no…"
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="flex gap-2 items-end">
          <div>
            <label className="block text-xs text-text-muted mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => { setFromDate(''); setToDate(''); setSearch(''); setCategory('all'); setAllocated('all') }}
            className="text-xs text-text-muted hover:text-text px-2 py-2"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50">{error}</div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-secondary">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Unit</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Reference</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Method</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Cat</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted text-right">Amount</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Invoice</th>
                <th className="px-4 py-3 text-xs font-medium text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-text-muted text-sm">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-text-muted text-sm">No payments found.</td></tr>
              )}
              {!loading && rows.map((r: PaymentLedgerRow) => (
                <tr key={r.id} className="hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-text whitespace-nowrap">
                    {r.payment_date ?? <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    {r.unit_label ?? <span className="text-text-muted text-xs">{r.unit_id?.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">
                    {r.reference_no ?? '—'}
                  </td>
                  <td className="px-4 py-3">{methodBadge(r.payment_method)}</td>
                  <td className="px-4 py-3">{catBadge(r.category_code)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-text tabular-nums">
                    {fmt(r.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {r.statement_no
                      ? <a href={`/billing/invoice/${r.invoice_id}`} className="text-primary hover:underline font-mono">{r.statement_no}</a>
                      : <span>—</span>}
                  </td>
                  <td className="px-4 py-3">{allocBadge(r.invoice_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-text-muted">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => load(page - 1)}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                const p = pages <= 7 ? i : (page < 4 ? i : (page > pages - 4 ? pages - 7 + i : page - 3 + i))
                return (
                  <button
                    key={p}
                    onClick={() => load(p)}
                    className={`px-3 py-1.5 rounded-lg border text-xs ${p === page ? 'bg-primary text-white border-primary' : 'border-border hover:bg-surface-secondary'}`}
                  >
                    {p + 1}
                  </button>
                )
              })}
              <button
                onClick={() => load(page + 1)}
                disabled={page >= pages - 1}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
