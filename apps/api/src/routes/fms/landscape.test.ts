import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    landscapeTask: {
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
import { fmsLandscapeRoutes } from './landscape'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsLandscapeRoutes)

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

const mockTask = {
  id: 'task-1',
  title: 'Mow front lawn',
  description: null,
  project_id: 'proj-1',
  zone_id: null,
  scheduled_date: new Date('2026-04-10'),
  completed_date: null,
  status: 'SCHEDULED',
  assigned_to: 'John',
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/landscape ───────────────────────────────────────────────────

describe('GET /api/fms/landscape', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/landscape')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of landscape tasks', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.count).mockResolvedValue(1)
    vi.mocked(prisma.landscapeTask.findMany).mockResolvedValue([mockTask] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/landscape?projectId=proj-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].title).toBe('Mow front lawn')
    expect(body.pagination.total).toBe(1)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.count).mockResolvedValue(0)
    vi.mocked(prisma.landscapeTask.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await req('GET', '/api/fms/landscape?projectId=proj-1&status=COMPLETED', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

// ─── GET /api/fms/landscape/:id ──────────────────────────────────────────────

describe('GET /api/fms/landscape/:id', () => {
  it('returns task when found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.findUnique).mockResolvedValue(mockTask as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/landscape/task-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
  })

  it('returns 404 when task not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/landscape/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Landscape task not found')
  })
})

// ─── POST /api/fms/landscape ─────────────────────────────────────────────────

describe('POST /api/fms/landscape', () => {
  it('creates a landscape task successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.create).mockResolvedValue(mockTask as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/landscape',
      { title: 'Mow front lawn', projectId: 'proj-1', scheduledDate: '2026-04-10' },
      token,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.title).toBe('Mow front lawn')
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/fms/landscape', {
      title: 'Task',
      projectId: 'proj-1',
      scheduledDate: '2026-04-10',
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/landscape', { projectId: 'proj-1' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/fms/landscape/:id ──────────────────────────────────────────────

describe('PUT /api/fms/landscape/:id', () => {
  it('updates a landscape task successfully', async () => {
    const updated = { ...mockTask, status: 'COMPLETED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.landscapeTask.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/landscape/task-1', { status: 'COMPLETED' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.status).toBe('COMPLETED')
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/landscape/ghost', { status: 'COMPLETED' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Landscape task not found')
  })
})

// ─── DELETE /api/fms/landscape/:id ───────────────────────────────────────────

describe('DELETE /api/fms/landscape/:id', () => {
  it('deletes a landscape task successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.landscapeTask.delete).mockResolvedValue(mockTask as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/landscape/task-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.landscapeTask.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/landscape/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Landscape task not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await req('DELETE', '/api/fms/landscape/task-1')
    expect(res.status).toBe(401)
  })
})
