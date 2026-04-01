import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    approvalWorkflow: { findUnique: vi.fn() },
    approvalRequest: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsApprovalRequestsRoutes } from './approval-requests'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const mockAuthUser = {
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
  created_at: new Date(),
  updated_at: new Date(),
  roles: [],
}

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsApprovalRequestsRoutes)

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

const mockWorkflow = {
  id: 'wf-1',
  entity_type: 'PR',
  name: 'Standard PR Approval',
  steps: [
    { step: 1, role: 'manager' },
    { step: 2, role: 'director' },
  ],
  is_active: true,
}

const mockRequest = {
  id: 'req-1',
  entity_type: 'PR',
  entity_id: 'pr-123',
  workflow_id: 'wf-1',
  workflow: { id: 'wf-1', name: 'Standard PR Approval', entity_type: 'PR', steps: mockWorkflow.steps },
  current_step: 0,
  status: 'PENDING',
  history: [],
  requested_by: 'user-1',
  requester: { id: 'user-1', first_name: 'John', last_name: 'Doe' },
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/fms/approval-requests/pending', () => {
  it('returns paginated pending requests', async () => {
    vi.mocked(prisma.approvalRequest.count).mockResolvedValue(1)
    vi.mocked(prisma.approvalRequest.findMany).mockResolvedValue([mockRequest] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/approval-requests/pending', undefined, token)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('returns 401 without token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await req('GET', '/api/fms/approval-requests/pending')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/fms/approval-requests', () => {

  it('creates an approval request', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(mockWorkflow as never)
    vi.mocked(prisma.approvalRequest.create).mockResolvedValue(mockRequest as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests',
      {
        entityType: 'PR',
        entityId: 'pr-123',
        workflowId: 'wf-1',
        requestedBy: 'user-1',
      },
      token
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.request.entity_id).toBe('pr-123')
  })

  it('returns 404 when workflow not found', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests',
      {
        entityType: 'PR',
        entityId: 'pr-123',
        workflowId: 'missing-wf',
        requestedBy: 'user-1',
      },
      token
    )

    expect(res.status).toBe(404)
  })

  it('returns 400 when workflow is inactive', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue({
      ...mockWorkflow,
      is_active: false,
    } as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests',
      {
        entityType: 'PR',
        entityId: 'pr-123',
        workflowId: 'wf-1',
        requestedBy: 'user-1',
      },
      token
    )

    expect(res.status).toBe(400)
  })
})

describe('GET /api/fms/approval-requests/:id', () => {
  it('returns a request by id', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(mockRequest as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/approval-requests/req-1', undefined, token)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.request.id).toBe('req-1')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/approval-requests/missing', undefined, token)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/approval-requests/:id/approve', () => {
  it('approves a step (intermediate step stays PENDING)', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue({
      ...mockRequest,
      workflow: mockWorkflow,
    } as never)
    vi.mocked(prisma.approvalRequest.update).mockResolvedValue({
      ...mockRequest,
      current_step: 1,
      status: 'PENDING',
      history: [{ step: 0, action: 'APPROVED', user: 'user-1', date: new Date().toISOString() }],
      workflow: mockWorkflow,
    } as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests/req-1/approve',
      { userId: 'user-1' },
      token
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.request.current_step).toBe(1)
    expect(body.request.status).toBe('PENDING')
  })

  it('marks APPROVED on last step', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue({
      ...mockRequest,
      current_step: 1,
      workflow: mockWorkflow,
    } as never)
    vi.mocked(prisma.approvalRequest.update).mockResolvedValue({
      ...mockRequest,
      current_step: 2,
      status: 'APPROVED',
      workflow: mockWorkflow,
    } as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests/req-1/approve',
      { userId: 'user-1' },
      token
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.request.status).toBe('APPROVED')
  })

  it('returns 400 when request is already resolved', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue({
      ...mockRequest,
      status: 'APPROVED',
      workflow: mockWorkflow,
    } as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests/req-1/approve',
      { userId: 'user-1' },
      token
    )

    expect(res.status).toBe(400)
  })
})

describe('POST /api/fms/approval-requests/:id/reject', () => {
  it('rejects a pending request', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(mockRequest as never)
    vi.mocked(prisma.approvalRequest.update).mockResolvedValue({
      ...mockRequest,
      status: 'REJECTED',
      workflow: mockWorkflow,
    } as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests/req-1/reject',
      { userId: 'user-1', reason: 'Budget exceeded' },
      token
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.request.status).toBe('REJECTED')
  })

  it('returns 400 when request is already resolved', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue({
      ...mockRequest,
      status: 'REJECTED',
    } as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests/req-1/reject',
      { userId: 'user-1', reason: 'Duplicate' },
      token
    )

    expect(res.status).toBe(400)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(prisma.approvalRequest.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-requests/missing/reject',
      { userId: 'user-1', reason: 'Not found test' },
      token
    )

    expect(res.status).toBe(404)
  })
})
