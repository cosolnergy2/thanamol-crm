import { describe, it, expect } from 'vitest'
import { STOCK_TRANSFER_QUERY_KEYS } from './useStockTransfers'

describe('STOCK_TRANSFER_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(STOCK_TRANSFER_QUERY_KEYS.all).toEqual(['stock-transfers'])
  })

  it('builds list key with empty params', () => {
    const key = STOCK_TRANSFER_QUERY_KEYS.list({})
    expect(key[0]).toBe('stock-transfers')
    expect(key[1]).toBe('list')
    expect(key[2]).toEqual({})
  })

  it('builds list key with source project filter', () => {
    const key = STOCK_TRANSFER_QUERY_KEYS.list({ sourceProjectId: 'proj-a' })
    expect(key[2]).toEqual({ sourceProjectId: 'proj-a' })
  })

  it('builds list key with destination project filter', () => {
    const key = STOCK_TRANSFER_QUERY_KEYS.list({ destinationProjectId: 'proj-b' })
    expect(key[2]).toEqual({ destinationProjectId: 'proj-b' })
  })

  it('builds list key with search and pagination', () => {
    const params = { search: 'ST-2026', page: 2, limit: 50 }
    const key = STOCK_TRANSFER_QUERY_KEYS.list(params)
    expect(key[2]).toEqual(params)
  })

  it('builds detail key with transfer id', () => {
    const key = STOCK_TRANSFER_QUERY_KEYS.detail('transfer-xyz')
    expect(key).toEqual(['stock-transfers', 'transfer-xyz'])
  })

  it('different params produce different list keys', () => {
    const key1 = STOCK_TRANSFER_QUERY_KEYS.list({ sourceProjectId: 'proj-a' })
    const key2 = STOCK_TRANSFER_QUERY_KEYS.list({ sourceProjectId: 'proj-b' })
    expect(key1).not.toEqual(key2)
  })

  it('list and detail keys are distinct', () => {
    const listKey = STOCK_TRANSFER_QUERY_KEYS.list({})
    const detailKey = STOCK_TRANSFER_QUERY_KEYS.detail('transfer-1')
    expect(listKey[1]).toBe('list')
    expect(detailKey[1]).toBe('transfer-1')
  })
})
