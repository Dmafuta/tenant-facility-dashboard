import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, listSystemUsersPaged, listRoles } from '@/lib/api/settings'
import { getOpeningBalances } from '@/lib/api/opening-balances'
import { queryKeys } from './keys'

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.general(),
    queryFn: getSettings,
  })
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: listRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

interface SystemUsersParams {
  search?: string
  status?: string
  sortBy?: string
  sortDir?: string
  page?: number
  size?: number
}

export function useSystemUsers(params: SystemUsersParams) {
  return useQuery({
    queryKey: queryKeys.users.paged(params as Record<string, unknown>),
    queryFn: () => listSystemUsersPaged(params),
    placeholderData: (prev) => prev,
  })
}

export function useOpeningBalances(category?: string) {
  return useQuery({
    queryKey: queryKeys.openingBalances.list(category),
    queryFn: () => getOpeningBalances(category),
  })
}

export function useInvalidateRoles() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.roles.all })
}

export function useInvalidateUsers() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.users.all })
}

export function useInvalidateOpeningBalances() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.openingBalances.all })
}
