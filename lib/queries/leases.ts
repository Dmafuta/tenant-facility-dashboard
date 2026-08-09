import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllLeases } from '@/lib/api/leases'
import { queryKeys } from './keys'

export function useLeases() {
  return useQuery({
    queryKey: queryKeys.leases.list(),
    queryFn: () => getAllLeases(),
  })
}

export function useInvalidateLeases() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.leases.list() })
}
