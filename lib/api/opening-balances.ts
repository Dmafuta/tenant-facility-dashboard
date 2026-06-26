import { apiFetch } from './fetch'

export interface OpeningBalance {
  id: string
  unit_id: string
  unit_label: string | null
  category_code: string
  amount: number
  as_of_date: string | null
  notes: string | null
  status: string
  person_id: string | null
  person_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ExcelPreviewRow {
  rowNum: number
  unitLabel: string
  unitId: string | null
  amount: number
  asOfDate: string | null
  notes: string | null
  valid: boolean
  error: string | null
}

export interface BulkImportResult {
  saved: number
  skipped: number
}

export async function getOpeningBalances(categoryCode?: string): Promise<OpeningBalance[]> {
  const qs = categoryCode ? `?categoryCode=${categoryCode}` : ''
  return apiFetch<OpeningBalance[]>(`/opening-balances${qs}`)
}

export async function createOpeningBalance(payload: {
  unitId: string
  unitLabel?: string
  categoryCode: string
  amount: number
  asOfDate?: string
  notes?: string
  personId?: string
  personName?: string
}): Promise<OpeningBalance> {
  return apiFetch<OpeningBalance>('/opening-balances', {
    method: 'POST',
    body: JSON.stringify({
      unitId:       payload.unitId,
      unitLabel:    payload.unitLabel,
      categoryCode: payload.categoryCode,
      amount:       payload.amount,
      asOfDate:     payload.asOfDate,
      notes:        payload.notes,
      personId:     payload.personId,
      personName:   payload.personName,
    }),
  })
}

export async function updateOpeningBalance(
  id: string,
  payload: { amount?: number; asOfDate?: string; notes?: string }
): Promise<OpeningBalance> {
  return apiFetch<OpeningBalance>(`/opening-balances/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      amount:    payload.amount,
      asOfDate:  payload.asOfDate,
      notes:     payload.notes,
    }),
  })
}

export async function voidOpeningBalance(id: string): Promise<OpeningBalance> {
  return apiFetch<OpeningBalance>(`/opening-balances/${id}`, { method: 'DELETE' })
}

export async function parseOpeningBalanceExcel(
  file: File,
  categoryCode: string
): Promise<ExcelPreviewRow[]> {
  const form = new FormData()
  form.append('file', file)
  form.append('categoryCode', categoryCode)
  // Use raw fetch through the backend proxy — apiFetch forces application/json
  const res = await fetch(`/api/backend/opening-balances/parse-excel`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error('Excel parse failed')
  const json = await res.json()
  return json.data
}

export async function bulkImportOpeningBalances(
  categoryCode: string,
  rows: Array<{ unitId: string; unitLabel: string; amount: number; asOfDate: string | null; notes: string | null }>
): Promise<BulkImportResult> {
  return apiFetch<BulkImportResult>('/opening-balances/bulk', {
    method: 'POST',
    body: JSON.stringify({ categoryCode, rows }),
  })
}
