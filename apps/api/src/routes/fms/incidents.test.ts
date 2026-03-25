import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    incident: {
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
import { fmsIncidentsRoutes } from './incidents'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsIncidentsRoutes)

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

const mockIncident = {
  id: 'inc-1',
  incident_number: 'INC-202501-0001',
  title: 'Slip and fall near elevator',
  description: null,
  project_id: 'proj-1',
  zone_id: null,
  incident_date: new Date().toISOString(),
  severity: 'MINOR',
  status: 'REPORTED',
  reported_by: 'user-1',
  investigation_notes: null,
  root_cause: null,
  corrective_actions: [],
  work_order_id: null,
  photos: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Test Project' },
  zone: null,
  reporter: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
})

describe('GET /fms/incidents', () => {
  it('returns 401 without token', async () => {
    const res = await req('GET', '/api/fms/incidents')
    expect(res.status).toBe(401)
  })

  it('returns paginated list with valid token', async () => {
    const token = await signToken()
    ;(prisma.incident.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.incident.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockIncident])

    const res = await req('GET', '/api/fms/incidents', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })
})

describe('POST /fms/incidents', () => {
  it('creates incident with auto-generated number', async () => {
    const token = await signToken()
    ;(prisma.incident.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(prisma.incident.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockIncident)

    const res = await req(
      'POST',
      '/api/fms/incidents',
      {
        title: 'Slip and fall near elevator',
        projectId: 'proj-1',
        incidentDate: new Date().toISOString(),
        severity: 'MINOR',
      },
      token
    )
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.incident.status).toBe('REPORTED')
    expect(data.incident.severity).toBe('MINOR')
  })
})

describe('PATCH /fms/incidents/:id/investigate', () => {
  it('transitions REPORTED to INVESTIGATING', async () => {
    const token = await signToken()
    ;(prisma.incident.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockIncident)
    const investigating = { ...mockIncident, status: 'INVESTIGATING' }
    ;(prisma.incident.update as ReturnType<typeof vi.fn>).mockResolvedValue(investigating)

    const res = await req('PATCH', '/api/fms/incidents/inc-1/investigate', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.incident.status).toBe('INVESTIGATING')
  })

  it('returns 422 when already closed', async () => {
    const token = await signToken()
    ;(prisma.incident.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockIncident,
      status: 'CLOSED',
    })

    const res = await req('PATCH', '/api/fms/incidents/inc-1/investigate', undefined, token)
    expect(res.status).toBe(422)
  })
})

describe('PATCH /fms/incidents/:id/resolve', () => {
  it('transitions INVESTIGATING to RESOLVED', async () => {
    const token = await signToken()
    ;(prisma.incident.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockIncident,
      status: 'INVESTIGATING',
    })
    const resolved = { ...mockIncident, status: 'RESOLVED' }
    ;(prisma.incident.update as ReturnType<typeof vi.fn>).mockResolvedValue(resolved)

    const res = await req('PATCH', '/api/fms/incidents/inc-1/resolve', {}, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.incident.status).toBe('RESOLVED')
  })
})

describe('DELETE /fms/incidents/:id', () => {
  it('returns 404 when not found', async () => {
    const token = await signToken()
    ;(prisma.incident.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await req('DELETE', '/api/fms/incidents/nonexistent', undefined, token)
    expect(res.status).toBe(404)
  })

  it('deletes incident when found', async () => {
    const token = await signToken()
    ;(prisma.incident.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockIncident)
    ;(prisma.incident.delete as ReturnType<typeof vi.fn>).mockResolvedValue(mockIncident)

    const res = await req('DELETE', '/api/fms/incidents/inc-1', undefined, token)
    expect(res.status).toBe(200)
  })
})
