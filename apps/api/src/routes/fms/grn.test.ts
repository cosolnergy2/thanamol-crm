import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { fmsGRNRoutes } from './grn'

vi.mock('../../lib/prisma', () => ({
  prisma: {
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

vi.mock('../../middleware/auth', () => ({
  authPlugin: new Elysia().derive(() => ({
    authUser: { id: 'user-1', email: 'test@test.com' },
  })),
}))

import { prisma } from '../../lib/prisma'

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
      vi.mocked(prisma.goodsReceivedNote.count).mockResolvedValue(1)
      vi.mocked(prisma.goodsReceivedNote.findMany).mockResolvedValue([mockGRN] as never)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(new Request('http://localhost/api/fms/grn'))

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })

    it('filters by status', async () => {
      vi.mocked(prisma.goodsReceivedNote.count).mockResolvedValue(0)
      vi.mocked(prisma.goodsReceivedNote.findMany).mockResolvedValue([])

      const app = new Elysia().use(fmsGRNRoutes)
      await app.handle(new Request('http://localhost/api/fms/grn?status=ACCEPTED'))

      const countCall = vi.mocked(prisma.goodsReceivedNote.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ status: 'ACCEPTED' })
    })
  })

  describe('GET /api/fms/grn/:id', () => {
    it('returns 404 for non-existent GRN', async () => {
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(new Request('http://localhost/api/fms/grn/nonexistent'))

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('GRN not found')
    })
  })

  describe('POST /api/fms/grn', () => {
    it('creates a GRN with DRAFT status', async () => {
      vi.mocked(prisma.goodsReceivedNote.count).mockResolvedValue(0)
      vi.mocked(prisma.goodsReceivedNote.create).mockResolvedValue(mockGRN as never)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          }),
        })
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.grn.status).toBe('DRAFT')
    })

    it('returns 422 for missing required fields', async () => {
      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierName: 'Test' }),
        })
      )

      expect(res.status).toBe(422)
    })
  })

  describe('PATCH /api/fms/grn/:id/accept', () => {
    it('accepts GRN and updates stock', async () => {
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

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn/grn-1/accept', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      )

      expect(res.status).toBe(200)
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('returns 409 when GRN already accepted', async () => {
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue({
        ...mockGRN,
        status: 'ACCEPTED',
      } as never)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn/grn-1/accept', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      )

      expect(res.status).toBe(409)
    })

    it('returns 404 for non-existent GRN', async () => {
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn/nonexistent/accept', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      )

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/fms/grn/:id', () => {
    it('deletes a DRAFT GRN', async () => {
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue(mockGRN as never)
      vi.mocked(prisma.goodsReceivedNote.delete).mockResolvedValue(mockGRN as never)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn/grn-1', { method: 'DELETE' })
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })

    it('prevents deletion of accepted GRN', async () => {
      vi.mocked(prisma.goodsReceivedNote.findUnique).mockResolvedValue({
        ...mockGRN,
        status: 'ACCEPTED',
      } as never)

      const app = new Elysia().use(fmsGRNRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/grn/grn-1', { method: 'DELETE' })
      )

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain('accepted')
    })
  })
})
