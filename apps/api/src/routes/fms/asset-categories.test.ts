import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    assetCategory: {
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
import { fmsAssetCategoriesRoutes } from './asset-categories'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsAssetCategoriesRoutes)

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

const mockCategory = {
  id: 'cat-1',
  name: 'HVAC Equipment',
  code: 'HVAC',
  description: 'Heating, ventilation, and air conditioning',
  parent_id: null,
  created_at: new Date(),
  _count: { assets: 0, children: 0 },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/fms/asset-categories', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/asset-categories')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of categories', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.assetCategory.count).mockResolvedValue(1)
    vi.mocked(prisma.assetCategory.findMany).mockResolvedValue([mockCategory] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/asset-categories', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].code).toBe('HVAC')
    expect(body.pagination.total).toBe(1)
  })
})

describe('POST /api/fms/asset-categories', () => {
  it('creates a category successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.assetCategory.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.assetCategory.create).mockResolvedValue(mockCategory as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/asset-categories',
      { name: 'HVAC Equipment', code: 'HVAC' },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.category.code).toBe('HVAC')
  })

  it('returns 409 when code already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.assetCategory.findUnique).mockResolvedValue(mockCategory as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/asset-categories',
      { name: 'HVAC Duplicate', code: 'HVAC' },
      token
    )

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('A category with this code already exists')
  })
})

describe('DELETE /api/fms/asset-categories/:id', () => {
  it('deletes a category with no assets or children', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.assetCategory.findUnique).mockResolvedValue(mockCategory as never)
    vi.mocked(prisma.assetCategory.delete).mockResolvedValue(mockCategory as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/asset-categories/cat-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 409 when category has assets', async () => {
    const catWithAssets = { ...mockCategory, _count: { assets: 3, children: 0 } }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.assetCategory.findUnique).mockResolvedValue(catWithAssets as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/asset-categories/cat-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Cannot delete category with assigned assets. Reassign assets first.')
  })

  it('returns 409 when category has sub-categories', async () => {
    const catWithChildren = { ...mockCategory, _count: { assets: 0, children: 2 } }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.assetCategory.findUnique).mockResolvedValue(catWithChildren as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/asset-categories/cat-1', undefined, token)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Cannot delete category with sub-categories. Remove sub-categories first.')
  })
})
