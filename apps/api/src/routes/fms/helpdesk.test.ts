import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    ticket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    workOrder: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsHelpdeskRoutes } from './helpdesk'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsHelpdeskRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
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

const mockTicket = {
  id: 'ticket-1',
  title: 'AC unit not working',
  description: 'Floor 3 AC is broken',
  project_id: 'proj-1',
  site: 'Building A',
  requester_id: null,
  category: 'HVAC',
  priority: 'HIGH',
  status: 'OPEN',
  assigned_to: null,
  resolved_at: null,
  work_order_id: null,
  resolution_notes: null,
  resolution_date: null,
  customer_id: null,
  unit_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Test Project', code: 'TEST' },
  requester: null,
  assignee: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
})

describe('GET /api/fms/helpdesk', () => {
  it('returns 401 when no auth token', async () => {
    const res = await req('GET', '/api/fms/helpdesk')
    expect(res.status).toBe(401)
  })

  it('returns ticket list with pagination', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.count).mockResolvedValue(1)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([mockTicket] as never)

    const res = await req('GET', '/api/fms/helpdesk', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by projectId', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.count).mockResolvedValue(0)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])

    await req('GET', '/api/fms/helpdesk?projectId=proj-99', undefined, token)
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'proj-99' }),
      }),
    )
  })

  it('filters by status', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.count).mockResolvedValue(0)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])

    await req('GET', '/api/fms/helpdesk?status=OPEN', undefined, token)
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'OPEN' }),
      }),
    )
  })
})

describe('GET /api/fms/helpdesk/:id', () => {
  it('returns ticket by id', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(mockTicket as never)

    const res = await req('GET', '/api/fms/helpdesk/ticket-1', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ticket.id).toBe('ticket-1')
  })

  it('returns 404 when ticket not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null)

    const res = await req('GET', '/api/fms/helpdesk/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/helpdesk', () => {
  it('creates a ticket with required fields', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.create).mockResolvedValue(mockTicket as never)

    const res = await req(
      'POST',
      '/api/fms/helpdesk',
      { title: 'AC unit not working', site: 'Building A', priority: 'HIGH' },
      token,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.ticket).toBeDefined()
  })

  it('returns 422 when title is missing', async () => {
    const token = await signToken()
    const res = await req('POST', '/api/fms/helpdesk', { priority: 'HIGH' }, token)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/fms/helpdesk/:id', () => {
  it('updates a ticket', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(mockTicket as never)
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      ...mockTicket,
      title: 'Updated title',
    } as never)

    const res = await req('PUT', '/api/fms/helpdesk/ticket-1', { title: 'Updated title' }, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ticket.title).toBe('Updated title')
  })

  it('returns 404 when ticket not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null)

    const res = await req('PUT', '/api/fms/helpdesk/nonexistent', { title: 'x' }, token)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/fms/helpdesk/:id/status', () => {
  it('updates ticket status', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(mockTicket as never)
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      ...mockTicket,
      status: 'IN_PROGRESS',
    } as never)

    const res = await req(
      'PATCH',
      '/api/fms/helpdesk/ticket-1/status',
      { status: 'IN_PROGRESS' },
      token,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ticket.status).toBe('IN_PROGRESS')
  })

  it('sets resolved_at when resolving', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(mockTicket as never)
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      ...mockTicket,
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
    } as never)

    await req('PATCH', '/api/fms/helpdesk/ticket-1/status', { status: 'RESOLVED' }, token)
    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ resolved_at: expect.any(Date) }),
      }),
    )
  })

  it('returns 404 when ticket not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null)

    const res = await req(
      'PATCH',
      '/api/fms/helpdesk/nonexistent/status',
      { status: 'RESOLVED' },
      token,
    )
    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/helpdesk/:id/create-work-order', () => {
  it('creates a work order from a ticket', async () => {
    const token = await signToken()
    const mockWO = {
      id: 'wo-1',
      wo_number: 'WO-202601-0001',
      title: 'AC unit not working',
      project_id: 'proj-1',
    }
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(mockTicket as never)
    vi.mocked(prisma.workOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.workOrder.create).mockResolvedValue(mockWO as never)
    vi.mocked(prisma.ticket.update).mockResolvedValue({
      ...mockTicket,
      work_order_id: 'wo-1',
      status: 'IN_PROGRESS',
    } as never)

    const res = await req(
      'POST',
      '/api/fms/helpdesk/ticket-1/create-work-order',
      { projectId: 'proj-1', createdBy: 'user-1' },
      token,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.workOrder.id).toBe('wo-1')
    expect(body.ticket.work_order_id).toBe('wo-1')
  })

  it('returns 409 if work order already exists', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue({
      ...mockTicket,
      work_order_id: 'wo-existing',
    } as never)

    const res = await req(
      'POST',
      '/api/fms/helpdesk/ticket-1/create-work-order',
      { projectId: 'proj-1', createdBy: 'user-1' },
      token,
    )
    expect(res.status).toBe(409)
  })

  it('returns 404 when ticket not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.ticket.findUnique).mockResolvedValue(null)

    const res = await req(
      'POST',
      '/api/fms/helpdesk/nonexistent/create-work-order',
      { projectId: 'proj-1', createdBy: 'user-1' },
      token,
    )
    expect(res.status).toBe(404)
  })
})
