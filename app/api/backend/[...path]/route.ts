import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

/** Replace the access_token value in a Cookie header string. */
function withNewAccessToken(cookieHeader: string, newToken: string): string {
  const without = cookieHeader.replace(/(?:^|;\s*)access_token=[^;]*/g, '').replace(/^;\s*/, '')
  return without ? `access_token=${newToken}; ${without}` : `access_token=${newToken}`
}

function buildResponse(body: string | ArrayBuffer, status: number, contentType: string, disposition: string | null) {
  const headers: Record<string, string> = { 'Content-Type': contentType }
  if (disposition) headers['Content-Disposition'] = disposition
  return new NextResponse(body, { status, headers })
}

async function proxy(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = `${BACKEND}/api/${params.path.join('/')}${request.nextUrl.search}`

  const contentType = request.headers.get('content-type') ?? ''
  const isMultipart = contentType.includes('multipart/form-data')

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? isMultipart ? await request.blob() : await request.text()
      : undefined

  const headers: Record<string, string> = {}
  if (!isMultipart) headers['Content-Type'] = 'application/json'
  else headers['Content-Type'] = contentType
  headers['Accept'] = 'application/json'
  const incoming = request.headers.get('cookie') ?? ''
  if (incoming) headers['Cookie'] = incoming

  let backendRes: Response
  try {
    backendRes = await fetch(backendUrl, { method: request.method, headers, body })
  } catch {
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }

  // ── Silent refresh on 401 ──────────────────────────────────────────────────
  if (backendRes.status === 401) {
    const refreshMatch = incoming.match(/(?:^|;\s*)refresh_token=([^;]+)/)
    const refreshToken = refreshMatch?.[1]

    if (refreshToken) {
      let refreshRes: Response
      try {
        refreshRes = await fetch(`${BACKEND}/api/auth/refresh`, {
          method: 'POST',
          headers: { Cookie: `refresh_token=${refreshToken}` },
        })
      } catch {
        return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
      }
      if (refreshRes.ok) {
        const newCookies = refreshRes.headers.getSetCookie()
        const newAccessToken = newCookies
          .map(c => c.match(/^access_token=([^;]+)/)?.[1])
          .find(Boolean)

        if (newAccessToken) {
          // Retry with refreshed access token
          const retryHeaders = { ...headers, Cookie: withNewAccessToken(incoming, newAccessToken) }
          let retryRes: Response
          try {
            retryRes = await fetch(backendUrl, { method: request.method, headers: retryHeaders, body })
          } catch {
            return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
          }
          const retryContentType = retryRes.headers.get('content-type') ?? 'application/json'
          const retryIsBinary = !retryContentType.includes('application/json') && !retryContentType.includes('text/')
          const retryBody = retryIsBinary ? await retryRes.arrayBuffer() : await retryRes.text()
          const response = buildResponse(retryBody, retryRes.status, retryContentType, retryRes.headers.get('content-disposition'))
          // Forward new auth cookies so browser picks them up immediately
          for (const c of newCookies) response.headers.append('Set-Cookie', c)
          return response
        }
      }
    }
    // Refresh failed or no refresh token — fall through and return the 401
  }
  // ── End silent refresh ─────────────────────────────────────────────────────

  const backendContentType = backendRes.headers.get('content-type') ?? 'application/json'
  const isBinary = !backendContentType.includes('application/json') && !backendContentType.includes('text/')
  const responseBody = isBinary ? await backendRes.arrayBuffer() : await backendRes.text()

  const response = buildResponse(responseBody, backendRes.status, backendContentType, backendRes.headers.get('content-disposition'))
  for (const cookie of backendRes.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', cookie)
  }
  return response
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
}
