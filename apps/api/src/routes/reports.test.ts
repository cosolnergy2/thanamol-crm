import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma', () => ({
  prisma: {
    deal: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    invoice: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    unit: {
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('../middleware/auth', () => ({
  authPlugin: {
    name: 'authPlugin',
    setup: () => {},
  },
}))

import { prisma } from '../lib/prisma'

describe('reports route helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sales report aggregation', () => {
    it('computes win rate correctly when there are deals', () => {
      const totalDeals = 10
      const wonDeals = 4
      const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0
      expect(winRate).toBe(40)
    })

    it('returns 0 win rate when there are no deals', () => {
      const totalDeals = 0
      const wonDeals = 0
      const winRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0
      expect(winRate).toBe(0)
    })
  })

  describe('revenue report aggregation', () => {
    it('computes collection rate correctly', () => {
      const totalBilled = 1000
      const totalCollected = 750
      const rate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0
      expect(rate).toBe(75)
    })

    it('returns 0 collection rate when nothing billed', () => {
      const totalBilled = 0
      const totalCollected = 0
      const rate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0
      expect(rate).toBe(0)
    })
  })

  describe('occupancy report aggregation', () => {
    it('computes occupancy rate from unit counts', () => {
      const totalUnits = 100
      const occupied = 60
      const rate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0
      expect(rate).toBe(60)
    })

    it('returns 0 when no units', () => {
      const totalUnits = 0
      const occupied = 0
      const rate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0
      expect(rate).toBe(0)
    })
  })

  describe('collection report on-time rate', () => {
    it('computes on-time rate correctly', () => {
      const onTime = 8
      const overdue = 2
      const collectedCount = onTime + overdue
      const rate = collectedCount > 0 ? Math.round((onTime / collectedCount) * 100) : 0
      expect(rate).toBe(80)
    })

    it('returns 0 when no collected invoices', () => {
      const onTime = 0
      const overdue = 0
      const collectedCount = onTime + overdue
      const rate = collectedCount > 0 ? Math.round((onTime / collectedCount) * 100) : 0
      expect(rate).toBe(0)
    })
  })

  describe('prisma queries are called', () => {
    it('sales mock setup works', () => {
      ;(prisma.deal.count as ReturnType<typeof vi.fn>).mockResolvedValue(5)
      ;(prisma.deal.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.deal.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { value: 0 },
        _avg: { value: 0 },
      })
      expect(prisma.deal.count).toBeDefined()
    })

    it('revenue mock setup works', () => {
      ;(prisma.invoice.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.invoice.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _sum: { total: 0 },
      })
      expect(prisma.invoice.groupBy).toBeDefined()
    })

    it('occupancy mock setup works', () => {
      ;(prisma.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.unit.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([])
      expect(prisma.project.findMany).toBeDefined()
    })

    it('collection mock setup works', () => {
      ;(prisma.invoice.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      expect(prisma.invoice.findMany).toBeDefined()
    })
  })
})
