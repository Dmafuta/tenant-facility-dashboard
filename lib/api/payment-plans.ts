import { apiFetch } from './fetch'

export interface PaymentPlanInstallment {
  id: string
  installment_no: number
  due_date: string
  amount: number
  paid_amount: number
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  paid_date: string | null
  notes: string | null
}

export interface PaymentPlanData {
  id: string
  unit_id: string
  unit_label: string | null
  person_id: string | null
  person_name: string | null
  person_email: string | null
  person_phone: string | null
  invoice_id: string | null
  category_code: string | null
  total_amount: number
  paid_amount: number
  start_date: string
  status: 'active' | 'completed' | 'defaulted' | 'cancelled'
  notes: string | null
  installments: PaymentPlanInstallment[]
  created_at: string
}

export async function getPaymentPlans(params?: {
  unitId?: string
  personId?: string
  status?: string
  categoryCode?: string
}): Promise<PaymentPlanData[]> {
  const qs = new URLSearchParams()
  if (params?.unitId)       qs.set('unitId', params.unitId)
  if (params?.personId)     qs.set('personId', params.personId)
  if (params?.status)       qs.set('status', params.status)
  if (params?.categoryCode) qs.set('categoryCode', params.categoryCode)
  const q = qs.toString()
  return apiFetch<PaymentPlanData[]>(`/payment-plans${q ? `?${q}` : ''}`)
}

export async function getPaymentPlan(id: string): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>(`/payment-plans/${id}`)
}

export async function createPaymentPlan(payload: {
  unit_id: string
  unit_label?: string
  person_id?: string
  person_name?: string
  person_email?: string
  person_phone?: string
  invoice_id?: string
  category_code?: string
  total_amount: number
  number_of_installments: number
  start_date: string
  notes?: string
}): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>('/payment-plans', {
    method: 'POST',
    body: JSON.stringify({
      unit_id:                 payload.unit_id,
      unit_label:              payload.unit_label,
      person_id:               payload.person_id,
      person_name:             payload.person_name,
      person_email:            payload.person_email,
      person_phone:            payload.person_phone,
      invoice_id:              payload.invoice_id,
      category_code:           payload.category_code,
      total_amount:            payload.total_amount,
      number_of_installments:  payload.number_of_installments,
      start_date:              payload.start_date,
      notes:                   payload.notes,
    }),
  })
}

export async function payInstallment(
  planId: string,
  installmentId: string,
  amount: number,
  notes?: string
): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>(`/payment-plans/${planId}/installments/${installmentId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount, notes }),
  })
}

export async function cancelPaymentPlan(id: string): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>(`/payment-plans/${id}/cancel`, { method: 'PATCH' })
}
