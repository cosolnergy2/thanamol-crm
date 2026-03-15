import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useTaskStatuses,
  useCreateTaskStatus,
  useUpdateTaskStatus,
  useDeleteTaskStatus,
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
} from './useTaskConfig'
import * as apiClient from '@/lib/api-client'

vi.mock('@/lib/api-client')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useTaskStatuses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches task statuses', async () => {
    const mockResponse = {
      data: [{ id: '1', name: 'In Review', color: '#6366f1', order: 0, is_default: false, is_closed: false }],
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useTaskStatuses(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/task-statuses')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTaskStatuses(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
  })
})

describe('useCreateTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /task-statuses and invalidates query', async () => {
    const mockStatus = { id: '2', name: 'Pending', color: '#f59e0b', order: 1 }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockStatus)

    const { result } = renderHook(() => useCreateTaskStatus(), { wrapper: createWrapper() })

    result.current.mutate({ name: 'Pending', color: '#f59e0b', order: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/task-statuses', {
      name: 'Pending',
      color: '#f59e0b',
      order: 1,
    })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateTaskStatus(), { wrapper: createWrapper() })

    result.current.mutate({ name: '', color: '#000', order: 0 })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})

describe('useUpdateTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /task-statuses/:id', async () => {
    const mockStatus = { id: '1', name: 'Updated', color: '#000', order: 0 }
    vi.mocked(apiClient.apiPut).mockResolvedValue(mockStatus)

    const { result } = renderHook(() => useUpdateTaskStatus(), { wrapper: createWrapper() })

    result.current.mutate({ id: '1', data: { name: 'Updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/task-statuses/1', { name: 'Updated' })
  })
})

describe('useDeleteTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /task-statuses/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteTaskStatus(), { wrapper: createWrapper() })

    result.current.mutate('status-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/task-statuses/status-1')
  })
})

describe('useAutomationRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches automation rules', async () => {
    const mockResponse = {
      data: [
        {
          id: '1',
          name: 'Auto notify',
          trigger_event: 'task.created',
          conditions: {},
          actions: [],
          is_active: true,
        },
      ],
    }
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAutomationRules(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiGet).toHaveBeenCalledWith('/automation-rules')
    expect(result.current.data).toEqual(mockResponse)
  })

  it('returns error state when API fails', async () => {
    vi.mocked(apiClient.apiGet).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAutomationRules(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateAutomationRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /automation-rules', async () => {
    const mockRule = { id: '2', name: 'New Rule', trigger_event: 'task.assigned' }
    vi.mocked(apiClient.apiPost).mockResolvedValue(mockRule)

    const { result } = renderHook(() => useCreateAutomationRule(), { wrapper: createWrapper() })

    result.current.mutate({ name: 'New Rule', triggerEvent: 'task.assigned' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPost).toHaveBeenCalledWith('/automation-rules', {
      name: 'New Rule',
      triggerEvent: 'task.assigned',
    })
  })

  it('surfaces API error on failure', async () => {
    vi.mocked(apiClient.apiPost).mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useCreateAutomationRule(), { wrapper: createWrapper() })

    result.current.mutate({ name: '', triggerEvent: '' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Server error')
  })
})

describe('useUpdateAutomationRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls PUT /automation-rules/:id', async () => {
    vi.mocked(apiClient.apiPut).mockResolvedValue({ id: '1', name: 'Updated Rule' })

    const { result } = renderHook(() => useUpdateAutomationRule(), { wrapper: createWrapper() })

    result.current.mutate({ id: '1', data: { isActive: false } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiPut).toHaveBeenCalledWith('/automation-rules/1', { isActive: false })
  })
})

describe('useDeleteAutomationRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls DELETE /automation-rules/:id', async () => {
    vi.mocked(apiClient.apiDelete).mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteAutomationRule(), { wrapper: createWrapper() })

    result.current.mutate('rule-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiClient.apiDelete).toHaveBeenCalledWith('/automation-rules/rule-1')
  })
})
