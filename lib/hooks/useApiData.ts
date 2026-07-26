import { useState, useEffect, useCallback, DependencyList } from 'react'

/**
 * Fetches data from an async function on mount (and when deps change).
 * Returns { data, loading, error, refetch }.
 *
 * Usage:
 *   const { data: issues, loading, error, refetch } = useApiData(getIssues)
 *
 *   // With deps (re-fetches when period changes):
 *   const { data } = useApiData(() => getInvoices(period), [period])
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])

  return { data, loading, error, refetch: load }
}
