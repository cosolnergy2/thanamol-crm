import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const ISO_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED'] as const
type ISODocumentStatusValue = (typeof ISO_STATUSES)[number]

const isoDocumentStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('ACTIVE'),
  t.Literal('ARCHIVED'),
  t.Literal('SUPERSEDED'),
])

const createISODocumentSchema = t.Object({
  documentNumber: t.String({ minLength: 1 }),
  title: t.String({ minLength: 1 }),
  category: t.String({ minLength: 1 }),
  revision: t.String({ minLength: 1 }),
  status: t.Optional(isoDocumentStatusUnion),
  content: t.Optional(t.String()),
  effectiveDate: t.Optional(t.String()),
  reviewDate: t.Optional(t.String()),
  approvedBy: t.Optional(t.String()),
})

const updateISODocumentSchema = t.Object({
  documentNumber: t.Optional(t.String()),
  title: t.Optional(t.String()),
  category: t.Optional(t.String()),
  revision: t.Optional(t.String()),
  status: t.Optional(isoDocumentStatusUnion),
  content: t.Optional(t.String()),
  effectiveDate: t.Optional(t.String()),
  reviewDate: t.Optional(t.String()),
  approvedBy: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const isoDocumentsRoutes = new Elysia({ prefix: '/api/iso-documents' })
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

            if (query.status && ISO_STATUSES.includes(query.status as ISODocumentStatusValue)) {
              where.status = query.status
            }

            if (query.category) {
              where.category = query.category
            }

            if (query.search) {
              where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { document_number: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, isoDocuments] = await Promise.all([
              prisma.iSODocument.count({ where }),
              prisma.iSODocument.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  approver: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
            ])

            return {
              data: isoDocuments,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              category: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const isoDocument = await prisma.iSODocument.findUnique({
            where: { id: params.id },
            include: {
              approver: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!isoDocument) {
            set.status = 404
            return { error: 'ISO Document not found' }
          }
          return { isoDocument }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser

            const isoDocument = await prisma.iSODocument.create({
              data: {
                document_number: body.documentNumber,
                title: body.title,
                category: body.category,
                revision: body.revision,
                status: body.status ?? 'DRAFT',
                content: body.content ?? null,
                effective_date: body.effectiveDate ? new Date(body.effectiveDate) : null,
                review_date: body.reviewDate ? new Date(body.reviewDate) : null,
                approved_by: body.approvedBy ?? null,
              },
            })

            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'ISODocument',
              entityId: isoDocument.id,
              ipAddress: getIpAddress(headers),
            })

            set.status = 201
            return { isoDocument }
          },
          { body: createISODocumentSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.iSODocument.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'ISO Document not found' }
            }

            const isoDocument = await prisma.iSODocument.update({
              where: { id: params.id },
              data: {
                document_number: body.documentNumber,
                title: body.title,
                category: body.category,
                revision: body.revision,
                status: body.status,
                content: body.content,
                effective_date: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
                review_date: body.reviewDate ? new Date(body.reviewDate) : undefined,
                approved_by: body.approvedBy,
              },
            })

            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'ISODocument',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })

            return { isoDocument }
          },
          { body: updateISODocumentSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.iSODocument.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'ISO Document not found' }
          }

          if (existing.status !== 'DRAFT') {
            set.status = 409
            return { error: 'Only DRAFT ISO documents can be deleted' }
          }

          await prisma.iSODocument.delete({ where: { id: params.id } })

          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'ISODocument',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })

          return { success: true }
        })
  )
