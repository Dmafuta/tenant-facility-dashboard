import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listRuns } from '@/lib/api/casualPayroll'
import { queryKeys } from './keys'

export function useCasualPayrollRuns() {
  return useQuery({
    queryKey: queryKeys.casualPayroll.runs(),
    queryFn: () => listRuns(),
  })
}

export function useInvalidateCasualPayrollRuns() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.casualPayroll.runs() })
}
