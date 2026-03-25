import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    stockIssue: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inventoryItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsStockIssuesRoutes } from './stock-issues'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsStockIssuesRoutes)

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
  email: 'test@test.com',
  first_name: 'Admin',
  last_name: 'User',
  avatar_url: null,
  phone: null,
  department: null,
  position: null,
  is_active: true,
  roles: [],
}

const mockIssue = {
  id: 'issue-1',
  issue_number: 'SI-202501-0001',
  work_order_id: null,
  project_id: 'proj-1',
  items: [
    { item_id: 'item-1', item_code: 'INV-001', item_name: 'Filter', quantity: 2, unit_cost: 100, unit_of_measure: 'piece' },
  ],
  issued_to: 'user-2',
  issued_by: 'user-1',
  issue_date: new Date().toISOString(),
  notes: 'Test issue',
  created_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Project 1', code: 'P1' },
  issued_to_user: { id: 'user-2', first_name: 'John', last_name: 'Doe' },
  issuer: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
}

describe('FMS Stock Issues Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/fms/stock-issues', () => {
    it('returns paginated stock issues', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockIssue.count).mockResolvedValue(1)
      vi.mocked(prisma.stockIssue.findMany).mockResolvedValue([mockIssue] as never)

      const token = await signToken()
      const res = await req('GET', '/api/fms/stock-issues', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })

    it('filters by projectId', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockIssue.count).mockResolvedValue(0)
      vi.mocked(prisma.stockIssue.findMany).mockResolvedValue([])

      const token = await signToken()
      await req('GET', '/api/fms/stock-issues?projectId=proj-1', undefined, token)

      const countCall = vi.mocked(prisma.stockIssue.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ project_id: 'proj-1' })
    })
  })

  describe('GET /api/fms/stock-issues/:id', () => {
    it('returns 404 for non-existent issue', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockIssue.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await req('GET', '/api/fms/stock-issues/nonexistent', undefined, token)

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Stock issue not found')
    })
  })

  describe('POST /api/fms/stock-issues', () => {
    it('creates a stock issue and deducts inventory', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockIssue.count).mockResolvedValue(0)
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const result = await fn({
          stockIssue: {
            create: vi.fn().mockResolvedValue(mockIssue),
          },
          inventoryItem: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'item-1', current_stock: 10,
            }),
            update: vi.fn(),
          },
          stockMovement: {
            create: vi.fn(),
          },
        } as never)
        return result
      })

      const token = await signToken()
      const res = await req('POST', '/api/fms/stock-issues', {
        projectId: 'proj-1',
        issueDate: '2025-01-15',
        issuedBy: 'user-1',
        items: [
          {
            item_id: 'item-1',
            item_code: 'INV-001',
            item_name: 'Filter',
            quantity: 2,
            unit_cost: 100,
            unit_of_measure: 'piece',
          },
        ],
      }, token)

      expect(res.status).toBe(201)
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('returns 422 for missing required fields', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

      const token = await signToken()
      const res = await req('POST', '/api/fms/stock-issues', { issueDate: '2025-01-15' }, token)

      expect(res.status).toBe(422)
    })
  })

  describe('DELETE /api/fms/stock-issues/:id', () => {
    it('returns 404 for non-existent issue', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockIssue.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await req('DELETE', '/api/fms/stock-issues/nonexistent', undefined, token)

      expect(res.status).toBe(404)
    })

    it('deletes a stock issue', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockIssue.findUnique).mockResolvedValue(mockIssue as never)
      vi.mocked(prisma.stockIssue.delete).mockResolvedValue(mockIssue as never)

      const token = await signToken()
      const res = await req('DELETE', '/api/fms/stock-issues/issue-1', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })
})
