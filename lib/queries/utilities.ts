import { useQuery } from '@tanstack/react-query'
import { getConsumptionTrend } from '@/lib/api/invoices'
import { queryKeys } from './keys'

export function useConsumptionTrend(meterId: string, months = 12) {
  return useQuery({
    queryKey: queryKeys.utilities.trend(meterId, months),
    queryFn: () => getConsumptionTrend({ meterId, months }),
    enabled: !!meterId,
  })
}
