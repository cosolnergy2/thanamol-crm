import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    saleJob04F01: {
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
import { saleJobsRoutes } from './sale-jobs'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(saleJobsRoutes)

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

const mockSaleJob = {
  id: 'sj-1',
  form_number: 'SJ04F01-202601-0001',
  project_id: 'proj-1',
  customer_id: 'cust-1',
  unit_id: null,
  form_data: {},
  status: 'DRAFT',
  created_by: 'user-1',
  approved_by: null,
  created_at: new Date(),
  updated_at: new Date(),
  project: { id: 'proj-1', name: 'Project A', code: 'PA' },
  customer: { id: 'cust-1', name: 'Acme Corp', email: null, phone: null },
  unit: null,
  creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
  approver: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/sale-jobs', () => {
  it('returns 401 without token', async () => {
    const res = await request('GET', '/api/sale-jobs')
    expect(res.status).toBe(401)
  })

  it('returns paginated list', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.count).mockResolvedValue(1)
    vi.mocked(prisma.saleJob04F01.findMany).mockResolvedValue([mockSaleJob] as never)

    const res = await request('GET', '/api/sale-jobs', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.count).mockResolvedValue(1)
    vi.mocked(prisma.saleJob04F01.findMany).mockResolvedValue([mockSaleJob] as never)

    const res = await request('GET', '/api/sale-jobs?status=DRAFT', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.saleJob04F01.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('filters by projectId and customerId', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.count).mockResolvedValue(1)
    vi.mocked(prisma.saleJob04F01.findMany).mockResolvedValue([mockSaleJob] as never)

    const res = await request(
      'GET',
      '/api/sale-jobs?projectId=proj-1&customerId=cust-1',
      undefined,
      token
    )
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.saleJob04F01.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'proj-1', customer_id: 'cust-1' }),
      })
    )
  })
})

describe('GET /api/sale-jobs/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(null)

    const res = await request('GET', '/api/sale-jobs/sj-999', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns sale job', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(mockSaleJob as never)

    const res = await request('GET', '/api/sale-jobs/sj-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.saleJob.id).toBe('sj-1')
  })
})

describe('POST /api/sale-jobs', () => {
  it('creates a sale job with auto-generated form number', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.count).mockResolvedValue(0)
    vi.mocked(prisma.saleJob04F01.create).mockResolvedValue(mockSaleJob as never)

    const res = await request(
      'POST',
      '/api/sale-jobs',
      { projectId: 'proj-1', customerId: 'cust-1' },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.saleJob.id).toBe('sj-1')
  })

  it('uses provided form number', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.create).mockResolvedValue(mockSaleJob as never)

    await request(
      'POST',
      '/api/sale-jobs',
      { formNumber: 'SJ04F01-CUSTOM-0001', projectId: 'proj-1', customerId: 'cust-1' },
      token
    )
    expect(vi.mocked(prisma.saleJob04F01.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ form_number: 'SJ04F01-CUSTOM-0001' }),
      })
    )
  })

  it('returns 422 when projectId is missing', async () => {
    const token = await signToken()
    const res = await request('POST', '/api/sale-jobs', { customerId: 'cust-1' }, token)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/sale-jobs/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(null)

    const res = await request('PUT', '/api/sale-jobs/sj-999', { status: 'SUBMITTED' }, token)
    expect(res.status).toBe(404)
  })

  it('updates a sale job', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(mockSaleJob as never)
    vi.mocked(prisma.saleJob04F01.update).mockResolvedValue({
      ...mockSaleJob,
      status: 'SUBMITTED',
    } as never)

    const res = await request('PUT', '/api/sale-jobs/sj-1', { status: 'SUBMITTED' }, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.saleJob.status).toBe('SUBMITTED')
  })
})

describe('DELETE /api/sale-jobs/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(null)

    const res = await request('DELETE', '/api/sale-jobs/sj-999', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns 409 when status is not DRAFT', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue({
      ...mockSaleJob,
      status: 'SUBMITTED',
    } as never)

    const res = await request('DELETE', '/api/sale-jobs/sj-1', undefined, token)
    expect(res.status).toBe(409)
  })

  it('deletes a DRAFT sale job', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(mockSaleJob as never)
    vi.mocked(prisma.saleJob04F01.delete).mockResolvedValue(mockSaleJob as never)

    const res = await request('DELETE', '/api/sale-jobs/sj-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('POST /api/sale-jobs/:id/approve', () => {
  it('returns 409 when status is not SUBMITTED', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(mockSaleJob as never)

    const res = await request('POST', '/api/sale-jobs/sj-1/approve', undefined, token)
    expect(res.status).toBe(409)
  })

  it('approves a SUBMITTED sale job', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue({
      ...mockSaleJob,
      status: 'SUBMITTED',
    } as never)
    vi.mocked(prisma.saleJob04F01.update).mockResolvedValue({
      ...mockSaleJob,
      status: 'APPROVED',
      approved_by: 'user-1',
    } as never)

    const res = await request('POST', '/api/sale-jobs/sj-1/approve', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.saleJob.status).toBe('APPROVED')
  })
})

describe('POST /api/sale-jobs/:id/reject', () => {
  it('returns 409 when status is not SUBMITTED', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue(mockSaleJob as never)

    const res = await request('POST', '/api/sale-jobs/sj-1/reject', undefined, token)
    expect(res.status).toBe(409)
  })

  it('rejects a SUBMITTED sale job', async () => {
    const token = await signToken()
    vi.mocked(prisma.saleJob04F01.findUnique).mockResolvedValue({
      ...mockSaleJob,
      status: 'SUBMITTED',
    } as never)
    vi.mocked(prisma.saleJob04F01.update).mockResolvedValue({
      ...mockSaleJob,
      status: 'REJECTED',
    } as never)

    const res = await request('POST', '/api/sale-jobs/sj-1/reject', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.saleJob.status).toBe('REJECTED')
  })
})
