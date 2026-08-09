import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getIssues } from '@/lib/api/issues'
import { queryKeys } from './keys'

export function useIssues() {
  return useQuery({
    queryKey: queryKeys.issues.list(),
    queryFn: () => getIssues(),
  })
}

export function useInvalidateIssues() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.issues.list() })
}
