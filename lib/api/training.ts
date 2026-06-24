import { apiFetch } from './fetch'

export interface TrainingData {
  id: string
  person_id: string
  person_name: string | null
  training_name: string
  provider: string | null
  completion_date: string | null
  expiry_date: string | null
  certificate_number: string | null
  notes: string | null
  created_at: string | null
}

export function listTraining(personId?: string): Promise<TrainingData[]> {
  return apiFetch(`/staff/training${personId ? '?person_id=' + personId : ''}`)
}

export function createTraining(payload: Record<string, unknown>): Promise<TrainingData> {
  return apiFetch('/staff/training', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateTraining(id: string, payload: Record<string, unknown>): Promise<TrainingData> {
  return apiFetch(`/staff/training/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteTraining(id: string): Promise<void> {
  return apiFetch(`/staff/training/${id}`, { method: 'DELETE' })
}
