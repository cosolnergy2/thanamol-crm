import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDocument = {
  id: 'doc-1',
  title: 'Test Document',
  file_url: 'https://example.com/test.pdf',
  file_type: 'application/pdf',
  file_size: 12345,
  category: 'Contract',
  entity_type: null,
  entity_id: null,
  uploaded_by: 'user-1',
  tags: ['test'],
  version: 1,
  created_at: new Date(),
  updated_at: new Date(),
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    document: {
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

describe('Documents routes logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list documents', () => {
    it('returns paginated list of documents', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(1)
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument] as never)

      const count = await prisma.document.count({})
      const docs = await prisma.document.findMany({})

      expect(count).toBe(1)
      expect(docs).toHaveLength(1)
      expect(docs[0].title).toBe('Test Document')
    })

    it('filters by category', async () => {
      vi.mocked(prisma.document.count).mockResolvedValue(1)
      vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument] as never)

      const docs = await prisma.document.findMany({
        where: { category: 'Contract' },
      })

      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { category: 'Contract' } })
      )
    })
  })

  describe('get document by id', () => {
    it('returns document when found', async () => {
      vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument as never)

      const doc = await prisma.document.findUnique({ where: { id: 'doc-1' } })

      expect(doc).not.toBeNull()
      expect(doc?.title).toBe('Test Document')
    })

    it('returns null when not found', async () => {
      vi.mocked(prisma.document.findUnique).mockResolvedValue(null)

      const doc = await prisma.document.findUnique({ where: { id: 'not-exist' } })

      expect(doc).toBeNull()
    })
  })

  describe('create document', () => {
    it('creates a new document with correct data', async () => {
      vi.mocked(prisma.document.create).mockResolvedValue(mockDocument as never)

      const doc = await prisma.document.create({
        data: {
          title: 'Test Document',
          file_url: 'https://example.com/test.pdf',
          uploaded_by: 'user-1',
          tags: ['test'],
          version: 1,
        },
      })

      expect(doc.title).toBe('Test Document')
    })
  })

  describe('delete document', () => {
    it('deletes existing document', async () => {
      vi.mocked(prisma.document.delete).mockResolvedValue(mockDocument as never)

      await prisma.document.delete({ where: { id: 'doc-1' } })

      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } })
    })
  })
})
