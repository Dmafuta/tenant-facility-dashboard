import { apiFetch } from './fetch'

export interface DisciplinaryData {
  id: string
  person_id: string
  person_name: string | null
  incident_date: string
  type: string
  description: string
  outcome: string | null
  issued_by: string | null
  issued_by_name: string | null
  notes: string | null
  created_at: string | null
}

export function listDisciplinary(personId?: string): Promise<DisciplinaryData[]> {
  return apiFetch(`/staff/disciplinary${personId ? '?person_id=' + personId : ''}`)
}

export function createDisciplinary(payload: Record<string, unknown>): Promise<DisciplinaryData> {
  return apiFetch('/staff/disciplinary', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateDisciplinary(id: string, payload: Record<string, unknown>): Promise<DisciplinaryData> {
  return apiFetch(`/staff/disciplinary/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteDisciplinary(id: string): Promise<void> {
  return apiFetch(`/staff/disciplinary/${id}`, { method: 'DELETE' })
}
