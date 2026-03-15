import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    taskComment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { tasksRoutes } from './tasks'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(tasksRoutes)

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

const mockTask = {
  id: 'task-1',
  title: 'Fix login bug',
  description: null,
  project_id: null,
  assigned_to: null,
  created_by: 'user-1',
  priority: 'MEDIUM',
  status: 'TODO',
  due_date: null,
  parent_task_id: null,
  estimated_hours: null,
  actual_hours: null,
  tags: [],
  is_recurring: false,
  recurrence_pattern: null,
  created_at: new Date(),
  updated_at: new Date(),
}

const mockTaskWithRelations = {
  ...mockTask,
  project: null,
  assignee: null,
  creator: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
  comments: [],
  parent_task: null,
  subtasks: [],
}

const mockComment = {
  id: 'comment-1',
  task_id: 'task-1',
  user_id: 'user-1',
  content: 'Looking into this now',
  created_at: new Date(),
  user: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/tasks ────────────────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/tasks')
    expect(res.status).toBe(401)
  })

  it('returns paginated task list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(1)
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask] as never)

    const token = await signToken()
    const res = await request('GET', '/api/tasks', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(0)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/tasks?status=IN_PROGRESS', undefined, token)

    expect(vi.mocked(prisma.task.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'IN_PROGRESS' }),
      })
    )
  })

  it('filters by priority', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(0)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/tasks?priority=HIGH', undefined, token)

    expect(vi.mocked(prisma.task.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ priority: 'HIGH' }),
      })
    )
  })

  it('filters by assignedTo', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(0)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/tasks?assignedTo=user-2', undefined, token)

    expect(vi.mocked(prisma.task.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assigned_to: 'user-2' }),
      })
    )
  })

  it('filters by projectId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(0)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/tasks?projectId=proj-1', undefined, token)

    expect(vi.mocked(prisma.task.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'proj-1' }),
      })
    )
  })

  it('filters by search term', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(0)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/tasks?search=login', undefined, token)

    expect(vi.mocked(prisma.task.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ title: { contains: 'login', mode: 'insensitive' } }),
      })
    )
  })

  it('ignores invalid status filter', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.count).mockResolvedValue(0)
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/tasks?status=INVALID', undefined, token)

    expect(vi.mocked(prisma.task.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })
})

// ─── GET /api/tasks/:id ────────────────────────────────────────────────────────

describe('GET /api/tasks/:id', () => {
  it('returns task with relations', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTaskWithRelations as never)

    const token = await signToken()
    const res = await request('GET', '/api/tasks/task-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
    expect(body.task.creator).toBeDefined()
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/tasks/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/tasks/task-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/tasks ──────────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  const validPayload = { title: 'New task' }

  it('creates a task with default status TODO and priority MEDIUM', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask as never)

    const token = await signToken()
    const res = await request('POST', '/api/tasks', validPayload, token)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.task.id).toBe('task-1')
    expect(vi.mocked(prisma.task.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'New task',
          status: 'TODO',
          priority: 'MEDIUM',
          created_by: 'user-1',
        }),
      })
    )
  })

  it('creates a task with explicit status and priority', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.create).mockResolvedValue({
      ...mockTask,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    } as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/tasks',
      { title: 'Urgent task', status: 'IN_PROGRESS', priority: 'HIGH' },
      token
    )

    expect(res.status).toBe(201)
    expect(vi.mocked(prisma.task.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'IN_PROGRESS', priority: 'HIGH' }),
      })
    )
  })

  it('returns 422 when title is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/tasks', {}, token)
    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/tasks', validPayload)
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/tasks/:id ────────────────────────────────────────────────────────

describe('PUT /api/tasks/:id', () => {
  it('updates task status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.task.update).mockResolvedValue({ ...mockTask, status: 'DONE' } as never)

    const token = await signToken()
    const res = await request('PUT', '/api/tasks/task-1', { status: 'DONE' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.task.status).toBe('DONE')
    expect(vi.mocked(prisma.task.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DONE' }),
      })
    )
  })

  it('updates task assignee', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.task.update).mockResolvedValue({
      ...mockTask,
      assigned_to: 'user-2',
    } as never)

    const token = await signToken()
    await request('PUT', '/api/tasks/task-1', { assignedTo: 'user-2' }, token)

    expect(vi.mocked(prisma.task.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigned_to: 'user-2' }),
      })
    )
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/tasks/nonexistent', { status: 'DONE' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/tasks/task-1', { status: 'DONE' })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────

describe('DELETE /api/tasks/:id', () => {
  it('deletes task successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.task.delete).mockResolvedValue(mockTask as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/tasks/task-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/tasks/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/tasks/task-1')
    expect(res.status).toBe(401)
  })
})

// ─── GET /api/tasks/:id/comments ─────────────────────────────────────────────

describe('GET /api/tasks/:id/comments', () => {
  it('returns comments for a task', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.taskComment.findMany).mockResolvedValue([mockComment] as never)

    const token = await signToken()
    const res = await request('GET', '/api/tasks/task-1/comments', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].content).toBe('Looking into this now')
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/tasks/nonexistent/comments', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/tasks/task-1/comments')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/tasks/:id/comments ────────────────────────────────────────────

describe('POST /api/tasks/:id/comments', () => {
  it('adds a comment to a task', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)
    vi.mocked(prisma.taskComment.create).mockResolvedValue(mockComment as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/tasks/task-1/comments',
      { content: 'Looking into this now' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.comment.content).toBe('Looking into this now')
    expect(vi.mocked(prisma.taskComment.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          task_id: 'task-1',
          user_id: 'user-1',
          content: 'Looking into this now',
        }),
      })
    )
  })

  it('returns 404 when task does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/tasks/nonexistent/comments',
      { content: 'A comment' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Task not found')
  })

  it('returns 422 when content is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask as never)

    const token = await signToken()
    const res = await request('POST', '/api/tasks/task-1/comments', {}, token)
    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/tasks/task-1/comments', { content: 'hi' })
    expect(res.status).toBe(401)
  })
})
