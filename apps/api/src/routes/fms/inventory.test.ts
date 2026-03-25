import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { fmsInventoryRoutes } from './inventory'
import { fmsInventoryCategoriesRoutes } from './inventory-categories'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    inventoryItem: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inventoryCategory: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../../middleware/auth', () => ({
  authPlugin: new Elysia().derive(() => ({
    authUser: { id: 'user-1', email: 'test@test.com' },
  })),
}))

import { prisma } from '../../lib/prisma'

const mockItem = {
  id: 'item-1',
  item_code: 'INV-202501-0001',
  name: 'Air Filter',
  description: null,
  category_id: null,
  unit_of_measure: 'piece',
  current_stock: 10,
  minimum_stock: 2,
  maximum_stock: 50,
  reorder_point: 5,
  reorder_quantity: 20,
  unit_cost: 100,
  storage_location: 'Shelf A',
  project_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: null,
  project: null,
}

const mockCategory = {
  id: 'cat-1',
  name: 'HVAC',
  code: 'HVAC',
  description: null,
  parent_id: null,
  created_at: new Date().toISOString(),
  children: [],
  parent: null,
  _count: { items: 0 },
}

describe('FMS Inventory Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/fms/inventory', () => {
    it('returns paginated inventory items', async () => {
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(1)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([mockItem] as never)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory')
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })

    it('filters by projectId', async () => {
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(0)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([])

      const app = new Elysia().use(fmsInventoryRoutes)
      await app.handle(
        new Request('http://localhost/api/fms/inventory?projectId=proj-1')
      )

      const countCall = vi.mocked(prisma.inventoryItem.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ project_id: 'proj-1' })
    })

    it('filters by search term', async () => {
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(0)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([])

      const app = new Elysia().use(fmsInventoryRoutes)
      await app.handle(
        new Request('http://localhost/api/fms/inventory?search=filter')
      )

      const countCall = vi.mocked(prisma.inventoryItem.count).mock.calls[0][0]
      expect(countCall?.where).toHaveProperty('OR')
    })
  })

  describe('GET /api/fms/inventory/:id', () => {
    it('returns 404 for non-existent item', async () => {
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory/nonexistent')
      )

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Inventory item not found')
    })

    it('returns item with stock movements', async () => {
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({
        ...mockItem,
        stock_movements: [],
      } as never)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory/item-1')
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.item.id).toBe('item-1')
    })
  })

  describe('POST /api/fms/inventory', () => {
    it('creates a new inventory item with auto-generated code', async () => {
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(0)
      vi.mocked(prisma.inventoryItem.create).mockResolvedValue(mockItem as never)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Air Filter',
            unitOfMeasure: 'piece',
            reorderPoint: 5,
            unitCost: 100,
          }),
        })
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.item.name).toBe('Air Filter')
    })

    it('returns 422 for missing required name field', async () => {
      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      )

      expect(res.status).toBe(422)
    })
  })

  describe('PUT /api/fms/inventory/:id', () => {
    it('returns 404 when item not found', async () => {
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory/nonexistent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Name' }),
        })
      )

      expect(res.status).toBe(404)
    })

    it('updates an existing item', async () => {
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(mockItem as never)
      vi.mocked(prisma.inventoryItem.update).mockResolvedValue({
        ...mockItem,
        name: 'Updated Air Filter',
      } as never)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory/item-1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated Air Filter' }),
        })
      )

      expect(res.status).toBe(200)
    })
  })

  describe('DELETE /api/fms/inventory/:id', () => {
    it('returns 404 when item not found', async () => {
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory/nonexistent', {
          method: 'DELETE',
        })
      )

      expect(res.status).toBe(404)
    })

    it('deletes an item successfully', async () => {
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(mockItem as never)
      vi.mocked(prisma.inventoryItem.delete).mockResolvedValue(mockItem as never)

      const app = new Elysia().use(fmsInventoryRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory/item-1', {
          method: 'DELETE',
        })
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })
})

describe('FMS Inventory Categories Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/fms/inventory-categories', () => {
    it('returns paginated categories', async () => {
      vi.mocked(prisma.inventoryCategory.count).mockResolvedValue(1)
      vi.mocked(prisma.inventoryCategory.findMany).mockResolvedValue([mockCategory] as never)

      const app = new Elysia().use(fmsInventoryCategoriesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory-categories')
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
    })
  })

  describe('POST /api/fms/inventory-categories', () => {
    it('creates a category', async () => {
      vi.mocked(prisma.inventoryCategory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.inventoryCategory.create).mockResolvedValue(mockCategory as never)

      const app = new Elysia().use(fmsInventoryCategoriesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'HVAC', code: 'HVAC' }),
        })
      )

      expect(res.status).toBe(201)
    })

    it('returns 409 when code already exists', async () => {
      vi.mocked(prisma.inventoryCategory.findUnique).mockResolvedValue(mockCategory as never)

      const app = new Elysia().use(fmsInventoryCategoriesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'HVAC', code: 'HVAC' }),
        })
      )

      expect(res.status).toBe(409)
    })
  })

  describe('DELETE /api/fms/inventory-categories/:id', () => {
    it('prevents deletion with child items', async () => {
      vi.mocked(prisma.inventoryCategory.findUnique).mockResolvedValue({
        ...mockCategory,
        _count: { children: 0, items: 3 },
      } as never)

      const app = new Elysia().use(fmsInventoryCategoriesRoutes)
      const res = await app.handle(
        new Request('http://localhost/api/fms/inventory-categories/cat-1', {
          method: 'DELETE',
        })
      )

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain('items')
    })
  })
})
