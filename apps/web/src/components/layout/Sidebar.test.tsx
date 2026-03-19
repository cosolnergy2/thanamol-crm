import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { LanguageProvider } from '@/providers/LanguageProvider'
import type { AuthUser } from '@thanamol/shared'

// TanStack Router hooks are used in Sidebar; mock them
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useRouterState: vi.fn(() => ({
      location: { pathname: '/' },
    })),
    Link: ({ to, children, className, title }: { to: string; children?: React.ReactNode; className?: string; title?: string }) => (
      <a href={to} className={className} title={title}>
        {children}
      </a>
    ),
  }
})

const adminUser: AuthUser = {
  id: 'user-1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  avatarUrl: null,
  phone: null,
  department: null,
  position: null,
  isActive: true,
  roles: [{ id: 'r1', name: 'admin' }],
}

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const defaults = {
    user: adminUser,
    isOpen: true,
    isCollapsed: false,
    onClose: vi.fn(),
    onLogout: vi.fn(),
  }
  return render(
    <LanguageProvider>
      <Sidebar {...defaults} {...props} />
    </LanguageProvider>,
  )
}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the PropertyFlow brand logo text', () => {
    renderSidebar()
    expect(screen.getByText('PropertyFlow')).toBeTruthy()
  })

  it('renders all 15 main navigation sections for admin', () => {
    renderSidebar()
    // All visible nav section labels should be present
    expect(screen.getByText('Dashboard')).toBeTruthy()
    expect(screen.getByText('My Dashboard')).toBeTruthy()
    expect(screen.getByText('Projects')).toBeTruthy()
    expect(screen.getByText('Customers')).toBeTruthy()
    expect(screen.getByText('Leads & Deals')).toBeTruthy()
    expect(screen.getByText('Units/Products')).toBeTruthy()
    expect(screen.getByText('Quotations')).toBeTruthy()
    expect(screen.getByText('Contracts')).toBeTruthy()
    expect(screen.getByText('Finance')).toBeTruthy()
    expect(screen.getByText('Utilities')).toBeTruthy()
    expect(screen.getByText('Service')).toBeTruthy()
    expect(screen.getByText('Documents')).toBeTruthy()
    expect(screen.getByText('Meeting Minutes')).toBeTruthy()
    expect(screen.getByText('Form List')).toBeTruthy()
    expect(screen.getByText('Reports')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('shows user name and role in the sidebar', () => {
    renderSidebar()
    const userNameElements = screen.getAllByText('Admin User')
    expect(userNameElements.length).toBeGreaterThan(0)
    const roleElements = screen.getAllByText('admin')
    expect(roleElements.length).toBeGreaterThan(0)
  })

  it('expands a submenu when its parent button is clicked', () => {
    renderSidebar()
    const customersButton = screen.getByRole('button', { name: /customers/i })
    fireEvent.click(customersButton)
    expect(screen.getByText('Customer List')).toBeTruthy()
    expect(screen.getByText('Add New Customer')).toBeTruthy()
    expect(screen.getByText('Contacts')).toBeTruthy()
  })

  it('collapses a submenu when its parent button is clicked again', () => {
    renderSidebar()
    const customersButton = screen.getByRole('button', { name: /customers/i })
    fireEvent.click(customersButton)
    expect(screen.getByText('Customer List')).toBeTruthy()
    fireEvent.click(customersButton)
    expect(screen.queryByText('Customer List')).toBeNull()
  })

  it('hides text labels in collapsed mode', () => {
    renderSidebar({ isCollapsed: true })
    expect(screen.queryByText('PropertyFlow')).toBeNull()
    expect(screen.queryByText('Customers')).toBeNull()
  })

  it('calls onClose when mobile backdrop is clicked', () => {
    const onClose = vi.fn()
    renderSidebar({ onClose })
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeTruthy()
    fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders the user menu trigger button', () => {
    const onLogout = vi.fn()
    renderSidebar({ onLogout })
    // Verify the user menu trigger button is present
    const profileButton = screen.getByRole('button', { name: 'User menu' })
    expect(profileButton).toBeTruthy()
  })

  it('filters nav items for non-admin user with limited roles', () => {
    const limitedUser: AuthUser = {
      ...adminUser,
      roles: [{ id: 'r2', name: 'dashboard' }],
    }
    renderSidebar({ user: limitedUser })
    expect(screen.getByText('Dashboard')).toBeTruthy()
    // Finance requires 'finance' permission — should not be visible
    expect(screen.queryByText('Finance')).toBeNull()
  })

  it('hides sidebar when isOpen is false on mobile', () => {
    renderSidebar({ isOpen: false })
    // backdrop should not be present when closed on mobile
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).toBeNull()
  })
})
