import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    wasteRecord: {
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
import { fmsWasteRoutes } from './waste'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsWasteRoutes)

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

const mockRecord = {
  id: 'record-1',
  record_date: new Date('2026-04-01'),
  project_id: 'proj-1',
  waste_type: 'GENERAL',
  volume: 120.5,
  unit: 'kg',
  disposal_method: 'Municipal collection',
  vendor_id: null,
  cost: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/waste ───────────────────────────────────────────────────────

describe('GET /api/fms/waste', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/waste')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of waste records', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.count).mockResolvedValue(1)
    vi.mocked(prisma.wasteRecord.findMany).mockResolvedValue([mockRecord] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/waste?projectId=proj-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].waste_type).toBe('GENERAL')
    expect(body.pagination.total).toBe(1)
  })

  it('filters by wasteType', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.count).mockResolvedValue(0)
    vi.mocked(prisma.wasteRecord.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await req('GET', '/api/fms/waste?projectId=proj-1&wasteType=HAZARDOUS', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

// ─── GET /api/fms/waste/:id ───────────────────────────────────────────────────

describe('GET /api/fms/waste/:id', () => {
  it('returns waste record when found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.findUnique).mockResolvedValue(mockRecord as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/waste/record-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.record.id).toBe('record-1')
    expect(body.record.volume).toBe(120.5)
  })

  it('returns 404 when record not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/waste/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Waste record not found')
  })
})

// ─── POST /api/fms/waste ─────────────────────────────────────────────────────

describe('POST /api/fms/waste', () => {
  it('creates a waste record successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.create).mockResolvedValue(mockRecord as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/waste',
      {
        recordDate: '2026-04-01',
        projectId: 'proj-1',
        wasteType: 'GENERAL',
        volume: 120.5,
        unit: 'kg',
      },
      token,
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.record.waste_type).toBe('GENERAL')
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/fms/waste', {
      recordDate: '2026-04-01',
      projectId: 'proj-1',
      wasteType: 'GENERAL',
      volume: 120.5,
      unit: 'kg',
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/waste', { projectId: 'proj-1' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/fms/waste/:id ───────────────────────────────────────────────────

describe('PUT /api/fms/waste/:id', () => {
  it('updates a waste record successfully', async () => {
    const updated = { ...mockRecord, volume: 200 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.findUnique).mockResolvedValue(mockRecord as never)
    vi.mocked(prisma.wasteRecord.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/waste/record-1', { volume: 200 }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.record.volume).toBe(200)
  })

  it('returns 404 when record does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/waste/ghost', { volume: 200 }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Waste record not found')
  })
})

// ─── DELETE /api/fms/waste/:id ───────────────────────────────────────────────

describe('DELETE /api/fms/waste/:id', () => {
  it('deletes a waste record successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.findUnique).mockResolvedValue(mockRecord as never)
    vi.mocked(prisma.wasteRecord.delete).mockResolvedValue(mockRecord as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/waste/record-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when record does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.wasteRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/waste/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Waste record not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await req('DELETE', '/api/fms/waste/record-1')
    expect(res.status).toBe(401)
  })
})
