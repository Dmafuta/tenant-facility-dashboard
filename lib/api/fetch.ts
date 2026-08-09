const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/backend'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

function friendlyStatus(status: number): string {
  if (status === 0)   return 'Unable to connect. Please check your internet connection and try again.'
  if (status === 403) return "You don't have permission to do that. Contact your administrator if you think this is a mistake."
  if (status === 404) return 'The requested item was not found.'
  if (status === 409) return 'This action conflicts with existing data. Please refresh the page and try again.'
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status === 503) return 'The service is temporarily unavailable. Please try again in a few minutes.'
  if (status >= 500)  return 'Something went wrong on our end. Please try again in a moment.'
  return 'An unexpected error occurred. Please try again.'
}

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

  // Safely parse JSON — backend may return empty body on some errors
  const parseJson = async (r: Response) => {
    const text = await r.text()
    if (!text) return {} as { success?: boolean; message?: string; data?: T }
    try { return JSON.parse(text) as { success?: boolean; message?: string; data?: T } }
    catch { return {} as { success?: boolean; message?: string; data?: T } }
  }

  let res: Response
  try {
    res = await doFetch()
  } catch {
    throw new ApiError('Unable to connect. Please check your internet connection and try again.', 0)
  }

  if (res.status === 401) {
    // Don't attempt refresh for auth endpoints — avoids infinite loops
    const isAuthPath = path.startsWith('/auth/')
    if (!isAuthPath && typeof window !== 'undefined') {
      const refreshed = await tryRefresh()
      if (refreshed) {
        // Browser now has fresh cookies — retry the original request once
        let retry: Response
        try { retry = await doFetch() } catch {
          throw new ApiError('Unable to connect. Please check your internet connection and try again.', 0)
        }
        if (retry.ok) {
          const json = await parseJson(retry)
          if (json.success !== undefined || json.data !== undefined) {
            return json.data as T
          }
        }
        // Retry still failed — fall through to redirect
      }
    }
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }

  const json = await parseJson(res)

  if (!res.ok) {
    const msg = json.message ?? (json as Record<string, unknown>).error
    throw new ApiError(typeof msg === 'string' ? msg : friendlyStatus(res.status), res.status)
  }

  // If the response is 200 OK but doesn't look like our API envelope
  // (e.g. middleware redirected to /login and fetch followed to an HTML page),
  // redirect to login rather than surfacing a confusing internal message.
  if (json.success === undefined && json.data === undefined) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }

  return json.data as T
}
