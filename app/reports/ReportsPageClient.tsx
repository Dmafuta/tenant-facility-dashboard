'use client'
import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'

interface Report {
  name: string
  desc: string
  badge: 'PDF' | 'XLSX'
  premium?: boolean
  file?: string
}

const REPORT_CATEGORIES: { title: string; icon: string; color: string; reports: Report[] }[] = [
  {
    title: 'Financial Reports',
    icon: '\u{1F4B0}',
    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    reports: [
      { name: 'Monthly Rent Collection', desc: 'Rent collected vs expected by period', badge: 'PDF', file: '/reports/Rent_Collection_Jun2026.pdf' },
      { name: 'Outstanding Arrears', desc: 'All unpaid charges with aging analysis', badge: 'PDF', file: '/reports/Arrears_Report_Jun2026.pdf' },
      { name: 'Charge Type Breakdown', desc: 'Revenue by charge type (rent, utilities, fines)', badge: 'XLSX', file: '/reports/Charges_Ledger_Jun2026.xlsx' },
      { name: 'Deposit Ledger Summary', desc: 'All deposits held, deductions and refunds', badge: 'PDF' },
    ],
  },
  {
    title: 'Occupancy Reports',
    icon: '\u{1F3E2}',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    reports: [
      { name: 'Occupancy Rate',        desc: 'Occupied vs vacant units by block and floor', badge: 'PDF' },
      { name: 'Lease Expiry Schedule', desc: 'Upcoming lease renewals and expiry dates',    badge: 'PDF' },
      { name: 'Tenant Turnover',       desc: 'Move-ins and move-outs over a given period',  badge: 'XLSX' },
    ],
  },
  {
    title: 'Utilities & Maintenance',
    icon: '\u{1F527}',
    color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    reports: [
      { name: 'Water Balance Report',       desc: 'Supply chain loss analysis by zone', badge: 'PDF' },
      { name: 'Meter Readings Summary',     desc: 'All readings in a billing period',   badge: 'XLSX', file: '/reports/Meter_Readings_Jun2026.xlsx' },
      { name: 'Work Order Status Report',   desc: 'Open, in-progress, completed jobs',  badge: 'PDF' },
      { name: 'Preventive Maintenance Log', desc: 'Scheduled tasks due and completed',  badge: 'PDF' },
    ],
  },
  {
    title: 'Compliance & Communications',
    icon: '⚖',
    color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    reports: [
      { name: 'Active Breach Records',  desc: 'Open and warned breaches by severity',  badge: 'PDF' },
      { name: 'Notice Delivery Status', desc: 'All notices sent and acknowledgements', badge: 'PDF' },
      { name: 'Document Expiry Report', desc: 'Certificates and contracts expiring',   badge: 'PDF' },
    ],
  },
  {
    title: 'Visitor & Access Reports',
    icon: '\u{1FAAA}',
    color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    reports: [
      { name: 'Visitor Log Export',    desc: 'All visitor entries by date range',        badge: 'XLSX' },
      { name: 'Gate Activity Summary', desc: 'Entry/exit counts by period and gate',     badge: 'PDF', premium: true },
      { name: 'Denied Entry Report',   desc: 'All denied visitor attempts with reasons', badge: 'PDF', premium: true },
    ],
  },
]

const RECENT_EXPORTS = [
  { name: 'June 2026 Rent Collection',  type: 'PDF',  generated: '2026-06-13', by: 'Jane Karimi', file: '/reports/Rent_Collection_Jun2026.pdf' },
  { name: 'Arrears Report - June 2026', type: 'PDF',  generated: '2026-06-13', by: 'Jane Karimi', file: '/reports/Arrears_Report_Jun2026.pdf' },
  { name: 'Meter Readings - June 2026', type: 'XLSX', generated: '2026-06-13', by: 'System',      file: '/reports/Meter_Readings_Jun2026.xlsx' },
  { name: 'Charges Ledger - June 2026', type: 'XLSX', generated: '2026-06-13', by: 'System',      file: '/reports/Charges_Ledger_Jun2026.xlsx' },
  { name: 'May 2026 Rent Collection',   type: 'PDF',  generated: '2026-06-01', by: 'Jane Karimi', file: undefined },
]

export function ReportsPageClient() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleGenerate(report: Report) {
    if (report.file) {
      window.open(report.file, '_blank')
      showToast('Opening ' + report.name + '...')
      return
    }
    setGenerating(report.name)
    setTimeout(() => {
      setGenerating(null)
      showToast(report.name + ' - demo export (no data configured yet)')
    }, 1800)
  }

  function handleDownload(file: string | undefined, name: string) {
    if (!file) {
      showToast('File not available - re-generate to create a fresh export')
      return
    }
    const a = document.createElement('a')
    a.href = file
    a.download = file.split('/').pop() ?? name
    a.click()
  }

  return (
    <DashboardLayout>
      <main className="flex-1 overflow-y-auto">
        <Topbar title="Reports & Analytics" subtitle="Generate and export facility management reports" />

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
            {toast}
          </div>
        )}

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Recent Exports</h3>
            <div className="bg-surface border border-surface-border dark:border-dark-border dark:bg-dark-surface rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-hover dark:bg-dark-hover">
                  <tr>
                    {['Report', 'Format', 'Generated', 'By', ''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border dark:divide-dark-border">
                  {RECENT_EXPORTS.map((r, i) => (
                    <tr key={i} className="hover:bg-surface-hover dark:hover:bg-dark-hover">
                      <td className="px-4 py-2.5 text-text font-medium">{r.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-mono font-bold ${r.type === 'PDF' ? 'text-red-600' : 'text-green-700'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted">{r.generated}</td>
                      <td className="px-4 py-2.5 text-text-muted">{r.by}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleDownload(r.file, r.name)}
                          className={`text-xs font-medium transition-colors ${r.file ? 'text-primary-600 hover:underline' : 'text-text-muted cursor-default'}`}
                        >
                          {r.file ? 'Download' : 'Unavailable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {REPORT_CATEGORIES.map(cat => (
            <div key={cat.title}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{cat.icon}</span>
                <h3 className="text-sm font-semibold text-text">{cat.title}</h3>
              </div>
              <div className={`border rounded-xl p-4 ${cat.color}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cat.reports.map(report => {
                    const isGenerating = generating === report.name
                    const hasFile = !!report.file
                    return (
                      <div
                        key={report.name}
                        className="bg-surface dark:bg-dark-surface border border-surface-border dark:border-dark-border rounded-lg p-4 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-sm font-medium text-text">{report.name}</p>
                            {report.premium && <Badge variant="warning">PRO</Badge>}
                            {hasFile && (
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                                Ready
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">{report.desc}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-mono font-bold ${report.badge === 'PDF' ? 'text-red-600' : 'text-green-700'}`}>
                            {report.badge}
                          </span>
                          <button
                            onClick={() => handleGenerate(report)}
                            disabled={isGenerating}
                            className="px-3 py-1 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {isGenerating ? (
                              <>
                                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                </svg>
                                Generating...
                              </>
                            ) : hasFile ? 'Open' : 'Generate'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </DashboardLayout>
  )
}
