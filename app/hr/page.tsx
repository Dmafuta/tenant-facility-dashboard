import { cookies } from 'next/headers'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Topbar } from '@/components/layout/Topbar'
import { HRPageClient } from './HRPageClient'
import type { Person, PersonType, PersonStatus, KycStatus } from '@/lib/types'
import type { PersonData } from '@/lib/api/people'

const STAFF_TYPES = ['permanent_staff', 'casual_staff', 'outsourced']

async function loadStaff(): Promise<Person[] | undefined> {
  try {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8081'
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    const res = await fetch(`${backend}/api/people`, {
      cache: 'no-store',
      headers: token ? { Cookie: `access_token=${token}` } : {},
    })
    if (!res.ok) return undefined
    const json = await res.json()
    const all: PersonData[] = json.data ?? []

    const typeMap: Record<string, PersonType> = {
      permanent_staff: 'permanent_staff', casual_staff: 'casual_staff', outsourced: 'outsourced',
    }
    const statusMap: Record<string, PersonStatus> = {
      pending_verification: 'pending_verification', active: 'active',
      inactive: 'inactive', suspended: 'suspended', former: 'former',
    }

    return all
      .filter(p => STAFF_TYPES.includes(p.person_type))
      .map(p => ({
        id: p.id,
        type: (typeMap[p.person_type] ?? 'permanent_staff') as PersonType,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email ?? '',
        phone: p.phone ?? '',
        national_id: p.national_id ?? undefined,
        unit_ids: p.unit_ids,
        status: (statusMap[p.status] ?? 'pending_verification') as PersonStatus,
        kyc_status: (p.kyc_status as KycStatus) ?? 'not_started',
        phone_verified_at: p.phone_verified_at ?? undefined,
        joined_date: p.joined_date ?? new Date().toISOString().slice(0, 10),
        is_outsourced: p.is_outsourced,
        agency_name: p.agency_name ?? undefined,
        notes: p.notes ?? undefined,
        job_title: p.job_title ?? undefined,
        department: p.department ?? undefined,
        contract_type: p.contract_type ?? undefined,
        contract_status: p.contract_status ?? undefined,
        start_date: p.start_date ?? undefined,
        end_date: p.end_date ?? undefined,
        probation_end_date: p.probation_end_date ?? undefined,
        background_check_done: p.background_check_done,
        exit_date: p.exit_date ?? undefined,
        exit_reason: p.exit_reason ?? undefined,
        exit_notes: p.exit_notes ?? undefined,
      }))
  } catch {
    return undefined
  }
}

export default async function HRPage() {
  const staff = await loadStaff()

  return (
    <DashboardLayout>
      <Topbar
        title="HR & Staff"
        subtitle="Facility staff roster, vendor contracts, and onboarding"
      />
      <main className="flex-1 overflow-auto">
        <HRPageClient initialStaff={staff} />
      </main>
    </DashboardLayout>
  )
}
