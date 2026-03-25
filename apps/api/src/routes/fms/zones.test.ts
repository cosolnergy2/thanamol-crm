import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    zone: {
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
import { fmsZonesRoutes } from './zones'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsZonesRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(
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

const mockUser = {
  id: 'user-1',
  email: 'dev@example.com',
  first_name: 'Dev',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockZone = {
  id: 'zone-1',
  project_id: 'proj-1',
  name: 'Building A',
  code: 'BLDG-A',
  description: null,
  floor: null,
  building: null,
  parent_zone_id: null,
  created_at: new Date(),
  updated_at: new Date(),
  _count: { children: 0, units: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/zones ───────────────────────────────────────────────────────

describe('GET /api/fms/zones', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/zones?projectId=proj-1')
    expect(res.status).toBe(401)
  })

  it('returns 400 when projectId is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    const token = await signToken()
    const res = await req('GET', '/api/fms/zones', undefined, token)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('projectId is required')
  })

  it('returns paginated list of zones for a project', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.count).mockResolvedValue(1)
    vi.mocked(prisma.zone.findMany).mockResolvedValue([mockZone] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/zones?projectId=proj-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].code).toBe('BLDG-A')
    expect(body.pagination.total).toBe(1)
  })

  it('applies search filter', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.count).mockResolvedValue(0)
    vi.mocked(prisma.zone.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await req('GET', '/api/fms/zones?projectId=proj-1&search=floor', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

// ─── GET /api/fms/zones/:id ───────────────────────────────────────────────────

describe('GET /api/fms/zones/:id', () => {
  it('returns zone with children and parent', async () => {
    const zoneWithRelations = { ...mockZone, children: [], parent_zone: null }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(zoneWithRelations as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/zones/zone-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.zone.id).toBe('zone-1')
    expect(body.zone.children).toEqual([])
    expect(body.zone.parent_zone).toBeNull()
  })

  it('returns 404 when zone does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/zones/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Zone not found')
  })
})

// ─── POST /api/fms/zones ──────────────────────────────────────────────────────

describe('POST /api/fms/zones', () => {
  it('creates a zone successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.zone.create).mockResolvedValue(mockZone as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/zones',
      { projectId: 'proj-1', name: 'Building A', code: 'BLDG-A' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.zone.code).toBe('BLDG-A')
  })

  it('returns 409 when zone code already exists in project', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(mockZone as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/zones',
      { projectId: 'proj-1', name: 'Building A Duplicate', code: 'BLDG-A' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('A zone with this code already exists in the project')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/zones', { name: 'No Project' }, token)

    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/fms/zones', {
      projectId: 'proj-1',
      name: 'Zone',
      code: 'Z1',
    })
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/fms/zones/:id ───────────────────────────────────────────────────

describe('PUT /api/fms/zones/:id', () => {
  it('updates a zone successfully', async () => {
    const updated = { ...mockZone, name: 'Building A Renamed' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(mockZone as never)
    vi.mocked(prisma.zone.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/zones/zone-1', { name: 'Building A Renamed' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.zone.name).toBe('Building A Renamed')
  })

  it('returns 404 when zone does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/zones/ghost', { name: 'Ghost Zone' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Zone not found')
  })

  it('returns 409 when updated code conflicts with existing zone in project', async () => {
    const conflictZone = { ...mockZone, id: 'zone-2', code: 'BLDG-B' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique)
      .mockResolvedValueOnce(mockZone as never)
      .mockResolvedValueOnce(conflictZone as never)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/zones/zone-1', { code: 'BLDG-B' }, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('A zone with this code already exists in the project')
  })
})

// ─── DELETE /api/fms/zones/:id ────────────────────────────────────────────────

describe('DELETE /api/fms/zones/:id', () => {
  it('deletes a zone with no children or units', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(mockZone as never)
    vi.mocked(prisma.zone.delete).mockResolvedValue(mockZone as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/zones/zone-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when zone has children', async () => {
    const zoneWithChildren = { ...mockZone, _count: { children: 2, units: 0 } }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(zoneWithChildren as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/zones/zone-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Cannot delete zone with sub-zones. Remove sub-zones first.')
  })

  it('returns 409 when zone has assigned units', async () => {
    const zoneWithUnits = { ...mockZone, _count: { children: 0, units: 3 } }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(zoneWithUnits as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/zones/zone-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Cannot delete zone with assigned units. Unassign units first.')
  })

  it('returns 404 when zone does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.zone.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/zones/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Zone not found')
  })
})
