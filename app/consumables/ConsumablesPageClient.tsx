'use client'
import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { CONSUMABLE_TYPES, CONSUMABLE_ISSUANCES, CONSUMABLE_STOCK } from '@/lib/mock-data'
import type { ConsumableType, ConsumableIssuance, ConsumableStock, IssuanceStatus } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: IssuanceStatus) {
  const map: Record<IssuanceStatus, { label: string; variant: 'success' | 'danger' | 'warning' }> = {
    issued:   { label: 'Issued',    variant: 'success' },
    withheld: { label: 'Withheld',  variant: 'danger' },
    pending:  { label: 'Pending',   variant: 'warning' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'warning' as const }
  return <Badge variant={variant}>{label}</Badge>
}

function freqLabel(f: string) {
  const MAP: Record<string, string> = {
    monthly:   'Monthly',
    bi_monthly: 'Bi-Monthly',
    quarterly: 'Quarterly',
    on_request: 'On Request',
  }
  return MAP[f] ?? f
}

// ── IssuanceRunTab ─────────────────────────────────────────────────────────

function IssuanceRunTab() {
  const [period] = useState('2024-06')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...CONSUMABLE_TYPES.map(t => ({ value: t.id, label: t.name })),
  ]

  const rows = useMemo(() => {
    return CONSUMABLE_ISSUANCES.filter(r => r.billing_period === period)
      .filter(r => typeFilter === 'all' || r.consumable_type_id === typeFilter)
      .filter(r =>
        !search ||
        r.unit_label.toLowerCase().includes(search.toLowerCase()) ||
        r.person_name.toLowerCase().includes(search.toLowerCase()) ||
        r.consumable_name.toLowerCase().includes(search.toLowerCase())
      )
  }, [period, search, typeFilter])

  const issued   = rows.filter(r => r.status === 'issued')
  const withheld = rows.filter(r => r.status === 'withheld')
  const pending  = rows.filter(r => r.status === 'pending')

  const totalIssued   = issued.length
  const totalWithheld = withheld.length
  const totalPending  = pending.length
  const coverage      = rows.length > 0 ? Math.round((totalIssued / rows.length) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Period banner */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">Issuance run for</p>
          <h3 className="text-lg font-semibold text-text">June 2024</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">← Prev Month</Button>
          <Button variant="outline" size="sm">Next Month →</Button>
          <Button variant="primary" size="sm">⬇ Export Run</Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: rows.length, icon: '🏠' },
          { label: 'Issued',      value: totalIssued,   icon: '✅', color: 'text-success' },
          { label: 'Withheld',    value: totalWithheld, icon: '🚫', color: 'text-danger' },
          { label: 'Pending',     value: totalPending,  icon: '⏳', color: 'text-warning' },
        ].map(k => (
          <Card key={k.label} className="p-4 flex items-center gap-3">
            <span className="text-2xl">{k.icon}</span>
            <div>
              <p className={cn('text-xl font-bold', k.color ?? 'text-text')}>{k.value}</p>
              <p className="text-xs text-text-muted">{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Coverage bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted w-24">Coverage</span>
        <div className="flex-1 h-2 bg-surface-border rounded-full overflow-hidden">
          <div
            className="h-2 bg-success rounded-full transition-all"
            style={{ width: `${coverage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-text">{coverage}%</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search unit or resident…"
          containerClassName="w-64"
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Button variant="primary" size="sm" className="ml-auto">
          ⚡ Bulk Issue Pending
        </Button>
      </div>

      {/* Issued group */}
      {issued.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <span className="text-success">✅</span> Issued ({issued.length})
          </h4>
          <IssuanceTable rows={issued} />
        </div>
      )}

      {/* Withheld group */}
      {withheld.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <span className="text-danger">🚫</span> Withheld ({withheld.length})
            <span className="text-xs font-normal text-text-muted">— Clearance condition not met</span>
          </h4>
          <IssuanceTable rows={withheld} />
        </div>
      )}

      {/* Pending group */}
      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
            <span className="text-warning">⏳</span> Pending ({pending.length})
            <span className="text-xs font-normal text-text-muted">— Not yet processed</span>
          </h4>
          <IssuanceTable rows={pending} />
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-center text-text-muted py-12">No issuance records for this period or filter.</p>
      )}
    </div>
  )
}

function IssuanceTable({ rows }: { rows: ConsumableIssuance[] }) {
  return (
    <div className="rounded-lg border border-surface-border overflow-hidden mb-2">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-text-muted">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Unit</th>
            <th className="text-left px-4 py-2 font-medium">Resident</th>
            <th className="text-left px-4 py-2 font-medium">Item</th>
            <th className="text-center px-4 py-2 font-medium">Qty</th>
            <th className="text-left px-4 py-2 font-medium">Status</th>
            <th className="text-left px-4 py-2 font-medium">Reason / Notes</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={cn('border-t border-surface-border hover:bg-surface-hover transition-colors', i % 2 === 0 ? '' : 'bg-surface-muted/30')}>
              <td className="px-4 py-3 font-medium text-text">{r.unit_label}</td>
              <td className="px-4 py-3 text-text-muted">{r.person_name}</td>
              <td className="px-4 py-3 text-text">{r.consumable_name}</td>
              <td className="px-4 py-3 text-center text-text">{r.status === 'issued' ? r.quantity_issued : '—'}</td>
              <td className="px-4 py-3">{statusBadge(r.status)}</td>
              <td className="px-4 py-3 text-text-muted text-xs max-w-xs">
                {r.withheld_reason ?? r.notes ?? '—'}
              </td>
              <td className="px-4 py-3 text-right">
                {r.status === 'pending' && (
                  <Button variant="outline" size="sm">Issue</Button>
                )}
                {r.status === 'withheld' && (
                  <Button variant="ghost" size="sm" className="text-text-muted">Check</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── ConsumableTypesTab ─────────────────────────────────────────────────────

function ConsumableTypesTab() {
  const [search, setSearch] = useState('')

  const types = useMemo(() => {
    return CONSUMABLE_TYPES.filter(t =>
      !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description ?? '').toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search consumable types…" containerClassName="w-64" />
        <Button variant="primary" size="sm" className="ml-auto">+ Add Type</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {types.map(t => (
          <ConsumableTypeCard key={t.id} type={t} />
        ))}
        {types.length === 0 && (
          <p className="text-center text-text-muted py-12">No consumable types found.</p>
        )}
      </div>
    </div>
  )
}

function ConsumableTypeCard({ type }: { type: ConsumableType }) {
  const isActive = type.active
  return (
    <Card className={cn('p-5', !isActive && 'opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-text">{type.name}</h3>
            <Badge variant={isActive ? 'success' : 'default'} className="text-xs">
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="blue" className="text-xs">{freqLabel(type.issue_frequency)}</Badge>
          </div>
          {type.description && (
            <p className="text-sm text-text-muted mb-3">{type.description}</p>
          )}

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-text-muted mb-0.5">Issue Unit</p>
              <p className="font-medium text-text capitalize">{type.unit_of_issue}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Qty / Issue</p>
              <p className="font-medium text-text">{type.quantity_per_issue} {type.unit_of_issue}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5">Eligible Unit Types</p>
              <p className="font-medium text-text capitalize">{type.eligible_unit_types.join(', ')}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm">Edit</Button>
        </div>
      </div>

      {type.requires_clearance && (
        <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
          <div className="flex items-center gap-2 font-medium text-warning mb-1">
            <span>⚠️</span> Clearance Required
          </div>
          <p className="text-text-muted text-xs">
            The following charges must be fully paid before issuance:{' '}
            <span className="font-medium text-text">
              {type.clearance_charge_types.map(c => c.replace(/_/g, ' ')).join(', ')}
            </span>
          </p>
          {type.notes && <p className="text-text-muted text-xs mt-1 italic">{type.notes}</p>}
        </div>
      )}
    </Card>
  )
}

// ── StockLevelsTab ─────────────────────────────────────────────────────────

function StockLevelsTab() {
  const stocks = CONSUMABLE_STOCK

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {stocks.filter(s => s.current_stock < s.reorder_level).length} item(s) below reorder level
        </p>
        <Button variant="primary" size="sm">+ Record Restock</Button>
      </div>

      <div className="rounded-lg border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-text-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Item</th>
              <th className="text-center px-4 py-3 font-medium">In Stock</th>
              <th className="text-center px-4 py-3 font-medium">Reorder At</th>
              <th className="text-left px-4 py-3 font-medium">Last Restocked</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {stocks.map((s, i) => {
              const belowReorder = s.current_stock < s.reorder_level
              const outOfStock   = s.current_stock === 0
              return (
                <tr key={s.id} className={cn('border-t border-surface-border hover:bg-surface-hover transition-colors', i % 2 === 0 ? '' : 'bg-surface-muted/30')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{s.consumable_name}</p>
                    <p className="text-xs text-text-muted">{s.unit_of_issue}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('font-bold text-lg', outOfStock ? 'text-danger' : belowReorder ? 'text-warning' : 'text-success')}>
                      {s.current_stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-text-muted">{s.reorder_level}</td>
                  <td className="px-4 py-3 text-text-muted">
                    <p>{s.last_restocked_date}</p>
                    <p className="text-xs">+{s.last_restocked_quantity} by {s.last_restocked_by}</p>
                  </td>
                  <td className="px-4 py-3">
                    {outOfStock ? (
                      <Badge variant="danger">Out of Stock</Badge>
                    ) : belowReorder ? (
                      <Badge variant="warning">Low Stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted max-w-xs">{s.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm">Restock</Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function ConsumablesPageClient() {
  const pendingCount  = CONSUMABLE_ISSUANCES.filter(i => i.status === 'pending').length
  const withheldCount = CONSUMABLE_ISSUANCES.filter(i => i.status === 'withheld').length
  const lowStockCount = CONSUMABLE_STOCK.filter(s => s.current_stock < s.reorder_level).length

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Consumable Types', value: CONSUMABLE_TYPES.filter(t => t.active).length, icon: '📦', sub: 'active' },
          { label: 'Pending Issuance', value: pendingCount, icon: '⏳', sub: 'this month', color: pendingCount > 0 ? 'text-warning' : 'text-text' },
          { label: 'Withheld',         value: withheldCount, icon: '🚫', sub: 'this month', color: withheldCount > 0 ? 'text-danger' : 'text-text' },
          { label: 'Low Stock Items',  value: lowStockCount, icon: '⚠️', sub: 'below reorder', color: lowStockCount > 0 ? 'text-warning' : 'text-text' },
        ].map(k => (
          <Card key={k.label} className="p-5 flex items-center gap-4">
            <span className="text-3xl">{k.icon}</span>
            <div>
              <p className={cn('text-2xl font-bold', k.color ?? 'text-text')}>{k.value}</p>
              <p className="text-xs text-text-muted">{k.label}</p>
              <p className="text-xs text-text-muted">{k.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="issuance">
        <TabsList>
          <TabsTrigger value="issuance">
            📋 Issuance Run
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning text-white text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="types">📦 Consumable Types</TabsTrigger>
          <TabsTrigger value="stock">
            🏪 Stock Levels
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-danger text-white text-xs font-bold">
                {lowStockCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issuance" className="pt-5">
          <IssuanceRunTab />
        </TabsContent>
        <TabsContent value="types" className="pt-5">
          <ConsumableTypesTab />
        </TabsContent>
        <TabsContent value="stock" className="pt-5">
          <StockLevelsTab />
        </TabsContent>
      </Tabs>
    </main>
  )
}
