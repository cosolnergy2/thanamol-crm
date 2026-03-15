import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    warehouseRequirement: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { warehouseRequirementsRoutes } from './warehouse-requirements'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(warehouseRequirementsRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function request(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

const mockAuthUser = {
  id: 'user-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockWarehouseRequirement = {
  id: 'wh-1',
  customer_id: 'cust-1',
  project_id: 'proj-1',
  requirements: { area: 500 },
  specifications: { ceiling_height: 6 },
  status: 'DRAFT',
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  customer: { id: 'cust-1', name: 'Acme Corp', email: null, phone: null },
  project: { id: 'proj-1', name: 'Project A', code: 'PA' },
  creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/warehouse-requirements', () => {
  it('returns 401 without token', async () => {
    const res = await request('GET', '/api/warehouse-requirements')
    expect(res.status).toBe(401)
  })

  it('returns paginated list', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.count).mockResolvedValue(1)
    vi.mocked(prisma.warehouseRequirement.findMany).mockResolvedValue([mockWarehouseRequirement] as never)

    const res = await request('GET', '/api/warehouse-requirements', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.count).mockResolvedValue(1)
    vi.mocked(prisma.warehouseRequirement.findMany).mockResolvedValue([mockWarehouseRequirement] as never)

    const res = await request('GET', '/api/warehouse-requirements?status=DRAFT', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.warehouseRequirement.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('filters by customerId and projectId', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.count).mockResolvedValue(1)
    vi.mocked(prisma.warehouseRequirement.findMany).mockResolvedValue([mockWarehouseRequirement] as never)

    const res = await request(
      'GET',
      '/api/warehouse-requirements?customerId=cust-1&projectId=proj-1',
      undefined,
      token
    )
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.warehouseRequirement.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1', project_id: 'proj-1' }),
      })
    )
  })
})

describe('GET /api/warehouse-requirements/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue(null)

    const res = await request('GET', '/api/warehouse-requirements/wh-999', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns warehouse requirement', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue(mockWarehouseRequirement as never)

    const res = await request('GET', '/api/warehouse-requirements/wh-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.warehouseRequirement.id).toBe('wh-1')
  })
})

describe('POST /api/warehouse-requirements', () => {
  it('creates a warehouse requirement', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.create).mockResolvedValue(mockWarehouseRequirement as never)

    const res = await request(
      'POST',
      '/api/warehouse-requirements',
      { customerId: 'cust-1', projectId: 'proj-1' },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.warehouseRequirement.id).toBe('wh-1')
  })

  it('returns 422 when customerId is missing', async () => {
    const token = await signToken()
    const res = await request('POST', '/api/warehouse-requirements', { projectId: 'proj-1' }, token)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/warehouse-requirements/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue(null)

    const res = await request(
      'PUT',
      '/api/warehouse-requirements/wh-999',
      { status: 'SUBMITTED' },
      token
    )
    expect(res.status).toBe(404)
  })

  it('updates a warehouse requirement', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue(mockWarehouseRequirement as never)
    vi.mocked(prisma.warehouseRequirement.update).mockResolvedValue({
      ...mockWarehouseRequirement,
      status: 'SUBMITTED',
    } as never)

    const res = await request(
      'PUT',
      '/api/warehouse-requirements/wh-1',
      { status: 'SUBMITTED' },
      token
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.warehouseRequirement.status).toBe('SUBMITTED')
  })
})

describe('DELETE /api/warehouse-requirements/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue(null)

    const res = await request('DELETE', '/api/warehouse-requirements/wh-999', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns 409 when status is not DRAFT', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue({
      ...mockWarehouseRequirement,
      status: 'SUBMITTED',
    } as never)

    const res = await request('DELETE', '/api/warehouse-requirements/wh-1', undefined, token)
    expect(res.status).toBe(409)
  })

  it('deletes a DRAFT warehouse requirement', async () => {
    const token = await signToken()
    vi.mocked(prisma.warehouseRequirement.findUnique).mockResolvedValue(mockWarehouseRequirement as never)
    vi.mocked(prisma.warehouseRequirement.delete).mockResolvedValue(mockWarehouseRequirement as never)

    const res = await request('DELETE', '/api/warehouse-requirements/wh-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
