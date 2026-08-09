import { useQuery } from '@tanstack/react-query'
import { getMpesaTransactions } from '@/lib/api/mpesa'
import type { MpesaTransactionData } from '@/lib/api/mpesa'
import { getMeterReadings } from '@/lib/api/meters'
import type { MeterReadingData } from '@/lib/api/meters'
import { getConsumableStock } from '@/lib/api/consumables'
import type { ConsumableStockData } from '@/lib/api/consumables'
import { getPendingExitCount } from '@/lib/api/exitRequests'
import { queryKeys } from './keys'

export function useDashboardLiveData() {
  const today = new Date()
  const currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1).toISOString().slice(0, 10)

  return useQuery({
    queryKey: queryKeys.dashboard.liveData(),
    queryFn: async () => {
      const [txns, stock, exitCount, readings] = await Promise.all([
        getMpesaTransactions({ since: sixMonthsAgo }).catch(() => [] as MpesaTransactionData[]),
        getConsumableStock().catch(() => [] as ConsumableStockData[]),
        getPendingExitCount().catch(() => 0),
        getMeterReadings({ period: currentPeriod, limit: 8 }).catch(() => [] as MeterReadingData[]),
      ])
      return {
        mpesaTxns: txns as MpesaTransactionData[],
        liveStock: stock as ConsumableStockData[],
        pendingExits: exitCount as number,
        recentReadings: (readings as MeterReadingData[])
          .filter(r => r.read_by)
          .sort((a, b) => (b.reading_date ?? '').localeCompare(a.reading_date ?? ''))
          .slice(0, 8),
      }
    },
    refetchInterval: 30_000,
  })
}
