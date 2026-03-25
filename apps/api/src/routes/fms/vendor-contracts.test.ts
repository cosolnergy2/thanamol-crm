import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    vendor: { findUnique: vi.fn() },
    vendorContract: {
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
import { fmsVendorContractsRoutes } from './vendor-contracts'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsVendorContractsRoutes)

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

const mockVendor = { id: 'vendor-1', name: 'ABC Co.', vendor_code: 'VND-202503-0001' }

const mockContract = {
  id: 'contract-1',
  contract_number: 'VC-202503-0001',
  vendor_id: 'vendor-1',
  title: 'Maintenance Contract',
  scope: 'Monthly maintenance',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31'),
  value: 120000,
  payment_terms: 'Net 30',
  status: 'DRAFT',
  document_url: null,
  project_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  vendor: mockVendor,
  project: null,
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

describe('GET /api/fms/vendor-contracts', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/vendor-contracts')
    expect(res.status).toBe(401)
  })

  it('returns paginated contract list', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorContract.findMany).mockResolvedValue([mockContract] as never)
    vi.mocked(prisma.vendorContract.count).mockResolvedValue(1)

    const res = await req('GET', '/api/fms/vendor-contracts', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
  })

  it('filters by vendorId', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorContract.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.vendorContract.count).mockResolvedValue(0)

    await req('GET', '/api/fms/vendor-contracts?vendorId=vendor-1', undefined, token)

    const calls = vi.mocked(prisma.vendorContract.findMany).mock.calls
    const firstCallArg = calls[0]?.[0]
    expect(firstCallArg?.where).toMatchObject({ vendor_id: 'vendor-1' })
  })
})

describe('POST /api/fms/vendor-contracts', () => {
  it('creates a contract', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(mockVendor as never)
    vi.mocked(prisma.vendorContract.count).mockResolvedValue(0)
    vi.mocked(prisma.vendorContract.create).mockResolvedValue(mockContract as never)

    const res = await req(
      'POST',
      '/api/fms/vendor-contracts',
      {
        vendorId: 'vendor-1',
        title: 'Maintenance Contract',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        value: 120000,
      },
      token
    )
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.contract).toBeDefined()
    expect(json.contract.title).toBe('Maintenance Contract')
  })

  it('returns 404 when vendor not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue(null)

    const res = await req(
      'POST',
      '/api/fms/vendor-contracts',
      {
        vendorId: 'nonexistent',
        title: 'Test',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
      token
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/vendor-contracts/:id/activate', () => {
  it('activates a draft contract', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorContract.findUnique).mockResolvedValue(mockContract as never)
    const activated = { ...mockContract, status: 'ACTIVE' }
    vi.mocked(prisma.vendorContract.update).mockResolvedValue(activated as never)

    const res = await req('POST', '/api/fms/vendor-contracts/contract-1/activate', {}, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.contract.status).toBe('ACTIVE')
  })
})

describe('POST /api/fms/vendor-contracts/:id/terminate', () => {
  it('terminates an active contract', async () => {
    const token = await signToken()
    const activeContract = { ...mockContract, status: 'ACTIVE' }
    vi.mocked(prisma.vendorContract.findUnique).mockResolvedValue(activeContract as never)
    const terminated = { ...mockContract, status: 'TERMINATED' }
    vi.mocked(prisma.vendorContract.update).mockResolvedValue(terminated as never)

    const res = await req('POST', '/api/fms/vendor-contracts/contract-1/terminate', {}, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.contract.status).toBe('TERMINATED')
  })
})

describe('DELETE /api/fms/vendor-contracts/:id', () => {
  it('deletes contract', async () => {
    const token = await signToken()
    vi.mocked(prisma.vendorContract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.vendorContract.delete).mockResolvedValue(mockContract as never)

    const res = await req('DELETE', '/api/fms/vendor-contracts/contract-1', undefined, token)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
