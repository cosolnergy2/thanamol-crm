import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CLEANING_SHIFTS, CLEANING_STATUSES } from '@thanamol/shared'
import type { CleaningArea, CleaningAreaTask } from '@thanamol/shared'

vi.mock('@/lib/api-client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

describe('CLEANING_SHIFTS constant', () => {
  it('contains all four shift values', () => {
    expect(CLEANING_SHIFTS).toContain('Morning')
    expect(CLEANING_SHIFTS).toContain('Afternoon')
    expect(CLEANING_SHIFTS).toContain('Evening')
    expect(CLEANING_SHIFTS).toContain('Night')
  })

  it('has exactly four shifts', () => {
    expect(CLEANING_SHIFTS).toHaveLength(4)
  })
})

describe('CLEANING_STATUSES constant', () => {
  it('contains all three status values', () => {
    expect(CLEANING_STATUSES).toContain('PENDING')
    expect(CLEANING_STATUSES).toContain('IN_PROGRESS')
    expect(CLEANING_STATUSES).toContain('COMPLETED')
  })
})

describe('CleaningArea type structure', () => {
  it('can construct a valid CleaningArea with tasks', () => {
    const task: CleaningAreaTask = {
      task_name: 'Sweep and mop floor',
      completed: false,
      quality_score: 5,
    }

    const area: CleaningArea = {
      area_name: 'Lobby',
      tasks: [task],
    }

    expect(area.area_name).toBe('Lobby')
    expect(area.tasks).toHaveLength(1)
    expect(area.tasks[0].task_name).toBe('Sweep and mop floor')
    expect(area.tasks[0].completed).toBe(false)
    expect(area.tasks[0].quality_score).toBe(5)
  })

  it('supports quality scores from 1 to 5', () => {
    const scores = [1, 2, 3, 4, 5]
    scores.forEach((score) => {
      const task: CleaningAreaTask = {
        task_name: 'Test task',
        completed: false,
        quality_score: score,
      }
      expect(task.quality_score).toBe(score)
    })
  })

  it('supports multiple tasks per area', () => {
    const area: CleaningArea = {
      area_name: 'Restroom',
      tasks: [
        { task_name: 'Clean toilet', completed: true, quality_score: 4 },
        { task_name: 'Mop floor', completed: false, quality_score: 3 },
        { task_name: 'Restock supplies', completed: true, quality_score: 5 },
      ],
    }
    expect(area.tasks).toHaveLength(3)
    expect(area.tasks.filter((t) => t.completed)).toHaveLength(2)
  })
})

describe('useCleaningChecklists hook query keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('constructs list query key with params', async () => {
    const { CLEANING_CHECKLIST_QUERY_KEYS } = await import('./useCleaningChecklists')
    const key = CLEANING_CHECKLIST_QUERY_KEYS.list({ projectId: 'proj-1', status: 'PENDING' })
    expect(key[0]).toBe('cleaningChecklists')
    expect(key[1]).toBe('list')
    expect(key[2]).toMatchObject({ projectId: 'proj-1', status: 'PENDING' })
  })

  it('constructs detail query key with id', async () => {
    const { CLEANING_CHECKLIST_QUERY_KEYS } = await import('./useCleaningChecklists')
    const key = CLEANING_CHECKLIST_QUERY_KEYS.detail('checklist-123')
    expect(key).toEqual(['cleaningChecklists', 'checklist-123'])
  })
})
