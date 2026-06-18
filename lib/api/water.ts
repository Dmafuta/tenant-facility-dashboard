import { apiFetch } from './fetch'

export interface WaterSupplierData {
  id: string
  name: string
  sourceType: string
  contactName: string | null
  contactPhone: string | null
  contractedRatePerM3: number | null
  currency: string
  active: boolean
  meterIds: string | null
  notes: string | null
}

export interface ReserveTankData {
  id: string
  name: string
  capacityM3: number | null
  currentLevelM3: number
  location: string | null
  compartments: number
  inflowMeterIds: string | null
  outflowMeterIds: string | null
  lowLevelThresholdPct: number
  notes: string | null
}

export interface WaterZoneData {
  id: string
  name: string
  description: string | null
  tankId: string | null
  distributionMeterId: string | null
  unitIds: string | null
}

export async function getWaterSuppliers(activeOnly?: boolean): Promise<WaterSupplierData[]> {
  const qs = activeOnly ? '?activeOnly=true' : ''
  return apiFetch<WaterSupplierData[]>(`/water/suppliers${qs}`)
}

export async function createWaterSupplier(payload: Record<string, unknown>): Promise<WaterSupplierData> {
  return apiFetch<WaterSupplierData>('/water/suppliers', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateWaterSupplier(id: string, payload: Record<string, unknown>): Promise<WaterSupplierData> {
  return apiFetch<WaterSupplierData>(`/water/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function toggleWaterSupplier(id: string): Promise<WaterSupplierData> {
  return apiFetch<WaterSupplierData>(`/water/suppliers/${id}/toggle`, { method: 'PATCH' })
}

export async function getReserveTanks(): Promise<ReserveTankData[]> {
  return apiFetch<ReserveTankData[]>('/water/tanks')
}

export async function createReserveTank(payload: Record<string, unknown>): Promise<ReserveTankData> {
  return apiFetch<ReserveTankData>('/water/tanks', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateReserveTank(id: string, payload: Record<string, unknown>): Promise<ReserveTankData> {
  return apiFetch<ReserveTankData>(`/water/tanks/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function updateTankLevel(id: string, currentLevelM3: number): Promise<ReserveTankData> {
  return apiFetch<ReserveTankData>(`/water/tanks/${id}/level`, {
    method: 'PATCH',
    body: JSON.stringify({ currentLevelM3 }),
  })
}

export async function getWaterZones(): Promise<WaterZoneData[]> {
  return apiFetch<WaterZoneData[]>('/water/zones')
}

export async function createWaterZone(payload: Record<string, unknown>): Promise<WaterZoneData> {
  return apiFetch<WaterZoneData>('/water/zones', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateWaterZone(id: string, payload: Record<string, unknown>): Promise<WaterZoneData> {
  return apiFetch<WaterZoneData>(`/water/zones/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteWaterZone(id: string): Promise<void> {
  await apiFetch<unknown>(`/water/zones/${id}`, { method: 'DELETE' })
}
