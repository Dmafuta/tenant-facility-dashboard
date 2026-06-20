import { apiFetch } from './fetch'

export interface VehicleData {
  id: string
  person_id: string
  person_name: string | null
  unit_id: string | null
  unit_label: string | null
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
  verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string | null
}

export async function getAllVehicles(): Promise<VehicleData[]> {
  return apiFetch<VehicleData[]>('/vehicles')
}

export async function getVehicles(personId: string): Promise<VehicleData[]> {
  return apiFetch<VehicleData[]>(`/people/${personId}/vehicles`)
}

export async function verifyVehicle(id: string): Promise<VehicleData> {
  return apiFetch<VehicleData>(`/vehicles/${id}/verify`, { method: 'PATCH' })
}

export async function unverifyVehicle(id: string): Promise<VehicleData> {
  return apiFetch<VehicleData>(`/vehicles/${id}/unverify`, { method: 'PATCH' })
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
