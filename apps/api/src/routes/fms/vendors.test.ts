import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    vendor: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsVendorsRoutes } from './vendors'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsVendorsRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(method: string, path: string, body?: unknown, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  )
}

const mockVendor = {
  id: 'vendor-1',
  vendor_code: 'VND-202503-0001',
  name: 'ABC Maintenance Co.',
  tax_id: '1234567890123',
  address: '123 Main St',
  phone: '02-123-4567',
  email: 'abc@maintenance.com',
  website: null,
  contact_person: 'John Doe',
  category: 'MAINTENANCE',
  rating: 4,
  status: 'ACTIVE',
  bank_details: {},
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  password_hash: '',
  first_name: 'Test',
  last_name: 'User',
  phone: null,
  department: null,
  position: null,
  avatar_url: null,
  is_active: true,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  roles: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
})

describe('GET /api/fms/vendors', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/vendors')
    expect(res.status).toBe(401)
  })

  it('returns paginated vendor list', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([mockVendor] as never)
    vi.mocked(prisma.vendor.count).mockResolvedValue(1)

    const res = await req('GET', '/api/fms/vendors', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
    expect(json.data[0].vendor_code).toBe('VND-202503-0001')
  })

  it('filters by status', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.vendor.count).mockResolvedValue(0)

    const res = await req('GET', '/api/fms/vendors?status=BLACKLISTED', undefined, token)
    expect(res.status).toBe(200)

    const calls = vi.mocked(prisma.vendor.findMany).mock.calls
    expect(calls[0][0].where).toMatchObject({ status: 'BLACKLISTED' })
  })

  it('searches by name', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.vendor.count).mockResolvedValue(0)

    const res = await req('GET', '/api/fms/vendors?search=abc', undefined, token)
    expect(res.status).toBe(200)

    const calls = vi.mocked(prisma.vendor.findMany).mock.calls
    expect(calls[0][0].where).toHaveProperty('OR')
  })
})

describe('GET /api/fms/vendors/:id', () => {
  it('returns 404 when vendor not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null)

    const res = await req('GET', '/api/fms/vendors/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns vendor with relations', async () => {
    const token = await signToken()
    const vendorWithRelations = {
      ...mockVendor,
      contracts: [],
      item_prices: [],
      invoices: [],
    }
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(vendorWithRelations as never)

    const res = await req('GET', '/api/fms/vendors/vendor-1', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.vendor.id).toBe('vendor-1')
    expect(json.vendor.contracts).toEqual([])
  })
})

describe('POST /api/fms/vendors', () => {
  it('creates a vendor with auto-generated code', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.count).mockResolvedValue(0)
    vi.mocked(prisma.vendor.create).mockResolvedValue(mockVendor as never)

    const res = await req(
      'POST',
      '/api/fms/vendors',
      {
        name: 'ABC Maintenance Co.',
        category: 'MAINTENANCE',
        phone: '02-123-4567',
      },
      token
    )
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.vendor).toBeDefined()
  })

  it('returns 422 when name is missing', async () => {
    const token = await signToken()
    const res = await req('POST', '/api/fms/vendors', { category: 'MAINTENANCE' }, token)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/fms/vendors/:id', () => {
  it('updates vendor', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(mockVendor as never)
    const updated = { ...mockVendor, status: 'INACTIVE' }
    vi.mocked(prisma.vendor.update).mockResolvedValue(updated as never)

    const res = await req('PUT', '/api/fms/vendors/vendor-1', { status: 'INACTIVE' }, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.vendor.status).toBe('INACTIVE')
  })

  it('returns 404 when vendor not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null)

    const res = await req('PUT', '/api/fms/vendors/nonexistent', { name: 'Test' }, token)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/fms/vendors/:id', () => {
  it('deletes vendor', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(mockVendor as never)
    vi.mocked(prisma.vendor.delete).mockResolvedValue(mockVendor as never)

    const res = await req('DELETE', '/api/fms/vendors/vendor-1', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 404 when vendor not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/vendors/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })
})
