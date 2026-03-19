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
import { contractsRoutes } from './contracts'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(contractsRoutes)

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
  customer_id: 'cust-1',
  project_id: 'proj-1',
  unit_id: null,
  quotation_id: null,
  type: 'SALE',
  start_date: new Date('2026-01-01'),
  end_date: null,
  value: 5000000,
  monthly_rent: null,
  deposit_amount: null,
  terms: null,
  status: 'DRAFT',
  approved_by: null,
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
}

const mockPendingContract = { ...mockContract, status: 'PENDING_APPROVAL' }
const mockApprovedContract = { ...mockContract, status: 'APPROVED' }
const mockActiveContract = {
  ...mockContract,
  status: 'ACTIVE',
  end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
}

const mockUserRoleWithManageContracts = [
  {
    role: {
      permissions: { contracts: { view: true, create: true, edit: true, approve: true } },
    },
  },
]

const mockUserRoleWithoutPermission = [
  {
    role: {
      permissions: {},
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/contracts ───────────────────────────────────────────────────────

describe('GET /api/contracts', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/contracts')
    expect(res.status).toBe(401)
  })

  it('returns paginated contract list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(1)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([mockContract] as never)

    const token = await signToken()
    const res = await request('GET', '/api/contracts', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/contracts?status=DRAFT', undefined, token)

    expect(vi.mocked(prisma.contract.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('filters by type', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/contracts?type=SALE', undefined, token)

    expect(vi.mocked(prisma.contract.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'SALE' }),
      })
    )
  })

  it('filters by customerId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/contracts?customerId=cust-1', undefined, token)

    expect(vi.mocked(prisma.contract.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: 'cust-1' }),
      })
    )
  })

  it('filters by projectId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/contracts?projectId=proj-1', undefined, token)

    expect(vi.mocked(prisma.contract.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'proj-1' }),
      })
    )
  })
})

// ─── GET /api/contracts/pending ───────────────────────────────────────────────

describe('GET /api/contracts/pending', () => {
  it('returns contracts with PENDING_APPROVAL status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([mockPendingContract] as never)

    const token = await signToken()
    const res = await request('GET', '/api/contracts/pending', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(vi.mocked(prisma.contract.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING_APPROVAL' },
      })
    )
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/contracts/pending')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/contracts/expiring ──────────────────────────────────────────────

describe('GET /api/contracts/expiring', () => {
  it('returns contracts expiring within default 30 days', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([mockActiveContract] as never)

    const token = await signToken()
    const res = await request('GET', '/api/contracts/expiring', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(vi.mocked(prisma.contract.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          end_date: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      })
    )
  })

  it('accepts custom days parameter', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/contracts/expiring?days=7', undefined, token)

    expect(res.status).toBe(200)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/contracts/expiring')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/contracts/:id ───────────────────────────────────────────────────

describe('GET /api/contracts/:id', () => {
  it('returns contract with relations', async () => {
    const contractWithRelations = {
      ...mockContract,
      customer: { id: 'cust-1', name: 'Acme', email: null, phone: null },
      project: { id: 'proj-1', name: 'Project A', code: 'PA' },
      unit: null,
      quotation: null,
      creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
      approver: null,
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(contractWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/contracts/ct-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contract.id).toBe('ct-1')
    expect(body.contract.customer).toBeDefined()
    expect(body.contract.creator).toBeDefined()
  })

  it('returns 404 when contract does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/contracts/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contract not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/contracts/ct-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/contracts ──────────────────────────────────────────────────────

describe('POST /api/contracts', () => {
  it('creates a contract and auto-generates contract number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.create).mockResolvedValue(mockContract as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contracts',
      { customerId: 'cust-1', projectId: 'proj-1', type: 'SALE', startDate: '2026-01-01' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.contract.id).toBe('ct-1')
  })

  it('contract number follows CT-YYYYMM-XXXX format', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.create).mockResolvedValue(mockContract as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/contracts',
      { customerId: 'cust-1', projectId: 'proj-1', type: 'SALE', startDate: '2026-01-01' },
      token
    )

    expect(vi.mocked(prisma.contract.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contract_number: expect.stringMatching(/^CT-\d{6}-\d{4}$/),
        }),
      })
    )
  })

  it('uses provided contract number when given', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.create).mockResolvedValue({
      ...mockContract,
      contract_number: 'CT-CUSTOM-001',
    } as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/contracts',
      {
        customerId: 'cust-1',
        projectId: 'proj-1',
        type: 'SALE',
        startDate: '2026-01-01',
        contractNumber: 'CT-CUSTOM-001',
      },
      token
    )

    expect(vi.mocked(prisma.contract.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contract_number: 'CT-CUSTOM-001' }),
      })
    )
  })

  it('defaults status to DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)
    vi.mocked(prisma.contract.create).mockResolvedValue(mockContract as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/contracts',
      { customerId: 'cust-1', projectId: 'proj-1', type: 'SALE', startDate: '2026-01-01' },
      token
    )

    expect(vi.mocked(prisma.contract.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      })
    )
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/contracts', {
      customerId: 'cust-1',
      projectId: 'proj-1',
      type: 'SALE',
      startDate: '2026-01-01',
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/contracts', { projectId: 'proj-1' }, token)
    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/contracts/:id ───────────────────────────────────────────────────

