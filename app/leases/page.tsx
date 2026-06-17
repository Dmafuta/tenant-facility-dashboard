import { cookies } from 'next/headers'
import { LeasesPageClient } from './LeasesPageClient'
import type { LeaseData } from '@/lib/api/leases'

async function loadLeases(): Promise<LeaseData[]> {
  try {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const authHeader: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
    const res = await fetch(`${backend}/api/leases`, { cache: 'no-store', headers: authHeader })
    if (!res.ok) return []
    return (await res.json()).data ?? []
  } catch {
    return []
  }
}

export default async function Page() {
  const initialLeases = await loadLeases()
  return <LeasesPageClient initialLeases={initialLeases} />
}
