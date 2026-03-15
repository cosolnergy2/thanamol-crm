import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    customer: {
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
import { customersRoutes } from './customers'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(customersRoutes)

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

const mockCustomer = {
  id: 'cust-1',
  name: 'Acme Corp',
  email: 'acme@example.com',
  phone: '0812345678',
  address: '123 Main St',
  tax_id: '1234567890',
  type: 'COMPANY',
  status: 'ACTIVE',
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
}

const mockCustomerWithCount = {
  ...mockCustomer,
  _count: { contacts: 2 },
}

const mockCustomerWithContacts = {
  ...mockCustomer,
  contacts: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/customers ───────────────────────────────────────────────────────

describe('GET /api/customers', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/customers')
    expect(res.status).toBe(401)
  })

  it('returns paginated customer list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.count).mockResolvedValue(1)
    vi.mocked(prisma.customer.findMany).mockResolvedValue([mockCustomerWithCount] as never)

    const token = await signToken()
    const res = await request('GET', '/api/customers', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
    expect(body.pagination.totalPages).toBe(1)
  })

  it('filters by search query', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.count).mockResolvedValue(0)
    vi.mocked(prisma.customer.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/customers?search=acme', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    )
  })

  it('filters by type and status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.count).mockResolvedValue(1)
    vi.mocked(prisma.customer.findMany).mockResolvedValue([mockCustomerWithCount] as never)

    const token = await signToken()
    const res = await request(
      'GET',
      '/api/customers?type=INDIVIDUAL&status=ACTIVE',
      undefined,
      token
    )

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.customer.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'INDIVIDUAL', status: 'ACTIVE' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.count).mockResolvedValue(50)
    vi.mocked(prisma.customer.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/customers?page=2&limit=10', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(5)
  })
})

// ─── GET /api/customers/:id ───────────────────────────────────────────────────

describe('GET /api/customers/:id', () => {
  it('returns customer with contacts', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomerWithContacts as never)

    const token = await signToken()
    const res = await request('GET', '/api/customers/cust-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.customer.id).toBe('cust-1')
    expect(body.customer.contacts).toBeDefined()
  })

  it('returns 404 when customer does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/customers/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Customer not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/customers/cust-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/customers ──────────────────────────────────────────────────────

describe('POST /api/customers', () => {
  it('creates a customer successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.create).mockResolvedValue(mockCustomer as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/customers',
      { name: 'Acme Corp', email: 'acme@example.com', type: 'COMPANY' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.customer.name).toBe('Acme Corp')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/customers', { name: 'Test' })
    expect(res.status).toBe(401)
  })

  it('returns 422 when name is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/customers', { email: 'test@example.com' }, token)

    expect(res.status).toBe(422)
  })

  it('defaults type to INDIVIDUAL and status to ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.create).mockResolvedValue({
      ...mockCustomer,
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
    } as never)

    const token = await signToken()
    const res = await request('POST', '/api/customers', { name: 'New Customer' }, token)

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.customer.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'INDIVIDUAL', status: 'ACTIVE' }),
      })
    )
  })
})

// ─── PUT /api/customers/:id ───────────────────────────────────────────────────

describe('PUT /api/customers/:id', () => {
  it('updates a customer successfully', async () => {
    const updated = { ...mockCustomer, name: 'Updated Corp' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)
    vi.mocked(prisma.customer.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/customers/cust-1', { name: 'Updated Corp' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.customer.name).toBe('Updated Corp')
  })

  it('returns 404 when customer does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/customers/nonexistent', { name: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Customer not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/customers/cust-1', { name: 'X' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/customers/:id ────────────────────────────────────────────────

describe('DELETE /api/customers/:id', () => {
  it('deletes a customer successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)
    vi.mocked(prisma.customer.delete).mockResolvedValue(mockCustomer as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/customers/cust-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when customer does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/customers/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Customer not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/customers/cust-1')
    expect(res.status).toBe(401)
  })
})
