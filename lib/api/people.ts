import type { Person, PersonType, KycStatus, PersonStatus } from '@/lib/types'
import { apiFetch } from './fetch'

export interface PersonData {
  id: string
  person_type: string
  first_name: string
  middle_name: string | null
  last_name: string
  email: string | null
  phone: string | null
  national_id: string | null
  unit_ids: string[]
  home_unit_id: string | null
  status: string
  kyc_status: string
  phone_verified_at: string | null
  email_verified_at: string | null
  joined_date: string | null
  is_outsourced: boolean
  agency_name: string | null
  agency_contact: string | null
  agency_clearance_ref: string | null
  notes: string | null
  created_at: string | null
}


export async function getPeopleFromApi(): Promise<PersonData[]> {
  return apiFetch<PersonData[]>('/people')
}

export async function getPersonById(id: string): Promise<PersonData> {
  return apiFetch<PersonData>(`/people/${id}`)
}

export async function createPerson(payload: Record<string, unknown>): Promise<PersonData> {
  return apiFetch<PersonData>('/people', { method: 'POST', body: JSON.stringify(payload) })
}

export async function addUnitToPerson(personId: string, unitId: string, resident = false): Promise<PersonData> {
  const url = resident
    ? `/people/${personId}/units/${unitId}?resident=true`
    : `/people/${personId}/units/${unitId}`
  return apiFetch<PersonData>(url, { method: 'POST' })
}

export async function removeUnitFromPerson(personId: string, unitId: string): Promise<PersonData> {
  return apiFetch<PersonData>(`/people/${personId}/units/${unitId}`, { method: 'DELETE' })
}

export async function updatePerson(personId: string, payload: Record<string, unknown>): Promise<PersonData> {
  return apiFetch<PersonData>(`/people/${personId}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function updatePersonStatus(personId: string, status: string): Promise<PersonData> {
  return apiFetch<PersonData>(`/people/${personId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function updatePersonType(personId: string, personType: string): Promise<PersonData> {
  return apiFetch<PersonData>(`/people/${personId}/type`, { method: 'PATCH', body: JSON.stringify({ personType }) })
}

export async function resendWelcomeEmail(personId: string): Promise<void> {
  await apiFetch<void>(`/people/${personId}/resend-welcome-email`, { method: 'POST' })
}

export async function sendEmailVerification(personId: string): Promise<void> {
  return apiFetch(`/people/${personId}/send-email-verification`, { method: 'POST' })
}

/** Map a backend PersonData to the frontend Person shape */
export function apiPersonToPerson(p: PersonData): Person {
  const typeMap: Record<string, PersonType> = {
    tenant: 'tenant',
    resident_owner: 'resident_owner',
    non_resident_owner: 'non_resident_owner',
    short_stay_guest: 'short_stay_guest',
    permanent_staff: 'permanent_staff',
    casual_staff: 'casual_staff',
    outsourced: 'outsourced',
  }
  const statusMap: Record<string, PersonStatus> = {
    pending_verification: 'pending_verification',
    active: 'active',
    inactive: 'inactive',
    suspended: 'suspended',
    former: 'former',
  }
  return {
    id: p.id,
    type: (typeMap[p.person_type] ?? 'tenant') as PersonType,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email ?? '',
    phone: p.phone ?? '',
    national_id: p.national_id ?? undefined,
    unit_ids: p.unit_ids ?? [],
    home_unit_id: p.home_unit_id ?? undefined,
    status: (statusMap[p.status] ?? 'pending_verification') as PersonStatus,
    kyc_status: (p.kyc_status as KycStatus) ?? 'not_started',
    phone_verified_at: p.phone_verified_at ?? undefined,
    email_verified_at: p.email_verified_at ?? undefined,
    joined_date: p.joined_date ?? new Date().toISOString().slice(0, 10),
    is_outsourced: p.is_outsourced,
    agency_name: p.agency_name ?? undefined,
    agency_contact: p.agency_contact ?? undefined,
    agency_clearance_ref: p.agency_clearance_ref ?? undefined,
  }
}
