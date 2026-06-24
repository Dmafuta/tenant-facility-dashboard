import { apiFetch } from './fetch'

export interface StaffDocData {
  id: string
  person_id: string
  person_name: string | null
  document_type: string
  filename: string
  file_size: number
  content_type: string | null
  expiry_date: string | null
  notes: string | null
  created_at: string | null
}

export function listStaffDocs(personId?: string): Promise<StaffDocData[]> {
  return apiFetch(`/staff/documents${personId ? '?person_id=' + personId : ''}`)
}

export async function uploadStaffDoc(payload: {
  person_id: string
  document_type: string
  file: File
  expiry_date?: string
  notes?: string
}): Promise<StaffDocData> {
  const form = new FormData()
  form.append('person_id',     payload.person_id)
  form.append('document_type', payload.document_type)
  form.append('file',          payload.file)
  if (payload.expiry_date) form.append('expiry_date', payload.expiry_date)
  if (payload.notes)       form.append('notes',       payload.notes)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'}/staff/documents`, {
    method: 'POST',
    body: form,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Upload failed')
  return json.data as StaffDocData
}

export function patchStaffDoc(id: string, payload: Record<string, unknown>): Promise<StaffDocData> {
  return apiFetch(`/staff/documents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteStaffDoc(id: string): Promise<void> {
  return apiFetch(`/staff/documents/${id}`, { method: 'DELETE' })
}

export function staffDocDownloadUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'}/staff/documents/${id}/download`
}
