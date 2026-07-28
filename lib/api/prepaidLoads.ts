import { apiFetch } from './fetch'

export interface PrepaidLoad {
  id: string
  meter_id: string
  meter_number: string | null
  unit_id: string | null
  unit_label: string | null
  amount_paid: number
  units_loaded: number | null
  mpesa_reference: string | null
  loaded_at: string
  loaded_by_id: string | null
  loaded_by_name: string | null
  notes: string | null
  created_at: string
}

export interface PrepaidLoadsPage {
  content: PrepaidLoad[]
  totalElements: number
  totalPages: number
  page: number
  size: number
}

export interface PrepaidLoadSummary {
  total_amount_paid: number
  total_units_loaded: number
  total_loads: number
}

export function getPrepaidLoads(params: {
  meterId?: string
  unitId?: string
  from?: string
  to?: string
  page?: number
  size?: number
}): Promise<PrepaidLoadsPage> {
  const q = new URLSearchParams()
  if (params.meterId) q.set('meterId', params.meterId)
  if (params.unitId)  q.set('unitId',  params.unitId)
  if (params.from)    q.set('from',    params.from)
  if (params.to)      q.set('to',      params.to)
  q.set('page', String(params.page ?? 0))
  q.set('size', String(params.size ?? 25))
  return apiFetch<PrepaidLoadsPage>(`/prepaid-loads?${q}`)
}

export function getPrepaidSummary(from?: string, to?: string): Promise<PrepaidLoadSummary> {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to)   q.set('to',   to)
  return apiFetch<PrepaidLoadSummary>(`/prepaid-loads/summary?${q}`)
}

export function recordPrepaidLoad(data: {
  meterId: string
  amountPaid: number
  unitsLoaded?: number | null
  mpesaReference?: string | null
  loadedAt?: string | null
  notes?: string | null
}): Promise<PrepaidLoad> {
  return apiFetch<PrepaidLoad>('/prepaid-loads', {
    method: 'POST',
    body: JSON.stringify({
      meter_id:       data.meterId,
      amount_paid:    data.amountPaid,
      units_loaded:   data.unitsLoaded ?? null,
      mpesa_reference: data.mpesaReference ?? null,
      loaded_at:      data.loadedAt ?? null,
      notes:          data.notes ?? null,
    }),
  })
}

export function deletePrepaidLoad(id: string): Promise<void> {
  return apiFetch<void>(`/prepaid-loads/${id}`, { method: 'DELETE' })
}
