import { apiFetch } from './fetch'

export interface DepartmentData {
  id: string
  name: string
  description: string | null
  head_person_id: string | null
  head_name: string | null
  budget_monthly: number | null
  created_at: string | null
  updated_at: string | null
}

export async function listDepartments(): Promise<DepartmentData[]> {
  return apiFetch<DepartmentData[]>('/departments')
}

export async function createDepartment(payload: Record<string, unknown>): Promise<DepartmentData> {
  return apiFetch<DepartmentData>('/departments', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateDepartment(id: string, payload: Record<string, unknown>): Promise<DepartmentData> {
  return apiFetch<DepartmentData>(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiFetch<void>(`/departments/${id}`, { method: 'DELETE' })
}
