import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    taskStatus: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    automationRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { taskConfigRoutes } from './task-config'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(taskConfigRoutes)

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

const mockTaskStatus = {
  id: 'ts-1',
  name: 'In Review',
  color: '#FFA500',
  order: 3,
  is_default: false,
  is_closed: false,
  created_at: new Date(),
}

const mockAutomationRule = {
  id: 'rule-1',
  name: 'Auto-assign on creation',
  trigger_event: 'task.created',
  conditions: {},
  actions: [],
  is_active: true,
  created_at: new Date(),
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ─── GET /api/task-statuses ───────────────────────────────────────────────────

describe('GET /api/task-statuses', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/task-statuses')
    expect(res.status).toBe(401)
  })

  it('returns list of task statuses ordered by order field', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findMany).mockResolvedValue([mockTaskStatus] as never)

    const token = await signToken()
    const res = await request('GET', '/api/task-statuses', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('In Review')
    expect(vi.mocked(prisma.taskStatus.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: 'asc' } })
    )
  })
})

// ─── POST /api/task-statuses ──────────────────────────────────────────────────

describe('POST /api/task-statuses', () => {
  const validPayload = { name: 'In Review', color: '#FFA500', order: 3 }

  it('creates a task status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.taskStatus.create).mockResolvedValue(mockTaskStatus as never)

    const token = await signToken()
    const res = await request('POST', '/api/task-statuses', validPayload, token)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.status.name).toBe('In Review')
    expect(vi.mocked(prisma.taskStatus.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'In Review',
          color: '#FFA500',
          order: 3,
          is_default: false,
          is_closed: false,
        }),
      })
    )
  })

  it('returns 409 when status name already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique).mockResolvedValue(mockTaskStatus as never)

    const token = await signToken()
    const res = await request('POST', '/api/task-statuses', validPayload, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Task status with this name already exists')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/task-statuses', {}, token)
    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/task-statuses', validPayload)
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/task-statuses/:id ───────────────────────────────────────────────

describe('PUT /api/task-statuses/:id', () => {
  it('updates a task status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique).mockResolvedValue(mockTaskStatus as never)
    vi.mocked(prisma.taskStatus.update).mockResolvedValue({
      ...mockTaskStatus,
      color: '#FF0000',
    } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/task-statuses/ts-1', { color: '#FF0000' }, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.taskStatus.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ts-1' },
        data: expect.objectContaining({ color: '#FF0000' }),
      })
    )
  })

  it('returns 409 on name conflict with another status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique)
      .mockResolvedValueOnce(mockTaskStatus as never)
      .mockResolvedValueOnce({ ...mockTaskStatus, id: 'ts-2', name: 'Blocked' } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/task-statuses/ts-1', { name: 'Blocked' }, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Task status with this name already exists')
  })

  it('returns 404 when task status does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/task-statuses/nonexistent', { color: '#000' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task status not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/task-statuses/ts-1', { color: '#000' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/task-statuses/:id ────────────────────────────────────────────

describe('DELETE /api/task-statuses/:id', () => {
  it('deletes task status successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique).mockResolvedValue(mockTaskStatus as never)
    vi.mocked(prisma.taskStatus.delete).mockResolvedValue(mockTaskStatus as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/task-statuses/ts-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when task status does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.taskStatus.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/task-statuses/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task status not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/task-statuses/ts-1')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/automation-rules ────────────────────────────────────────────────

describe('GET /api/automation-rules', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/automation-rules')
    expect(res.status).toBe(401)
  })

  it('returns list of automation rules', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.automationRule.findMany).mockResolvedValue([mockAutomationRule] as never)

    const token = await signToken()
    const res = await request('GET', '/api/automation-rules', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('Auto-assign on creation')
  })
})

// ─── POST /api/automation-rules ───────────────────────────────────────────────

describe('POST /api/automation-rules', () => {
  const validPayload = {
    name: 'Auto-assign on creation',
    triggerEvent: 'task.created',
    conditions: {},
    actions: [],
  }

  it('creates an automation rule with is_active defaulting to true', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.automationRule.create).mockResolvedValue(mockAutomationRule as never)

    const token = await signToken()
    const res = await request('POST', '/api/automation-rules', validPayload, token)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.rule.name).toBe('Auto-assign on creation')
    expect(vi.mocked(prisma.automationRule.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Auto-assign on creation',
          trigger_event: 'task.created',
          is_active: true,
        }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/automation-rules', {}, token)
    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/automation-rules', validPayload)
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/automation-rules/:id ────────────────────────────────────────────

describe('PUT /api/automation-rules/:id', () => {
  it('updates an automation rule', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.automationRule.findUnique).mockResolvedValue(mockAutomationRule as never)
    vi.mocked(prisma.automationRule.update).mockResolvedValue({
      ...mockAutomationRule,
      is_active: false,
    } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/automation-rules/rule-1', { isActive: false }, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.automationRule.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rule-1' },
        data: expect.objectContaining({ is_active: false }),
      })
    )
  })

  it('returns 404 when rule does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.automationRule.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/automation-rules/nonexistent', { isActive: false }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Automation rule not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/automation-rules/rule-1', { isActive: false })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/automation-rules/:id ────────────────────────────────────────

describe('DELETE /api/automation-rules/:id', () => {
  it('deletes an automation rule successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.automationRule.findUnique).mockResolvedValue(mockAutomationRule as never)
    vi.mocked(prisma.automationRule.delete).mockResolvedValue(mockAutomationRule as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/automation-rules/rule-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when rule does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.automationRule.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/automation-rules/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Automation rule not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/automation-rules/rule-1')
    expect(res.status).toBe(401)
  })
})
