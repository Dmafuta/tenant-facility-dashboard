import { apiFetch } from './fetch'

export interface AiQueryResponse {
  sql: string
  explanation: string
  columns: string[]
  rows: (string | null)[][]
}

export async function runAiQuery(question: string): Promise<AiQueryResponse> {
  return apiFetch<AiQueryResponse>('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}
