import { apiFetch } from './fetch'

export interface LeaseData {
  id: string
  unit_id: string
  unit_label: string | null
  tenant_id: string
  tenant_name: string | null
  monthly_rent: number | null
  deposit: number | null
  start_date: string
  end_date: string | null
  status: string
  notice_date: string | null
  billing_cycle: string | null
  next_billing_date: string | null
  pro_rate_first: boolean
  notes: string | null
  created_at: string | null
}

export async function getLeases(unitId: string): Promise<LeaseData[]> {
  return apiFetch<LeaseData[]>(`/units/${unitId}/leases`)
}

export async function getAllLeases(status?: string): Promise<LeaseData[]> {
  const url = status ? `/leases?status=${encodeURIComponent(status)}` : '/leases'
  return apiFetch<LeaseData[]>(url)
}

export async function createLease(unitId: string, payload: Record<string, unknown>): Promise<LeaseData> {
  return apiFetch<LeaseData>(`/units/${unitId}/leases`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateLease(unitId: string, leaseId: string, payload: Record<string, unknown>): Promise<LeaseData> {
  return apiFetch<LeaseData>(`/units/${unitId}/leases/${leaseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteLease(unitId: string, leaseId: string): Promise<void> {
  await apiFetch<unknown>(`/units/${unitId}/leases/${leaseId}`, { method: 'DELETE' })
}
