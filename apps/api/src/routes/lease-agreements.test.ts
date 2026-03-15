import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    contract: {
      findUnique: vi.fn(),
    },
    leaseAgreement: {
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
import { leaseAgreementsRoutes } from './lease-agreements'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(leaseAgreementsRoutes)

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

const mockContract = {
  id: 'ct-1',
  contract_number: 'CT-202603-0001',
  type: 'LEASE',
  status: 'ACTIVE',
  customer_id: 'cust-1',
  project_id: 'proj-1',
}

const mockLeaseAgreement = {
  id: 'la-1',
  contract_id: 'ct-1',
  lease_terms: { duration: 12 },
  special_conditions: null,
  status: 'DRAFT',
  created_at: new Date(),
  updated_at: new Date(),
}

const mockLeaseAgreementWithContract = {
  ...mockLeaseAgreement,
  contract: {
    id: 'ct-1',
    contract_number: 'CT-202603-0001',
    type: 'LEASE',
    status: 'ACTIVE',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/lease-agreements ────────────────────────────────────────────────

describe('GET /api/lease-agreements', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/lease-agreements')
    expect(res.status).toBe(401)
  })

  it('returns paginated lease agreement list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.count).mockResolvedValue(1)
    vi.mocked(prisma.leaseAgreement.findMany).mockResolvedValue(
      [mockLeaseAgreementWithContract] as never
    )

    const token = await signToken()
    const res = await request('GET', '/api/lease-agreements', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by contractId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.count).mockResolvedValue(0)
    vi.mocked(prisma.leaseAgreement.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/lease-agreements?contractId=ct-1', undefined, token)

    expect(vi.mocked(prisma.leaseAgreement.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contract_id: 'ct-1' }),
      })
    )
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.count).mockResolvedValue(0)
    vi.mocked(prisma.leaseAgreement.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/lease-agreements?status=ACTIVE', undefined, token)

    expect(vi.mocked(prisma.leaseAgreement.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      })
    )
  })
})

// ─── GET /api/lease-agreements/:id ───────────────────────────────────────────

describe('GET /api/lease-agreements/:id', () => {
  it('returns lease agreement with contract relation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.findUnique).mockResolvedValue(
      mockLeaseAgreementWithContract as never
    )

    const token = await signToken()
    const res = await request('GET', '/api/lease-agreements/la-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaseAgreement.id).toBe('la-1')
    expect(body.leaseAgreement.contract).toBeDefined()
    expect(body.leaseAgreement.contract.contract_number).toBe('CT-202603-0001')
  })

  it('returns 404 when lease agreement does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/lease-agreements/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Lease agreement not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/lease-agreements/la-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/lease-agreements ───────────────────────────────────────────────

describe('POST /api/lease-agreements', () => {
  it('creates a lease agreement linked to a contract', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.leaseAgreement.create).mockResolvedValue(mockLeaseAgreement as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/lease-agreements',
      { contractId: 'ct-1', leaseTerms: { duration: 12 } },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.leaseAgreement.id).toBe('la-1')
    expect(body.leaseAgreement.contract_id).toBe('ct-1')
  })

  it('returns 404 when contract does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/lease-agreements',
      { contractId: 'nonexistent' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contract not found')
  })

  it('defaults status to DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.leaseAgreement.create).mockResolvedValue(mockLeaseAgreement as never)

    const token = await signToken()
    await request('POST', '/api/lease-agreements', { contractId: 'ct-1' }, token)

    expect(vi.mocked(prisma.leaseAgreement.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('returns 422 when contractId is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/lease-agreements', {}, token)
    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/lease-agreements', { contractId: 'ct-1' })
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/lease-agreements/:id ───────────────────────────────────────────

describe('PUT /api/lease-agreements/:id', () => {
  it('updates a lease agreement successfully', async () => {
    const updated = { ...mockLeaseAgreement, special_conditions: 'No pets' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.findUnique).mockResolvedValue(mockLeaseAgreement as never)
    vi.mocked(prisma.leaseAgreement.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/lease-agreements/la-1',
      { specialConditions: 'No pets' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.leaseAgreement.special_conditions).toBe('No pets')
  })

  it('returns 404 when lease agreement does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'PUT',
      '/api/lease-agreements/nonexistent',
      { specialConditions: 'x' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Lease agreement not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/lease-agreements/la-1', { specialConditions: 'x' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/lease-agreements/:id ────────────────────────────────────────

describe('DELETE /api/lease-agreements/:id', () => {
  it('deletes a lease agreement successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.findUnique).mockResolvedValue(mockLeaseAgreement as never)
    vi.mocked(prisma.leaseAgreement.delete).mockResolvedValue(mockLeaseAgreement as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/lease-agreements/la-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when lease agreement does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.leaseAgreement.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/lease-agreements/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Lease agreement not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/lease-agreements/la-1')
    expect(res.status).toBe(401)
  })
})
