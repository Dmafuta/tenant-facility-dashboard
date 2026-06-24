import { apiFetch } from './fetch'

export interface PayrollData {
  id: string
  person_id: string
  person_name: string | null
  month: string
  gross_salary: number | null
  paye: number | null
  nssf: number | null
  nhif: number | null
  other_deductions: number | null
  net_salary: number | null
  notes: string | null
  created_at: string | null
}

export function listPayroll(params?: { person_id?: string; month?: string }): Promise<PayrollData[]> {
  const q = new URLSearchParams()
  if (params?.person_id) q.set('person_id', params.person_id)
  if (params?.month)     q.set('month',     params.month)
  return apiFetch(`/staff/payroll${q.size ? '?' + q : ''}`)
}

export function savePayroll(payload: Record<string, unknown>): Promise<PayrollData> {
  return apiFetch('/staff/payroll', { method: 'POST', body: JSON.stringify(payload) })
}

export function deletePayroll(id: string): Promise<void> {
  return apiFetch(`/staff/payroll/${id}`, { method: 'DELETE' })
}
