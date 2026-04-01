import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    stockTransfer: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma'
import { fmsStockTransfersRoutes } from './stock-transfers'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const app = new Elysia().use(fmsStockTransfersRoutes)

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

const mockTransfer = {
  id: 'transfer-1',
  transfer_number: 'ST-202601-0001',
  source_project_id: 'proj-a',
  destination_project_id: 'proj-b',
  items: [{ item_id: 'item-1', item_code: 'ITM-001', item_name: 'Test Item', quantity: 5, unit_of_measure: 'pcs' }],
  transfer_date: new Date().toISOString(),
  notes: 'Urgent transfer',
  transferred_by: null,
  created_at: new Date().toISOString(),
  source_project: { id: 'proj-a', name: 'Site A', code: 'A' },
  destination_project: { id: 'proj-b', name: 'Site B', code: 'B' },
  transferred_by_user: null,
}

describe('FMS Stock Transfers Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/fms/stock-transfers', () => {
    it('returns 401 without token', async () => {
      const res = await req('GET', '/api/fms/stock-transfers')
      expect(res.status).toBe(401)
    })

    it('returns paginated transfers', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockTransfer.count).mockResolvedValue(1)
      vi.mocked(prisma.stockTransfer.findMany).mockResolvedValue([mockTransfer] as never)

      const token = await signToken()
      const res = await req('GET', '/api/fms/stock-transfers', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
      expect(body.data[0].transfer_number).toBe('ST-202601-0001')
    })

    it('filters by sourceProjectId', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockTransfer.count).mockResolvedValue(0)
      vi.mocked(prisma.stockTransfer.findMany).mockResolvedValue([])

      const token = await signToken()
      await req('GET', '/api/fms/stock-transfers?sourceProjectId=proj-a', undefined, token)

      const countCall = vi.mocked(prisma.stockTransfer.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ source_project_id: 'proj-a' })
    })

    it('filters by destinationProjectId', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockTransfer.count).mockResolvedValue(0)
      vi.mocked(prisma.stockTransfer.findMany).mockResolvedValue([])

      const token = await signToken()
      await req('GET', '/api/fms/stock-transfers?destinationProjectId=proj-b', undefined, token)

      const countCall = vi.mocked(prisma.stockTransfer.count).mock.calls[0][0]
      expect(countCall?.where).toMatchObject({ destination_project_id: 'proj-b' })
    })
  })

  describe('GET /api/fms/stock-transfers/:id', () => {
    it('returns transfer by id', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockTransfer.findUnique).mockResolvedValue(mockTransfer as never)

      const token = await signToken()
      const res = await req('GET', '/api/fms/stock-transfers/transfer-1', undefined, token)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.transfer.id).toBe('transfer-1')
    })

    it('returns 404 for non-existent transfer', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.stockTransfer.findUnique).mockResolvedValue(null)

      const token = await signToken()
      const res = await req('GET', '/api/fms/stock-transfers/nonexistent', undefined, token)

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Stock transfer not found')
    })
  })

  describe('POST /api/fms/stock-transfers', () => {
    it('creates a transfer and records stock movements', async () => {
      const mockInventoryItem = {
        id: 'item-1',
        item_code: 'ITM-001',
        name: 'Test Item',
        unit_of_measure: 'pcs',
        current_stock: 20,
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([mockInventoryItem] as never)
      vi.mocked(prisma.stockTransfer.count).mockResolvedValue(0)
      vi.mocked(prisma.$transaction).mockResolvedValue([mockTransfer])

      const token = await signToken()
      const res = await req(
        'POST',
        '/api/fms/stock-transfers',
        {
          sourceProjectId: 'proj-a',
          destinationProjectId: 'proj-b',
          items: [{ itemId: 'item-1', quantity: 5 }],
          transferDate: '2026-01-15',
          notes: 'Urgent transfer',
        },
        token
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.transfer).toBeDefined()
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('returns 404 when inventory item not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)
      vi.mocked(prisma.inventoryItem.findMany).mockResolvedValue([])

      const token = await signToken()
      const res = await req(
        'POST',
        '/api/fms/stock-transfers',
        {
          items: [{ itemId: 'nonexistent', quantity: 5 }],
          transferDate: '2026-01-15',
        },
        token
      )

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toContain('nonexistent')
    })

    it('returns 422 for missing required fields', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never)

      const token = await signToken()
      const res = await req(
        'POST',
        '/api/fms/stock-transfers',
        { items: [] },
        token
      )

      expect(res.status).toBe(422)
    })

    it('returns 401 without token', async () => {
      const res = await req('POST', '/api/fms/stock-transfers', {
        items: [{ itemId: 'item-1', quantity: 5 }],
        transferDate: '2026-01-15',
      })
      expect(res.status).toBe(401)
    })
  })
})
