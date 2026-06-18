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

export async function getAllMeters(params?: { utilityType?: string; meterType?: string; meterRole?: string }): Promise<MeterData[]> {
  const qs = new URLSearchParams()
  if (params?.utilityType) qs.set('utilityType', params.utilityType)
  if (params?.meterType) qs.set('meterType', params.meterType)
  if (params?.meterRole) qs.set('meterRole', params.meterRole)
  const query = qs.toString()
  return apiFetch<MeterData[]>(`/meters${query ? '?' + query : ''}`)
}

export interface MeterReadingData {
  id: string
  meter_id: string
  meter_number: string
  unit_label: string | null
  utility_type: string
  previous_value: number
  current_value: number
  units_consumed: number
  reading_date: string | null
  billing_period: string | null
  source: string | null
  read_by: string | null
  unit_cost: number | null
  amount_due: number
  management_fee: number | null
  status: string
  notes: string | null
  created_at: string | null
}

export async function getMeterReadings(params?: { period?: string; meterId?: string }): Promise<MeterReadingData[]> {
  const qs = new URLSearchParams()
  if (params?.period) qs.set('period', params.period)
  if (params?.meterId) qs.set('meterId', params.meterId)
  const query = qs.toString()
  return apiFetch<MeterReadingData[]>(`/meter-readings${query ? '?' + query : ''}`)
}

export async function getReadingsForMeter(meterId: string): Promise<MeterReadingData[]> {
  return apiFetch<MeterReadingData[]>(`/meters/${meterId}/readings`)
}

export async function createMeterReading(meterId: string, payload: Record<string, unknown>): Promise<MeterReadingData> {
  return apiFetch<MeterReadingData>(`/meters/${meterId}/readings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateReadingStatus(readingId: string, status: string): Promise<MeterReadingData> {
  return apiFetch<MeterReadingData>(`/meter-readings/${readingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
