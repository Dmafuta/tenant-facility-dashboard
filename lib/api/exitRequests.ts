import { apiFetch } from './fetch'

export interface ExitRequest {
  id: string
  lease_id: string | null
  unit_id: string
  person_id: string
  person_name: string | null
  unit_label: string | null
  move_out_date: string | null
  reason: string | null
  notes: string | null
  status: 'pending_billing' | 'billing_approved' | 'rejected' | 'completed' | 'cancelled'
  initiated_by: string | null
  initiated_by_name: string | null
  initiated_at: string | null
  billing_action: 'cleared' | 'waived' | null
  billing_notes: string | null
  billing_reviewed_by_name: string | null
  billing_reviewed_at: string | null
  unit_condition: string | null
  keys_returned: boolean | null
  deposit_deduction: number | null
  completion_notes: string | null
  completed_at: string | null
  outstanding_ws_balance: number
  created_at: string
}

export function getExitRequests(status?: string): Promise<ExitRequest[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<ExitRequest[]>(`/lease-exit-requests${q}`)
}

export function getActiveExitRequest(personId: string): Promise<ExitRequest | null> {
  return apiFetch<ExitRequest | null>(`/lease-exit-requests/person/${personId}/active`)
}

export function getPendingExitCount(): Promise<number> {
  return apiFetch<number>('/lease-exit-requests/count/pending')
}

export function initiateExitRequest(data: {
  lease_id?: string | null
  unit_id: string
  person_id: string
  person_name: string
  unit_label?: string
  move_out_date: string
  reason: string
  notes?: string
}): Promise<ExitRequest> {
  return apiFetch<ExitRequest>('/lease-exit-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function billingReviewExit(
  id: string,
  action: 'cleared' | 'waived' | 'rejected',
  notes?: string
): Promise<ExitRequest> {
  return apiFetch<ExitRequest>(`/lease-exit-requests/${id}/billing-review`, {
    method: 'PATCH',
    body: JSON.stringify({ action, notes: notes ?? '' }),
  })
}

export function completeExitRequest(
  id: string,
  data: {
    unit_condition: string
    keys_returned: boolean
    deposit_deduction: number
    notes?: string
  }
): Promise<ExitRequest> {
  return apiFetch<ExitRequest>(`/lease-exit-requests/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function cancelExitRequest(id: string): Promise<ExitRequest> {
  return apiFetch<ExitRequest>(`/lease-exit-requests/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
}
