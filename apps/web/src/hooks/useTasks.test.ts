import { describe, it, expect } from 'vitest'
import { TASK_QUERY_KEYS } from './useTasks'

describe('TASK_QUERY_KEYS', () => {
  it('returns stable all key', () => {
    expect(TASK_QUERY_KEYS.all).toEqual(['tasks'])
  })

  it('builds list key with params', () => {
    const key = TASK_QUERY_KEYS.list({ page: 1, limit: 20, search: 'fix login' })
    expect(key[0]).toBe('tasks')
    expect(key[1]).toBe('list')
    expect(key[2]).toEqual({ page: 1, limit: 20, search: 'fix login' })
  })

  it('builds list key with empty params', () => {
    const key = TASK_QUERY_KEYS.list({})
    expect(key[2]).toEqual({})
  })

  it('builds detail key with task id', () => {
    const key = TASK_QUERY_KEYS.detail('task-abc')
    expect(key).toEqual(['tasks', 'task-abc'])
  })

  it('builds comments key with task id', () => {
    const key = TASK_QUERY_KEYS.comments('task-abc')
    expect(key).toEqual(['tasks', 'task-abc', 'comments'])
  })

  it('detail key differs per task id', () => {
    const k1 = TASK_QUERY_KEYS.detail('id-1')
    const k2 = TASK_QUERY_KEYS.detail('id-2')
    expect(k1).not.toEqual(k2)
  })

  it('list keys with different params are unique', () => {
    const k1 = TASK_QUERY_KEYS.list({ status: 'TODO' })
    const k2 = TASK_QUERY_KEYS.list({ status: 'DONE' })
    expect(JSON.stringify(k1)).not.toBe(JSON.stringify(k2))
  })

  it('list key differs from detail key for same segment', () => {
    const list = TASK_QUERY_KEYS.list({ search: 'tasks' })
    const detail = TASK_QUERY_KEYS.detail('tasks')
    expect(list[1]).toBe('list')
    expect(detail[1]).toBe('tasks')
  })

  it('comments key differs from detail key for same task id', () => {
    const detail = TASK_QUERY_KEYS.detail('xyz')
    const comments = TASK_QUERY_KEYS.comments('xyz')
    expect(detail.length).toBe(2)
    expect(comments.length).toBe(3)
    expect(comments[2]).toBe('comments')
  })

  it('list key with priority filter is unique', () => {
    const k1 = TASK_QUERY_KEYS.list({ priority: 'HIGH' })
    const k2 = TASK_QUERY_KEYS.list({ priority: 'LOW' })
    expect(JSON.stringify(k1)).not.toBe(JSON.stringify(k2))
  })
})
