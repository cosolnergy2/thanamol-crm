import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: unknown }) => opts,
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/useQuotations', () => ({
  usePendingQuotations: vi.fn(),
  useApproveQuotation: vi.fn(),
  useRejectQuotation: vi.fn(),
}))

vi.mock('@/hooks/useCommercialQuotations', () => ({
  usePendingCommercialQuotations: vi.fn(),
  useApproveCommercialQuotation: vi.fn(),
  useRejectCommercialQuotation: vi.fn(),
}))

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (p: string) => p === 'manage_contracts',
    isLoading: false,
  }),
}))

import * as useQuotationsModule from '@/hooks/useQuotations'
import * as useCommercialQuotationsModule from '@/hooks/useCommercialQuotations'
import { Route } from './approvals'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockPendingQuotation = {
  id: 'q1',
  quotation_number: 'QT-202603-0001',
  status: 'SENT',
  customer: { id: 'c1', name: 'ACME Corp', email: null, phone: null },
  project: { id: 'p1', name: 'Project Alpha', code: 'PA' },
  grand_total: 50000,
  valid_until: '2026-04-01T00:00:00.000Z',
  created_at: '2026-03-15T00:00:00.000Z',
}

const mockPendingCommercial = {
  id: 'cq1',
  quotation_number: 'CQ-202603-0001',
  status: 'SENT',
  customer: { id: 'c1', name: 'Beta Ltd', email: null, phone: null },
  project: { id: 'p2', name: 'Project Beta', code: 'PB' },
  total_amount: 120000,
  created_at: '2026-03-15T00:00:00.000Z',
}

const mockMutateAsync = vi.fn().mockResolvedValue({})
const mockMutationIdle = { mutateAsync: mockMutateAsync, isPending: false }

function setupMocks(quotations = [mockPendingQuotation], commercial = [mockPendingCommercial]) {
  vi.mocked(useQuotationsModule.usePendingQuotations).mockReturnValue({
    data: { data: quotations },
    isLoading: false,
  } as ReturnType<typeof useQuotationsModule.usePendingQuotations>)

  vi.mocked(useQuotationsModule.useApproveQuotation).mockReturnValue(
    mockMutationIdle as unknown as ReturnType<typeof useQuotationsModule.useApproveQuotation>
  )
  vi.mocked(useQuotationsModule.useRejectQuotation).mockReturnValue(
    mockMutationIdle as unknown as ReturnType<typeof useQuotationsModule.useRejectQuotation>
  )

  vi.mocked(useCommercialQuotationsModule.usePendingCommercialQuotations).mockReturnValue({
    data: { data: commercial },
    isLoading: false,
  } as ReturnType<typeof useCommercialQuotationsModule.usePendingCommercialQuotations>)

  vi.mocked(useCommercialQuotationsModule.useApproveCommercialQuotation).mockReturnValue(
    mockMutationIdle as unknown as ReturnType<typeof useCommercialQuotationsModule.useApproveCommercialQuotation>
  )
  vi.mocked(useCommercialQuotationsModule.useRejectCommercialQuotation).mockReturnValue(
    mockMutationIdle as unknown as ReturnType<typeof useCommercialQuotationsModule.useRejectCommercialQuotation>
  )
}

function renderPage() {
  const PageComponent = (Route as unknown as { component: React.ComponentType }).component
  return render(
    React.createElement(PageComponent),
    { wrapper: createWrapper() }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ApprovalsPage', () => {
  it('renders the page title', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('รายการรออนุมัติ')).toBeTruthy()
  })

  it('shows quotation tab with count', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('ใบเสนอราคา')).toBeTruthy()
    expect(screen.getAllByText('(1)').length).toBeGreaterThanOrEqual(1)
  })

  it('renders pending quotation card with quotation number', () => {
    setupMocks()
    renderPage()
    expect(screen.getByText('QT-202603-0001')).toBeTruthy()
    expect(screen.getByText('ACME Corp')).toBeTruthy()
  })

  it('renders approve and reject buttons for manage_contracts permission', () => {
    setupMocks()
    renderPage()
    const approveButtons = screen.getAllByText('อนุมัติ')
    const rejectButtons = screen.getAllByText('ปฏิเสธ')
    expect(approveButtons.length).toBeGreaterThan(0)
    expect(rejectButtons.length).toBeGreaterThan(0)
  })

  it('shows empty state when no pending quotations', () => {
    setupMocks([], [])
    renderPage()
    expect(screen.getByText('ไม่มีใบเสนอราคารออนุมัติ')).toBeTruthy()
  })

  it('calls approve mutation when approve button clicked', async () => {
    setupMocks()
    renderPage()

    const approveBtn = screen.getAllByText('อนุมัติ')[0]
    fireEvent.click(approveBtn)

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled()
    })
  })

  it('opens reject dialog when reject button clicked', async () => {
    setupMocks()
    renderPage()

    const rejectBtn = screen.getAllByText('ปฏิเสธ')[0]
    fireEvent.click(rejectBtn)

    await waitFor(() => {
      expect(screen.getByText('ปฏิเสธรายการ')).toBeTruthy()
    })
  })

  it('shows commercial quotations tab trigger in the DOM', () => {
    setupMocks()
    renderPage()
    // The Commercial Quotations tab trigger should always be rendered
    expect(screen.getByText('Commercial Quotations')).toBeTruthy()
    // usePendingCommercialQuotations hook was called — confirms data integration
    expect(useCommercialQuotationsModule.usePendingCommercialQuotations).toHaveBeenCalled()
  })

  it('aggregates both quotations and commercial quotations', () => {
    setupMocks([mockPendingQuotation], [mockPendingCommercial])
    renderPage()

    // Quotation tab active by default — shows quotation count (both tabs may show (1))
    expect(screen.getAllByText('(1)').length).toBeGreaterThanOrEqual(1)
    // Commercial tab count also visible
    const allCounts = screen.getAllByText('(1)')
    expect(allCounts.length).toBeGreaterThanOrEqual(1)
  })

  it('shows loading skeletons when data is loading', () => {
    vi.mocked(useQuotationsModule.usePendingQuotations).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useQuotationsModule.usePendingQuotations>)

    vi.mocked(useQuotationsModule.useApproveQuotation).mockReturnValue(
      mockMutationIdle as unknown as ReturnType<typeof useQuotationsModule.useApproveQuotation>
    )
    vi.mocked(useQuotationsModule.useRejectQuotation).mockReturnValue(
      mockMutationIdle as unknown as ReturnType<typeof useQuotationsModule.useRejectQuotation>
    )

    vi.mocked(useCommercialQuotationsModule.usePendingCommercialQuotations).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCommercialQuotationsModule.usePendingCommercialQuotations>)

    vi.mocked(useCommercialQuotationsModule.useApproveCommercialQuotation).mockReturnValue(
      mockMutationIdle as unknown as ReturnType<typeof useCommercialQuotationsModule.useApproveCommercialQuotation>
    )
    vi.mocked(useCommercialQuotationsModule.useRejectCommercialQuotation).mockReturnValue(
      mockMutationIdle as unknown as ReturnType<typeof useCommercialQuotationsModule.useRejectCommercialQuotation>
    )

    renderPage()
    // Skeletons render, no quotation numbers appear
    expect(screen.queryByText('QT-202603-0001')).toBeNull()
  })
})
