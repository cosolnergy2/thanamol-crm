import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    asset: {
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
import { fmsAssetsRoutes } from './assets'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsAssetsRoutes)

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

const mockAsset = {
  id: 'asset-1',
  asset_number: 'AST-202501-0001',
  name: 'Air Conditioner Unit 1',
  description: null,
  category_id: 'cat-1',
  project_id: 'proj-1',
  zone_id: null,
  unit_id: null,
  location_detail: null,
  manufacturer: 'Daikin',
  model_name: 'FTXS50K',
  serial_number: 'SN-12345',
  purchase_date: null,
  purchase_cost: null,
  warranty_expiry: null,
  status: 'OPERATIONAL',
  qr_code_url: null,
  specifications: {},
  photos: [],
  assigned_to: null,
  created_at: new Date(),
  updated_at: new Date(),
  category: { id: 'cat-1', name: 'HVAC', code: 'HVAC', description: null, parent_id: null, created_at: new Date() },
  project: { id: 'proj-1', name: 'Test Project', code: 'TEST' },
  zone: null,
  unit: null,
  assignee: null,
  _count: { work_orders: 0, calibrations: 0, pm_schedules: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/assets ─────────────────────────────────────────────────────

describe('GET /api/fms/assets', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/assets')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of assets', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.count).mockResolvedValue(1)
    vi.mocked(prisma.asset.findMany).mockResolvedValue([mockAsset] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/assets', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].asset_number).toBe('AST-202501-0001')
    expect(body.pagination.total).toBe(1)
  })

  it('filters by projectId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.count).mockResolvedValue(0)
    vi.mocked(prisma.asset.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await req('GET', '/api/fms/assets?projectId=proj-2', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.count).mockResolvedValue(1)
    vi.mocked(prisma.asset.findMany).mockResolvedValue([mockAsset] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/assets?status=OPERATIONAL', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0].status).toBe('OPERATIONAL')
  })
})

// ─── GET /api/fms/assets/:id ─────────────────────────────────────────────────

describe('GET /api/fms/assets/:id', () => {
  it('returns asset with relations', async () => {
    const assetWithDetail = { ...mockAsset, work_orders: [], calibrations: [], pm_schedules: [] }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(assetWithDetail as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/assets/asset-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.asset.id).toBe('asset-1')
    expect(body.asset.work_orders).toEqual([])
  })

  it('returns 404 when asset does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/assets/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Asset not found')
  })
})

// ─── POST /api/fms/assets ────────────────────────────────────────────────────

describe('POST /api/fms/assets', () => {
  it('creates an asset with auto-generated number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.count).mockResolvedValue(0)
    vi.mocked(prisma.asset.create).mockResolvedValue(mockAsset as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/assets',
      { name: 'AC Unit 1', projectId: 'proj-1' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.asset).toBeDefined()
    expect(prisma.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'AC Unit 1',
          project_id: 'proj-1',
          status: 'OPERATIONAL',
        }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/assets', { description: 'no name or project' }, token)

    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/fms/assets', { name: 'AC', projectId: 'proj-1' })
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/fms/assets/:id ─────────────────────────────────────────────────

describe('PUT /api/fms/assets/:id', () => {
  it('updates an asset successfully', async () => {
    const updated = { ...mockAsset, name: 'AC Unit 1 Updated', status: 'UNDER_MAINTENANCE' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(mockAsset as never)
    vi.mocked(prisma.asset.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req(
      'PUT',
      '/api/fms/assets/asset-1',
      { name: 'AC Unit 1 Updated', status: 'UNDER_MAINTENANCE' },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.asset.name).toBe('AC Unit 1 Updated')
    expect(body.asset.status).toBe('UNDER_MAINTENANCE')
  })

  it('returns 404 when asset does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/assets/ghost', { name: 'Updated' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Asset not found')
  })
})

// ─── DELETE /api/fms/assets/:id ──────────────────────────────────────────────

describe('DELETE /api/fms/assets/:id', () => {
  it('deletes an asset successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(mockAsset as never)
    vi.mocked(prisma.asset.delete).mockResolvedValue(mockAsset as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/assets/asset-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when asset does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/assets/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Asset not found')
  })
})
