import { apiFetch } from './fetch'

export interface AuditChange {
  field: string
  from: string
  to: string
}

export interface AuditEventApi {
  id: string
  action: string
  module: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  description: string | null
  changes_json: string | null
  changes?: AuditChange[]
  user_id: string | null
  user_name: string | null
  user_role: string | null
  ip_address: string | null
  timestamp: string | null
}

export interface AuditPage {
  items: AuditEventApi[]
  total: number
  page: number
  total_pages: number
}

function buildAuditQs(params: {
  module?: string; action?: string; q?: string
  from?: string; to?: string; page?: number; size?: number
}): string {
  const qs = new URLSearchParams()
  if (params.module) qs.set('module', params.module)
  if (params.action) qs.set('action', params.action)
  if (params.q)      qs.set('q', params.q)
  if (params.from)   qs.set('from', params.from)
  if (params.to)     qs.set('to', params.to)
  if (params.page != null) qs.set('page', String(params.page))
  if (params.size != null) qs.set('size', String(params.size))
  return qs.toString()
}

export function getAuditEvents(params: {
  module?: string; action?: string; q?: string
  from?: string; to?: string; page?: number; size?: number
}): Promise<AuditPage> {
  const query = buildAuditQs(params)
  return apiFetch(`/audit${query ? '?' + query : ''}`)
}

export async function exportAuditCsv(params: {
  module?: string; action?: string; q?: string; from?: string; to?: string
}): Promise<Blob> {
  const API = (process.env.NEXT_PUBLIC_API_URL ?? '/api/backend')
  const query = buildAuditQs(params)
  const res = await fetch(`${API}/audit/export${query ? '?' + query : ''}`)
  if (res.status === 401) { if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Session expired') }
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}
