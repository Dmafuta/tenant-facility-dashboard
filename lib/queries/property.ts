import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLeases } from '@/lib/api/leases'
import { getCharges } from '@/lib/api/charges'
import { getMeters } from '@/lib/api/meters'
import { apiFetch } from '@/lib/api/fetch'
import { queryKeys } from './keys'

export function useUnitLeases(unitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.property.leases(unitId ?? ''),
    queryFn: () => getLeases(unitId!),
    enabled: !!unitId,
  })
}

export function useUnitCharges(unitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.property.charges(unitId ?? ''),
    queryFn: () => getCharges(unitId!),
    enabled: !!unitId,
  })
}

export function useUnitMeters(unitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.property.meters(unitId ?? ''),
    queryFn: () => getMeters(unitId!),
    enabled: !!unitId,
  })
}

export function useUnitVisitors(unitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.property.visitors(unitId ?? ''),
    queryFn: () =>
      apiFetch<{ content: unknown[] }>(`/visitors?unitId=${unitId}&size=50`).then(d => d.content),
    enabled: !!unitId,
  })
}

export function useInvalidateUnitLeases(unitId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.property.leases(unitId) })
}

export function useInvalidateUnitCharges(unitId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.property.charges(unitId) })
}

export function useInvalidateUnitMeters(unitId: string) {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.property.meters(unitId) })
}
