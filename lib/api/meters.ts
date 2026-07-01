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
  rate_per_unit: number | null
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

export async function createGlobalMeter(payload: Record<string, unknown>): Promise<MeterData> {
  return apiFetch<MeterData>('/meters', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
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
  anomaly: boolean
  created_at: string | null
  photo_base64: string | null
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

export async function assignMeter(meterId: string, unitId: string, unitLabel: string): Promise<MeterData> {
  return apiFetch<MeterData>(`/meters/${meterId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ unitId, unitLabel }),
  })
}

export interface MeterTypeHistoryData {
  id: string
  meter_id: string
  unit_label: string | null
  from_type: string
  to_type: string
  migration_date: string | null
  final_reading: number | null
  migrated_by: string | null
  notes: string | null
  created_at: string | null
}

export async function getMeterTypeHistory(meterId: string): Promise<MeterTypeHistoryData[]> {
  return apiFetch<MeterTypeHistoryData[]>(`/meters/${meterId}/history`)
}

export async function recordMeterTypeMigration(meterId: string, payload: Record<string, unknown>): Promise<MeterTypeHistoryData> {
  return apiFetch<MeterTypeHistoryData>(`/meters/${meterId}/history`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function correctReading(
  readingId: string,
  payload: { current_value: number; previous_value?: number }
): Promise<MeterReadingData> {
  return apiFetch<MeterReadingData>(`/meter-readings/${readingId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function patchMeter(meterId: string, payload: Record<string, unknown>): Promise<MeterData> {
  return apiFetch<MeterData>(`/meters/${meterId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteGlobalMeter(meterId: string): Promise<void> {
  await apiFetch<unknown>(`/meters/${meterId}`, { method: 'DELETE' })
}

export interface BulkReadingItem {
  meter_id: string
  current_value: number
  previous_value?: number
  reading_date?: string
  billing_period?: string
  notes?: string
}

export async function bulkCreateReadings(items: BulkReadingItem[]): Promise<{ created: number; errors: number; errorDetails: string[] }> {
  return apiFetch<{ created: number; errors: number; errorDetails: string[] }>('/meter-readings/bulk', {
    method: 'POST',
    body: JSON.stringify(items.map(i => ({
      meter_id:       i.meter_id,
      current_value:  i.current_value,
      previous_value: i.previous_value,
      reading_date:   i.reading_date,
      billing_period: i.billing_period,
      notes:          i.notes,
    }))),
  })
}

export async function generateEstimatedReadings(period: string): Promise<{ generated: number; skipped: number; back_billing_blocked: number }> {
  return apiFetch<{ generated: number; skipped: number; back_billing_blocked: number }>(
    `/meter-readings/generate-estimated?period=${encodeURIComponent(period)}`,
    { method: 'POST' }
  )
}

// ── Meter Bulk Import ──────────────────────────────────────────────────────

export interface ImportRowPreview {
  rowNum: number
  meterNumber: string
  unitLabel: string
  utilityType: string
  meterType: string
  meterRole: string
  lastReading: number | null
  lastReadingDate: string | null
  accountNumber: string
  notes: string
  resolvedUnitId: string | null
  status: 'ok' | 'warning' | 'error'
  message: string
}

export interface BulkImportResult {
  created: number
  updated: number
  skipped: number
}

export async function parseMeterImport(file: File): Promise<ImportRowPreview[]> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/backend/meters/parse-import', { method: 'POST', body: form })
  const json = await res.json()
  if (!json.success) throw new Error(json.message ?? 'Parse failed')
  return json.data as ImportRowPreview[]
}

export async function bulkImportMeters(rows: ImportRowPreview[]): Promise<BulkImportResult> {
  return apiFetch<BulkImportResult>('/meters/bulk-import', {
    method: 'POST',
    body: JSON.stringify(rows),
  })
}

// ── Server-side pagination ─────────────────────────────────────────────────

export interface MeterPageData {
  content: MeterData[]
  totalElements: number
  totalPages: number
}

export async function getMetersPaged(params: {
  search?: string
  utilityType?: string
  meterType?: string
  meterRole?: string
  deployed?: boolean
  inventory?: boolean
  page?: number
  size?: number
  sortBy?: string
  sortDir?: string
}): Promise<MeterPageData> {
  const qs = new URLSearchParams()
  if (params.search)      qs.set('search',      params.search)
  if (params.utilityType) qs.set('utilityType', params.utilityType)
  if (params.meterType)   qs.set('meterType',   params.meterType)
  if (params.meterRole)   qs.set('meterRole',   params.meterRole)
  if (params.deployed  != null) qs.set('deployed',  String(params.deployed))
  if (params.inventory != null) qs.set('inventory', String(params.inventory))
  qs.set('page',    String(params.page    ?? 0))
  qs.set('size',    String(params.size    ?? 20))
  qs.set('sortBy',  params.sortBy  ?? 'unit_label')
  qs.set('sortDir', params.sortDir ?? 'asc')
  return apiFetch<MeterPageData>(`/meters/paged?${qs}`)
}

export interface MeterReadingPageData {
  content: MeterReadingData[]
  totalElements: number
  totalPages: number
  periods: string[]
}

export async function getMeterReadingsPaged(params: {
  search?: string
  period?: string
  utilityType?: string
  status?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: string
}): Promise<MeterReadingPageData> {
  const qs = new URLSearchParams()
  if (params.search)      qs.set('search',      params.search)
  if (params.period)      qs.set('period',      params.period)
  if (params.utilityType) qs.set('utilityType', params.utilityType)
  if (params.status)      qs.set('status',      params.status)
  qs.set('page',    String(params.page    ?? 0))
  qs.set('size',    String(params.size    ?? 20))
  qs.set('sortBy',  params.sortBy  ?? 'reading_date')
  qs.set('sortDir', params.sortDir ?? 'desc')
  return apiFetch<MeterReadingPageData>(`/meter-readings/paged?${qs}`)
}

export interface ReadingRunRow {
  meterId: string
  meterNumber: string
  unitId: string | null
  unitLabel: string | null
  utilityType: string
  meterType: string
  lastReading: number | null
  lastReadingDate: string | null
  // reading fields (null if not yet read)
  readingId: string | null
  currentValue: number | null
  previousValue: number | null
  unitsConsumed: number | null
  readingDate: string | null
  amountDue: number | null
  source: string | null
  readBy: string | null
  anomaly: boolean
  readingStatus: string | null
}

export interface ReadingRunPageData {
  content: ReadingRunRow[]
  totalElements: number
  totalPages: number
  readCount: number
  pendingCount: number
}

export async function getMeterReadingRun(params: {
  period?: string
  utilityType?: string
  search?: string
  page?: number
  size?: number
}): Promise<ReadingRunPageData> {
  const qs = new URLSearchParams()
  if (params.period)      qs.set('period',      params.period)
  if (params.utilityType) qs.set('utilityType', params.utilityType)
  if (params.search)      qs.set('search',      params.search)
  qs.set('page', String(params.page ?? 0))
  qs.set('size', String(params.size ?? 20))
  return apiFetch<ReadingRunPageData>(`/meters/reading-run?${qs}`)
}

export interface UtilityStats {
  consumerMeters: number
  activeConsumerMeters: number
  smartMeters: number
  inventoryMeters: number
  pendingBillingReadings: number
}

export async function getUtilityStats(): Promise<UtilityStats> {
  return apiFetch<UtilityStats>('/meters/stats')
}
