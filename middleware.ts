import { NextResponse, type NextRequest } from 'next/server'
import { getAllowedPaths, ROLE_HOME, NAV } from '@/lib/nav-config'

const BACKEND      = process.env.BACKEND_URL ?? 'http://localhost:8081'
const PUBLIC_PATHS = ['/login', '/verify', '/auth/magic', '/api/backend/auth', '/api/auth']

// All first-level nav paths (used to decide whether to apply the role guard)
const NAV_PATHS = NAV.flatMap(g => g.items).map(i => i.href)

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)) as Record<string, unknown>
  } catch {
    return {}
  }
}

function getTokenExpiry(token: string): number {
  try {
    const payload = decodeJwtPayload(token) as { exp?: number }
    return (payload.exp ?? 0) * 1000
  } catch {
    return 0
  }
}

function applyRouteGuard(request: NextRequest, token: string): NextResponse {
  const { pathname } = request.nextUrl
  // Only guard top-level nav pages, not API routes or sub-paths of non-nav pages
  if (pathname.startsWith('/api/')) return NextResponse.next()
  const isNavPage = NAV_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!isNavPage) return NextResponse.next()

  const role    = (decodeJwtPayload(token).role as string) ?? 'facility_manager'
  const allowed = getAllowedPaths(role)
  const canAccess = allowed.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (canAccess) return NextResponse.next()

  const home = ROLE_HOME[role] ?? '/dashboard'
  return NextResponse.redirect(new URL(home, request.url))
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

  // Access token valid → check role-based route guard then allow through
  if (accessToken && getTokenExpiry(accessToken) > Date.now() + 5_000) {
    return applyRouteGuard(request, accessToken)
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
    const response = applyRouteGuard(request, data.accessToken)
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
