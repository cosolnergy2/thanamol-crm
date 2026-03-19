import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const PDF_TEMPLATE_TYPES = ['quotation', 'contract', 'invoice', 'receipt', 'handover'] as const
type PDFTemplateTypeValue = (typeof PDF_TEMPLATE_TYPES)[number]

const pdfTemplateTypeUnion = t.Union([
  t.Literal('quotation'),
  t.Literal('contract'),
  t.Literal('invoice'),
  t.Literal('receipt'),
  t.Literal('handover'),
])

const createPDFTemplateSchema = t.Object({
  name: t.String({ minLength: 1 }),
  templateType: pdfTemplateTypeUnion,
  header: t.Optional(t.Record(t.String(), t.Unknown())),
  footer: t.Optional(t.Record(t.String(), t.Unknown())),
  styles: t.Optional(t.Record(t.String(), t.Unknown())),
  isDefault: t.Optional(t.Boolean()),
})

const updatePDFTemplateSchema = t.Object({
  name: t.Optional(t.String()),
  templateType: t.Optional(pdfTemplateTypeUnion),
  header: t.Optional(t.Record(t.String(), t.Unknown())),
  footer: t.Optional(t.Record(t.String(), t.Unknown())),
  styles: t.Optional(t.Record(t.String(), t.Unknown())),
  isDefault: t.Optional(t.Boolean()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const pdfTemplatesRoutes = new Elysia({ prefix: '/api/pdf-templates' })
  .use(authPlugin)
  .guard(
    {
      beforeHandle({ authUser, set }) {
        if (!authUser) {
          set.status = 401
          return { error: 'Unauthorized' }
        }
      },
    },
    (app) =>
      app
        .get(
          '/',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.type && PDF_TEMPLATE_TYPES.includes(query.type as PDFTemplateTypeValue)) {
              where.template_type = query.type
            }

            const [total, templates] = await Promise.all([
              prisma.pDFTemplateSettings.count({ where }),
              prisma.pDFTemplateSettings.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: templates,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              type: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const template = await prisma.pDFTemplateSettings.findUnique({
            where: { id: params.id },
          })
          if (!template) {
            set.status = 404
            return { error: 'PDF Template not found' }
          }
          return { template }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser

            if (body.isDefault) {
              await prisma.pDFTemplateSettings.updateMany({
                where: { template_type: body.templateType, is_default: true },
                data: { is_default: false },
              })
            }

            const template = await prisma.pDFTemplateSettings.create({
              data: {
                name: body.name,
                template_type: body.templateType,
                header: body.header ?? {},
                footer: body.footer ?? {},
                styles: body.styles ?? {},
                is_default: body.isDefault ?? false,
              },
            })

            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'PDFTemplate',
              entityId: template.id,
              ipAddress: getIpAddress(headers),
            })

            set.status = 201
            return { template }
          },
          { body: createPDFTemplateSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.pDFTemplateSettings.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'PDF Template not found' }
            }

            if (body.isDefault && body.templateType) {
              await prisma.pDFTemplateSettings.updateMany({
                where: {
                  template_type: body.templateType,
                  is_default: true,
                  NOT: { id: params.id },
                },
                data: { is_default: false },
              })
            }

            const template = await prisma.pDFTemplateSettings.update({
              where: { id: params.id },
              data: {
                name: body.name,
                template_type: body.templateType,
                header: body.header,
                footer: body.footer,
                styles: body.styles,
                is_default: body.isDefault,
              },
            })

            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'PDFTemplate',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })

            return { template }
          },
          { body: updatePDFTemplateSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.pDFTemplateSettings.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'PDF Template not found' }
          }

          await prisma.pDFTemplateSettings.delete({ where: { id: params.id } })

          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'PDFTemplate',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })

          return { success: true }
        })
  )
