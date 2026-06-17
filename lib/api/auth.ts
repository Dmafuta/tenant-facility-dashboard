import { apiFetch } from './fetch'

export interface UserData {
  id: string
  email: string
  fullName: string
  role: string
  status: string
  unitIds: string[]
  twoFactorEnabled: boolean
  phone?: string
}

export interface TwoFactorChallenge {
  requiresTwoFactor: true
  email: string
  maskedContact: string
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<UserData | TwoFactorChallenge> {
  return apiFetch<UserData | TwoFactorChallenge>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function toggleTwoFactor(enabled: boolean): Promise<void> {
  await apiFetch<void>('/auth/2fa/toggle', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  })
}

export async function updatePhone(phone: string): Promise<void> {
  await apiFetch<void>('/auth/me/phone', {
    method: 'PUT',
    body: JSON.stringify({ phone }),
  })
}

export async function sendOtp(email: string): Promise<void> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'
  const res = await fetch(`${api}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message ?? 'Failed to send code')
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<UserData> {
  return apiFetch<UserData>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/signout', { method: 'POST' })
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' })
  } catch {
    // Proceed to redirect even if the API call fails —
    // the session is effectively abandoned on the client.
  }
}
