import { apiFetch } from './fetch'

export interface KycStatus {
  person_id:          string
  kyc_status:         string   // not_started | in_progress | pending_docs | verified | failed | partial
  kyc_method:         string | null
  kyc_step1_status:   string | null  // passed | failed
  kyc_step2_status:   string | null  // passed | failed | pending
  kyc_provider_ref:   string | null
  kyc_verified_at:    string | null
  kyc_failure_reason: string | null
  id_type:            string | null  // national_id | passport | kra_pin
  business_reg_number: string | null
}

export async function getKycStatus(personId: string): Promise<KycStatus> {
  return apiFetch<KycStatus>(`/people/${personId}/kyc/status`)
}

export async function initiateKyc(
  personId: string,
  payload: { id_type?: string; id_number?: string }
): Promise<KycStatus> {
  return apiFetch<KycStatus>(`/people/${personId}/kyc/initiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function scanKycDocument(
  personId: string,
  documentBase64: string
): Promise<KycStatus> {
  return apiFetch<KycStatus>(`/people/${personId}/kyc/scan`, {
    method: 'POST',
    body: JSON.stringify({ document_base64: documentBase64 }),
  })
}

export async function verifyKycBusiness(
  personId: string,
  payload: {
    business_reg_number?: string
    tax_id?: string
    director_national_id?: string
    cert_base64?: string
  }
): Promise<KycStatus> {
  return apiFetch<KycStatus>(`/people/${personId}/kyc/verify-business`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
