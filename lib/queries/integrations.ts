import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getIntegrations, listMpesaAccounts } from '@/lib/api/settings'
import { queryKeys } from './keys'

export function useIntegrationSettings() {
  return useQuery({
    queryKey: queryKeys.integrations.settings(),
    queryFn: () => getIntegrations(),
  })
}

export function useMpesaAccounts() {
  return useQuery({
    queryKey: queryKeys.integrations.mpesaAccounts(),
    queryFn: () => listMpesaAccounts(),
  })
}

export function useInvalidateIntegrationSettings() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.integrations.settings() })
}

export function useInvalidateMpesaAccounts() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.integrations.mpesaAccounts() })
}
