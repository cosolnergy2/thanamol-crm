import { describe, it, expect } from 'vitest'
import { ZONE_QUERY_KEYS } from './useZones'

describe('ZONE_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(ZONE_QUERY_KEYS.all).toEqual(['zones'])
  })

  it('builds list key with projectId', () => {
    const key = ZONE_QUERY_KEYS.list({ projectId: 'proj-123' })
    expect(key[0]).toBe('zones')
    expect(key[1]).toBe('list')
    expect(key[2]).toEqual({ projectId: 'proj-123' })
  })

  it('builds list key with all params', () => {
    const params = { projectId: 'proj-1', search: 'zone', page: 2, limit: 10 }
    const key = ZONE_QUERY_KEYS.list(params)
    expect(key[2]).toEqual(params)
  })

  it('builds detail key with zone id', () => {
    const key = ZONE_QUERY_KEYS.detail('zone-abc')
    expect(key).toEqual(['zones', 'zone-abc'])
  })

  it('list keys with different projectIds are unique', () => {
    const k1 = ZONE_QUERY_KEYS.list({ projectId: 'p1' })
    const k2 = ZONE_QUERY_KEYS.list({ projectId: 'p2' })
    expect(JSON.stringify(k1)).not.toBe(JSON.stringify(k2))
  })

  it('detail keys with different ids are unique', () => {
    const k1 = ZONE_QUERY_KEYS.detail('z1')
    const k2 = ZONE_QUERY_KEYS.detail('z2')
    expect(k1).not.toEqual(k2)
  })

  it('list key differs from detail key', () => {
    const list = ZONE_QUERY_KEYS.list({ projectId: 'p' })
    const detail = ZONE_QUERY_KEYS.detail('p')
    expect(JSON.stringify(list)).not.toBe(JSON.stringify(detail))
  })
})
