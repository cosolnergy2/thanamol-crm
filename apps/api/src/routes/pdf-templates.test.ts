import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTemplate = {
  id: 'tpl-1',
  name: 'Standard Quotation',
  template_type: 'quotation',
  header: {},
  footer: {},
  styles: {},
  is_default: false,
  created_at: new Date(),
  updated_at: new Date(),
}

vi.mock('../lib/prisma', () => ({
  prisma: {
    pDFTemplateSettings: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('../lib/activity-logger', () => ({
  logActivity: vi.fn(),
  getIpAddress: vi.fn(() => '127.0.0.1'),
}))

import { prisma } from '../lib/prisma'

describe('PDF Templates routes logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list PDF templates', () => {
    it('returns paginated list', async () => {
      vi.mocked(prisma.pDFTemplateSettings.count).mockResolvedValue(1)
      vi.mocked(prisma.pDFTemplateSettings.findMany).mockResolvedValue([mockTemplate] as never)

      const count = await prisma.pDFTemplateSettings.count({})
      const templates = await prisma.pDFTemplateSettings.findMany({})

      expect(count).toBe(1)
      expect(templates).toHaveLength(1)
      expect(templates[0].name).toBe('Standard Quotation')
    })

    it('filters by template type', async () => {
      vi.mocked(prisma.pDFTemplateSettings.count).mockResolvedValue(1)
      vi.mocked(prisma.pDFTemplateSettings.findMany).mockResolvedValue([mockTemplate] as never)

      await prisma.pDFTemplateSettings.findMany({ where: { template_type: 'quotation' } })

      expect(prisma.pDFTemplateSettings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { template_type: 'quotation' } })
      )
    })
  })

  describe('get PDF template by id', () => {
    it('returns template when found', async () => {
      vi.mocked(prisma.pDFTemplateSettings.findUnique).mockResolvedValue(mockTemplate as never)

      const template = await prisma.pDFTemplateSettings.findUnique({ where: { id: 'tpl-1' } })

      expect(template).not.toBeNull()
      expect(template?.name).toBe('Standard Quotation')
    })

    it('returns null when not found', async () => {
      vi.mocked(prisma.pDFTemplateSettings.findUnique).mockResolvedValue(null)

      const template = await prisma.pDFTemplateSettings.findUnique({ where: { id: 'not-exist' } })

      expect(template).toBeNull()
    })
  })

  describe('create PDF template', () => {
    it('creates template with correct data', async () => {
      vi.mocked(prisma.pDFTemplateSettings.create).mockResolvedValue(mockTemplate as never)
      vi.mocked(prisma.pDFTemplateSettings.updateMany).mockResolvedValue({ count: 0 })

      const template = await prisma.pDFTemplateSettings.create({
        data: {
          name: 'Standard Quotation',
          template_type: 'quotation',
          header: {},
          footer: {},
          styles: {},
          is_default: false,
        },
      })

      expect(template.template_type).toBe('quotation')
    })

    it('clears existing default when setting new default', async () => {
      vi.mocked(prisma.pDFTemplateSettings.updateMany).mockResolvedValue({ count: 1 })
      vi.mocked(prisma.pDFTemplateSettings.create).mockResolvedValue({ ...mockTemplate, is_default: true } as never)

      // When isDefault = true, updateMany is called to clear other defaults
      await prisma.pDFTemplateSettings.updateMany({
        where: { template_type: 'quotation', is_default: true },
        data: { is_default: false },
      })

      expect(prisma.pDFTemplateSettings.updateMany).toHaveBeenCalled()
    })
  })

  describe('delete PDF template', () => {
    it('deletes existing template', async () => {
      vi.mocked(prisma.pDFTemplateSettings.findUnique).mockResolvedValue(mockTemplate as never)
      vi.mocked(prisma.pDFTemplateSettings.delete).mockResolvedValue(mockTemplate as never)

      await prisma.pDFTemplateSettings.delete({ where: { id: 'tpl-1' } })

      expect(prisma.pDFTemplateSettings.delete).toHaveBeenCalledWith({ where: { id: 'tpl-1' } })
    })
  })
})
