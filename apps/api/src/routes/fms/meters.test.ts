import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    fmsMeterRecord: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    utilityRate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsMetersRoutes } from './meters'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsMetersRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function req(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<Response> {
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
  phone: null,
  department: null,
  position: null,
  is_active: true,
  password_hash: 'hashed',
  roles: [],
}

const mockReading = {
  id: 'reading-1',
  project_id: 'project-1',
  meter_type: 'ELECTRICITY',
  location: 'Building A',
  reading_date: new Date('2025-01-15'),
  value: 1500,
  previous_value: 1200,
  unit: 'kWh',
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  project: { id: 'project-1', name: 'Test Project', code: 'TP01' },
}

const mockRate = {
  id: 'rate-1',
  project_id: 'project-1',
  meter_type: 'ELECTRICITY',
  tier_name: 'Base Tier',
  min_usage: 0,
  max_usage: 500,
  rate_per_unit: 4.5,
  created_at: new Date(),
  updated_at: new Date(),
}

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
})

describe('GET /api/fms/meters', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/meters')
    expect(res.status).toBe(401)
  })

  it('returns list of meter readings with valid token', async () => {
    vi.mocked(prisma.fmsMeterRecord.count).mockResolvedValue(1)
    vi.mocked(prisma.fmsMeterRecord.findMany).mockResolvedValue([mockReading] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/meters', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination).toBeDefined()
  })

  it('filters by projectId', async () => {
    vi.mocked(prisma.fmsMeterRecord.count).mockResolvedValue(1)
    vi.mocked(prisma.fmsMeterRecord.findMany).mockResolvedValue([mockReading] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/meters?projectId=project-1', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.fmsMeterRecord.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ project_id: 'project-1' }),
      }),
    )
  })
})

describe('GET /api/fms/meters/:id', () => {
  it('returns 404 for nonexistent reading', async () => {
    vi.mocked(prisma.fmsMeterRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/meters/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns reading by id', async () => {
    vi.mocked(prisma.fmsMeterRecord.findUnique).mockResolvedValue(mockReading as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/meters/reading-1', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meterReading.id).toBe('reading-1')
  })
})

describe('POST /api/fms/meters', () => {
  it('creates a new meter reading', async () => {
    vi.mocked(prisma.fmsMeterRecord.create).mockResolvedValue(mockReading as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/meters',
      {
        projectId: 'project-1',
        meterType: 'ELECTRICITY',
        location: 'Building A',
        readingDate: '2025-01-15',
        value: 1500,
        previousValue: 1200,
        unit: 'kWh',
      },
      token,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.meterReading).toBeDefined()
  })

  it('returns 401 without token', async () => {
    const res = await req('POST', '/api/fms/meters', {
      projectId: 'project-1',
      meterType: 'ELECTRICITY',
      readingDate: '2025-01-15',
      value: 1500,
      unit: 'kWh',
    })
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/fms/meters/:id', () => {
  it('returns 404 for nonexistent reading', async () => {
    vi.mocked(prisma.fmsMeterRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/meters/nonexistent', { value: 1600 }, token)
    expect(res.status).toBe(404)
  })

  it('updates reading successfully', async () => {
    vi.mocked(prisma.fmsMeterRecord.findUnique).mockResolvedValue(mockReading as never)
    vi.mocked(prisma.fmsMeterRecord.update).mockResolvedValue({
      ...mockReading,
      value: 1600,
    } as never)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/meters/reading-1', { value: 1600 }, token)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/fms/meters/:id', () => {
  it('returns 404 for nonexistent reading', async () => {
    vi.mocked(prisma.fmsMeterRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/meters/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes reading successfully', async () => {
    vi.mocked(prisma.fmsMeterRecord.findUnique).mockResolvedValue(mockReading as never)
    vi.mocked(prisma.fmsMeterRecord.delete).mockResolvedValue(mockReading as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/meters/reading-1', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe('GET /api/fms/meters/revenue', () => {
  it('returns 400 without projectId', async () => {
    const token = await signToken()
    const res = await req('GET', '/api/fms/meters/revenue', undefined, token)
    expect(res.status).toBe(400)
  })

  it('returns revenue calculation', async () => {
    vi.mocked(prisma.fmsMeterRecord.findMany).mockResolvedValue([mockReading] as never)
    vi.mocked(prisma.utilityRate.findMany).mockResolvedValue([mockRate] as never)

    const token = await signToken()
    const res = await req(
      'GET',
      '/api/fms/meters/revenue?projectId=project-1',
      undefined,
      token,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(typeof body.totalCharge).toBe('number')
  })
})

describe('GET /api/fms/meters/rates', () => {
  it('returns list of utility rates', async () => {
    vi.mocked(prisma.utilityRate.findMany).mockResolvedValue([mockRate] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/meters/rates', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe('POST /api/fms/meters/rates', () => {
  it('creates a utility rate', async () => {
    vi.mocked(prisma.utilityRate.create).mockResolvedValue(mockRate as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/meters/rates',
      {
        projectId: 'project-1',
        meterType: 'ELECTRICITY',
        tierName: 'Base Tier',
        minUsage: 0,
        maxUsage: 500,
        ratePerUnit: 4.5,
      },
      token,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.utilityRate).toBeDefined()
  })
})

describe('PUT /api/fms/meters/rates/:id', () => {
  it('returns 404 for nonexistent rate', async () => {
    vi.mocked(prisma.utilityRate.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/meters/rates/nonexistent', { ratePerUnit: 5.0 }, token)
    expect(res.status).toBe(404)
  })

  it('updates rate successfully', async () => {
    vi.mocked(prisma.utilityRate.findUnique).mockResolvedValue(mockRate as never)
    vi.mocked(prisma.utilityRate.update).mockResolvedValue({ ...mockRate, rate_per_unit: 5.0 } as never)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/meters/rates/rate-1', { ratePerUnit: 5.0 }, token)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/fms/meters/rates/:id', () => {
  it('returns 404 for nonexistent rate', async () => {
    vi.mocked(prisma.utilityRate.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/meters/rates/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes rate successfully', async () => {
    vi.mocked(prisma.utilityRate.findUnique).mockResolvedValue(mockRate as never)
    vi.mocked(prisma.utilityRate.delete).mockResolvedValue(mockRate as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/meters/rates/rate-1', undefined, token)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
