import { cookies } from 'next/headers'
import type { Subject } from '@/lib/abac/types'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'))
  } catch {
    return {}
  }
}

export async function getSubjectFromSession(): Promise<Subject> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    if (!token) return { id: 'anon', role: 'facility_manager', name: 'Guest' }

    const claims = decodeJwtPayload(token)
    const role = (claims.role as string) ?? 'facility_manager'
    const permissions = Array.isArray(claims.permissions)
      ? (claims.permissions as string[])
      : undefined

    return {
      id:               (claims.sub as string) ?? 'anon',
      role,
      name:             (claims.name as string) ?? (claims.email as string) ?? 'User',
      email:            (claims.email as string) ?? undefined,
      phone:            (claims.phone as string) ?? undefined,
      unit_ids:         (claims.unit_ids as string[] | undefined) ?? undefined,
      permissions,
      twoFactorEnabled: (claims.twoFactorEnabled as boolean) ?? false,
    }
  } catch {
    return { id: 'anon', role: 'facility_manager', name: 'Guest' }
  }
}
