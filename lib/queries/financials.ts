import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAllCharges } from '@/lib/api/charges'
import { getMpesaTransactions } from '@/lib/api/mpesa'
import { getInvoices } from '@/lib/api/invoices'
import { queryKeys } from './keys'

export function useAllCharges() {
  return useQuery({
    queryKey: queryKeys.financials.charges(),
    queryFn: () => getAllCharges(),
  })
}

export function useMpesaTransactions() {
  return useQuery({
    queryKey: queryKeys.financials.transactions(),
    queryFn: () => getMpesaTransactions(),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return false
      return data.some(t => t.status === 'pending') ? 5000 : false
    },
  })
}

export function useOpenInvoices() {
  return useQuery({
    queryKey: queryKeys.financials.openInvoices(),
    queryFn: async () => {
      const [issued, partial] = await Promise.all([
        getInvoices({ status: 'issued' }).catch(() => []),
        getInvoices({ status: 'partial' }).catch(() => []),
      ])
      return [...issued, ...partial]
    },
  })
}

export function useInvalidateCharges() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.financials.charges() })
}

export function useInvalidateTransactions() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: queryKeys.financials.transactions() })
}
