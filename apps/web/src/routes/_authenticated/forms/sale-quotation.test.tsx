import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: unknown }) => opts,
}))

import { Route } from './sale-quotation'

function renderPage() {
  // Route.component is the actual page function returned by createFileRoute mock
  const PageComponent = (Route as unknown as { component: React.ComponentType }).component
  return render(React.createElement(PageComponent))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FormSaleQuotationPage', () => {
  it('renders the form title', () => {
    renderPage()
    expect(screen.getByText(/SALE-JOB01/)).toBeTruthy()
  })

  it('renders required fields', () => {
    renderPage()
    expect(screen.getByLabelText(/Quotation Number/)).toBeTruthy()
    expect(screen.getByLabelText(/Customer Name/)).toBeTruthy()
    expect(screen.getByLabelText(/Quotation Date/)).toBeTruthy()
    expect(screen.getByLabelText(/Valid Until/)).toBeTruthy()
  })

  it('renders one item row by default', () => {
    renderPage()
    const descInputs = screen.getAllByPlaceholderText('Item description')
    expect(descInputs).toHaveLength(1)
  })

  it('adds a new item row when Add Item button clicked', () => {
    renderPage()
    const addBtn = screen.getByText('Add Item')
    fireEvent.click(addBtn)
    const descInputs = screen.getAllByPlaceholderText('Item description')
    expect(descInputs).toHaveLength(2)
  })

  it('remove button is disabled when only one item exists', () => {
    renderPage()
    // Only one item: remove button should be disabled
    const allButtons = screen.getAllByRole('button')
    const trashButtons = allButtons.filter((btn) => btn.hasAttribute('disabled') && btn.querySelector('svg'))
    // At least one trash button should be disabled when only 1 item
    expect(trashButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('calculates subtotal and total when quantity and unit_price are entered', async () => {
    renderPage()

    const qtyInput = screen.getAllByDisplayValue('1')[0]
    const priceInputs = screen.getAllByDisplayValue('0')
    const priceInput = priceInputs[0]

    act(() => {
      fireEvent.change(qtyInput, { target: { value: '2' } })
      fireEvent.change(priceInput, { target: { value: '100' } })
    })

    // amount = 2 * 100 = 200, subtotal = 200, vat = 14, total = 214
    await screen.findByDisplayValue('200.00')
    expect(screen.getByText('฿200.00')).toBeTruthy()
    expect(screen.getByText('฿14.00')).toBeTruthy()
    expect(screen.getByText('฿214.00')).toBeTruthy()
  })

  it('resets form when Reset button clicked', () => {
    renderPage()

    const quotationNumberInput = screen.getByLabelText(/Quotation Number/) as HTMLInputElement
    fireEvent.change(quotationNumberInput, { target: { value: 'QT-TEST' } })
    expect(quotationNumberInput.value).toBe('QT-TEST')

    const resetBtn = screen.getByText('Reset')
    fireEvent.click(resetBtn)

    expect((screen.getByLabelText(/Quotation Number/) as HTMLInputElement).value).toBe('')
  })

  it('shows Print / Save button', () => {
    renderPage()
    expect(screen.getByText('Print / Save')).toBeTruthy()
  })

  it('shows Terms & Conditions and Notes fields', () => {
    renderPage()
    expect(screen.getByLabelText(/Terms/)).toBeTruthy()
    expect(screen.getByLabelText('Notes')).toBeTruthy()
  })
})
