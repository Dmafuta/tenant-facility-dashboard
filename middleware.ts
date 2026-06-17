import { NextResponse, type NextRequest } from 'next/server'

const BACKEND      = process.env.BACKEND_URL ?? 'http://localhost:8081'
const PUBLIC_PATHS = ['/login', '/verify', '/auth/magic', '/api/backend/auth', '/api/auth']

function getTokenExpiry(token: string): number {
  try {
    const base64  = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64)) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths through without auth check
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const accessToken  = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // No tokens at all → send to login
  if (!accessToken && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Access token valid → allow through
  if (accessToken && getTokenExpiry(accessToken) > Date.now() + 5_000) {
    return NextResponse.next()
  }

  // Access token expired or missing — try silent refresh
  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const res = await fetch(`${BACKEND}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    })
    if (!res.ok) throw new Error('refresh failed')
    const data = await res.json() as { accessToken: string; refreshToken?: string }
    const response = NextResponse.next()
    response.cookies.set('access_token', data.accessToken, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/',
    })
    if (data.refreshToken) {
      response.cookies.set('refresh_token', data.refreshToken, {
        httpOnly: true, secure: true, sameSite: 'strict', path: '/',
      })
    }
    return response
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('access_token')
    response.cookies.delete('refresh_token')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
