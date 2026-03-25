import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { fmsStockIssuesRoutes } from './stock-issues'

vi.mock('../../lib/prisma', () => ({
  prisma: {
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

vi.mock('../../middleware/auth', () => ({
  authPlugin: new Elysia().derive(() => ({
    authUser: { id: 'user-1', email: 'test@test.com' },
  })),
}))

import { prisma } from '../../lib/prisma'

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
      vi.mocked(prisma.stockIssue.count).mockResolvedValue(1)
      vi.mocked(prisma.stockIssue.findMany).mockResolvedValue([mockIssue] as never)

      const app = new Elysia().use(fmsStockIssuesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/stock-issues')
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })

    it('filters by projectId', async () => {
      vi.mocked(prisma.stockIssue.count).mockResolvedValue(0)
      vi.mocked(prisma.stockIssue.findMany).mockResolvedValue([])

      const app = new Elysia().use(fmsStockIssuesRoutes)
      await app.handle(
        new Request('http://localhost/api/fms/stock-issues?projectId=proj-1')
      )

      const countCall = vi.mocked(prisma.stockIssue.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ project_id: 'proj-1' })
    })
  })

  describe('GET /api/fms/stock-issues/:id', () => {
    it('returns 404 for non-existent issue', async () => {
      vi.mocked(prisma.stockIssue.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsStockIssuesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/stock-issues/nonexistent')
      )

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Stock issue not found')
    })
  })

  describe('POST /api/fms/stock-issues', () => {
    it('creates a stock issue and deducts inventory', async () => {
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

      const app = new Elysia().use(fmsStockIssuesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/stock-issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          }),
        })
      )

      expect(res.status).toBe(201)
      expect(prisma.$transaction).toHaveBeenCalled()
    })

    it('returns 422 for missing required fields', async () => {
      const app = new Elysia().use(fmsStockIssuesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/stock-issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ issueDate: '2025-01-15' }),
        })
      )

      expect(res.status).toBe(422)
    })
  })

  describe('DELETE /api/fms/stock-issues/:id', () => {
    it('returns 404 for non-existent issue', async () => {
      vi.mocked(prisma.stockIssue.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsStockIssuesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/stock-issues/nonexistent', {
          method: 'DELETE',
        })
      )

      expect(res.status).toBe(404)
    })

    it('deletes a stock issue', async () => {
      vi.mocked(prisma.stockIssue.findUnique).mockResolvedValue(mockIssue as never)
      vi.mocked(prisma.stockIssue.delete).mockResolvedValue(mockIssue as never)

      const app = new Elysia().use(fmsStockIssuesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/stock-issues/issue-1', {
          method: 'DELETE',
        })
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })
})
