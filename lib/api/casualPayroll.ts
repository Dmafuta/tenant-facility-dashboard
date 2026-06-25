import { apiFetch } from './fetch'

export interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  status: 'draft' | 'in_review' | 'approved' | 'paid'
  overtime_multiplier: number
  total_gross: number | null
  total_net: number | null
  entry_count: number | null
  unmatched_count: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  entries?: PayrollEntry[]
}

export interface PayrollEntry {
  id: string
  run_id: string
  person_id: string | null
  biometric_id: string
  name_in_file: string
  person_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  bank_branch_code: string | null
  days_scheduled: number
  days_worked: number
  overtime_hours: number
  late_minutes: number
  absent_days: number
  daily_rate: number | null
  gross_pay: number
  overtime_pay: number
  deductions: number
  net_pay: number
  override_net_pay: number | null
  matched: boolean
  notes: string | null
}

const BASE = '/payroll/casual'

export function listRuns(): Promise<PayrollRun[]> {
  return apiFetch(`${BASE}/runs`)
}

export function createRun(payload: { period_start: string; period_end: string; notes?: string }): Promise<PayrollRun> {
  return apiFetch(`${BASE}/runs`, { method: 'POST', body: JSON.stringify(payload) })
}

export function getRun(id: string): Promise<PayrollRun> {
  return apiFetch(`${BASE}/runs/${id}`)
}

export async function uploadAttendance(runId: string, file: File): Promise<PayrollRun> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`/api/backend/payroll/casual/runs/${runId}/upload`, {
    method: 'POST',
    body: form,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Upload failed')
  return json.data
}

export function patchEntry(runId: string, entryId: string, patch: Record<string, unknown>): Promise<PayrollEntry> {
  return apiFetch(`${BASE}/runs/${runId}/entries/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function updateRunStatus(runId: string, status: string): Promise<PayrollRun> {
  return apiFetch(`${BASE}/runs/${runId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export function exportKcb(runId: string): void {
  window.open(`/api/backend/payroll/casual/runs/${runId}/export`, '_blank')
}
