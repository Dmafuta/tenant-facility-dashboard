import { NextResponse, type NextRequest } from 'next/server'
import { getAllowedPaths, ROLE_HOME, NAV } from '@/lib/nav-config'

const BACKEND      = process.env.BACKEND_URL ?? 'http://localhost:8081'
const PUBLIC_PATHS = ['/login', '/verify', '/auth/magic', '/accept-invite', '/reset-password', '/api/backend/auth', '/api/auth', '/api/backend/settings/brand']

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
    // The backend reads the refresh token from the Cookie header — send it that way
    const res = await fetch(`${BACKEND}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Cookie': `refresh_token=${refreshToken}` },
    })
    if (!res.ok) throw new Error('refresh failed')

    // Parse the new access token out of the Set-Cookie headers the backend issued
    const setCookies = res.headers.getSetCookie()
    let newAccessToken = ''
    for (const c of setCookies) {
      const m = c.match(/^access_token=([^;]+)/)
      if (m) { newAccessToken = m[1]; break }
    }
    if (!newAccessToken) throw new Error('no access token in refresh response')

    // Apply the route guard with the new token, then forward all Set-Cookie headers to the browser
    const response = applyRouteGuard(request, newAccessToken)
    for (const c of setCookies) {
      response.headers.append('Set-Cookie', c)
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
