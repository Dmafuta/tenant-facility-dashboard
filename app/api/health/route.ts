import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

export async function GET() {
  let backendStatus = 'DOWN'
  let backendDb = 'UNKNOWN'

  try {
    const res = await fetch(`${BACKEND}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      backendStatus = data.status ?? 'UP'
      backendDb     = data.db     ?? 'UNKNOWN'
    }
  } catch {
    // backend unreachable
  }

  const healthy = backendStatus === 'UP'

  return NextResponse.json(
    {
      status:    healthy ? 'UP' : 'DOWN',
      frontend:  'UP',
      backend:   backendStatus,
      db:        backendDb,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  )
}
