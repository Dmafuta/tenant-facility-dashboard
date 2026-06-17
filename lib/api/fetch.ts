const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth/refresh`, { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () =>
    fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })

  let res = await doFetch()

  // Safely parse JSON — backend may return empty body on some errors
  const parseJson = async (r: Response) => {
    const text = await r.text()
    if (!text) return {} as { success?: boolean; message?: string; data?: T }
    try { return JSON.parse(text) as { success?: boolean; message?: string; data?: T } }
    catch { return {} as { success?: boolean; message?: string; data?: T } }
  }

  if (res.status === 401) {
    // Don't attempt refresh for auth endpoints — avoids infinite loops
    const isAuthPath = path.startsWith('/auth/')
    if (!isAuthPath && typeof window !== 'undefined') {
      const refreshed = await tryRefresh()
      if (refreshed) {
        // Browser now has fresh cookies — retry the original request once
        const retry = await doFetch()
        if (retry.ok) {
          const json = await parseJson(retry)
          return json.data as T
        }
        // Retry still failed — fall through to redirect
      }
    }
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired. Please sign in again.')
  }

  const json = await parseJson(res)

  if (!res.ok) {
    throw new Error(json.message ?? `Request failed (${res.status})`)
  }

  return json.data as T
}
