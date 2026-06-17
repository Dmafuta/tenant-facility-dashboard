import { apiFetch } from './fetch'

export interface EmergencyContactData {
  id: string
  person_id: string
  name: string
  relationship: string | null
  phone_primary: string
  phone_secondary: string | null
  email: string | null
  address: string | null
  priority: number
  notes: string | null
  created_at: string | null
}

export async function getEmergencyContacts(personId: string): Promise<EmergencyContactData[]> {
  return apiFetch<EmergencyContactData[]>(`/people/${personId}/emergency-contacts`)
}

export async function createEmergencyContact(personId: string, payload: Record<string, unknown>): Promise<EmergencyContactData> {
  return apiFetch<EmergencyContactData>(`/people/${personId}/emergency-contacts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEmergencyContact(personId: string, contactId: string, payload: Record<string, unknown>): Promise<EmergencyContactData> {
  return apiFetch<EmergencyContactData>(`/people/${personId}/emergency-contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteEmergencyContact(personId: string, contactId: string): Promise<void> {
  await apiFetch<unknown>(`/people/${personId}/emergency-contacts/${contactId}`, { method: 'DELETE' })
}
