import { createClient } from '@/lib/supabase/server'
import type { Subject } from '@/lib/abac/types'

type Role = Subject['role']

const ROLE_MAP: Record<string, Role> = {
  facility_manager:       'facility_manager',
  finance_officer:        'finance_officer',
  maintenance_supervisor: 'maintenance_supervisor',
  security_officer:       'security_officer',
  receptionist:           'receptionist',
  owner:                  'owner',
}

export async function getSubjectFromSession(): Promise<Subject> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      // Fallback for dev / unauthenticated server renders
      return { id: 'anon', role: 'facility_manager', name: 'Guest' }
    }

    const meta = user.user_metadata ?? {}
    const role: Role = ROLE_MAP[meta.role as string] ?? 'facility_manager'

    return {
      id:       user.id,
      role,
      name:     meta.full_name ?? meta.name ?? user.email ?? 'User',
      unit_ids: meta.unit_ids ?? undefined,
    }
  } catch {
    return { id: 'anon', role: 'facility_manager', name: 'Guest' }
  }
}
