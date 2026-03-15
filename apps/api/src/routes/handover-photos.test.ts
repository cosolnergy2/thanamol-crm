import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    handoverPhotos: {
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
import { handoverPhotosRoutes } from './handover-photos'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(handoverPhotosRoutes)

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

const mockHandoverPhoto = {
  id: 'photo-1',
  handover_id: 'handover-1',
  photos: [],
  description: 'Entry inspection',
  category: 'ENTRANCE',
  created_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/handover-photos ─────────────────────────────────────────────────

describe('GET /api/handover-photos', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/handover-photos')
    expect(res.status).toBe(401)
  })

  it('returns paginated handover photo list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.count).mockResolvedValue(1)
    vi.mocked(prisma.handoverPhotos.findMany).mockResolvedValue([mockHandoverPhoto] as never)

    const token = await signToken()
    const res = await request('GET', '/api/handover-photos', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by handoverId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.count).mockResolvedValue(1)
    vi.mocked(prisma.handoverPhotos.findMany).mockResolvedValue([mockHandoverPhoto] as never)

    const token = await signToken()
    const res = await request('GET', '/api/handover-photos?handoverId=handover-1', undefined, token)

    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.handoverPhotos.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ handover_id: 'handover-1' }),
      })
    )
  })
})

// ─── GET /api/handover-photos/:id ─────────────────────────────────────────────

describe('GET /api/handover-photos/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/handover-photos/photo-1')
    expect(res.status).toBe(401)
  })

  it('returns handover photo by id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.findUnique).mockResolvedValue(mockHandoverPhoto as never)

    const token = await signToken()
    const res = await request('GET', '/api/handover-photos/photo-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.photo.id).toBe('photo-1')
  })

  it('returns 404 when photo does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/handover-photos/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Handover photo not found')
  })
})

// ─── POST /api/handover-photos ────────────────────────────────────────────────

describe('POST /api/handover-photos', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/handover-photos', { handoverId: 'handover-1' })
    expect(res.status).toBe(401)
  })

  it('creates a handover photo successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.create).mockResolvedValue(mockHandoverPhoto as never)

    const token = await signToken()
    const res = await request(
      'POST',
      '/api/handover-photos',
      { handoverId: 'handover-1', description: 'Entry inspection', category: 'ENTRANCE' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.photo.id).toBe('photo-1')
  })

  it('returns 422 when handoverId is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)

    const token = await signToken()
    const res = await request('POST', '/api/handover-photos', { description: 'Test' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/handover-photos/:id ─────────────────────────────────────────────

describe('PUT /api/handover-photos/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/handover-photos/photo-1', { description: 'Updated' })
    expect(res.status).toBe(401)
  })

  it('updates a handover photo successfully', async () => {
    const updated = { ...mockHandoverPhoto, description: 'Updated' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.findUnique).mockResolvedValue(mockHandoverPhoto as never)
    vi.mocked(prisma.handoverPhotos.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/handover-photos/photo-1', { description: 'Updated' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.photo.description).toBe('Updated')
  })

  it('returns 404 when photo does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/handover-photos/nonexistent', { description: 'X' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Handover photo not found')
  })
})

// ─── DELETE /api/handover-photos/:id ─────────────────────────────────────────

describe('DELETE /api/handover-photos/:id', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/handover-photos/photo-1')
    expect(res.status).toBe(401)
  })

  it('deletes a handover photo successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.findUnique).mockResolvedValue(mockHandoverPhoto as never)
    vi.mocked(prisma.handoverPhotos.delete).mockResolvedValue(mockHandoverPhoto as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/handover-photos/photo-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when photo does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.handoverPhotos.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/handover-photos/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Handover photo not found')
  })
})
