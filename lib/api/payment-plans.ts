import { apiFetch } from './fetch'

export interface PaymentPlanInstallment {
  id: string
  installment_no: number
  due_date: string
  amount: number
  paid_amount: number
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  paid_date: string | null
  reference_no: string | null
  payment_method: string | null
  notes: string | null
}

export interface PaymentPlanData {
  id: string | null
  unit_id: string | null
  unit_label: string | null
  person_id: string | null
  person_name: string | null
  person_email: string | null
  person_phone: string | null
  invoice_id: string | null
  category_code: string | null
  total_amount: number
  paid_amount: number
  upfront_paid: number
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

export interface ImmediatePayment {
  amount: number
  payment_date?: string
  payment_method?: string
  reference_no?: string
  notes?: string
}

export interface CustomInstallment {
  amount: number
  due_date: string
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
  total_amount?: number
  // Auto mode
  number_of_installments?: number
  start_date?: string
  // Custom mode
  installments?: CustomInstallment[]
  // Upfront payment (both modes)
  immediate_payment?: ImmediatePayment
  notes?: string
}): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>('/payment-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function payInstallment(
  planId: string,
  installmentId: string,
  payload: {
    amount: number
    payment_date?: string
    payment_method?: string
    reference_no?: string
    notes?: string
  }
): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>(`/payment-plans/${planId}/installments/${installmentId}/pay`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function cancelPaymentPlan(id: string): Promise<PaymentPlanData> {
  return apiFetch<PaymentPlanData>(`/payment-plans/${id}/cancel`, { method: 'PATCH' })
}
