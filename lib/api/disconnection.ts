import { apiFetch } from './fetch'
import type { ChargeData } from './charges'

export type { ChargeData }

export interface DisconnectionNoticeData {
  id: string
  meter_id: string
  meter_number: string
  unit_id: string | null
  unit_label: string | null
  person_id: string | null
  person_name: string | null
  person_phone: string | null
  notice_type: 'reminder' | 'formal'
  outstanding_amount_kes: number | null
  utility_type: string | null
  sent_by: string | null
  sent_at: string
  notes: string | null
}

export interface SendNoticePayload {
  meter_id: string
  meter_number: string
  unit_id: string | null
  unit_label: string | null
  person_id: string | null
  person_name: string | null
  person_phone: string | null
  person_email: string | null
  notice_type: 'reminder' | 'formal'
  outstanding_amount_kes: number
  utility_type: string
  notes?: string
}

export async function getOverdueUtilityCharges(): Promise<ChargeData[]> {
  return apiFetch<ChargeData[]>('/charges/utility-overdue')
}

export async function getDisconnectionNotices(): Promise<DisconnectionNoticeData[]> {
  return apiFetch<DisconnectionNoticeData[]>('/disconnection-notices')
}

export async function sendDisconnectionNotice(payload: SendNoticePayload): Promise<DisconnectionNoticeData> {
  return apiFetch<DisconnectionNoticeData>('/disconnection-notices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
