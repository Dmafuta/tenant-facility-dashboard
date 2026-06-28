import { apiFetch } from './fetch'

export interface StatementPaymentRow {
  date: string | null
  reference_no: string | null
  payment_method: string | null
  amount: number
  notes: string | null
  is_write_off: boolean
}

export interface WsStatementRow {
  period: string
  statement_no: string
  issue_date: string | null
  due_date: string | null
  meter_number: string | null
  reading_date: string | null
  prev_reading: number | null
  curr_reading: number | null
  consumption: number | null
  water_mgmt_amount: number
  sewerage_amount: number
  billed: number
  bal_bf: number
  amount_payable: number
  invoice_status: string
  payments: StatementPaymentRow[]
}

export function getWsStatement(
  personId: string,
  from?: string,
  to?: string,
): Promise<WsStatementRow[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to)   params.set('to', to)
  const q = params.size ? `?${params}` : ''
  return apiFetch<WsStatementRow[]>(`/statement/ws/${personId}${q}`)
}
