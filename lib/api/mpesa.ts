import { apiFetch } from './fetch'

export interface MpesaTransactionData {
  id: string
  checkout_request_id: string | null
  charge_id: string | null
  unit_id: string | null
  unit_label: string | null
  person_name: string | null
  phone: string
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  mpesa_receipt: string | null
  result_desc: string | null
  created_at: string | null
}

export interface InitiateStkPayload {
  phone: string
  amount: number
  charge_id?: string | null
  unit_id?: string | null
  unit_label?: string | null
  person_name?: string | null
  account_id?: string | null
  description?: string | null
}

export interface StkPushResult {
  accepted: boolean
  checkout_request_id: string | null
  transaction_id: string | null
  customer_message: string | null
}

export async function initiateStkPush(payload: InitiateStkPayload): Promise<StkPushResult> {
  return apiFetch<StkPushResult>('/mpesa/stk-push', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getMpesaTransactions(): Promise<MpesaTransactionData[]> {
  return apiFetch<MpesaTransactionData[]>('/mpesa/transactions')
}
