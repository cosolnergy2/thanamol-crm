import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: unknown) => ({
    ...(opts as object),
    useParams: () => ({ vendorId: 'v1' }),
  }),
  Link: ({ children, to }: { children: React.ReactNode; to: string; [key: string]: unknown }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/useVendors', () => ({
  useVendor: vi.fn(),
}))

vi.mock('@/hooks/useVendorContracts', () => ({
  useVendorContracts: vi.fn(),
}))

vi.mock('@/hooks/useVendorInvoices', () => ({
  useVendorInvoices: vi.fn(),
}))

import { useVendor } from '@/hooks/useVendors'
import { useVendorContracts } from '@/hooks/useVendorContracts'
import { useVendorInvoices } from '@/hooks/useVendorInvoices'
import { VendorDetailPage } from './index'

const mockUseVendor = vi.mocked(useVendor)
const mockUseVendorContracts = vi.mocked(useVendorContracts)
const mockUseVendorInvoices = vi.mocked(useVendorInvoices)

const baseVendor = {
  id: 'v1',
  vendor_code: 'VEN-001',
  name: 'Test Vendor Co',
  legal_name: 'Test Vendor Company Ltd.',
  display_name: 'Test Vendor',
  vendor_type: 'Supplier',
  tax_id: '1234567890123',
  phone: '02-111-2222',
  email: 'test@vendor.com',
  website: 'https://vendor.com',
  address: '123 Test Street',
  contact_person: 'John Doe',
  category: 'General',
  rating: 4,
  status: 'ACTIVE',
  supplier_type: 'Supplier ทั่วไป',
  payment_terms: '30 Days',
  credit_limit: 500000,
  notes: 'Test note',
  service_tags: ['HVAC', 'Electrical'],
  additional_contacts: [
    { name: 'Jane Smith', phone: '08x-xxx-xxxx', email: 'jane@vendor.com', position: 'Manager' },
  ],
  default_conditions: {
    vat_enabled: true,
    wht_enabled: true,
    wht_rate: 3,
    retention_enabled: false,
    warranty: '1 year',
    credit_terms: '30 days',
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
      <VendorDetailPage />
    </QueryClientProvider>
  )
}

describe('VendorDetailPage', () => {
  beforeEach(() => {
    mockUseVendorContracts.mockReturnValue({ data: { data: [] } } as ReturnType<typeof useVendorContracts>)
    mockUseVendorInvoices.mockReturnValue({ data: { data: [] } } as ReturnType<typeof useVendorInvoices>)
  })

  it('shows loading state', () => {
    mockUseVendor.mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('shows vendor not found when no vendor data', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: null }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Vendor not found')).toBeTruthy()
  })

  it('renders vendor code in header', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('VEN-001')).toBeTruthy()
  })

  it('defaults to Info tab showing company info section', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('ข้อมูลบริษัท')).toBeTruthy()
  })

  it('renders all 4 tabs: Info, Contracts, Item Prices, Invoices', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByRole('button', { name: /^info$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /contracts/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /item prices/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /invoices/i })).toBeTruthy()
  })

  it('Info tab displays legal name', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Test Vendor Company Ltd.')).toBeTruthy()
  })

  it('Info tab displays tax ID', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('1234567890123')).toBeTruthy()
  })

  it('Info tab displays service tags', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('HVAC')).toBeTruthy()
    expect(screen.getByText('Electrical')).toBeTruthy()
  })

  it('Info tab displays additional contacts', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('Jane Smith')).toBeTruthy()
    expect(screen.getByText('Manager')).toBeTruthy()
  })

  it('Info tab displays payment terms', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('30 Days')).toBeTruthy()
  })

  it('Info tab displays default conditions warranty', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    expect(screen.getByText('1 year')).toBeTruthy()
  })

  it('switches to Contracts tab', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /contracts/i }))
    expect(screen.getByText('No contracts')).toBeTruthy()
  })

  it('switches to Invoices tab', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /invoices/i }))
    expect(screen.getByText('No invoices')).toBeTruthy()
  })

  it('switches to Item Prices tab', () => {
    mockUseVendor.mockReturnValue({ data: { vendor: baseVendor }, isLoading: false } as ReturnType<typeof useVendor>)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /item prices/i }))
    expect(screen.getByText('No item prices')).toBeTruthy()
  })
})
