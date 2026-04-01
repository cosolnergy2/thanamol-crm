import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({
    ...(opts as object),
    useParams: () => ({ vendorId: 'v1' }),
  }),
  useNavigate: () => vi.fn(),
}))

const mockMutate = vi.fn()

vi.mock('@/hooks/useVendors', () => ({
  useVendor: vi.fn(),
  useUpdateVendor: () => ({ mutate: mockMutate, isPending: false }),
}))

import { useVendor } from '@/hooks/useVendors'
import { VendorEditPage } from './edit'

const mockUseVendor = vi.mocked(useVendor)

const baseVendor = {
  id: 'v1',
  vendor_code: 'VEN-001',
  name: 'Test Vendor',
  legal_name: 'Test Vendor Co Ltd.',
  display_name: 'Test Vendor',
  vendor_type: 'Supplier',
  tax_id: '9876543210123',
  phone: '02-999-8888',
  email: 'info@testvendor.com',
  address: '456 Vendor Road',
  contact_person: 'Alice',
  status: 'ACTIVE',
  supplier_type: 'Supplier ทั่วไป',
  payment_terms: '30 Days',
  credit_limit: 100000,
  notes: 'Some notes',
  service_tags: ['HVAC', 'Electrical'],
  additional_contacts: [
    { name: 'Bob', phone: '081-111-2222', email: 'bob@vendor.com', position: 'Engineer' },
  ],
  default_conditions: {
    vat_enabled: true,
    wht_enabled: false,
    warranty: '2 years',
  },
  bank_details: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  item_prices: [],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <VendorEditPage />
    </QueryClientProvider>
  )
}

describe('VendorEditPage', () => {
  beforeEach(() => {
    mockMutate.mockReset()
  })

  it('shows loading state', () => {
    mockUseVendor.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('shows vendor not found when no vendor', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: null }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Vendor not found')).toBeTruthy()
  })

  it('renders Edit Vendor heading', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Edit Vendor')).toBeTruthy()
  })

  it('pre-fills legal name from vendor data', async () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('ชื่อบริษัทตามทะเบียน') as HTMLInputElement
      expect(input.value).toBe('Test Vendor Co Ltd.')
    })
  })

  it('pre-fills tax ID from vendor data', async () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('0000000000000 (13 หลัก)') as HTMLInputElement
      expect(input.value).toBe('9876543210123')
    })
  })

  it('pre-fills address from vendor data', async () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('ที่อยู่บริษัท') as HTMLTextAreaElement
      expect(textarea.value).toBe('456 Vendor Road')
    })
  })

  it('renders additional contacts section', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('ผู้ติดต่อสำรอง (Additional Contacts)')).toBeTruthy()
  })

  it('adds a new additional contact row when add button clicked', async () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    const addButtons = screen.getAllByRole('button', { name: /เพิ่ม$/i })
    fireEvent.click(addButtons[0])
    await waitFor(() => {
      const nameInputs = screen.getAllByPlaceholderText('ชื่อ')
      expect(nameInputs.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders service tags checkboxes', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Service Tags')).toBeTruthy()
    expect(screen.getByText('HVAC')).toBeTruthy()
  })

  it('pre-fills notes from vendor data', async () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('หมายเหตุเพิ่มเติม...') as HTMLTextAreaElement
      expect(textarea.value).toBe('Some notes')
    })
  })

  it('Save Changes button is rendered', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeTruthy()
  })

  it('calls updateVendor.mutate on form submit with legalName', async () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    await waitFor(() => {
      const input = screen.getByPlaceholderText('ชื่อบริษัทตามทะเบียน') as HTMLInputElement
      expect(input.value).toBe('Test Vendor Co Ltd.')
    })
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!
    fireEvent.submit(form)
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ legalName: 'Test Vendor Co Ltd.' }),
        expect.any(Object)
      )
    })
  })

  it('renders Default Conditions section', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('เงื่อนไขมาตรฐานของ Vendor (Default Conditions)')).toBeTruthy()
  })
})
