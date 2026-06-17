import { apiFetch } from './fetch'

export interface HouseholdMemberData {
  id: string
  person_id: string
  first_name: string
  last_name: string | null
  relationship: string
  phone: string | null
  national_id: string | null
  email: string | null
  date_of_birth: string | null
  is_minor: boolean
  can_authorize_visitors: boolean
  status: string
  notes: string | null
  created_at: string | null
}

export async function getHouseholdMembers(personId: string): Promise<HouseholdMemberData[]> {
  return apiFetch<HouseholdMemberData[]>(`/people/${personId}/household`)
}

export async function createHouseholdMember(personId: string, payload: Record<string, unknown>): Promise<HouseholdMemberData> {
  return apiFetch<HouseholdMemberData>(`/people/${personId}/household`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateHouseholdMember(personId: string, memberId: string, payload: Record<string, unknown>): Promise<HouseholdMemberData> {
  return apiFetch<HouseholdMemberData>(`/people/${personId}/household/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteHouseholdMember(personId: string, memberId: string): Promise<void> {
  await apiFetch<unknown>(`/people/${personId}/household/${memberId}`, { method: 'DELETE' })
}
