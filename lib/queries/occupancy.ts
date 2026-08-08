import { useQuery } from '@tanstack/react-query'
import { getUnitsFromApi } from '@/lib/api/units'
import { getAllLeases } from '@/lib/api/leases'
import { queryKeys } from './keys'

export function useOccupancyData() {
  return useQuery({
    queryKey: queryKeys.occupancy.summary(),
    queryFn: () =>
      Promise.all([getUnitsFromApi(), getAllLeases('active')]).then(
        ([units, leases]) => ({ units, leases })
      ),
  })
}
