import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    company: {
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
import { companiesRoutes } from './companies'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(companiesRoutes)

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

const mockCompany = {
  id: 'company-1',
  name: 'Tech Ventures Ltd',
  tax_id: '9876543210',
  address: '456 Business Ave',
  phone: '021234567',
  email: 'info@techventures.com',
  website: 'https://techventures.com',
  industry: 'Technology',
  status: 'ACTIVE',
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/companies ───────────────────────────────────────────────────────

describe('GET /api/companies', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/companies')
    expect(res.status).toBe(401)
  })

  it('returns paginated company list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.count).mockResolvedValue(1)
    vi.mocked(prisma.company.findMany).mockResolvedValue([mockCompany] as never)

    const token = await signToken()
    const res = await request('GET', '/api/companies', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
    expect(body.pagination.totalPages).toBe(1)
  })

  it('filters by search query on name and tax_id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.count).mockResolvedValue(0)
    vi.mocked(prisma.company.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/companies?search=tech', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.company.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    )
  })

  it('filters by industry', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.count).mockResolvedValue(1)
    vi.mocked(prisma.company.findMany).mockResolvedValue([mockCompany] as never)

    const token = await signToken()
    const res = await request('GET', '/api/companies?industry=Technology', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.company.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          industry: { contains: 'Technology', mode: 'insensitive' },
        }),
      })
    )
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.count).mockResolvedValue(1)
    vi.mocked(prisma.company.findMany).mockResolvedValue([mockCompany] as never)

    const token = await signToken()
    const res = await request('GET', '/api/companies?status=ACTIVE', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.company.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.count).mockResolvedValue(30)
    vi.mocked(prisma.company.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/companies?page=2&limit=5', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(5)
    expect(body.pagination.totalPages).toBe(6)
  })
})

// ─── GET /api/companies/:id ───────────────────────────────────────────────────

describe('GET /api/companies/:id', () => {
  it('returns company by id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as never)

    const token = await signToken()
    const res = await request('GET', '/api/companies/company-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.company.id).toBe('company-1')
    expect(body.company.name).toBe('Tech Ventures Ltd')
  })

  it('returns 404 when company does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/companies/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Company not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/companies/company-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/companies ──────────────────────────────────────────────────────

describe('POST /api/companies', () => {
  it('creates a company successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.create).mockResolvedValue(mockCompany as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/companies',
      { name: 'Tech Ventures Ltd', industry: 'Technology' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.company.name).toBe('Tech Ventures Ltd')
  })

  it('defaults status to ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.create).mockResolvedValue(mockCompany as never)

    const token = await signToken()
    const res = await request('POST', '/api/companies', { name: 'New Company' }, token)

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.company.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/companies', { name: 'Test' })
    expect(res.status).toBe(401)
  })

  it('returns 422 when name is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/companies', { industry: 'Tech' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/companies/:id ───────────────────────────────────────────────────

describe('PUT /api/companies/:id', () => {
  it('updates a company successfully', async () => {
    const updated = { ...mockCompany, name: 'Updated Ventures' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as never)
    vi.mocked(prisma.company.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/companies/company-1',
      { name: 'Updated Ventures' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.company.name).toBe('Updated Ventures')
  })

  it('returns 404 when company does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/companies/nonexistent', { name: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Company not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/companies/company-1', { name: 'X' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/companies/:id ────────────────────────────────────────────────

describe('DELETE /api/companies/:id', () => {
  it('deletes a company successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as never)
    vi.mocked(prisma.company.delete).mockResolvedValue(mockCompany as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/companies/company-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when company does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/companies/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Company not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/companies/company-1')
    expect(res.status).toBe(401)
  })
})
