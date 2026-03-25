import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    goodsReceivedNote: {
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
import { fmsGRNRoutes } from './grn'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsGRNRoutes)

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

const mockGRN = {
  id: 'grn-1',
  grn_number: 'GRN-202501-0001',
  supplier_name: 'Test Supplier',
  items: [
    { item_id: 'item-1', item_code: 'INV-001', item_name: 'Filter', quantity: 10, unit_cost: 100, unit_of_measure: 'piece' },
  ],
  received_date: new Date().toISOString(),
  received_by: 'user-1',
  status: 'DRAFT',
  inspection_notes: null,
  project_id: 'proj-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  project: { id: 'proj-1', name: 'Project 1', code: 'P1' },
  receiver: { id: 'user-1', first_name: 'Admin', last_name: 'User' },
}

describe('FMS GRN Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/fms/grn', () => {
    it('returns paginated GRNs', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.count).mockResolvedValue(1)
      vi.mocked(prisma.goodsReceivedNote.findMany).mockResolvedValue([mockGRN] as never)

      const token = await signToken()
      const res = await req('GET', '/api/fms/grn', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })

    it('filters by status', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.count).mockResolvedValue(0)
      vi.mocked(prisma.goodsReceivedNote.findMany).mockResolvedValue([])

      const token = await signToken()
      await req('GET', '/api/fms/grn?status=ACCEPTED', undefined, token)

      const countCall = vi.mocked(prisma.goodsReceivedNote.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ status: 'ACCEPTED' })
    })
  })

  describe('GET /api/fms/grn/:id', () => {
    it('returns 404 for non-existent GRN', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await req('GET', '/api/fms/grn/nonexistent', undefined, token)

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('GRN not found')
    })
  })

  describe('POST /api/fms/grn', () => {
    it('creates a GRN with DRAFT status', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.count).mockResolvedValue(0)
      vi.mocked(prisma.goodsReceivedNote.create).mockResolvedValue(mockGRN as never)

      const token = await signToken()
      const res = await req('POST', '/api/fms/grn', {
        supplierName: 'Test Supplier',
        receivedDate: '2025-01-15',
        items: [
          {
            item_id: 'item-1',
            item_code: 'INV-001',
            item_name: 'Filter',
            quantity: 10,
            unit_cost: 100,
            unit_of_measure: 'piece',
          },
        ],
      }, token)

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.grn.status).toBe('DRAFT')
    })

    it('returns 422 for missing required fields', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

      const token = await signToken()
      const res = await req('POST', '/api/fms/grn', { supplierName: 'Test' }, token)

      expect(res.status).toBe(422)
    })
  })

  describe('PATCH /api/fms/grn/:id/accept', () => {
    it('accepts GRN and updates stock', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(mockGRN as never)
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        const result = await fn({
          goodsReceivedNote: {
            update: vi.fn().mockResolvedValue({ ...mockGRN, status: 'ACCEPTED' }),
          },
          inventoryItem: {
            findUnique: vi.fn().mockResolvedValue({ id: 'item-1', current_stock: 5 }),
            update: vi.fn(),
          },
          stockMovement: {
            create: vi.fn(),
          },
        } as never)
        return result
      })

      const token = await signToken()
      const res = await req('PATCH', '/api/fms/grn/grn-1/accept', {}, token)

      expect(res.status).toBe(200)
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('returns 409 when GRN already accepted', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue({
        ...mockGRN,
        status: 'ACCEPTED',
      } as never)

      const token = await signToken()
      const res = await req('PATCH', '/api/fms/grn/grn-1/accept', {}, token)

      expect(res.status).toBe(409)
    })

    it('returns 404 for non-existent GRN', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await req('PATCH', '/api/fms/grn/nonexistent/accept', {}, token)

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/fms/grn/:id', () => {
    it('deletes a DRAFT GRN', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(mockGRN as never)
      vi.mocked(prisma.goodsReceivedNote.delete).mockResolvedValue(mockGRN as never)

      const token = await signToken()
      const res = await req('DELETE', '/api/fms/grn/grn-1', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })

    it('prevents deletion of accepted GRN', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue({
        ...mockGRN,
        status: 'ACCEPTED',
      } as never)

      const token = await signToken()
      const res = await req('DELETE', '/api/fms/grn/grn-1', undefined, token)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain('accepted')
    })
  })
})
