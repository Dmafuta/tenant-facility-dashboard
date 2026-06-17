import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value

  // Tell the backend to revoke the refresh token
  try {
    await fetch(`${BACKEND}/api/auth/logout`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: refreshToken ?? '' }),
    })
  } catch {
    // Ignore backend errors — still clear cookies client-side
  }

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 302 })
  response.cookies.delete('access_token')
  response.cookies.delete('refresh_token')
  return response
}
