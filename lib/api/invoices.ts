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

export async function voidInvoice(id: string): Promise<InvoiceData> {
  return apiFetch<InvoiceData>(`/invoices/${id}/void`, { method: 'PATCH' })
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
