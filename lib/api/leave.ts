import { apiFetch } from './fetch'

export interface LeaveData {
  id: string
  person_id: string
  person_name: string | null
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: string
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  approval_notes: string | null
  created_at: string | null
}

export function listLeave(params?: { person_id?: string; status?: string }): Promise<LeaveData[]> {
  const q = new URLSearchParams()
  if (params?.person_id) q.set('person_id', params.person_id)
  if (params?.status)    q.set('status',    params.status)
  return apiFetch(`/staff/leave${q.size ? '?' + q : ''}`)
}

export function createLeave(payload: Record<string, unknown>): Promise<LeaveData> {
  return apiFetch('/staff/leave', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateLeave(id: string, payload: Record<string, unknown>): Promise<LeaveData> {
  return apiFetch(`/staff/leave/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function approveLeave(id: string, payload: { approved_by?: string; approval_notes?: string }): Promise<LeaveData> {
  return apiFetch(`/staff/leave/${id}/approve`, { method: 'POST', body: JSON.stringify(payload) })
}

export function rejectLeave(id: string, payload: { approved_by?: string; approval_notes?: string }): Promise<LeaveData> {
  return apiFetch(`/staff/leave/${id}/reject`, { method: 'POST', body: JSON.stringify(payload) })
}

export function deleteLeave(id: string): Promise<void> {
  return apiFetch(`/staff/leave/${id}`, { method: 'DELETE' })
}
