import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    workOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsWorkOrdersRoutes } from './work-orders'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsWorkOrdersRoutes)

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
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

const mockUser = {
  id: 'user-1',
  email: 'dev@example.com',
  first_name: 'Dev',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockWO = {
  id: 'wo-1',
  wo_number: 'WO-202501-0001',
  title: 'Fix AC Unit',
  description: null,
  type: 'CORRECTIVE',
  priority: 'HIGH',
  status: 'OPEN',
  asset_id: 'asset-1',
  project_id: 'proj-1',
  zone_id: null,
  unit_id: null,
  assigned_to: null,
  estimated_hours: null,
  actual_hours: null,
  scheduled_date: null,
  started_at: null,
  completed_at: null,
  completion_notes: null,
  parts_used: [],
  cost_estimate: null,
  actual_cost: null,
  created_by: 'user-1',
  created_at: new Date(),
  updated_at: new Date(),
  asset: { id: 'asset-1', asset_number: 'AST-001', name: 'AC Unit' },
  project: { id: 'proj-1', name: 'Test Project', code: 'TEST' },
  zone: null,
  unit: null,
  assignee: null,
  creator: { id: 'user-1', first_name: 'Dev', last_name: 'User' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/work-orders ─────────────────────────────────────────────────

describe('GET /api/fms/work-orders', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/work-orders')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of work orders', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.count).mockResolvedValue(1)
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([mockWO] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/work-orders', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].wo_number).toBe('WO-202501-0001')
    expect(body.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.count).mockResolvedValue(1)
    vi.mocked(prisma.workOrder.findMany).mockResolvedValue([mockWO] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/work-orders?status=OPEN', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].status).toBe('OPEN')
  })
})

// ─── GET /api/fms/work-orders/:id ─────────────────────────────────────────────

describe('GET /api/fms/work-orders/:id', () => {
  it('returns work order with relations', async () => {
    const woWithDetail = { ...mockWO, pm_logs: [] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(woWithDetail as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/work-orders/wo-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workOrder.id).toBe('wo-1')
    expect(body.workOrder.pm_logs).toEqual([])
  })

  it('returns 404 when work order does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/work-orders/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Work order not found')
  })
})

// ─── POST /api/fms/work-orders ───────────────────────────────────────────────

describe('POST /api/fms/work-orders', () => {
  it('creates a work order with auto-generated number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.workOrder.create).mockResolvedValue(mockWO as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/work-orders',
      { title: 'Fix AC Unit', projectId: 'proj-1', createdBy: 'user-1' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.workOrder).toBeDefined()
    expect(prisma.workOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Fix AC Unit',
          project_id: 'proj-1',
          type: 'CORRECTIVE',
          priority: 'MEDIUM',
        }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/work-orders', { title: 'No project or createdBy' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PATCH /api/fms/work-orders/:id/start ────────────────────────────────────

describe('PATCH /api/fms/work-orders/:id/start', () => {
  it('sets status to IN_PROGRESS and sets started_at', async () => {
    const updatedWO = { ...mockWO, status: 'IN_PROGRESS', started_at: new Date() }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(mockWO as never)
    vi.mocked(prisma.workOrder.update).mockResolvedValue(updatedWO as never)

    const token = await signToken()
    const res = await req('PATCH', '/api/fms/work-orders/wo-1/start', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workOrder.status).toBe('IN_PROGRESS')
    expect(prisma.workOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      })
    )
  })

  it('returns 404 when work order does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PATCH', '/api/fms/work-orders/ghost/start', undefined, token)

    expect(res.status).toBe(404)
  })
})

// ─── PATCH /api/fms/work-orders/:id/complete ─────────────────────────────────

describe('PATCH /api/fms/work-orders/:id/complete', () => {
  it('sets status to COMPLETED and records completion data', async () => {
    const completedWO = {
      ...mockWO,
      status: 'COMPLETED',
      completed_at: new Date(),
      completion_notes: 'All done',
      actual_hours: 3,
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(mockWO as never)
    vi.mocked(prisma.workOrder.update).mockResolvedValue(completedWO as never)

    const token = await signToken()
    const res = await req(
      'PATCH',
      '/api/fms/work-orders/wo-1/complete',
      { completionNotes: 'All done', actualHours: 3 },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workOrder.status).toBe('COMPLETED')
    expect(body.workOrder.completion_notes).toBe('All done')
  })
})

// ─── PATCH /api/fms/work-orders/:id/cancel ───────────────────────────────────

describe('PATCH /api/fms/work-orders/:id/cancel', () => {
  it('sets status to CANCELLED', async () => {
    const cancelledWO = { ...mockWO, status: 'CANCELLED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(mockWO as never)
    vi.mocked(prisma.workOrder.update).mockResolvedValue(cancelledWO as never)

    const token = await signToken()
    const res = await req(
      'PATCH',
      '/api/fms/work-orders/wo-1/cancel',
      { reason: 'No longer needed' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.workOrder.status).toBe('CANCELLED')
  })
})

// ─── DELETE /api/fms/work-orders/:id ─────────────────────────────────────────

describe('DELETE /api/fms/work-orders/:id', () => {
  it('deletes a work order successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(mockWO as never)
    vi.mocked(prisma.workOrder.delete).mockResolvedValue(mockWO as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/work-orders/wo-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when work order does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/work-orders/ghost', undefined, token)

    expect(res.status).toBe(404)
  })
})
