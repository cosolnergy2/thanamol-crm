import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { PermissionGuard } from './PermissionGuard'

const mockUsePermissions = vi.fn()
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PermissionGuard', () => {
  it('renders nothing while loading', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: true,
    })

    const { container } = render(
      <PermissionGuard permission="dashboard">
        <span>Protected</span>
      </PermissionGuard>,
    )
    expect(screen.queryByText('Protected')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('renders children when user has the required permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: (p: string) => p === 'dashboard',
      isLoading: false,
    })

    render(
      <PermissionGuard permission="dashboard">
        <span>Protected</span>
      </PermissionGuard>,
    )
    expect(screen.getByText('Protected')).toBeTruthy()
  })

  it('hides children when user lacks the required permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    })

    render(
      <PermissionGuard permission="settings">
        <span>Protected</span>
      </PermissionGuard>,
    )
    expect(screen.queryByText('Protected')).toBeNull()
  })

  it('renders fallback when user lacks permission and fallback is provided', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    })

    render(
      <PermissionGuard permission="settings" fallback={<span>Access Denied</span>}>
        <span>Protected</span>
      </PermissionGuard>,
    )
    expect(screen.queryByText('Protected')).toBeNull()
    expect(screen.getByText('Access Denied')).toBeTruthy()
  })

  it('renders null fallback (default) when no fallback prop and permission denied', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: () => false,
      isLoading: false,
    })

    const { container } = render(
      <PermissionGuard permission="settings">
        <span>Protected</span>
      </PermissionGuard>,
    )
    expect(container.firstChild).toBeNull()
  })
})
