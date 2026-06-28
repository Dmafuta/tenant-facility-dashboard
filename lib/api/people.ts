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
  // Employment
  staff_number: string | null
  job_title: string | null
  department: string | null
  contract_type: string | null
  contract_status: string | null
  start_date: string | null
  end_date: string | null
  probation_end_date: string | null
  background_check_done: boolean
  // Offboarding
  exit_date: string | null
  exit_reason: string | null
  exit_notes: string | null
  created_at: string | null
  home_unit_label: string | null
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

export async function grantPortalAccess(personId: string, roleName: string): Promise<void> {
  await apiFetch<void>(`/people/${personId}/grant-portal-access`, {
    method: 'POST',
    body: JSON.stringify({ roleName }),
  })
}

export async function offboardPerson(
  personId: string,
  payload: { exitDate?: string; exitReason?: string; exitNotes?: string }
): Promise<PersonData> {
  return apiFetch<PersonData>(`/people/${personId}/offboard`, {
    method: 'POST',
    body: JSON.stringify({
      exitDate:   payload.exitDate,
      exitReason: payload.exitReason,
      exitNotes:  payload.exitNotes,
    }),
  })
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
    middle_name: p.middle_name ?? undefined,
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
    staff_number: p.staff_number ?? undefined,
    job_title: p.job_title ?? undefined,
    department: p.department ?? undefined,
    contract_type: p.contract_type ?? undefined,
    contract_status: p.contract_status ?? undefined,
    start_date: p.start_date ?? undefined,
    end_date: p.end_date ?? undefined,
    probation_end_date: p.probation_end_date ?? undefined,
    background_check_done: p.background_check_done,
    exit_date: p.exit_date ?? undefined,
    exit_reason: p.exit_reason ?? undefined,
    exit_notes: p.exit_notes ?? undefined,
  }
}
