import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { contactsRoutes } from './contacts'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(contactsRoutes)

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

const mockContact = {
  id: 'contact-1',
  customer_id: 'cust-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0812345678',
  position: 'Manager',
  is_primary: false,
  created_at: new Date(),
}

const mockCustomer = {
  id: 'cust-1',
  name: 'Acme Corp',
  email: 'acme@example.com',
  phone: null,
  address: null,
  tax_id: null,
  type: 'CORPORATE',
  status: 'ACTIVE',
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/contacts ────────────────────────────────────────────────────────

describe('GET /api/contacts', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/contacts')
    expect(res.status).toBe(401)
  })

  it('returns paginated contact list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.count).mockResolvedValue(1)
    vi.mocked(prisma.contact.findMany).mockResolvedValue([mockContact] as never)

    const token = await signToken()
    const res = await request('GET', '/api/contacts', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by customerId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.count).mockResolvedValue(1)
    vi.mocked(prisma.contact.findMany).mockResolvedValue([mockContact] as never)

    const token = await signToken()
    const res = await request('GET', '/api/contacts?customerId=cust-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.contact.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1' }),
      })
    )
  })

  it('filters by search query', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.count).mockResolvedValue(0)
    vi.mocked(prisma.contact.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/contacts?search=john', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.contact.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    )
  })
})

// ─── GET /api/contacts/:id ────────────────────────────────────────────────────

describe('GET /api/contacts/:id', () => {
  it('returns contact with customer relation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue({
      ...mockContact,
      customer: mockCustomer,
    } as never)

    const token = await signToken()
    const res = await request('GET', '/api/contacts/contact-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contact.id).toBe('contact-1')
    expect(body.contact.customer).toBeDefined()
  })

  it('returns 404 when contact does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/contacts/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contact not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/contacts/contact-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/contacts ───────────────────────────────────────────────────────

describe('POST /api/contacts', () => {
  it('creates a contact successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)
    vi.mocked(prisma.contact.create).mockResolvedValue(mockContact as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contacts',
      { customerId: 'cust-1', firstName: 'John', lastName: 'Doe' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.contact.first_name).toBe('John')
  })

  it('returns 404 when customer does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contacts',
      { customerId: 'nonexistent', firstName: 'John', lastName: 'Doe' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Customer not found')
  })

  it('unsets other primary contacts when isPrimary is true', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.customer.findUnique).mockResolvedValue(mockCustomer as never)
    vi.mocked(prisma.contact.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.contact.create).mockResolvedValue({
      ...mockContact,
      is_primary: true,
    } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contacts',
      { customerId: 'cust-1', firstName: 'John', lastName: 'Doe', isPrimary: true },
      token
    )

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.contact.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1', is_primary: true }),
        data: { is_primary: false },
      })
    )
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/contacts', {
      customerId: 'cust-1',
      firstName: 'John',
      lastName: 'Doe',
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/contacts', { customerId: 'cust-1' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/contacts/:id ────────────────────────────────────────────────────

describe('PUT /api/contacts/:id', () => {
  it('updates a contact successfully', async () => {
    const updated = { ...mockContact, first_name: 'Jane' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as never)
    vi.mocked(prisma.contact.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/contacts/contact-1', { firstName: 'Jane' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contact.first_name).toBe('Jane')
  })

  it('unsets other primary contacts when isPrimary set to true', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as never)
    vi.mocked(prisma.contact.updateMany).mockResolvedValue({ count: 1 } as never)
    vi.mocked(prisma.contact.update).mockResolvedValue({
      ...mockContact,
      is_primary: true,
    } as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/contacts/contact-1',
      { isPrimary: true },
      token
    )

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.contact.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customer_id: 'cust-1',
          is_primary: true,
          id: { not: 'contact-1' },
        }),
        data: { is_primary: false },
      })
    )
  })

  it('returns 404 when contact does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/contacts/nonexistent', { firstName: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contact not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/contacts/contact-1', { firstName: 'X' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/contacts/:id ─────────────────────────────────────────────────

describe('DELETE /api/contacts/:id', () => {
  it('deletes a contact successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(mockContact as never)
    vi.mocked(prisma.contact.delete).mockResolvedValue(mockContact as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/contacts/contact-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when contact does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contact.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/contacts/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contact not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/contacts/contact-1')
    expect(res.status).toBe(401)
  })
})
