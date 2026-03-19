import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { rolesRoutes, userRoleRoutes } from './roles'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const rolesApp = new Elysia().use(rolesRoutes)
const userRoleApp = new Elysia().use(userRoleRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function makeRolesRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return rolesApp.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

async function makeUserRoleRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return userRoleApp.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

const mockUserWithManageRoles = {
  id: 'user-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [{ role: { id: 'role-admin', name: 'Admin' } }],
}

const mockUserWithoutPermissions = {
  id: 'user-1',
  email: 'basic@example.com',
  first_name: 'Basic',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockRole = {
  id: 'role-1',
  name: 'Manager',
  code: 'manager',
  description: 'Manager role',
  permissions: { settings: { view: true, edit: true }, reports: { view: true } },
  is_system_role: false,
  created_at: new Date(),
  _count: { user_roles: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/roles ────────────────────────────────────────────────────────────

describe('GET /api/roles', () => {
  it('returns 401 without auth token', async () => {
    const res = await makeRolesRequest('GET', '/api/roles')
    expect(res.status).toBe(401)
  })

  it('returns list of roles for authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.role.findMany).mockResolvedValue([mockRole] as never)

    const token = await signToken()
    const res = await makeRolesRequest('GET', '/api/roles', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.roles).toHaveLength(1)
    expect(body.roles[0].name).toBe('Manager')
  })
})

// ─── GET /api/roles/:id ────────────────────────────────────────────────────────

describe('GET /api/roles/:id', () => {
  it('returns role by id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)

    const token = await signToken()
    const res = await makeRolesRequest('GET', '/api/roles/role-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role.id).toBe('role-1')
  })

  it('returns 404 when role does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await makeRolesRequest('GET', '/api/roles/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Role not found')
  })
})

// ─── POST /api/roles ───────────────────────────────────────────────────────────

describe('POST /api/roles', () => {
  it('returns 401 without auth token', async () => {
    const res = await makeRolesRequest('POST', '/api/roles', { name: 'NewRole' })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks settings.edit permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await makeRolesRequest('POST', '/api/roles', { name: 'NewRole' }, token)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('creates a role when user has settings.edit permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.role.create).mockResolvedValue(mockRole as never)

    const token = await signToken()
    const res = await makeRolesRequest(
      'POST',
      '/api/roles',
      { name: 'Manager', description: 'Manager role', permissions: { settings: { view: true, edit: true } } },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.role.name).toBe('Manager')
  })

  it('returns 400 when name is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)

    const token = await signToken()
    const res = await makeRolesRequest('POST', '/api/roles', {}, token)

    expect(res.status).toBe(422)
  })

  it('returns 409 when role name already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)

    const token = await signToken()
    const res = await makeRolesRequest('POST', '/api/roles', { name: 'Manager' }, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Role name already exists')
  })
})

// ─── PUT /api/roles/:id ────────────────────────────────────────────────────────

describe('PUT /api/roles/:id', () => {
  it('returns 403 when user lacks settings.edit permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await makeRolesRequest('PUT', '/api/roles/role-1', { name: 'Updated' }, token)

    expect(res.status).toBe(403)
  })

  it('updates role when user has settings.edit permission', async () => {
    const updatedRole = { ...mockRole, name: 'Updated Manager' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)
    vi.mocked(prisma.role.update).mockResolvedValue(updatedRole as never)

    const token = await signToken()
    const res = await makeRolesRequest(
      'PUT',
      '/api/roles/role-1',
      { name: 'Updated Manager' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role.name).toBe('Updated Manager')
  })

  it('returns 404 when role does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await makeRolesRequest('PUT', '/api/roles/ghost', { name: 'Ghost' }, token)

    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/roles/:id ─────────────────────────────────────────────────────

describe('DELETE /api/roles/:id', () => {
  it('returns 403 when user lacks settings.edit permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await makeRolesRequest('DELETE', '/api/roles/role-1', undefined, token)

    expect(res.status).toBe(403)
  })

  it('deletes role when no users are assigned', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)
    vi.mocked(prisma.userRole.count).mockResolvedValue(0)
    vi.mocked(prisma.role.delete).mockResolvedValue(mockRole as never)

    const token = await signToken()
    const res = await makeRolesRequest('DELETE', '/api/roles/role-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when users are assigned to the role', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)
    vi.mocked(prisma.userRole.count).mockResolvedValue(2)

    const token = await signToken()
    const res = await makeRolesRequest('DELETE', '/api/roles/role-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Cannot delete role with assigned users')
  })

  it('returns 404 when role does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await makeRolesRequest('DELETE', '/api/roles/ghost', undefined, token)

    expect(res.status).toBe(404)
  })
})

// ─── GET /api/roles/templates ──────────────────────────────────────────────────

describe('GET /api/roles/templates', () => {
  it('returns role templates for authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)

    const token = await signToken()
    const res = await makeRolesRequest('GET', '/api/roles/templates', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.templates).toBeDefined()
    expect(Array.isArray(body.templates)).toBe(true)
    expect(body.templates.length).toBeGreaterThan(0)
    expect(body.templates[0]).toHaveProperty('name')
    expect(body.templates[0]).toHaveProperty('permissions')
  })
})

