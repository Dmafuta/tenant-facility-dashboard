import { apiFetch } from './fetch'

export interface VehicleData {
  id: string
  person_id: string
  make: string
  model: string
  year: number | null
  color: string | null
  plate_number: string
  sticker_number: string | null
  vehicle_type: string
  status: string
  registered_date: string | null
  insurance_expiry: string | null
  notes: string | null
  created_at: string | null
}

export async function getVehicles(personId: string): Promise<VehicleData[]> {
  return apiFetch<VehicleData[]>(`/people/${personId}/vehicles`)
}

export async function createVehicle(personId: string, payload: Record<string, unknown>): Promise<VehicleData> {
  return apiFetch<VehicleData>(`/people/${personId}/vehicles`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateVehicle(personId: string, vehicleId: string, payload: Record<string, unknown>): Promise<VehicleData> {
  return apiFetch<VehicleData>(`/people/${personId}/vehicles/${vehicleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteVehicle(personId: string, vehicleId: string): Promise<void> {
  await apiFetch<unknown>(`/people/${personId}/vehicles/${vehicleId}`, { method: 'DELETE' })
}
