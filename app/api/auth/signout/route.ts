import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value

  // Revoke the refresh token on the backend (backend reads from Cookie header)
  try {
    await fetch(`${BACKEND}/api/auth/logout`, {
      method:  'POST',
      headers: { Cookie: `refresh_token=${refreshToken ?? ''}` },
    })
  } catch {
    // Ignore backend errors — still clear cookies
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
