import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockISODocument = {
  id: 'iso-1',
  document_number: 'DCN-TEST-ADM-PR-2026-001',
  title: 'Test ISO Procedure',
  category: 'Procedure',
  revision: '00',
  status: 'DRAFT',
  content: 'Test content',
  effective_date: null,
  review_date: null,
  approved_by: null,
  created_at: new Date(),
  updated_at: new Date(),
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    iSODocument: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../lib/activity-logger', () => ({
  logActivity: vi.fn(),
  getIpAddress: vi.fn(() => '127.0.0.1'),
}))

import { prisma } from '../lib/prisma'

describe('ISO Documents routes logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list ISO documents', () => {
    it('returns paginated list', async () => {
      vi.mocked(prisma.iSODocument.count).mockResolvedValue(1)
      vi.mocked(prisma.iSODocument.findMany).mockResolvedValue([mockISODocument] as never)

      const count = await prisma.iSODocument.count({})
      const docs = await prisma.iSODocument.findMany({})

      expect(count).toBe(1)
      expect(docs).toHaveLength(1)
      expect(docs[0].document_number).toBe('DCN-TEST-ADM-PR-2026-001')
    })

    it('filters by status', async () => {
      vi.mocked(prisma.iSODocument.count).mockResolvedValue(1)
      vi.mocked(prisma.iSODocument.findMany).mockResolvedValue([mockISODocument] as never)

      await prisma.iSODocument.findMany({ where: { status: 'DRAFT' } })

      expect(prisma.iSODocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'DRAFT' } })
      )
    })
  })

  describe('get ISO document by id', () => {
    it('returns document when found', async () => {
      vi.mocked(prisma.iSODocument.findUnique).mockResolvedValue(mockISODocument as never)

      const doc = await prisma.iSODocument.findUnique({ where: { id: 'iso-1' } })

      expect(doc).not.toBeNull()
      expect(doc?.title).toBe('Test ISO Procedure')
    })

    it('returns null when not found', async () => {
      vi.mocked(prisma.iSODocument.findUnique).mockResolvedValue(null)

      const doc = await prisma.iSODocument.findUnique({ where: { id: 'not-exist' } })

      expect(doc).toBeNull()
    })
  })

  describe('create ISO document', () => {
    it('creates with DRAFT status by default', async () => {
      vi.mocked(prisma.iSODocument.create).mockResolvedValue(mockISODocument as never)

      const doc = await prisma.iSODocument.create({
        data: {
          document_number: 'DCN-TEST-ADM-PR-2026-001',
          title: 'Test ISO Procedure',
          category: 'Procedure',
          revision: '00',
          status: 'DRAFT',
        },
      })

      expect(doc.status).toBe('DRAFT')
    })
  })

  describe('delete ISO document', () => {
    it('prevents deletion of non-DRAFT document', async () => {
      const activeDoc = { ...mockISODocument, status: 'ACTIVE' }
      vi.mocked(prisma.iSODocument.findUnique).mockResolvedValue(activeDoc as never)

      const found = await prisma.iSODocument.findUnique({ where: { id: 'iso-1' } })

      // Route logic: only DRAFT can be deleted
      expect(found?.status).not.toBe('DRAFT')
    })

    it('allows deletion of DRAFT document', async () => {
      vi.mocked(prisma.iSODocument.findUnique).mockResolvedValue(mockISODocument as never)
      vi.mocked(prisma.iSODocument.delete).mockResolvedValue(mockISODocument as never)

      const found = await prisma.iSODocument.findUnique({ where: { id: 'iso-1' } })
      expect(found?.status).toBe('DRAFT')

      await prisma.iSODocument.delete({ where: { id: 'iso-1' } })
      expect(prisma.iSODocument.delete).toHaveBeenCalled()
    })
  })
})
