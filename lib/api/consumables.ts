import { apiFetch } from './fetch'

export interface ConsumableTypeData {
  id: string
  name: string
  description: string | null
  unit_of_issue: string
  quantity_per_unit: number
  quantity_per_issue: number
  issue_frequency: string
  eligible_unit_types: string[]
  requires_clearance: boolean
  clearance_charge_types: string[]
  active: boolean
  notes: string | null
  created_at: string | null
}

export interface ConsumableIssuanceData {
  id: string
  consumable_type_id: string
  consumable_name: string
  unit_id: string
  unit_label: string
  person_id: string | null
  person_name: string | null
  quantity_issued: number
  issued_date: string | null
  billing_period: string
  issued_by: string | null
  status: 'issued' | 'withheld' | 'pending'
  withheld_reason: string | null
  notes: string | null
  created_at: string | null
}

export async function getConsumableTypes(): Promise<ConsumableTypeData[]> {
  return apiFetch<ConsumableTypeData[]>('/consumables/types')
}

export async function createConsumableType(payload: Record<string, unknown>): Promise<ConsumableTypeData> {
  return apiFetch<ConsumableTypeData>('/consumables/types', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateConsumableType(id: string, payload: Record<string, unknown>): Promise<ConsumableTypeData> {
  return apiFetch<ConsumableTypeData>(`/consumables/types/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function toggleConsumableType(id: string): Promise<ConsumableTypeData> {
  return apiFetch<ConsumableTypeData>(`/consumables/types/${id}/toggle`, { method: 'PATCH' })
}

export async function getIssuances(period: string): Promise<ConsumableIssuanceData[]> {
  return apiFetch<ConsumableIssuanceData[]>(`/consumables/issuances?period=${period}`)
}

export async function createIssuance(payload: Record<string, unknown>): Promise<ConsumableIssuanceData> {
  return apiFetch<ConsumableIssuanceData>('/consumables/issuances', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function issueOne(issuanceId: string): Promise<ConsumableIssuanceData> {
  return apiFetch<ConsumableIssuanceData>(`/consumables/issuances/${issuanceId}/issue`, { method: 'POST' })
}

export async function bulkIssue(period: string, typeId: string): Promise<{ issued: number; withheld: number; total: number }> {
  return apiFetch<{ issued: number; withheld: number; total: number }>(
    `/consumables/issuances/bulk-issue?period=${period}&typeId=${typeId}`,
    { method: 'POST' }
  )
}

export async function generateRun(period: string, typeId: string): Promise<{ generated: number }> {
  return apiFetch<{ generated: number }>(
    `/consumables/issuances/generate-run?period=${period}&typeId=${typeId}`,
    { method: 'POST' }
  )
}

// ── Stock Levels ────────────────────────────────────────────────────────────

export interface ConsumableStockData {
  id: string
  consumable_type_id: string
  consumable_name: string
  unit_of_issue: string
  current_stock: number
  reorder_level: number
  notes: string | null
  last_restocked_date: string | null
  last_restocked_quantity: number
  last_restocked_by: string | null
}

export async function getConsumableStock(): Promise<ConsumableStockData[]> {
  return apiFetch<ConsumableStockData[]>('/consumables/stock')
}

export async function restockConsumable(
  typeId: string,
  payload: { quantity: number; notes?: string }
): Promise<ConsumableStockData> {
  return apiFetch<ConsumableStockData>(`/consumables/stock/${typeId}/restock`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateStockSettings(
  typeId: string,
  payload: { reorder_level?: number; notes?: string }
): Promise<ConsumableStockData> {
  return apiFetch<ConsumableStockData>(`/consumables/stock/${typeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
