import { apiFetch } from './fetch'

export interface VendorData {
  id: string
  vendor_name: string
  service_type: string | null
  contact_person: string | null
  contact_phone: string | null
  contact_email: string | null
  status: string
  start_date: string | null
  end_date: string | null
  monthly_value: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export async function listVendors(): Promise<VendorData[]> {
  return apiFetch<VendorData[]>('/vendors')
}

export async function createVendor(payload: Record<string, unknown>): Promise<VendorData> {
  return apiFetch<VendorData>('/vendors', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateVendor(id: string, payload: Record<string, unknown>): Promise<VendorData> {
  return apiFetch<VendorData>(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteVendor(id: string): Promise<void> {
  await apiFetch<void>(`/vendors/${id}`, { method: 'DELETE' })
}
