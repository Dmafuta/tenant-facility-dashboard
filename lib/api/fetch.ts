const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  // Safely parse JSON — backend may return empty body on auth errors
  let json: { success?: boolean; message?: string; data?: T } = {}
  const text = await res.text()
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      // Non-JSON body — treat as generic error
    }
  }

  if (res.status === 401) {
    // Session expired — redirect to login
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired. Please sign in again.')
  }

  if (!res.ok) {
    throw new Error(json.message ?? `Request failed (${res.status})`)
  }

  return json.data as T
}
