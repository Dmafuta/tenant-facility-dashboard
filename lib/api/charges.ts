import { apiFetch } from './fetch'

export interface ChargeData {
  id: string
  unit_id: string
  unit_label: string | null
  person_id: string | null
  person_name: string | null
  type: string
  amount: number
  paid_amount: number
  due_date: string | null
  paid_date: string | null
  status: string
  period: string | null
  description: string | null
  receipt_no: string | null
  created_at: string | null
}

export async function getCharges(unitId: string): Promise<ChargeData[]> {
  return apiFetch<ChargeData[]>(`/units/${unitId}/charges`)
}

export async function createCharge(unitId: string, payload: Record<string, unknown>): Promise<ChargeData> {
  return apiFetch<ChargeData>(`/units/${unitId}/charges`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateCharge(unitId: string, chargeId: string, payload: Record<string, unknown>): Promise<ChargeData> {
  return apiFetch<ChargeData>(`/units/${unitId}/charges/${chargeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteCharge(unitId: string, chargeId: string): Promise<void> {
  await apiFetch<unknown>(`/units/${unitId}/charges/${chargeId}`, { method: 'DELETE' })
}

export async function recordPayment(
  unitId: string,
  chargeId: string,
  payload: { amount: number; paid_date?: string; receipt_no?: string }
): Promise<ChargeData> {
  return apiFetch<ChargeData>(`/units/${unitId}/charges/${chargeId}/pay`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function getAllCharges(status?: string): Promise<ChargeData[]> {
  const qs = status && status !== 'all' ? `?status=${status}` : ''
  return apiFetch<ChargeData[]>(`/charges${qs}`)
}
