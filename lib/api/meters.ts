import { apiFetch } from './fetch'

export interface MeterData {
  id: string
  unit_id: string | null
  unit_label: string | null
  utility_type: string
  meter_type: string
  meter_number: string
  account_number: string | null
  installation_date: string | null
  status: string
  billing_arrangement: string
  management_fee_pct: number | null
  last_reading: number | null
  last_reading_date: string | null
  current_billing_person: { person_id: string; name: string } | null
  meter_role: string | null
  notes: string | null
  created_at: string | null
}

export async function getMeters(unitId: string): Promise<MeterData[]> {
  return apiFetch<MeterData[]>(`/units/${unitId}/meters`)
}

export async function createMeter(unitId: string, payload: Record<string, unknown>): Promise<MeterData> {
  return apiFetch<MeterData>(`/units/${unitId}/meters`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateMeter(unitId: string, meterId: string, payload: Record<string, unknown>): Promise<MeterData> {
  return apiFetch<MeterData>(`/units/${unitId}/meters/${meterId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteMeter(unitId: string, meterId: string): Promise<void> {
  await apiFetch<unknown>(`/units/${unitId}/meters/${meterId}`, { method: 'DELETE' })
}
