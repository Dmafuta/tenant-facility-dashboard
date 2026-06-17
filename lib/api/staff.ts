import { apiFetch } from './fetch'

export interface PersonalStaffData {
  id: string
  employer_person_id: string
  first_name: string
  last_name: string
  national_id: string | null
  phone: string | null
  role: string
  status: string
  access_days: string
  access_hours_start: string | null
  access_hours_end: string | null
  background_check_done: boolean
  background_check_date: string | null
  registered_date: string | null
  notes: string | null
  created_at: string | null
}

export async function getPersonalStaff(personId: string): Promise<PersonalStaffData[]> {
  return apiFetch<PersonalStaffData[]>(`/people/${personId}/staff`)
}

export async function createPersonalStaff(personId: string, payload: Record<string, unknown>): Promise<PersonalStaffData> {
  return apiFetch<PersonalStaffData>(`/people/${personId}/staff`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePersonalStaff(personId: string, staffId: string, payload: Record<string, unknown>): Promise<PersonalStaffData> {
  return apiFetch<PersonalStaffData>(`/people/${personId}/staff/${staffId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deletePersonalStaff(personId: string, staffId: string): Promise<void> {
  await apiFetch<unknown>(`/people/${personId}/staff/${staffId}`, { method: 'DELETE' })
}
