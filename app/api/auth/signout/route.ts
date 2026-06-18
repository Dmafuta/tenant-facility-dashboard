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

  // Return 200 with cookies cleared. The client handles the redirect.
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  return response
}