describe('PUT /api/contracts/:id', () => {
  it('updates a contract successfully', async () => {
    const updated = { ...mockContract, terms: 'Updated terms' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.contract.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/contracts/ct-1', { terms: 'Updated terms' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contract.terms).toBe('Updated terms')
  })

  it('returns 404 when contract does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/contracts/nonexistent', { terms: 'x' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contract not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/contracts/ct-1', { terms: 'x' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/contracts/:id ────────────────────────────────────────────────

describe('DELETE /api/contracts/:id', () => {
  it('deletes a DRAFT contract successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)
    vi.mocked(prisma.contract.delete).mockResolvedValue(mockContract as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/contracts/ct-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when contract is not DRAFT', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockPendingContract as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/contracts/ct-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only DRAFT contracts can be deleted')
  })

  it('returns 404 when contract does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/contracts/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Contract not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/contracts/ct-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/contracts/:id/approve ─────────────────────────────────────────

describe('POST /api/contracts/:id/approve', () => {
  it('transitions PENDING_APPROVAL to APPROVED', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockPendingContract as never)
    vi.mocked(prisma.contract.update).mockResolvedValue({
      ...mockPendingContract,
      status: 'APPROVED',
      approved_by: 'user-1',
    } as never)

    const token = await signToken()
    const res = await request('POST', '/api/contracts/ct-1/approve', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contract.status).toBe('APPROVED')
    expect(vi.mocked(prisma.contract.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'APPROVED', approved_by: 'user-1' }),
      })
    )
  })

  it('transitions APPROVED to ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockApprovedContract as never)
    vi.mocked(prisma.contract.update).mockResolvedValue({
      ...mockApprovedContract,
      status: 'ACTIVE',
      approved_by: 'user-1',
    } as never)

    const token = await signToken()
    const res = await request('POST', '/api/contracts/ct-1/approve', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contract.status).toBe('ACTIVE')
  })

  it('returns 409 when contract status is DRAFT (not approvable)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)

    const token = await signToken()
    const res = await request('POST', '/api/contracts/ct-1/approve', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Contract cannot be approved in its current status')
  })

  it('returns 403 when user lacks contracts.approve permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithoutPermission as never)

    const token = await signToken()
    const res = await request('POST', '/api/contracts/ct-1/approve', undefined, token)

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 404 when contract does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('POST', '/api/contracts/nonexistent/approve', undefined, token)

    expect(res.status).toBe(404)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/contracts/ct-1/approve')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/contracts/:id/reject ──────────────────────────────────────────

describe('POST /api/contracts/:id/reject', () => {
  it('rejects a pending contract with a reason', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockPendingContract as never)
    vi.mocked(prisma.contract.update).mockResolvedValue({
      ...mockPendingContract,
      status: 'CANCELLED',
      terms: 'Price is too high',
    } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contracts/ct-1/reject',
      { reason: 'Price is too high' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.contract.status).toBe('CANCELLED')
  })

  it('stores rejection reason in terms field', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockPendingContract as never)
    vi.mocked(prisma.contract.update).mockResolvedValue({
      ...mockPendingContract,
      status: 'CANCELLED',
    } as never)

    const token = await signToken()
    await request('POST', '/api/contracts/ct-1/reject', { reason: 'Not viable' }, token)

    expect(vi.mocked(prisma.contract.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED', terms: 'Not viable' }),
      })
    )
  })

  it('returns 422 when reason is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)

    const token = await signToken()
    const res = await request('POST', '/api/contracts/ct-1/reject', {}, token)

    expect(res.status).toBe(422)
  })

  it('returns 403 when user lacks contracts.approve permission', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithoutPermission as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contracts/ct-1/reject',
      { reason: 'Rejected' },
      token
    )

    expect(res.status).toBe(403)
  })

  it('returns 409 when contract status is DRAFT (not rejectable)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.userRole.findMany).mockResolvedValue(mockUserRoleWithManageContracts as never)
    vi.mocked(prisma.contract.findUnique).mockResolvedValue(mockContract as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/contracts/ct-1/reject',
      { reason: 'Reason' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Contract cannot be rejected in its current status')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/contracts/ct-1/reject', { reason: 'x' })
    expect(res.status).toBe(401)
  })
})
