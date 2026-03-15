import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { commentsRoutes } from './comments'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(commentsRoutes)

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

const mockComment = {
  id: 'comment-1',
  entity_type: 'Task',
  entity_id: 'task-1',
  user_id: 'user-1',
  content: 'This is a comment',
  created_at: new Date(),
  updated_at: new Date(),
  user: { id: 'user-1', first_name: 'Admin', last_name: 'User', email: 'admin@example.com' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/comments', () => {
  it('returns 401 without token', async () => {
    const res = await request('GET', '/api/comments?entityType=Task&entityId=task-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when entityType or entityId is missing', async () => {
    const token = await signToken()
    const res = await request('GET', '/api/comments', undefined, token)
    expect(res.status).toBe(400)
  })

  it('returns comments for entity', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findMany).mockResolvedValue([mockComment] as never)

    const res = await request('GET', '/api/comments?entityType=Task&entityId=task-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.data[0].content).toBe('This is a comment')
  })
})

describe('POST /api/comments', () => {
  it('returns 401 without token', async () => {
    const res = await request('POST', '/api/comments', {
      entityType: 'Task',
      entityId: 'task-1',
      content: 'Hello',
    })
    expect(res.status).toBe(401)
  })

  it('creates a comment', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as never)

    const res = await request(
      'POST',
      '/api/comments',
      { entityType: 'Task', entityId: 'task-1', content: 'This is a comment' },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.comment.content).toBe('This is a comment')
  })

  it('returns 422 when content is missing', async () => {
    const token = await signToken()
    const res = await request(
      'POST',
      '/api/comments',
      { entityType: 'Task', entityId: 'task-1' },
      token
    )
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/comments/:id', () => {
  it('returns 404 when comment not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

    const res = await request('PUT', '/api/comments/comment-999', { content: 'Updated' }, token)
    expect(res.status).toBe(404)
  })

  it('returns 403 when comment belongs to another user', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      ...mockComment,
      user_id: 'other-user',
    } as never)

    const res = await request('PUT', '/api/comments/comment-1', { content: 'Updated' }, token)
    expect(res.status).toBe(403)
  })

  it('updates own comment', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockComment as never)
    vi.mocked(prisma.comment.update).mockResolvedValue({
      ...mockComment,
      content: 'Updated content',
    } as never)

    const res = await request('PUT', '/api/comments/comment-1', { content: 'Updated content' }, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.comment.content).toBe('Updated content')
  })
})

describe('DELETE /api/comments/:id', () => {
  it('returns 404 when comment not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(null)

    const res = await request('DELETE', '/api/comments/comment-999', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns 403 when comment belongs to another user', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findUnique).mockResolvedValue({
      ...mockComment,
      user_id: 'other-user',
    } as never)

    const res = await request('DELETE', '/api/comments/comment-1', undefined, token)
    expect(res.status).toBe(403)
  })

  it('deletes own comment', async () => {
    const token = await signToken()
    vi.mocked(prisma.comment.findUnique).mockResolvedValue(mockComment as never)
    vi.mocked(prisma.comment.delete).mockResolvedValue(mockComment as never)

    const res = await request('DELETE', '/api/comments/comment-1', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
