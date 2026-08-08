import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getInvoicesPaged,
  getInvoiceCategories,
  getUnallocatedCredits,
} from '@/lib/api/invoices'
import { queryKeys } from './keys'

interface InvoicesPagedParams {
  categoryCode: string
  status?: string
  period?: string
  search?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: string
}

export function useInvoicesPaged(params: InvoicesPagedParams) {
  return useQuery({
    queryKey: queryKeys.invoices.paged(params as unknown as Record<string, unknown>),
    queryFn: () => getInvoicesPaged(params),
    placeholderData: (prev) => prev,
    enabled: ['WS', 'SC', 'OT', 'OB'].includes(params.categoryCode),
  })
}

export function useInvoiceCategories() {
  return useQuery({
    queryKey: queryKeys.invoices.categories(),
    queryFn: getInvoiceCategories,
    staleTime: Infinity,
  })
}

export function useUnallocatedCredits(
  unitId: string | undefined,
  categoryCode: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: queryKeys.invoices.credits(unitId ?? '', categoryCode ?? ''),
    queryFn: () => getUnallocatedCredits(unitId!, categoryCode!),
    enabled: enabled && !!unitId && !!categoryCode,
  })
}

export function useInvalidateInvoices() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.invoices.all })
}
