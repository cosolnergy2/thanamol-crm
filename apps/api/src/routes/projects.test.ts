import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    unit: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { projectsRoutes } from './projects'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(projectsRoutes)

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
  description: null,
  address: '123 Main St',
  type: 'Warehouse',
  status: 'ACTIVE',
  total_units: 10,
  settings: {},
  created_at: new Date(),
  updated_at: new Date(),
  _count: { units: 3 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/projects ────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/projects')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of projects', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.count).mockResolvedValue(1)
    vi.mocked(prisma.project.findMany).mockResolvedValue([mockProject] as never)

    const token = await signToken()
    const res = await req('GET', '/api/projects', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].code).toBe('WH-001')
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
  })

  it('applies search filter', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.count).mockResolvedValue(0)
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await req('GET', '/api/projects?search=xyz', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

describe('GET /api/projects/:id', () => {
  it('returns project with unit status counts', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.unit.groupBy).mockResolvedValue([
      { status: 'AVAILABLE', _count: { status: 2 } },
      { status: 'RENTED', _count: { status: 1 } },
    ] as never)

    const token = await signToken()
    const res = await req('GET', '/api/projects/proj-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.project.id).toBe('proj-1')
    expect(body.project.unitStatusCounts.available).toBe(2)
    expect(body.project.unitStatusCounts.rented).toBe(1)
  })

  it('returns 404 when project does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/projects/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Project not found')
  })
})

// ─── GET /api/projects/:id/dashboard ─────────────────────────────────────────

describe('GET /api/projects/:id/dashboard', () => {
  it('returns dashboard stats for project', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.unit.groupBy).mockResolvedValue([
      { status: 'AVAILABLE', _count: { status: 5 } },
      { status: 'RENTED', _count: { status: 3 } },
      { status: 'SOLD', _count: { status: 2 } },
    ] as never)
    vi.mocked(prisma.unit.aggregate).mockResolvedValue({ _sum: { price: 5000000 } } as never)

    const token = await signToken()
    const res = await req('GET', '/api/projects/proj-1/dashboard', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.dashboard.totalUnits).toBe(10)
    expect(body.dashboard.unitStatusCounts.available).toBe(5)
    expect(body.dashboard.unitStatusCounts.rented).toBe(3)
    expect(body.dashboard.unitStatusCounts.sold).toBe(2)
    expect(body.dashboard.occupancyRate).toBe(50)
    expect(body.dashboard.totalRevenuePotential).toBe(5000000)
  })

  it('returns 404 when project does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/projects/ghost/dashboard', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Project not found')
  })
})

// ─── GET /api/projects/:id/units ──────────────────────────────────────────────

describe('GET /api/projects/:id/units', () => {
  it('returns units for a project with pagination', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.unit.count).mockResolvedValue(2)
    vi.mocked(prisma.unit.findMany).mockResolvedValue([
      {
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
      },
    ] as never)

    const token = await signToken()
    const res = await req('GET', '/api/projects/proj-1/units', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].unit_number).toBe('A-01')
    expect(body.pagination.total).toBe(2)
  })

  it('returns 404 when project does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/projects/ghost/units', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Project not found')
  })
})

// ─── POST /api/projects ───────────────────────────────────────────────────────

describe('POST /api/projects', () => {
  it('creates a project successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.project.create).mockResolvedValue(mockProject as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/projects',
      { name: 'Warehouse A', code: 'WH-001', type: 'Warehouse' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.project.code).toBe('WH-001')
  })

  it('returns 409 when code already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/projects',
      { name: 'Warehouse A', code: 'WH-001', type: 'Warehouse' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Project code already exists')
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/projects', {}, token)

    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/projects', { name: 'Test', code: 'T-1', type: 'Office' })
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────

describe('PUT /api/projects/:id', () => {
  it('updates a project successfully', async () => {
    const updated = { ...mockProject, name: 'Warehouse B' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.project.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req('PUT', '/api/projects/proj-1', { name: 'Warehouse B' }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.project.name).toBe('Warehouse B')
  })

  it('returns 404 when project does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/projects/ghost', { name: 'Ghost' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Project not found')
  })

  it('returns 409 when new code conflicts with existing project', async () => {
    const conflictProject = { ...mockProject, id: 'proj-2', code: 'WH-002' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(mockProject as never)
      .mockResolvedValueOnce(conflictProject as never)

    const token = await signToken()
    const res = await req('PUT', '/api/projects/proj-1', { code: 'WH-002' }, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Project code already exists')
  })
})

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────

describe('DELETE /api/projects/:id', () => {
  it('soft-deletes a project by setting status to SUSPENDED', async () => {
    const suspended = { ...mockProject, status: 'SUSPENDED' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as never)
    vi.mocked(prisma.project.update).mockResolvedValue(suspended as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/projects/proj-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.project.status).toBe('SUSPENDED')
  })

  it('returns 404 when project does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/projects/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Project not found')
  })
})
