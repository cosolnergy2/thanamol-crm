import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    preventiveMaintenance: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pMScheduleLog: {
      create: vi.fn(),
    },
    pMInspection: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    workOrder: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsPMRoutes } from './preventive-maintenance'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsPMRoutes)

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

const MOCK_USER = {
  id: 'user-1',
  email: 'user@test.com',
  first_name: 'Test',
  last_name: 'User',
  avatar_url: null,
  phone: null,
  department: null,
  position: null,
  is_active: true,
  roles: [],
}

const MOCK_PM = {
  id: 'pm-1',
  pm_number: 'PM-202601-0001',
  title: 'HVAC Filter',
  project_id: 'proj-1',
  frequency: 'MONTHLY',
  is_active: true,
}

const MOCK_INSPECTION = {
  id: 'insp-1',
  pm_id: 'pm-1',
  inspection_date: new Date('2026-01-15'),
  inspector_name: 'John Doe',
  checklist_results: [],
  passed: true,
  notes: null,
  created_at: new Date(),
}

describe('POST /api/fms/preventive-maintenance/:id/inspect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    const res = await req('POST', '/api/fms/preventive-maintenance/pm-1/inspect', {
      inspectionDate: '2026-01-15',
      inspectorName: 'John Doe',
      passed: true,
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when PM not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findUnique).mockResolvedValue(null)

    const res = await req(
      'POST',
      '/api/fms/preventive-maintenance/nonexistent/inspect',
      {
        inspectionDate: '2026-01-15',
        inspectorName: 'John Doe',
        passed: true,
      },
      token
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('PM schedule not found')
  })

  it('creates inspection record successfully', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findUnique).mockResolvedValue(MOCK_PM as never)
    vi.mocked(prisma.pMInspection.create).mockResolvedValue(MOCK_INSPECTION as never)

    const res = await req(
      'POST',
      '/api/fms/preventive-maintenance/pm-1/inspect',
      {
        inspectionDate: '2026-01-15',
        inspectorName: 'John Doe',
        checklistResults: [{ item: 'Filter clean', passed: true }],
        passed: true,
        notes: 'All good',
      },
      token
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.inspection).toBeDefined()
    expect(body.inspection.inspector_name).toBe('John Doe')
    expect(body.inspection.passed).toBe(true)
  })

  it('creates failed inspection record', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findUnique).mockResolvedValue(MOCK_PM as never)
    vi.mocked(prisma.pMInspection.create).mockResolvedValue({
      ...MOCK_INSPECTION,
      passed: false,
      notes: 'Filter clogged',
    } as never)

    const res = await req(
      'POST',
      '/api/fms/preventive-maintenance/pm-1/inspect',
      {
        inspectionDate: '2026-01-15',
        inspectorName: 'Jane Smith',
        passed: false,
        notes: 'Filter clogged',
      },
      token
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.inspection.passed).toBe(false)
  })
})

describe('GET /api/fms/preventive-maintenance/:id/inspections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    const res = await req('GET', '/api/fms/preventive-maintenance/pm-1/inspections')
    expect(res.status).toBe(401)
  })

  it('returns 404 when PM not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findUnique).mockResolvedValue(null)

    const res = await req(
      'GET',
      '/api/fms/preventive-maintenance/nonexistent/inspections',
      undefined,
      token
    )
    expect(res.status).toBe(404)
  })

  it('returns inspection list with pagination', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findUnique).mockResolvedValue(MOCK_PM as never)
    vi.mocked(prisma.pMInspection.count).mockResolvedValue(1)
    vi.mocked(prisma.pMInspection.findMany).mockResolvedValue([MOCK_INSPECTION] as never)

    const res = await req(
      'GET',
      '/api/fms/preventive-maintenance/pm-1/inspections',
      undefined,
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
    expect(body.data[0].inspector_name).toBe('John Doe')
  })

  it('returns empty list when no inspections exist', async () => {
    const token = await signToken()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_USER as never)
    vi.mocked(prisma.preventiveMaintenance.findUnique).mockResolvedValue(MOCK_PM as never)
    vi.mocked(prisma.pMInspection.count).mockResolvedValue(0)
    vi.mocked(prisma.pMInspection.findMany).mockResolvedValue([])

    const res = await req(
      'GET',
      '/api/fms/preventive-maintenance/pm-1/inspections',
      undefined,
      token
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
    expect(body.pagination.total).toBe(0)
  })
})
