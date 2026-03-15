import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

// Polyfill ResizeObserver for jsdom (required by Radix UI components)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: unknown }) => opts,
}))

// Popover and Calendar use ResizeObserver / Portals which don't work in jsdom
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  PopoverTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    React.createElement('div', { 'data-testid': 'popover-trigger' }, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children),
}))

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => React.createElement('div', { 'data-testid': 'calendar' }),
}))

import { Route } from './sale-commercial-proposal'

function renderPage() {
  const PageComponent = (Route as unknown as { component: React.ComponentType }).component
  return render(React.createElement(PageComponent))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FormSaleCommercialProposalPage', () => {
  it('renders the page header', () => {
    renderPage()
    expect(screen.getByText('Commercial Proposal Form')).toBeTruthy()
    expect(screen.getByText('SALE-001-F01')).toBeTruthy()
  })

  it('renders the COMMERCIAL PROPOSAL card title', () => {
    renderPage()
    expect(screen.getByText('COMMERCIAL PROPOSAL')).toBeTruthy()
  })

  it('renders quotation number field', () => {
    renderPage()
    const input = screen.getByPlaceholderText('QT-XXXX/2026/XXX')
    expect(input).toBeTruthy()
  })

  it('renders Customer Information section', () => {
    renderPage()
    expect(screen.getByText('Customer Information')).toBeTruthy()
    expect(screen.getByLabelText('Contact Name')).toBeTruthy()
    expect(screen.getByLabelText('Telephone')).toBeTruthy()
  })

  it('renders Warehouse Location section', () => {
    renderPage()
    expect(screen.getByText('Warehouse Location')).toBeTruthy()
    expect(screen.getByLabelText('House No.')).toBeTruthy()
    expect(screen.getByLabelText('Province')).toBeTruthy()
  })

  it('renders Rental Details table with one row by default', () => {
    renderPage()
    expect(screen.getByText('Rental Details')).toBeTruthy()
    const buildingInputs = screen.getAllByPlaceholderText('Building name')
    expect(buildingInputs).toHaveLength(1)
  })

  it('adds a new rental row when Add Row button clicked', () => {
    renderPage()
    const addBtn = screen.getByText('Add Row')
    fireEvent.click(addBtn)
    const buildingInputs = screen.getAllByPlaceholderText('Building name')
    expect(buildingInputs).toHaveLength(2)
  })

  it('renders Terms & Conditions section', () => {
    renderPage()
    expect(screen.getByText('Terms & Conditions')).toBeTruthy()
    expect(screen.getByText('Deposit')).toBeTruthy()
    expect(screen.getByText('Utility Charge')).toBeTruthy()
    expect(screen.getByText('Rental Term')).toBeTruthy()
  })

  it('renders lessee responsibility checkboxes', () => {
    renderPage()
    expect(screen.getByText('property insurance')).toBeTruthy()
    expect(screen.getByText('duty stamp')).toBeTruthy()
    expect(screen.getByText('goods insurance')).toBeTruthy()
  })

  it('shows note input when lessee responsibility is checked', () => {
    renderPage()

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[0])

    expect(screen.getByPlaceholderText('Add note (optional)')).toBeTruthy()
  })

  it('renders Company Information section with default company name', () => {
    renderPage()
    expect(screen.getByText('Company Information')).toBeTruthy()
    const companyInput = screen.getByDisplayValue('Thanamol Group Development Co.,Ltd')
    expect(companyInput).toBeTruthy()
  })

  it('renders Print / Save Proposal button', () => {
    renderPage()
    expect(screen.getByText('Print / Save Proposal')).toBeTruthy()
  })

  it('renders Reset button and clears form on click', () => {
    renderPage()

    const quotationInput = screen.getByPlaceholderText(
      'QT-XXXX/2026/XXX'
    ) as HTMLInputElement
    fireEvent.change(quotationInput, { target: { value: 'CQ-TEST' } })
    expect(quotationInput.value).toBe('CQ-TEST')

    const resetBtn = screen.getByText('Reset')
    fireEvent.click(resetBtn)

    expect((screen.getByPlaceholderText('QT-XXXX/2026/XXX') as HTMLInputElement).value).toBe('')
  })

  it('shows Draft badge by default', () => {
    renderPage()
    expect(screen.getByText('Draft')).toBeTruthy()
  })

  it('shows total monthly rental row in table', () => {
    renderPage()
    expect(screen.getByText('Total Monthly Rental:')).toBeTruthy()
  })
})
