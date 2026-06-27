import { apiFetch } from './fetch'

export interface InvoiceLineItem {
  id: string
  charge_type: string
  amount: number
  description: string | null
  status: string
}

export interface InvoicePayment {
  id: string
  invoice_id: string | null
  amount: number
  payment_date: string | null
  payment_method: string | null
  reference_no: string | null
  notes: string | null
  created_at: string
}

export interface InvoiceData {
  id: string
  statement_no: string
  category_code: string
  unit_id: string
  unit_label: string | null
  account_no: string | null
  person_id: string | null
  person_name: string | null
  person_email: string | null
  person_phone: string | null
  person_address: string | null
  period: string | null
  issue_date: string | null
  due_date: string | null
  opening_balance: number
  previous_balance: number
  current_charges: number
  paid_amount: number
  balance: number
  status: string
  meter_reading_id: string | null
  void_reason: string | null
  void_notes: string | null
  voided_at: string | null
  voided_by: string | null
  void_requested_by: string | null
  void_requested_by_name: string | null
  void_requested_at: string | null
  created_at: string
  updated_at: string
  line_items: InvoiceLineItem[] | null
  payments: InvoicePayment[] | null
}

export interface InvoiceCategory {
  id: string
  code: string
  name: string
  prefix: string
  tagline: string | null
  paybill_id: string | null
  bank_name: string | null
  bank_account: string | null
  bank_branch: string | null
  active: boolean
}

export async function getInvoices(params?: {
  status?: string
  categoryCode?: string
  unitId?: string
}): Promise<InvoiceData[]> {
  const qs = new URLSearchParams()
  if (params?.status)       qs.set('status', params.status)
  if (params?.categoryCode) qs.set('categoryCode', params.categoryCode)
  if (params?.unitId)       qs.set('unitId', params.unitId)
  const q = qs.toString()
  return apiFetch<InvoiceData[]>(`/invoices${q ? `?${q}` : ''}`)
}

export async function getInvoice(id: string): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}`)
}

export async function issueInvoice(id: string): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/issue`, { method: 'PATCH' })
}

export async function voidInvoice(
  id: string,
  payload: { void_reason: string; void_notes?: string }
): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/void`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function requestVoidInvoice(
  id: string,
  payload: { void_reason: string; void_notes?: string }
): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/request-void`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function approveVoidInvoice(id: string): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/approve-void`, { method: 'POST' })
}

export async function rejectVoidInvoice(id: string): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/reject-void`, { method: 'POST' })
}

export async function applyPayment(
  invoiceId: string,
  payload: {
    amount: number
    payment_date?: string
    payment_method?: string
    reference_no?: string
    notes?: string
  }
): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body: JSON.stringify({
      amount:         payload.amount,
      paymentDate:    payload.payment_date,
      paymentMethod:  payload.payment_method,
      referenceNo:    payload.reference_no,
      notes:          payload.notes,
    }),
  })
}

export async function removePayment(paymentId: string): Promise<InvoiceData | null> {
  return apiFetch<InvoiceData | null>(`/invoices/payments/${paymentId}`, { method: 'DELETE' })
}

export async function bulkIssueInvoices(period: string, categoryCode?: string): Promise<{ issued: number }> {
  const qs = new URLSearchParams({ period })
  if (categoryCode) qs.set('categoryCode', categoryCode)
  return apiFetch<{ issued: number }>(`/invoices/bulk-issue?${qs}`, { method: 'POST' })
}

export async function getInvoiceCategories(): Promise<InvoiceCategory[]> {
  return apiFetch<InvoiceCategory[]>('/invoice-categories')
}

