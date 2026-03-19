import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    userRole: {
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { getUserAggregatedPermissions, hasModulePermission } from './permissions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserAggregatedPermissions', () => {
  it('returns empty object when user has no roles', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const result = await getUserAggregatedPermissions('user-1')
    expect(result).toEqual({})
  })

  it('merges flat permissions from multiple roles', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { manage_projects: true, view_reports: false } } },
      { role: { permissions: { manage_finance: true } } },
    ] as never)

    const result = await getUserAggregatedPermissions('user-1')
    expect(result['manage_projects']).toBe(true)
    expect(result['manage_finance']).toBe(true)
    expect(result['view_reports']).toBeUndefined()
  })

  it('handles nested (granular) permissions and flattens to dot-notation', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      {
        role: {
          permissions: {
            customers: { view: true, create: true, edit: false },
            invoices: { view: true },
          },
        },
      },
    ] as never)

    const result = await getUserAggregatedPermissions('user-1')
    expect(result['customers.view']).toBe(true)
    expect(result['customers.create']).toBe(true)
    expect(result['customers.edit']).toBeUndefined()
    expect(result['invoices.view']).toBe(true)
  })

  it('generates legacy keys for nested permissions', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      {
        role: {
          permissions: {
            invoices: { view: true, create: true },
          },
        },
      },
    ] as never)

    const result = await getUserAggregatedPermissions('user-1')
    expect(result['manage_finance']).toBe(true)
  })

  it('generates manage_projects legacy key when customers module has actions', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      {
        role: {
          permissions: {
            customers: { view: true },
          },
        },
      },
    ] as never)

    const result = await getUserAggregatedPermissions('user-1')
    expect(result['manage_projects']).toBe(true)
  })

  it('does not generate legacy keys when nested module has no true actions', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      {
        role: {
          permissions: {
            invoices: { view: false, create: false },
          },
        },
      },
    ] as never)

    const result = await getUserAggregatedPermissions('user-1')
    expect(result['manage_finance']).toBeUndefined()
  })

  it('merges nested and flat permissions from different roles', async () => {
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { manage_roles: true } } },
      { role: { permissions: { customers: { view: true } } } },
    ] as never)

    const result = await getUserAggregatedPermissions('user-1')
    expect(result['manage_roles']).toBe(true)
    expect(result['customers.view']).toBe(true)
  })
})

describe('hasModulePermission', () => {
  it('returns true when dot-notation key is present and true', () => {
    const permissions = { 'customers.view': true, 'customers.create': false }
    expect(hasModulePermission(permissions, 'customers', 'view')).toBe(true)
  })

  it('returns false when permission is false', () => {
    const permissions = { 'customers.view': true, 'customers.create': false }
    expect(hasModulePermission(permissions, 'customers', 'create')).toBe(false)
  })

  it('returns false when permission key does not exist', () => {
    const permissions = { 'customers.view': true }
    expect(hasModulePermission(permissions, 'invoices', 'view')).toBe(false)
  })
})
