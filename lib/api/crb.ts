import { apiFetch } from './fetch'

export interface CrbConsentInfo {
  person_name:   string
  property_name: string
  expires_at:    string
  already_used:  boolean
}

export interface CrbStatus {
  person_id:          string
  crb_consent_given:  boolean
  crb_consent_at:     string | null
  crb_checked_at:     string | null
  crb_status:         string | null  // clear | listed | unknown
  crb_score:          number | null
  crb_listing_reason: string | null
  crb_provider_ref:   string | null
}

// ── Admin endpoints ─────────────────────────────────────────────────────────

export async function requestCrbConsent(personId: string): Promise<void> {
  await apiFetch<void>(`/people/${personId}/crb/request-consent`, { method: 'POST' })
}

export async function runCrbCheck(personId: string): Promise<CrbStatus> {
  return apiFetch<CrbStatus>(`/people/${personId}/crb/check`, { method: 'POST' })
}

export async function getCrbStatus(personId: string): Promise<CrbStatus> {
  return apiFetch<CrbStatus>(`/people/${personId}/crb/status`)
}

// ── Public endpoints (consent page — no auth cookie needed) ─────────────────

const PUBLIC_API = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res  = await fetch(`${PUBLIC_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(json.message ?? `Request failed (${res.status})`)
  return json.data as T
}

export async function getCrbConsentInfo(token: string): Promise<CrbConsentInfo> {
  return publicFetch<CrbConsentInfo>(`/crb/consent/${token}`)
}

export async function submitCrbConsent(token: string): Promise<void> {
  await publicFetch<void>(`/crb/consent/${token}`, { method: 'POST' })
}
