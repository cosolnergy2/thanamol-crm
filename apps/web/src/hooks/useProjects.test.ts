import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PROJECT_QUERY_KEYS } from './useProjects'

// buildQueryString is not exported; test indirectly via query key shapes

describe('PROJECT_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(PROJECT_QUERY_KEYS.all).toEqual(['projects'])
  })

  it('builds list key with params', () => {
    const key = PROJECT_QUERY_KEYS.list({ page: 1, limit: 20, search: 'test' })
    expect(key[0]).toBe('projects')
    expect(key[1]).toBe('list')
    expect(key[2]).toEqual({ page: 1, limit: 20, search: 'test' })
  })

  it('builds list key with empty params', () => {
    const key = PROJECT_QUERY_KEYS.list({})
    expect(key[2]).toEqual({})
  })

  it('builds detail key with project id', () => {
    const key = PROJECT_QUERY_KEYS.detail('abc-123')
    expect(key).toEqual(['projects', 'abc-123'])
  })

  it('builds dashboard key with project id', () => {
    const key = PROJECT_QUERY_KEYS.dashboard('abc-123')
    expect(key).toEqual(['projects', 'abc-123', 'dashboard'])
  })

  it('builds units key with project id and no params', () => {
    const key = PROJECT_QUERY_KEYS.units('abc-123')
    expect(key[0]).toBe('projects')
    expect(key[1]).toBe('abc-123')
    expect(key[2]).toBe('units')
    expect(key[3]).toBeUndefined()
  })

  it('builds units key with project id and params', () => {
    const key = PROJECT_QUERY_KEYS.units('abc-123', { page: 2, status: 'AVAILABLE' })
    expect(key[3]).toEqual({ page: 2, status: 'AVAILABLE' })
  })

  it('detail key differs per project id', () => {
    const key1 = PROJECT_QUERY_KEYS.detail('id-1')
    const key2 = PROJECT_QUERY_KEYS.detail('id-2')
    expect(key1).not.toEqual(key2)
  })
})

describe('query key uniqueness', () => {
  it('list keys with different params are unique', () => {
    const k1 = PROJECT_QUERY_KEYS.list({ page: 1 })
    const k2 = PROJECT_QUERY_KEYS.list({ page: 2 })
    expect(JSON.stringify(k1)).not.toBe(JSON.stringify(k2))
  })

  it('list key differs from detail key for same id segment', () => {
    const list = PROJECT_QUERY_KEYS.list({ search: 'projects' })
    const detail = PROJECT_QUERY_KEYS.detail('projects')
    expect(list[1]).toBe('list')
    expect(detail[1]).toBe('projects')
  })
})
