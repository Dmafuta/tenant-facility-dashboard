import { apiFetch } from './fetch'

export interface UnitData {
  id: string
  unit_type: string
  unit_label: string
  block: string | null
  floor: string | null
  floor_area_sqm: number | null
  bedrooms: number | null
  bathrooms: number | null
  guest_toilets: number | null
  parking_bays: number | null
  has_storage: boolean
  furnished: string | null
  bay_type: string | null
  bay_dimensions: string | null
  storage_area_sqm: number | null
  storage_height_m: number | null
  floor_position: string | null
  view: string | null
  features: string[]
  status: string
  handover_date: string | null
  available_from: string | null
  asking_rent: number | null
  deposit_months: number | null
  service_charge: number | null
  service_charge_included: boolean
  current_occupant: string | null
  notes: string | null
  created_at: string | null
}


export async function getUnitsFromApi(): Promise<UnitData[]> {
  return apiFetch<UnitData[]>('/units')
}

export async function createUnit(payload: Record<string, unknown>): Promise<UnitData> {
  return apiFetch<UnitData>('/units', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateUnit(id: string, payload: Record<string, unknown>): Promise<UnitData> {
  return apiFetch<UnitData>(`/units/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function patchUnitStatus(id: string, status: string, currentOccupant?: string): Promise<UnitData> {
  return apiFetch<UnitData>(`/units/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(currentOccupant !== undefined ? { currentOccupant } : {}) }),
  })
}

export async function patchUnitType(id: string, unitType: string): Promise<UnitData> {
  return apiFetch<UnitData>(`/units/${id}/type`, {
    method: 'PATCH',
    body: JSON.stringify({ unitType }),
  })
}

export async function deleteUnit(id: string): Promise<void> {
  return apiFetch<void>(`/units/${id}`, { method: 'DELETE' })
}
