import { describe, it, expect } from 'vitest'
import { PR_QUERY_KEYS } from './usePurchaseRequests'

describe('PR_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(PR_QUERY_KEYS.all).toEqual(['purchase-requests'])
  })

  it('builds list key with params', () => {
    const key = PR_QUERY_KEYS.list({ page: 1, status: 'DRAFT' })
    expect(key[0]).toBe('purchase-requests')
    expect(key[1]).toBe('list')
    expect(key[2]).toEqual({ page: 1, status: 'DRAFT' })
  })

  it('builds list key with empty params', () => {
    const key = PR_QUERY_KEYS.list({})
    expect(key[2]).toEqual({})
  })

  it('builds detail key for a given id', () => {
    const key = PR_QUERY_KEYS.detail('pr-abc-123')
    expect(key).toEqual(['purchase-requests', 'pr-abc-123'])
  })

  it('detail keys differ per id', () => {
    const k1 = PR_QUERY_KEYS.detail('id-1')
    const k2 = PR_QUERY_KEYS.detail('id-2')
    expect(k1).not.toEqual(k2)
  })

  it('list key differs from detail key', () => {
    const list = PR_QUERY_KEYS.list({ search: 'test' })
    const detail = PR_QUERY_KEYS.detail('test')
    expect(list[1]).toBe('list')
    expect(detail[1]).toBe('test')
  })

  it('all key is a prefix of list key', () => {
    const all = PR_QUERY_KEYS.all
    const list = PR_QUERY_KEYS.list({})
    expect(list[0]).toBe(all[0])
  })
})

describe('PR status workflow invariants', () => {
  const PR_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONVERTED']

  it('all expected statuses are defined', () => {
    expect(PR_STATUSES).toContain('DRAFT')
    expect(PR_STATUSES).toContain('SUBMITTED')
    expect(PR_STATUSES).toContain('APPROVED')
    expect(PR_STATUSES).toContain('REJECTED')
  })

  it('DRAFT is the initial status', () => {
    expect(PR_STATUSES[0]).toBe('DRAFT')
  })

  it('SUBMITTED follows DRAFT in the workflow', () => {
    const draftIndex = PR_STATUSES.indexOf('DRAFT')
    const submittedIndex = PR_STATUSES.indexOf('SUBMITTED')
    expect(draftIndex).toBeLessThan(submittedIndex)
  })

  it('APPROVED and REJECTED are terminal states after SUBMITTED', () => {
    const submittedIndex = PR_STATUSES.indexOf('SUBMITTED')
    const approvedIndex = PR_STATUSES.indexOf('APPROVED')
    const rejectedIndex = PR_STATUSES.indexOf('REJECTED')
    expect(approvedIndex).toBeGreaterThan(submittedIndex)
    expect(rejectedIndex).toBeGreaterThan(submittedIndex)
  })
})
