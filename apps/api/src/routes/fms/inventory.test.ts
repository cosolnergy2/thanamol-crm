import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
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
    purchaseRequest: {
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsInventoryRoutes } from './inventory'
import { fmsInventoryCategoriesRoutes } from './inventory-categories'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const inventoryApp = new Elysia().use(fmsInventoryRoutes)
const categoriesApp = new Elysia().use(fmsInventoryCategoriesRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function reqInventory(method: string, path: string, body?: unknown, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return inventoryApp.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

async function reqCategories(method: string, path: string, body?: unknown, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return categoriesApp.handle(
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(1)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([mockItem] as never)

      const token = await signToken()
      const res = await reqInventory('GET', '/api/fms/inventory', undefined, token)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })

    it('filters by projectId', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(0)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([])

      const token = await signToken()
      await reqInventory('GET', '/api/fms/inventory?projectId=proj-1', undefined, token)

      const countCall = vi.mocked(prisma.inventoryItem.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ project_id: 'proj-1' })
    })

    it('filters by search term', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(0)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([])

      const token = await signToken()
      await reqInventory('GET', '/api/fms/inventory?search=filter', undefined, token)

      const countCall = vi.mocked(prisma.inventoryItem.count).mock.calls[0][0]
      expect(countCall?.where).toHaveProperty('OR')
    })
  })

  describe('GET /api/fms/inventory/:id', () => {
    it('returns 404 for non-existent item', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await reqInventory('GET', '/api/fms/inventory/nonexistent', undefined, token)

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Inventory item not found')
    })

    it('returns item with stock movements', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue({
        ...mockItem,
        stock_movements: [],
      } as never)

      const token = await signToken()
      const res = await reqInventory('GET', '/api/fms/inventory/item-1', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.item.id).toBe('item-1')
    })
  })

  describe('POST /api/fms/inventory', () => {
    it('creates a new inventory item with auto-generated code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.count).mockResolvedValue(0)
      vi.mocked(prisma.inventoryItem.create).mockResolvedValue(mockItem as never)

      const token = await signToken()
      const res = await reqInventory('POST', '/api/fms/inventory', {
        name: 'Air Filter',
        unitOfMeasure: 'piece',
        reorderPoint: 5,
        unitCost: 100,
      }, token)

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.item.name).toBe('Air Filter')
    })

    it('returns 422 for missing required name field', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

      const token = await signToken()
      const res = await reqInventory('POST', '/api/fms/inventory', {}, token)

      expect(res.status).toBe(422)
    })
  })

  describe('PUT /api/fms/inventory/:id', () => {
    it('returns 404 when item not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await reqInventory('PUT', '/api/fms/inventory/nonexistent', { name: 'New Name' }, token)

      expect(res.status).toBe(404)
    })

    it('updates an existing item', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(mockItem as never)
      vi.mocked(prisma.inventoryItem.update).mockResolvedValue({
        ...mockItem,
        name: 'Updated Air Filter',
      } as never)

      const token = await signToken()
      const res = await reqInventory('PUT', '/api/fms/inventory/item-1', { name: 'Updated Air Filter' }, token)

      expect(res.status).toBe(200)
    })
  })

  describe('DELETE /api/fms/inventory/:id', () => {
    it('returns 404 when item not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await reqInventory('DELETE', '/api/fms/inventory/nonexistent', undefined, token)

      expect(res.status).toBe(404)
    })

    it('deletes an item successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findUnique).mockResolvedValue(mockItem as never)
      vi.mocked(prisma.inventoryItem.delete).mockResolvedValue(mockItem as never)

      const token = await signToken()
      const res = await reqInventory('DELETE', '/api/fms/inventory/item-1', undefined, token)

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
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryCategory.count).mockResolvedValue(1)
      vi.mocked(prisma.inventoryCategory.findMany).mockResolvedValue([mockCategory] as never)

      const token = await signToken()
      const res = await reqCategories('GET', '/api/fms/inventory-categories', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
    })
  })

  describe('POST /api/fms/inventory-categories', () => {
    it('creates a category', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryCategory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.inventoryCategory.create).mockResolvedValue(mockCategory as never)

      const token = await signToken()
      const res = await reqCategories('POST', '/api/fms/inventory-categories', { name: 'HVAC', code: 'HVAC' }, token)

      expect(res.status).toBe(201)
    })

    it('returns 409 when code already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryCategory.findUnique).mockResolvedValue(mockCategory as never)

      const token = await signToken()
      const res = await reqCategories('POST', '/api/fms/inventory-categories', { name: 'HVAC', code: 'HVAC' }, token)

      expect(res.status).toBe(409)
    })
  })

  describe('DELETE /api/fms/inventory-categories/:id', () => {
    it('prevents deletion with child items', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryCategory.findUnique).mockResolvedValue({
        ...mockCategory,
        _count: { children: 0, items: 3 },
      } as never)

      const token = await signToken()
      const res = await reqCategories('DELETE', '/api/fms/inventory-categories/cat-1', undefined, token)

      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain('items')
    })
  })
})

describe('POST /api/fms/inventory/auto-reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const lowStockItem = {
    ...mockItem,
    current_stock: 2,
    reorder_point: 5,
    reorder_quantity: 20,
    unit_cost: 100,
  }

  it('returns 401 without auth', async () => {
    const res = await reqInventory('POST', '/api/fms/inventory/auto-reorder', {})
    expect(res.status).toBe(401)
  })

  it('returns 400 when no items below reorder point', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([
      { ...mockItem, current_stock: 20, reorder_point: 5 },
    ] as never)

    const token = await signToken()
    const res = await reqInventory('POST', '/api/fms/inventory/auto-reorder', {}, token)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('No items below reorder point')
  })

  it('generates a PR for items at or below reorder point', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
    vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([lowStockItem] as never)
    vi.mocked(prisma.purchaseRequest.count).mockResolvedValue(0)
    vi.mocked(prisma.purchaseRequest.create).mockResolvedValue({
      id: 'pr-1',
      pr_number: 'PR-202501-0001',
      title: 'Auto Reorder',
      status: 'DRAFT',
      estimated_total: 2000,
      created_at: new Date(),
    } as never)

    const token = await signToken()
    const res = await reqInventory('POST', '/api/fms/inventory/auto-reorder', {}, token)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.pr.pr_number).toBe('PR-202501-0001')
    expect(body.itemCount).toBe(1)
  })
})