export async function sendInvoiceEmail(invoiceId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/invoices/${invoiceId}/send-email`, { method: 'POST' })
}

export async function applyLateFees(feePercent?: number, categoryCode?: string): Promise<{ updated: number; message: string }> {
  const qs = new URLSearchParams()
  if (feePercent != null) qs.set('feePercent', String(feePercent))
  if (categoryCode)       qs.set('categoryCode', categoryCode)
  return apiFetch<{ updated: number; message: string }>(`/invoices/apply-late-fees?${qs}`, { method: 'POST' })
}

export interface AgedDebtorRow {
  id: string
  statement_no: string
  category_code: string
  unit_label: string | null
  person_name: string | null
  period: string | null
  due_date: string | null
  balance: number
  days_overdue: number
  bucket: '0-30' | '31-60' | '61-90' | '90+'
}

export interface AgedDebtorSummary {
  total_0_30: number
  total_31_60: number
  total_61_90: number
  total_90_plus: number
  grand_total: number
}

export async function getAgedDebtors(categoryCode?: string): Promise<{ rows: AgedDebtorRow[]; summary: AgedDebtorSummary }> {
  const qs = categoryCode ? `?categoryCode=${categoryCode}` : ''
  return apiFetch<{ rows: AgedDebtorRow[]; summary: AgedDebtorSummary }>(`/reports/aged-debtors${qs}`)
}

export interface BillingSummaryCategory {
  category_code: string
  invoice_count: number
  invoiced: number
  paid: number
  outstanding: number
  collection_rate: number
}

export interface BillingSummary {
  period: string
  categories: BillingSummaryCategory[]
  grand_invoiced: number
  grand_paid: number
  grand_outstanding: number
  grand_collection_rate: number
}

export async function getBillingSummary(period: string): Promise<BillingSummary> {
  return apiFetch<BillingSummary>(`/reports/billing-summary?period=${encodeURIComponent(period)}`)
}

export interface OutstandingBalanceRow {
  unit_id: string
  unit_label: string | null
  person_name: string | null
  person_email: string | null
  person_phone: string | null
  ws_balance: number
  sc_balance: number
  ot_balance: number
  total_balance: number
  earliest_due: string | null
  invoice_count: number
}

export async function getOutstandingBalances(): Promise<OutstandingBalanceRow[]> {
  return apiFetch<OutstandingBalanceRow[]>('/reports/outstanding-balances')
}

export async function writeOffInvoice(id: string): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/write-off`, { method: 'POST' })
}

export async function bulkEmailInvoices(
  period: string,
  categoryCode?: string
): Promise<{ sent: number; skipped: number; message: string }> {
  const qs = new URLSearchParams({ period })
  if (categoryCode) qs.set('categoryCode', categoryCode)
  return apiFetch<{ sent: number; skipped: number; message: string }>(
    `/invoices/bulk-email?${qs}`,
    { method: 'POST' }
  )
}

export async function getTenantStatement(personId: string): Promise<InvoiceData[]> {
  return apiFetch<InvoiceData[]>(`/invoices/statement/${personId}`)
}

export async function sendInvoiceDisconnectionNotice(
  invoiceId: string,
  noticeType: 'reminder' | 'formal'
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/invoices/${invoiceId}/disconnection-notice?noticeType=${noticeType}`,
    { method: 'POST' }
  )
}

export async function getWaterLossReport(period: string): Promise<{
  period: string
  supplier_total_m3: number
  consumer_total_m3: number
  water_loss_m3: number
  loss_pct: number
  supplier_count: number
  consumer_count: number
  supplier_readings: Record<string, unknown>[]
  consumer_readings: Record<string, unknown>[]
}> {
  return apiFetch(`/reports/water-loss?period=${encodeURIComponent(period)}`)
}

export async function getUnreadMeters(period: string): Promise<{
  id: string
  meter_number: string
  unit_id: string | null
  unit_label: string | null
  utility_type: string
  meter_type: string
  meter_role: string | null
  last_reading: number | null
  last_reading_date: string | null
}[]> {
  return apiFetch(`/reports/unread-meters?period=${encodeURIComponent(period)}`)
}

export async function updateInvoiceCategory(
  id: string,
  payload: Partial<Pick<InvoiceCategory, 'name' | 'tagline' | 'bank_name' | 'bank_account' | 'bank_branch' | 'active'>>
): Promise<InvoiceCategory> {
  return apiFetch<InvoiceCategory>(`/invoice-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name:        payload.name,
      tagline:     payload.tagline,
      bankName:    payload.bank_name,
      bankAccount: payload.bank_account,
      bankBranch:  payload.bank_branch,
      active:      payload.active,
    }),
  })
}
