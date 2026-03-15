import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn((opts: { queryKey: unknown }) => ({
    queryKey: opts.queryKey,
    data: undefined,
    isLoading: true,
  })),
}))

import { useSalesReport, useRevenueReport, useOccupancyReport, useCollectionReport } from './useReports'

describe('useReports hooks', () => {
  it('useSalesReport returns query with correct key (no params)', () => {
    const result = useSalesReport() as unknown as { queryKey: unknown[] }
    expect(result.queryKey).toEqual(['reports', 'sales', {}])
  })

  it('useSalesReport includes period params in query key', () => {
    const params = { from: '2026-01-01', to: '2026-03-31' }
    const result = useSalesReport(params) as unknown as { queryKey: unknown[] }
    expect(result.queryKey).toEqual(['reports', 'sales', params])
  })

  it('useRevenueReport returns query with correct key', () => {
    const result = useRevenueReport() as unknown as { queryKey: unknown[] }
    expect(result.queryKey).toEqual(['reports', 'revenue', {}])
  })

  it('useOccupancyReport returns query with correct key', () => {
    const result = useOccupancyReport() as unknown as { queryKey: unknown[] }
    expect(result.queryKey).toEqual(['reports', 'occupancy'])
  })

  it('useCollectionReport returns query with correct key', () => {
    const result = useCollectionReport() as unknown as { queryKey: unknown[] }
    expect(result.queryKey).toEqual(['reports', 'collection', {}])
  })

  it('useCollectionReport with period params', () => {
    const params = { from: '2026-01-01' }
    const result = useCollectionReport(params) as unknown as { queryKey: unknown[] }
    expect(result.queryKey).toEqual(['reports', 'collection', params])
  })
})
