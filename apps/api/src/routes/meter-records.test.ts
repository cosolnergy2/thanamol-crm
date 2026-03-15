import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userRole: {
      findMany: vi.fn(),
    },
    meterRecord: {
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
import { meterRecordsRoutes } from './meter-records'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(meterRecordsRoutes)

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

const mockUnit = {
  id: 'unit-1',
  unit_number: 'A101',
  floor: 1,
  building: 'A',
  project_id: 'proj-1',
}

const mockMeterRecord = {
  id: 'mr-1',
  unit_id: 'unit-1',
  meter_type: 'ELECTRICITY',
  previous_reading: 100,
  current_reading: 150,
  reading_date: new Date('2026-03-01'),
  usage: 50,
  amount: 250,
  billing_period: '2026-03',
  created_at: new Date(),
}

const mockMeterRecordWithUnit = {
  ...mockMeterRecord,
  unit: mockUnit,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/meter-records ────────────────────────────────────────────────────

describe('GET /api/meter-records', () => {
  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/meter-records')
    expect(res.status).toBe(401)
  })

  it('returns paginated meter record list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.count).mockResolvedValue(1)
    vi.mocked(prisma.meterRecord.findMany).mockResolvedValue([mockMeterRecord] as never)

    const token = await signToken()
    const res = await request('GET', '/api/meter-records', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by unitId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.count).mockResolvedValue(0)
    vi.mocked(prisma.meterRecord.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/meter-records?unitId=unit-1', undefined, token)

    expect(vi.mocked(prisma.meterRecord.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ unit_id: 'unit-1' }),
      })
    )
  })

  it('filters by meterType', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.count).mockResolvedValue(0)
    vi.mocked(prisma.meterRecord.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/meter-records?meterType=WATER', undefined, token)

    expect(vi.mocked(prisma.meterRecord.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ meter_type: 'WATER' }),
      })
    )
  })

  it('filters by billingPeriod', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.count).mockResolvedValue(0)
    vi.mocked(prisma.meterRecord.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/meter-records?billingPeriod=2026-03', undefined, token)

    expect(vi.mocked(prisma.meterRecord.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ billing_period: '2026-03' }),
      })
    )
  })

  it('ignores invalid meterType filter', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.count).mockResolvedValue(0)
    vi.mocked(prisma.meterRecord.findMany).mockResolvedValue([])

    const token = await signToken()
    await request('GET', '/api/meter-records?meterType=INVALID', undefined, token)

    expect(vi.mocked(prisma.meterRecord.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    )
  })
})

// ─── GET /api/meter-records/:id ───────────────────────────────────────────────

describe('GET /api/meter-records/:id', () => {
  it('returns meter record with unit relation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(mockMeterRecordWithUnit as never)

    const token = await signToken()
    const res = await request('GET', '/api/meter-records/mr-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meterRecord.id).toBe('mr-1')
    expect(body.meterRecord.unit).toBeDefined()
    expect(body.meterRecord.unit.unit_number).toBe('A101')
  })

  it('returns 404 when meter record does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('GET', '/api/meter-records/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('MeterRecord not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('GET', '/api/meter-records/mr-1')
    expect(res.status).toBe(401)
  })
})

// ─── POST /api/meter-records ──────────────────────────────────────────────────

describe('POST /api/meter-records', () => {
  const validPayload = {
    unitId: 'unit-1',
    meterType: 'ELECTRICITY',
    previousReading: 100,
    currentReading: 150,
    readingDate: '2026-03-01',
    amount: 250,
    billingPeriod: '2026-03',
  }

  it('creates a meter record and auto-calculates usage', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.create).mockResolvedValue(mockMeterRecordWithUnit as never)

    const token = await signToken()
    const res = await request('POST', '/api/meter-records', validPayload, token)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.meterRecord.id).toBe('mr-1')
    expect(vi.mocked(prisma.meterRecord.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit_id: 'unit-1',
          meter_type: 'ELECTRICITY',
          previous_reading: 100,
          current_reading: 150,
          usage: 50,
          amount: 250,
          billing_period: '2026-03',
        }),
      })
    )
  })

  it('calculates usage as zero when current_reading <= previous_reading', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.create).mockResolvedValue({
      ...mockMeterRecordWithUnit,
      usage: 0,
    } as never)

    const token = await signToken()
    await request(
      'POST',
      '/api/meter-records',
      { ...validPayload, previousReading: 200, currentReading: 150 },
      token
    )

    expect(vi.mocked(prisma.meterRecord.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usage: 0 }),
      })
    )
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    const token = await signToken()
    const res = await request('POST', '/api/meter-records', {}, token)
    expect(res.status).toBe(422)
  })

  it('returns 401 without auth token', async () => {
    const res = await request('POST', '/api/meter-records', validPayload)
    expect(res.status).toBe(401)
  })
})

// ─── PUT /api/meter-records/:id ───────────────────────────────────────────────

describe('PUT /api/meter-records/:id', () => {
  it('updates a meter record and recalculates usage', async () => {
    const updated = { ...mockMeterRecordWithUnit, current_reading: 200, usage: 100 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(mockMeterRecord as never)
    vi.mocked(prisma.meterRecord.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await request('PUT', '/api/meter-records/mr-1', { currentReading: 200 }, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meterRecord.usage).toBe(100)
    expect(vi.mocked(prisma.meterRecord.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ current_reading: 200, usage: 100 }),
      })
    )
  })

  it('recalculates usage when previousReading changes', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(mockMeterRecord as never)
    vi.mocked(prisma.meterRecord.update).mockResolvedValue({
      ...mockMeterRecordWithUnit,
      previous_reading: 120,
      usage: 30,
    } as never)

    const token = await signToken()
    await request('PUT', '/api/meter-records/mr-1', { previousReading: 120 }, token)

    expect(vi.mocked(prisma.meterRecord.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ previous_reading: 120, usage: 30 }),
      })
    )
  })

  it('returns 404 when meter record does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('PUT', '/api/meter-records/nonexistent', { amount: 300 }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('MeterRecord not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('PUT', '/api/meter-records/mr-1', { amount: 300 })
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/meter-records/:id ────────────────────────────────────────────

describe('DELETE /api/meter-records/:id', () => {
  it('deletes a meter record successfully', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(mockMeterRecord as never)
    vi.mocked(prisma.meterRecord.delete).mockResolvedValue(mockMeterRecord as never)

    const token = await signToken()
    const res = await request('DELETE', '/api/meter-records/mr-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when meter record does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
    vi.mocked(prisma.meterRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await request('DELETE', '/api/meter-records/nonexistent', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('MeterRecord not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await request('DELETE', '/api/meter-records/mr-1')
    expect(res.status).toBe(401)
  })
})
