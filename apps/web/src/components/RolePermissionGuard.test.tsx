import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { RolePermissionGuard } from './RolePermissionGuard'

const mockUsePermissions = vi.fn()
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RolePermissionGuard', () => {
  it('renders nothing while loading', () => {
    mockUsePermissions.mockReturnValue({
      hasRole: () => false,
      isLoading: true,
    })

    const { container } = render(
      <RolePermissionGuard role="admin">
        <span>Admin Area</span>
      </RolePermissionGuard>,
    )
    expect(screen.queryByText('Admin Area')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('renders children when user has the required role', () => {
    mockUsePermissions.mockReturnValue({
      hasRole: (r: string) => r === 'admin',
      isLoading: false,
    })

    render(
      <RolePermissionGuard role="admin">
        <span>Admin Area</span>
      </RolePermissionGuard>,
    )
    expect(screen.getByText('Admin Area')).toBeTruthy()
  })

  it('hides children when user does not have the required role', () => {
    mockUsePermissions.mockReturnValue({
      hasRole: () => false,
      isLoading: false,
    })

    render(
      <RolePermissionGuard role="admin">
        <span>Admin Area</span>
      </RolePermissionGuard>,
    )
    expect(screen.queryByText('Admin Area')).toBeNull()
  })

  it('renders fallback when user lacks the role and fallback is provided', () => {
    mockUsePermissions.mockReturnValue({
      hasRole: () => false,
      isLoading: false,
    })

    render(
      <RolePermissionGuard role="admin" fallback={<span>Not Allowed</span>}>
        <span>Admin Area</span>
      </RolePermissionGuard>,
    )
    expect(screen.queryByText('Admin Area')).toBeNull()
    expect(screen.getByText('Not Allowed')).toBeTruthy()
  })

  it('renders null (default fallback) when user lacks role and no fallback given', () => {
    mockUsePermissions.mockReturnValue({
      hasRole: () => false,
      isLoading: false,
    })

    const { container } = render(
      <RolePermissionGuard role="admin">
        <span>Admin Area</span>
      </RolePermissionGuard>,
    )
    expect(container.firstChild).toBeNull()
  })
})
