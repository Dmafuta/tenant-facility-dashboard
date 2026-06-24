import { apiFetch } from './fetch'

export interface RosterEntry {
  id: string
  person_id: string
  person_name: string | null
  department: string | null
  date: string
  shift_type: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  created_at: string | null
}

export function listRoster(params?: {
  from?: string; to?: string; person_id?: string; department?: string
}): Promise<RosterEntry[]> {
  const q = new URLSearchParams()
  if (params?.from)       q.set('from',       params.from)
  if (params?.to)         q.set('to',         params.to)
  if (params?.person_id)  q.set('person_id',  params.person_id)
  if (params?.department) q.set('department', params.department)
  return apiFetch(`/staff/roster${q.size ? '?' + q : ''}`)
}

export function createRosterEntry(payload: Record<string, unknown>): Promise<RosterEntry> {
  return apiFetch('/staff/roster', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateRosterEntry(id: string, payload: Record<string, unknown>): Promise<RosterEntry> {
  return apiFetch(`/staff/roster/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteRosterEntry(id: string): Promise<void> {
  return apiFetch(`/staff/roster/${id}`, { method: 'DELETE' })
}
