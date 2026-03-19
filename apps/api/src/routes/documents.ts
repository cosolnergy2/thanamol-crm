import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const DOCUMENT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED'] as const
type DocumentStatusValue = (typeof DOCUMENT_STATUSES)[number]

const documentStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('ACTIVE'),
  t.Literal('ARCHIVED'),
  t.Literal('SUPERSEDED'),
])

const createDocumentSchema = t.Object({
  title: t.String({ minLength: 1 }),
  fileUrl: t.String({ minLength: 1 }),
  fileType: t.Optional(t.String()),
  fileSize: t.Optional(t.Number()),
  category: t.Optional(t.String()),
  entityType: t.Optional(t.String()),
  entityId: t.Optional(t.String()),
  tags: t.Optional(t.Array(t.String())),
  version: t.Optional(t.Number()),
})

const updateDocumentSchema = t.Object({
  title: t.Optional(t.String()),
  fileUrl: t.Optional(t.String()),
  fileType: t.Optional(t.String()),
  fileSize: t.Optional(t.Number()),
  category: t.Optional(t.String()),
  entityType: t.Optional(t.String()),
  entityId: t.Optional(t.String()),
  tags: t.Optional(t.Array(t.String())),
  version: t.Optional(t.Number()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const documentsRoutes = new Elysia({ prefix: '/api/documents' })
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

            if (query.category) {
              where.category = query.category
            }

            if (query.entityType) {
              where.entity_type = query.entityType
            }

            if (query.search) {
              where.title = { contains: query.search, mode: 'insensitive' }
            }

            const [total, documents] = await Promise.all([
              prisma.document.count({ where }),
              prisma.document.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  uploader: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
            ])

            return {
              data: documents,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              category: t.Optional(t.String()),
              entityType: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const document = await prisma.document.findUnique({
            where: { id: params.id },
            include: {
              uploader: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!document) {
            set.status = 404
            return { error: 'Document not found' }
          }
          return { document }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser

            const document = await prisma.document.create({
              data: {
                title: body.title,
                file_url: body.fileUrl,
                file_type: body.fileType ?? null,
                file_size: body.fileSize ?? null,
                category: body.category ?? null,
                entity_type: body.entityType ?? null,
                entity_id: body.entityId ?? null,
                tags: body.tags ?? [],
                version: body.version ?? 1,
                uploaded_by: user.id,
              },
            })

            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'Document',
              entityId: document.id,
              ipAddress: getIpAddress(headers),
            })

            set.status = 201
            return { document }
          },
          { body: createDocumentSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.document.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Document not found' }
            }

            const document = await prisma.document.update({
              where: { id: params.id },
              data: {
                title: body.title,
                file_url: body.fileUrl,
                file_type: body.fileType,
                file_size: body.fileSize,
                category: body.category,
                entity_type: body.entityType,
                entity_id: body.entityId,
                tags: body.tags,
                version: body.version,
              },
            })

            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'Document',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })

            return { document }
          },
          { body: updateDocumentSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.document.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Document not found' }
          }

          await prisma.document.delete({ where: { id: params.id } })

          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'Document',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })

          return { success: true }
        })
  )
