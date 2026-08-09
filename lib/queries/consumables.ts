import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getConsumableTypes, getIssuances, getConsumableStock } from '@/lib/api/consumables'
import { queryKeys } from './keys'

export function useConsumableTypes() {
  return useQuery({
    queryKey: queryKeys.consumables.types(),
    queryFn: () => getConsumableTypes(),
  })
}

export function useConsumableStock() {
  return useQuery({
    queryKey: queryKeys.consumables.stock(),
    queryFn: () => getConsumableStock(),
  })
}

export function useIssuances(period: string) {
  return useQuery({
    queryKey: queryKeys.consumables.issuances(period),
    queryFn: () => getIssuances(period),
    placeholderData: (prev) => prev,
  })
}

export function useInvalidateConsumableTypes() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.consumables.types() })
}

export function useInvalidateConsumableStock() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.consumables.stock() })
}

export function useInvalidateIssuances(period: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.consumables.issuances(period) })
}
