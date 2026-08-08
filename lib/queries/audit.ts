import { useInfiniteQuery } from '@tanstack/react-query'
import { getAuditEvents } from '@/lib/api/audit'
import { queryKeys } from './keys'

interface AuditEventsParams {
  module?: string
  action?: string
  q?: string
}

export function useAuditEvents(params: AuditEventsParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.audit.events(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      getAuditEvents({ ...params, page: pageParam as number, size: 50 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.total_pages ? lastPage.page + 1 : undefined,
    refetchInterval: 30_000,
  })
}
