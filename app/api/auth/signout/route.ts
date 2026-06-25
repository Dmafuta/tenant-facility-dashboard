import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value

  // Revoke the refresh token on the backend (2 s timeout so a slow/down backend never blocks signout)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2000)
  try {
    await fetch(`${BACKEND}/api/auth/logout`, {
      method:  'POST',
      headers: { Cookie: `refresh_token=${refreshToken ?? ''}` },
      signal:  controller.signal,
    })
  } catch {
    // Ignore backend errors / timeout — still clear cookies
  } finally {
    clearTimeout(timer)
  }

  // Clear cookies explicitly via Set-Cookie headers so the browser removes them
  // regardless of the original cookie attributes (HttpOnly, Secure, SameSite).
  const response = NextResponse.json({ ok: true })
  const cookieClear = (name: string) =>
    `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
  response.headers.append('Set-Cookie', cookieClear('access_token'))
  response.headers.append('Set-Cookie', cookieClear('refresh_token'))
  return response
}
