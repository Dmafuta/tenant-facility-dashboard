import { apiFetch } from './fetch'

export interface IssueData {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  unit_id: string | null
  unit_label: string | null
  reported_by_id: string | null
  reported_by_name: string | null
  assigned_to: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string | null
  updated_at: string | null
}

export async function getIssues(): Promise<IssueData[]> {
  return apiFetch<IssueData[]>('/issues')
}

export async function createIssue(payload: Record<string, unknown>): Promise<IssueData> {
  return apiFetch<IssueData>('/issues', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateIssue(id: string, payload: Record<string, unknown>): Promise<IssueData> {
  return apiFetch<IssueData>(`/issues/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updateIssueStatus(
  id: string,
  status: string,
  extra?: { resolution_notes?: string; assigned_to?: string }
): Promise<IssueData> {
  return apiFetch<IssueData>(`/issues/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...extra }),
  })
}

export async function deleteIssue(id: string): Promise<void> {
  await apiFetch<unknown>(`/issues/${id}`, { method: 'DELETE' })
}
