import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllVehicles } from '@/lib/api/vehicles'
import { queryKeys } from './keys'

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles.list(),
    queryFn: getAllVehicles,
  })
}

export function useInvalidateVehicles() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.vehicles.all })
}
