import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    unit: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { unitsRoutes } from './units'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(unitsRoutes)

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

const mockProject = {
  id: 'proj-1',
  name: 'Warehouse A',
  code: 'WH-001',
  status: 'ACTIVE',
}

const mockUnit = {
  id: 'unit-1',
  project_id: 'proj-1',
  unit_number: 'A-01',
  floor: 1,
  building: 'A',
  type: 'Standard',
  area_sqm: 150,
  price: 500000,
  status: 'AVAILABLE',
  features: {},
  created_at: new Date(),
  updated_at: new Date(),
  project: { id: 'proj-1', name: 'Warehouse A', code: 'WH-001' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/units/availability ──────────────────────────────────────────────

describe('GET /api/units/availability', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/units/availability')
    expect(res.status).toBe(401)
  })

  it('returns availability matrix grouped by project', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findMany).mockResolvedValue([mockUnit] as never)

    const token = await signToken()
    const res = await req('GET', '/api/units/availability', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.availability).toHaveLength(1)
    expect(body.availability[0].projectId).toBe('proj-1')
    expect(body.availability[0].projectName).toBe('Warehouse A')
    expect(body.availability[0].units).toHaveLength(1)
    expect(body.availability[0].units[0].unitNumber).toBe('A-01')
    expect(body.availability[0].units[0].status).toBe('AVAILABLE')
  })

  it('groups multiple units under the same project', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findMany).mockResolvedValue([
      mockUnit,
      { ...mockUnit, id: 'unit-2', unit_number: 'A-02', status: 'RESERVED' },
    ] as never)

    const token = await signToken()
    const res = await req('GET', '/api/units/availability', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.availability).toHaveLength(1)
    expect(body.availability[0].units).toHaveLength(2)
  })
})

// ─── GET /api/units ───────────────────────────────────────────────────────────

describe('GET /api/units', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/units')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of units', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.count).mockResolvedValue(1)
    vi.mocked(prisma.unit.findMany).mockResolvedValue([mockUnit] as never)

    const token = await signToken()
    const res = await req('GET', '/api/units', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].unit_number).toBe('A-01')
    expect(body.pagination.total).toBe(1)
  })

  it('applies projectId filter', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.count).mockResolvedValue(1)
    vi.mocked(prisma.unit.findMany).mockResolvedValue([mockUnit] as never)

    const token = await signToken()
    const res = await req('GET', '/api/units?projectId=proj-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].project_id).toBe('proj-1')
  })
})

// ─── GET /api/units/:id ───────────────────────────────────────────────────────

describe('GET /api/units/:id', () => {
  it('returns unit with project info', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockUnit as never)

    const token = await signToken()
    const res = await req('GET', '/api/units/unit-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unit.id).toBe('unit-1')
    expect(body.unit.project.name).toBe('Warehouse A')
  })

  it('returns 404 when unit does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/units/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Unit not found')
  })
})

// ─── POST /api/units ──────────────────────────────────────────────────────────

describe('POST /api/units', () => {
  it('creates a unit successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.unit.create).mockResolvedValue(mockUnit as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/units',
      { projectId: 'proj-1', unitNumber: 'A-01', type: 'Standard' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.unit.unit_number).toBe('A-01')
  })

  it('returns 404 when project does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/units',
      { projectId: 'ghost', unitNumber: 'A-01', type: 'Standard' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Project not found')
  })

  it('returns 409 when unit number already exists in project', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockUnit as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/units',
      { projectId: 'proj-1', unitNumber: 'A-01', type: 'Standard' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Unit number already exists in this project')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/units', {}, token)

    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/units', {
      projectId: 'proj-1',
      unitNumber: 'A-01',
      type: 'Standard',
    })
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/units/:id ───────────────────────────────────────────────────────

describe('PUT /api/units/:id', () => {
  it('updates a unit successfully', async () => {
    const updated = { ...mockUnit, price: 600000 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockUnit as never)
    vi.mocked(prisma.unit.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req('PUT', '/api/units/unit-1', { price: 600000 }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unit.price).toBe(600000)
  })

  it('returns 404 when unit does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/units/ghost', { price: 100 }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Unit not found')
  })

  it('returns 409 when new unit number conflicts with existing unit', async () => {
    const conflictUnit = { ...mockUnit, id: 'unit-2', unit_number: 'A-02' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique)
      .mockResolvedValueOnce(mockUnit as never)
      .mockResolvedValueOnce(conflictUnit as never)

    const token = await signToken()
    const res = await req('PUT', '/api/units/unit-1', { unitNumber: 'A-02' }, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Unit number already exists in this project')
  })
})

// ─── DELETE /api/units/:id ────────────────────────────────────────────────────

describe('DELETE /api/units/:id', () => {
  it('soft-deletes a unit by setting status to UNDER_MAINTENANCE', async () => {
    const softDeleted = { ...mockUnit, status: 'UNDER_MAINTENANCE' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(mockUnit as never)
    vi.mocked(prisma.unit.update).mockResolvedValue(softDeleted as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/units/unit-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unit.status).toBe('UNDER_MAINTENANCE')
  })

  it('returns 404 when unit does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.unit.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/units/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Unit not found')
  })
})
