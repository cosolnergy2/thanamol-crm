import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    handover: {
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
import { handoversRoutes } from './handovers'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(handoversRoutes)

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

const mockHandover = {
  id: 'handover-1',
  contract_id: 'contract-1',
  handover_date: new Date('2026-03-15'),
  handover_type: 'INITIAL',
  checklist: [],
  notes: null,
  status: 'PENDING',
  received_by: null,
  handed_by: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/handovers ───────────────────────────────────────────────────────

describe('GET /api/handovers', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/handovers')
    expect(res.status).toBe(401)
  })

  it('returns paginated handover list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.count).mockResolvedValue(1)
    vi.mocked(prisma.handover.findMany).mockResolvedValue([mockHandover] as never)

    const token = await signToken()
    const res = await request('GET', '/api/handovers', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
    expect(body.pagination.totalPages).toBe(1)
  })

  it('filters by contractId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.count).mockResolvedValue(1)
    vi.mocked(prisma.handover.findMany).mockResolvedValue([mockHandover] as never)

    const token = await signToken()
    const res = await request('GET', '/api/handovers?contractId=contract-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.handover.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ contract_id: 'contract-1' }),
      })
    )
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.count).mockResolvedValue(1)
    vi.mocked(prisma.handover.findMany).mockResolvedValue([mockHandover] as never)

    const token = await signToken()
    const res = await request('GET', '/api/handovers?status=PENDING', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.handover.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      })
    )
  })

  it('filters by handoverType', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.count).mockResolvedValue(1)
    vi.mocked(prisma.handover.findMany).mockResolvedValue([mockHandover] as never)

    const token = await signToken()
    const res = await request('GET', '/api/handovers?handoverType=INITIAL', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.handover.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ handover_type: 'INITIAL' }),
      })
    )
  })

  it('respects page and limit params', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.count).mockResolvedValue(50)
    vi.mocked(prisma.handover.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await request('GET', '/api/handovers?page=2&limit=10', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pagination.page).toBe(2)
    expect(body.pagination.limit).toBe(10)
    expect(body.pagination.totalPages).toBe(5)
  })
})

// ─── GET /api/handovers/:id ───────────────────────────────────────────────────

describe('GET /api/handovers/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/handovers/handover-1')
    expect(res.status).toBe(401)
  })

  it('returns handover with relations', async () => {
    const handoverWithRelations = {
      ...mockHandover,
      contract: { id: 'contract-1', contract_number: 'CTR-001', type: 'SALE', status: 'ACTIVE' },
      photos: [],
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(handoverWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/handovers/handover-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.handover.id).toBe('handover-1')
    expect(body.handover.contract).toBeDefined()
    expect(body.handover.photos).toBeDefined()
  })

  it('returns 404 when handover does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/handovers/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Handover not found')
  })
})

// ─── POST /api/handovers ──────────────────────────────────────────────────────

describe('POST /api/handovers', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/handovers', {
      contractId: 'contract-1',
      handoverDate: '2026-03-15',
      handoverType: 'INITIAL',
    })
    expect(res.status).toBe(401)
  })

  it('creates a handover successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.create).mockResolvedValue(mockHandover as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/handovers',
      { contractId: 'contract-1', handoverDate: '2026-03-15', handoverType: 'INITIAL' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.handover.id).toBe('handover-1')
  })

  it('defaults status to PENDING', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.create).mockResolvedValue(mockHandover as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/handovers',
      { contractId: 'contract-1', handoverDate: '2026-03-15', handoverType: 'INITIAL' },
      token
    )

    expect(vi.mocked(prisma.handover.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PENDING' }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/handovers', { contractId: 'contract-1' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/handovers/:id ───────────────────────────────────────────────────

describe('PUT /api/handovers/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/handovers/handover-1', { notes: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('updates a handover successfully', async () => {
    const updated = { ...mockHandover, notes: 'Updated notes' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(mockHandover as never)
    vi.mocked(prisma.handover.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/handovers/handover-1', { notes: 'Updated notes' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.handover.notes).toBe('Updated notes')
  })

  it('returns 404 when handover does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/handovers/nonexistent', { notes: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Handover not found')
  })
})

// ─── DELETE /api/handovers/:id ────────────────────────────────────────────────

describe('DELETE /api/handovers/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/handovers/handover-1')
    expect(res.status).toBe(401)
  })

  it('deletes a PENDING handover successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(mockHandover as never)
    vi.mocked(prisma.handover.delete).mockResolvedValue(mockHandover as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/handovers/handover-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when handover is not PENDING', async () => {
    const completedHandover = { ...mockHandover, status: 'COMPLETED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(completedHandover as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/handovers/handover-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Only PENDING handovers can be deleted')
  })

  it('returns 404 when handover does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handover.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/handovers/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Handover not found')
  })
})
