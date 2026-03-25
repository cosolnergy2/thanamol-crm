import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    fireEquipment: {
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
import { fmsFireEquipmentRoutes } from './fire-equipment'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsFireEquipmentRoutes)

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

const mockEquipment = {
  id: 'eq-1',
  equipment_number: 'FE-001',
  type: 'Fire Extinguisher',
  location_detail: 'Floor 1',
  project_id: 'proj-1',
  zone_id: null,
  status: 'ACTIVE',
  last_inspection_date: null,
  next_inspection_date: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Test Project', code: 'TP' },
  zone: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
})

describe('GET /fms/fire-equipment', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/fire-equipment')
    expect(res.status).toBe(401)
  })

  it('returns paginated list with valid token', async () => {
    const token = await signToken()
    ;(prisma.fireEquipment.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.fireEquipment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockEquipment])

    const res = await req('GET', '/api/fms/fire-equipment', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })
})

describe('POST /fms/fire-equipment', () => {
  it('creates fire equipment record', async () => {
    const token = await signToken()
    ;(prisma.fireEquipment.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment)

    const res = await req(
      'POST',
      '/api/fms/fire-equipment',
      {
        equipmentNumber: 'FE-001',
        type: 'Fire Extinguisher',
        projectId: 'proj-1',
      },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.equipment.type).toBe('Fire Extinguisher')
  })

  it('returns 401 without token', async () => {
    const res = await req('POST', '/api/fms/fire-equipment', { equipmentNumber: 'FE-001', type: 'Fire Extinguisher', projectId: 'proj-1' })
    expect(res.status).toBe(401)
  })
})

describe('PUT /fms/fire-equipment/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.fireEquipment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('PUT', '/api/fms/fire-equipment/nonexistent', { equipmentType: 'Hose Reel' }, token)
    expect(res.status).toBe(404)
  })

  it('updates equipment when found', async () => {
    const token = await signToken()
    ;(prisma.fireEquipment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment)
    const updated = { ...mockEquipment, location_detail: 'Floor 2' }
    ;(prisma.fireEquipment.update as ReturnType<typeof vi.fn>).mockResolvedValue(updated)

    const res = await req('PUT', '/api/fms/fire-equipment/eq-1', { locationDetail: 'Floor 2' }, token)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /fms/fire-equipment/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.fireEquipment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/fire-equipment/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes equipment when found', async () => {
    const token = await signToken()
    ;(prisma.fireEquipment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment)
    ;(prisma.fireEquipment.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockEquipment)

    const res = await req('DELETE', '/api/fms/fire-equipment/eq-1', undefined, token)
    expect(res.status).toBe(200)
  })
})
