import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getPeoplePaged, apiPersonToPerson } from '@/lib/api/people'
import { getHouseholdMembers } from '@/lib/api/household'
import { getVehicles } from '@/lib/api/vehicles'
import { getEmergencyContacts } from '@/lib/api/emergencyContacts'
import { getPersonalStaff } from '@/lib/api/staff'
import { getCrbStatus } from '@/lib/api/crb'
import { getKycStatus } from '@/lib/api/kyc'
import { listSystemUsers } from '@/lib/api/settings'
import { getLeases, type LeaseData } from '@/lib/api/leases'
import { apiFetch } from '@/lib/api/fetch'
import { queryKeys } from './keys'

export function usePeoplePaged(type: 'owner' | 'tenant', search: string, page: number) {
  return useQuery({
    queryKey: queryKeys.people.paged(type, search, page),
    queryFn: () => getPeoplePaged(type, search, page),
  })
}

export function useHouseholdMembers(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.householdMembers(personId),
    queryFn: () => getHouseholdMembers(personId),
  })
}

export function usePersonVehicles(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.vehicles(personId),
    queryFn: () => getVehicles(personId),
  })
}

export function useEmergencyContacts(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.emergencyContacts(personId),
    queryFn: () => getEmergencyContacts(personId),
  })
}

export function usePersonalStaff(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.personalStaff(personId),
    queryFn: () => getPersonalStaff(personId),
  })
}

export function usePersonVisitors(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.visitors(personId),
    queryFn: () =>
      apiFetch<{ content: unknown[] }>(`/visitors?personId=${personId}&size=50`).then(
        d => d.content
      ),
  })
}

export function useCrbStatus(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.crbStatus(personId),
    queryFn: () => getCrbStatus(personId),
  })
}

export function useKycStatus(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.kycStatus(personId),
    queryFn: () => getKycStatus(personId),
  })
}

export function usePersonAccess(personId: string) {
  return useQuery({
    queryKey: queryKeys.people.access(personId),
    queryFn: () =>
      listSystemUsers().then(users => users.find(u => u.person_id === personId) ?? null),
  })
}

export function usePersonActiveLeases(personId: string, unitIds: string[]) {
  return useQuery({
    queryKey: queryKeys.people.activeLeases(personId, unitIds),
    queryFn: () =>
      Promise.all(unitIds.map(uid => getLeases(uid).catch(() => [] as LeaseData[])))
        .then(results =>
          results.flat().filter(l => l.tenant_id === personId && l.status === 'active')
        ),
    enabled: unitIds.length > 0,
  })
}

export function useInvalidatePeople() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.people.all })
}

export function useInvalidatePersonDetail() {
  const qc = useQueryClient()
  return (personId: string) =>
    qc.invalidateQueries({ queryKey: [...queryKeys.people.all, personId] })
}

// Fine-grained invalidators for each sub-panel
export function useInvalidateHousehold(personId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.people.householdMembers(personId) })
}

export function useInvalidatePersonVehicles(personId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.people.vehicles(personId) })
}

export function useInvalidateEmergencyContacts(personId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.people.emergencyContacts(personId) })
}

export function useInvalidatePersonalStaff(personId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.people.personalStaff(personId) })
}

export function useInvalidatePersonAccess(personId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.people.access(personId) })
}