// ─── System role protection ────────────────────────────────────────────────────

describe('System role protection', () => {
  const systemRole = {
    ...mockRole,
    is_system_role: true,
    name: 'Admin',
    code: 'admin',
  }

  it('DELETE /api/roles/:id returns 403 for system role', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(systemRole as never)

    const token = await signToken()
    const res = await makeRolesRequest('DELETE', '/api/roles/role-1', undefined, token)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Cannot delete a system role')
  })

  it('PUT /api/roles/:id returns 403 when trying to change system role name', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(systemRole as never)

    const token = await signToken()
    const res = await makeRolesRequest('PUT', '/api/roles/role-1', { name: 'New Name' }, token)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Cannot change name or code of a system role')
  })

  it('PUT /api/roles/:id allows permissions change on system role', async () => {
    const updatedSystemRole = {
      ...systemRole,
      permissions: { customers: { view: true, create: true } },
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(systemRole as never)
    vi.mocked(prisma.role.update).mockResolvedValue(updatedSystemRole as never)

    const token = await signToken()
    const res = await makeRolesRequest(
      'PUT',
      '/api/roles/role-1',
      { name: 'Admin', permissions: { customers: { view: true, create: true } } },
      token
    )

    expect(res.status).toBe(200)
  })
})

// ─── GET /api/roles with user_count ───────────────────────────────────────────

describe('GET /api/roles user_count', () => {
  it('returns user_count in each role', async () => {
    const roleWithCount = { ...mockRole, _count: { user_roles: 3 } }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.role.findMany).mockResolvedValue([roleWithCount] as never)

    const token = await signToken()
    const res = await makeRolesRequest('GET', '/api/roles', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.roles[0].user_count).toBe(3)
  })
})

// ─── POST /api/users/:userId/roles ────────────────────────────────────────────

describe('POST /api/users/:userId/roles', () => {
  it('returns 403 when user lacks settings.edit permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'POST',
      '/api/users/user-2/roles',
      { roleId: 'role-1' },
      token
    )

    expect(res.status).toBe(403)
  })

  it('assigns a role to user successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)
    vi.mocked(prisma.userRole.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.userRole.create).mockResolvedValue({} as never)

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'POST',
      '/api/users/user-2/roles',
      { roleId: 'role-1' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when role is already assigned', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.role.findUnique).mockResolvedValue(mockRole as never)
    vi.mocked(prisma.userRole.findUnique).mockResolvedValue({ user_id: 'user-2', role_id: 'role-1' } as never)

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'POST',
      '/api/users/user-2/roles',
      { roleId: 'role-1' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Role already assigned to user')
  })

  it('returns 404 when target user does not exist', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(mockUserWithManageRoles as never)
      .mockResolvedValueOnce(null)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'POST',
      '/api/users/ghost-user/roles',
      { roleId: 'role-1' },
      token
    )

    expect(res.status).toBe(404)
  })
})

// ─── DELETE /api/users/:userId/roles/:roleId ──────────────────────────────────

describe('DELETE /api/users/:userId/roles/:roleId', () => {
  it('removes a role from user successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.userRole.findUnique).mockResolvedValue({
      user_id: 'user-2',
      role_id: 'role-1',
    } as never)
    vi.mocked(prisma.userRole.delete).mockResolvedValue({} as never)

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'DELETE',
      '/api/users/user-2/roles/role-1',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when user does not have the role', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithManageRoles as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([
      { role: { permissions: { settings: { view: true, edit: true } } } },
    ] as never)
    vi.mocked(prisma.userRole.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'DELETE',
      '/api/users/user-2/roles/role-1',
      undefined,
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('User does not have this role')
  })

  it('returns 403 when user lacks settings.edit permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'DELETE',
      '/api/users/user-2/roles/role-1',
      undefined,
      token
    )

    expect(res.status).toBe(403)
  })
})

// ─── GET /api/users/:userId/permissions ───────────────────────────────────────

describe('GET /api/users/:userId/permissions', () => {
  it('returns 401 without auth token', async () => {
    const res = await makeUserRoleRequest('GET', '/api/users/user-1/permissions')
    expect(res.status).toBe(401)
  })

  it('returns aggregated permissions for user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUserWithoutPermissions as never)
    vi.mocked(prisma.userRole.findMany)
      .mockResolvedValueOnce([]) // auth plugin call
      .mockResolvedValueOnce([
        { role: { permissions: { reports: { view: true }, projects: { view: true } } } },
        { role: { permissions: { invoices: { view: true } } } },
      ] as never)

    const token = await signToken()
    const res = await makeUserRoleRequest('GET', '/api/users/user-1/permissions', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.permissions).toBeDefined()
  })

  it('returns 404 when user does not exist', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(mockUserWithoutPermissions as never)
      .mockResolvedValueOnce(null)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await makeUserRoleRequest(
      'GET',
      '/api/users/ghost-user/permissions',
      undefined,
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('User not found')
  })
})
