import { apiFetch } from './fetch'

export interface BlockReaderSummary {
  reader_user_id: string
  reader_name: string
  meter_count: number
  completed: number
  pending: number
}

export interface BlockSummary {
  block: string
  total_meters: number
  assigned_meters: number
  readers: BlockReaderSummary[]
}

export interface PhaseSummary {
  phase: string
  total_meters: number
  assigned_meters: number
  blocks: BlockSummary[]
}

export interface AssignmentUser {
  id: string
  full_name: string
  email: string
  role_name: string
  status: string
}

export function getAssignmentSummary(period: string): Promise<PhaseSummary[]> {
  return apiFetch(`/reading-assignments/summary?period=${encodeURIComponent(period)}`)
}

export function assignBlock(payload: {
  billing_period: string
  block: string
  reader_user_id: string
  reader_name: string
}): Promise<{ assigned: number; block: string }> {
  return apiFetch('/reading-assignments/by-block', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function clearBlock(period: string, block: string): Promise<void> {
  return apiFetch(
    `/reading-assignments/by-block?period=${encodeURIComponent(period)}&block=${encodeURIComponent(block)}`,
    { method: 'DELETE' }
  )
}

export function getUsers(): Promise<AssignmentUser[]> {
  return apiFetch('/settings/users')
}
