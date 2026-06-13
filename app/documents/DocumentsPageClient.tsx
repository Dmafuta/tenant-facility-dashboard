'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { DOCUMENTS } from '@/lib/mock-data'
import type { FacilityDocument } from '@/lib/types'

function categoryIcon(cat: FacilityDocument['category']) {
  const map: Record<string, string> = {
    lease_agreement: '📋', inspection_report: '🔍', id_kyc: '🪪',
    insurance: '🛡', compliance_certificate: '✅', vendor_contract: '🤝',
    financial_statement: '💰', notice: '📨', correspondence: '✉️', other: '📁'
  }
  return map[cat] ?? '📁'
}

function statusBadge(status: FacilityDocument['status']) {
  const map: Record<string, 'success'|'default'|'warning'> = {
    active: 'success', superseded: 'warning', archived: 'default'
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function daysUntilExpiry(expiry: string) {
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
}

export function DocumentsPageClient() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [selected, setSelected] = useState<FacilityDocument | null>(null)

  const filtered = DOCUMENTS.filter(d => {
    const q = search.toLowerCase()
    const matchQ = d.name.toLowerCase().includes(q) || (d.entity_label ?? '').toLowerCase().includes(q)
    const matchC = catFilter === 'all' || d.category === catFilter
    return matchQ && matchC
  })

  const expiringSoon = DOCUMENTS.filter(d => d.expiry_date && daysUntilExpiry(d.expiry_date) <= 60 && daysUntilExpiry(d.expiry_date) > 0)

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar title="Documents" subtitle="Facility documents, certificates and compliance files" />

        {/* KPIs */}
        <div className="flex gap-4 px-6 py-4 border-b border-surface-border dark:border-dark-border flex-shrink-0">
          {[
            { label: 'Total Documents', value: DOCUMENTS.length,  color: 'text-text' },
            { label: 'Active',          value: DOCUMENTS.filter(d => d.status === 'active').length, color: 'text-green-600' },
            { label: 'Expiring Soon',   value: expiringSoon.length, color: expiringSoon.length > 0 ? 'text-amber-600' : 'text-green-600' },
          ].map(k => (
            <div key={k.label} className="flex-1 bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl p-4">
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{k.label}</p>
            </div>
          ))}
          <div className="flex-1" />
        </div>

        {/* expiry alert */}
        {expiringSoon.length > 0 && (
          <div className="mx-6 mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2 flex-shrink-0">
            <span>⚠️</span>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>{expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''}</strong> expiring within 60 days: {expiringSoon.map(d => d.name).join(', ')}
            </p>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden min-h-0 mt-4">
          {/* list */}
          <div className="w-80 flex-shrink-0 border-r border-surface-border dark:border-dark-border flex flex-col">
            <div className="p-3 space-y-2 border-b border-surface-border dark:border-dark-border flex-shrink-0">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" />
                </div>
                <button className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 whitespace-nowrap">+ Upload</button>
              </div>
              <Select value={catFilter} onChange={setCatFilter} options={[
                { value: 'all', label: 'All categories' },
                { value: 'lease_agreement', label: 'Lease Agreements' },
                { value: 'inspection_report', label: 'Inspection Reports' },
                { value: 'id_kyc', label: 'ID / KYC' },
                { value: 'insurance', label: 'Insurance' },
                { value: 'compliance_certificate', label: 'Compliance Certs' },
                { value: 'vendor_contract', label: 'Vendor Contracts' },
                { value: 'financial_statement', label: 'Financial' },
              ]} />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-border dark:divide-dark-border">
              {filtered.map(doc => {
                const expDays = doc.expiry_date ? daysUntilExpiry(doc.expiry_date) : null
                return (
                  <button key={doc.id} onClick={() => setSelected(doc)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-hover dark:hover:bg-dark-hover transition-colors ${selected?.id === doc.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg mt-0.5">{categoryIcon(doc.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{doc.name}</p>
                        <p className="text-xs text-text-muted">{doc.entity_label ?? 'General'}</p>
                        {expDays !== null && expDays <= 60 && expDays > 0 && (
                          <p className="text-xs text-amber-600 font-medium mt-0.5">Expires in {expDays}d</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
              {filtered.length === 0 && <p className="py-8 text-center text-sm text-text-muted">No documents found.</p>}
            </div>
          </div>

          {/* detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-sm text-text-muted">Select a document to view details</div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{categoryIcon(selected.category)}</span>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-text">{selected.name}</h2>
                    <p className="text-sm text-text-muted">{selected.entity_label ?? 'General'} · {selected.id}</p>
                    <div className="flex gap-1.5 mt-1">{statusBadge(selected.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Category', value: selected.category.replace(/_/g,' ') },
                    { label: 'Entity Type', value: selected.entity_type },
                    { label: 'Upload Date', value: selected.upload_date },
                    { label: 'Uploaded By', value: selected.uploaded_by },
                    ...(selected.file_type ? [{ label: 'File Type', value: selected.file_type.toUpperCase() }] : []),
                    ...(selected.file_size_kb ? [{ label: 'File Size', value: `${selected.file_size_kb} KB` }] : []),
                    ...(selected.expiry_date ? [{ label: 'Expiry Date', value: selected.expiry_date }] : []),
                  ].map(f => (
                    <div key={f.label} className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-3">
                      <p className="text-xs text-text-muted">{f.label}</p>
                      <p className="text-sm font-medium text-text capitalize">{f.value}</p>
                    </div>
                  ))}
                </div>

                {selected.description && (
                  <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-lg p-4">
                    <p className="text-xs font-semibold text-text-muted mb-1">Description</p>
                    <p className="text-sm text-text">{selected.description}</p>
                  </div>
                )}

                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-surface-hover dark:bg-dark-hover border border-surface-border dark:border-dark-border rounded-full text-text-muted">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700">Download</button>
                  <button className="px-4 py-1.5 text-sm font-medium bg-surface border border-surface-border dark:border-dark-border text-text-muted rounded-lg hover:bg-surface-hover">Replace</button>
                  <button className="px-4 py-1.5 text-sm font-medium bg-surface border border-surface-border dark:border-dark-border text-text-muted rounded-lg hover:bg-surface-hover">Archive</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
