import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    approvalWorkflow: {
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
import { fmsApprovalWorkflowsRoutes } from './approval-workflows'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

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
  created_at: new Date(),
  updated_at: new Date(),
  roles: [],
}

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsApprovalWorkflowsRoutes)

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
  steps: [{ step: 1, role: 'manager', threshold: 50000 }],
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
})

describe('GET /api/fms/approval-workflows', () => {
  it('returns paginated workflow list', async () => {
    vi.mocked(prisma.approvalWorkflow.count).mockResolvedValue(1)
    vi.mocked(prisma.approvalWorkflow.findMany).mockResolvedValue([mockWorkflow] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/approval-workflows', undefined, token)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('returns 401 without token', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await req('GET', '/api/fms/approval-workflows')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/fms/approval-workflows/:id', () => {
  it('returns workflow when found', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue({
      ...mockWorkflow,
      _count: { requests: 0 },
    } as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/approval-workflows/wf-1', undefined, token)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.workflow.id).toBe('wf-1')
  })

  it('returns 404 when not found', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/approval-workflows/missing', undefined, token)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/fms/approval-workflows', () => {
  it('creates a new workflow', async () => {
    vi.mocked(prisma.approvalWorkflow.create).mockResolvedValue(mockWorkflow as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/approval-workflows',
      {
        entityType: 'PR',
        name: 'Standard PR Approval',
        steps: [{ step: 1, role: 'manager', threshold: 50000 }],
      },
      token
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.workflow.name).toBe('Standard PR Approval')
  })

  it('returns 422 for missing required fields', async () => {
    const token = await signToken()
    const res = await req('POST', '/api/fms/approval-workflows', { name: '' }, token)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/fms/approval-workflows/:id', () => {
  it('updates an existing workflow', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(mockWorkflow as never)
    vi.mocked(prisma.approvalWorkflow.update).mockResolvedValue({
      ...mockWorkflow,
      name: 'Updated Workflow',
    } as never)

    const token = await signToken()
    const res = await req(
      'PUT',
      '/api/fms/approval-workflows/wf-1',
      { name: 'Updated Workflow' },
      token
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.workflow.name).toBe('Updated Workflow')
  })

  it('returns 404 when workflow not found', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/approval-workflows/missing', { name: 'X' }, token)

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/fms/approval-workflows/:id', () => {
  it('deletes an existing workflow', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(mockWorkflow as never)
    vi.mocked(prisma.approvalWorkflow.delete).mockResolvedValue(mockWorkflow as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/approval-workflows/wf-1', undefined, token)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('returns 404 when not found', async () => {
    vi.mocked(prisma.approvalWorkflow.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/approval-workflows/missing', undefined, token)

    expect(res.status).toBe(404)
  })
})
