import { apiFetch } from './fetch'

export interface OtpSendResult {
  masked_phone: string
}

export function sendRevealOtp(purpose: string): Promise<OtpSendResult> {
  return apiFetch('/otp/reveal/send', {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  })
}

export function verifyRevealOtp(purpose: string, code: string): Promise<void> {
  return apiFetch('/otp/reveal/verify', {
    method: 'POST',
    body: JSON.stringify({ purpose, code }),
  })
}
