import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    asset: { findUnique: vi.fn() },
    calibrationRecord: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsCalibrationsRoutes } from './calibrations'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsCalibrationsRoutes)

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
  asset_number: 'AST-00001',
  name: 'Pressure Gauge A',
}

const mockCalibration = {
  id: 'cal-1',
  asset_id: 'asset-1',
  calibration_date: new Date('2026-01-01'),
  next_calibration_date: new Date('2027-01-01'),
  performed_by: 'John Doe',
  certificate_url: null,
  status: 'PASSED',
  notes: 'All good',
  calibration_number: 'CAL-00001',
  frequency_days: 365,
  calibration_type: 'Internal',
  calibration_standard: 'ISO 17025',
  certificate_number: 'CERT-001',
  cost: 1500,
  results: [
    { parameter: 'Temperature', standard: 100, measured: 100.5, deviation: 0.5, tolerance: 1, status: 'Pass' },
  ],
  created_at: new Date(),
  asset: { id: 'asset-1', asset_number: 'AST-00001', name: 'Pressure Gauge A', project_id: 'proj-1' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/fms/calibrations ────────────────────────────────────────────────

describe('GET /api/fms/calibrations', () => {
  it('returns 401 without auth token', async () => {
    const res = await req('GET', '/api/fms/calibrations')
    expect(res.status).toBe(401)
  })

  it('returns paginated list of calibrations', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.count).mockResolvedValue(1)
    vi.mocked(prisma.calibrationRecord.findMany).mockResolvedValue([mockCalibration] as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/calibrations', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].calibration_number).toBe('CAL-00001')
    expect(body.pagination.total).toBe(1)
  })

  it('filters by assetId', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.count).mockResolvedValue(0)
    vi.mocked(prisma.calibrationRecord.findMany).mockResolvedValue([])

    const token = await signToken()
    const res = await req('GET', '/api/fms/calibrations?assetId=asset-2', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})

// ─── GET /api/fms/calibrations/:id ───────────────────────────────────────────

describe('GET /api/fms/calibrations/:id', () => {
  it('returns calibration with all new fields', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.findUnique).mockResolvedValue(mockCalibration as never)

    const token = await signToken()
    const res = await req('GET', '/api/fms/calibrations/cal-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.calibration.calibration_number).toBe('CAL-00001')
    expect(body.calibration.frequency_days).toBe(365)
    expect(body.calibration.calibration_type).toBe('Internal')
    expect(body.calibration.calibration_standard).toBe('ISO 17025')
    expect(body.calibration.certificate_number).toBe('CERT-001')
    expect(body.calibration.cost).toBe(1500)
    expect(Array.isArray(body.calibration.results)).toBe(true)
    expect(body.calibration.results[0].status).toBe('Pass')
  })

  it('returns 404 when calibration does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('GET', '/api/fms/calibrations/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Calibration record not found')
  })
})

// ─── POST /api/fms/calibrations ──────────────────────────────────────────────

describe('POST /api/fms/calibrations', () => {
  it('creates calibration with auto-generated calibration_number', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(mockAsset as never)
    vi.mocked(prisma.calibrationRecord.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.calibrationRecord.create).mockResolvedValue(mockCalibration as never)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/calibrations',
      {
        assetId: 'asset-1',
        calibrationDate: '2026-01-01',
        frequencyDays: 365,
        calibrationType: 'Internal',
        calibrationStandard: 'ISO 17025',
        certificateNumber: 'CERT-001',
        cost: 1500,
        results: [{ parameter: 'Temperature', standard: 100, measured: 100.5, deviation: 0.5, tolerance: 1, status: 'Pass' }],
      },
      token
    )

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.calibration).toBeDefined()
    expect(prisma.calibrationRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          calibration_number: 'CAL-00001',
          frequency_days: 365,
          calibration_type: 'Internal',
          calibration_standard: 'ISO 17025',
          certificate_number: 'CERT-001',
          cost: 1500,
        }),
      })
    )
  })

  it('returns 404 when asset does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.asset.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req(
      'POST',
      '/api/fms/calibrations',
      { assetId: 'ghost', calibrationDate: '2026-01-01' },
      token
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Asset not found')
  })

  it('returns 401 without auth token', async () => {
    const res = await req('POST', '/api/fms/calibrations', {
      assetId: 'asset-1',
      calibrationDate: '2026-01-01',
    })
    expect(res.status).toBe(401)
  })

  it('returns 422 when required fields are missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

    const token = await signToken()
    const res = await req('POST', '/api/fms/calibrations', { notes: 'no asset or date' }, token)

    expect(res.status).toBe(422)
  })
})

// ─── PUT /api/fms/calibrations/:id ───────────────────────────────────────────

describe('PUT /api/fms/calibrations/:id', () => {
  it('updates calibration with new fields', async () => {
    const updated = { ...mockCalibration, calibration_type: 'External', cost: 2500 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.findUnique).mockResolvedValue(mockCalibration as never)
    vi.mocked(prisma.calibrationRecord.update).mockResolvedValue(updated as never)

    const token = await signToken()
    const res = await req(
      'PUT',
      '/api/fms/calibrations/cal-1',
      { calibrationType: 'External', cost: 2500 },
      token
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.calibration.calibration_type).toBe('External')
    expect(body.calibration.cost).toBe(2500)
  })

  it('returns 404 when calibration does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('PUT', '/api/fms/calibrations/ghost', { notes: 'update' }, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Calibration record not found')
  })
})

// ─── DELETE /api/fms/calibrations/:id ────────────────────────────────────────

describe('DELETE /api/fms/calibrations/:id', () => {
  it('deletes a calibration record', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.findUnique).mockResolvedValue(mockCalibration as never)
    vi.mocked(prisma.calibrationRecord.delete).mockResolvedValue(mockCalibration as never)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/calibrations/cal-1', undefined, token)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 404 when calibration does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.calibrationRecord.findUnique).mockResolvedValue(null)

    const token = await signToken()
    const res = await req('DELETE', '/api/fms/calibrations/ghost', undefined, token)

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('Calibration record not found')
  })
})
