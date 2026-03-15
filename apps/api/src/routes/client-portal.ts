import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const UPDATE_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const
type UpdateRequestStatusValue = typeof UPDATE_REQUEST_STATUSES[number]

const createClientUserSchema = t.Object({
  customerId: t.String({ minLength: 1 }),
  email: t.String({ minLength: 1 }),
  password: t.String({ minLength: 6 }),
  firstName: t.String({ minLength: 1 }),
  lastName: t.String({ minLength: 1 }),
  isActive: t.Optional(t.Boolean()),
})

const updateClientUserSchema = t.Object({
  email: t.Optional(t.String({ minLength: 1 })),
  password: t.Optional(t.String({ minLength: 6 })),
  firstName: t.Optional(t.String({ minLength: 1 })),
  lastName: t.Optional(t.String({ minLength: 1 })),
  isActive: t.Optional(t.Boolean()),
})

const createClientUpdateRequestSchema = t.Object({
  entityType: t.String({ minLength: 1 }),
  entityId: t.String({ minLength: 1 }),
  clientUserId: t.String({ minLength: 1 }),
  requestedChanges: t.Record(t.String(), t.Any()),
})

const updateClientUpdateRequestSchema = t.Object({
  status: t.Union([t.Literal('PENDING'), t.Literal('APPROVED'), t.Literal('REJECTED')]),
  reviewedBy: t.Optional(t.String()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

export const clientPortalRoutes = new Elysia()
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
        // ─── ClientUser endpoints ────────────────────────────────────────────
        .get(
          '/api/clients',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (query.search) {
              where.OR = [
                { first_name: { contains: query.search, mode: 'insensitive' } },
                { last_name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            if (query.isActive !== undefined) {
              where.is_active = query.isActive === 'true'
            }

            const [total, clients] = await Promise.all([
              prisma.clientUser.count({ where }),
              prisma.clientUser.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  customer: { select: { id: true, name: true, email: true, phone: true } },
                },
              }),
            ])

            return {
              data: clients,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              search: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              isActive: t.Optional(t.String()),
            }),
          }
        )
        .get('/api/clients/:id', async ({ params, set }) => {
          const client = await prisma.clientUser.findUnique({
            where: { id: params.id },
            include: {
              customer: { select: { id: true, name: true, email: true, phone: true } },
            },
          })
          if (!client) {
            set.status = 404
            return { error: 'Client not found' }
          }
          return { client }
        })
        .post(
          '/api/clients',
          async ({ body, set }) => {
            const existingEmail = await prisma.clientUser.findUnique({
              where: { email: body.email },
            })
            if (existingEmail) {
              set.status = 409
              return { error: 'Email already in use' }
            }

            const password_hash = await hashPassword(body.password)

            const client = await prisma.clientUser.create({
              data: {
                customer_id: body.customerId,
                email: body.email,
                password_hash,
                first_name: body.firstName,
                last_name: body.lastName,
                is_active: body.isActive ?? true,
              },
              include: {
                customer: { select: { id: true, name: true, email: true, phone: true } },
              },
            })
            set.status = 201
            return { client }
          },
          { body: createClientUserSchema }
        )
        .put(
          '/api/clients/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.clientUser.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Client not found' }
            }

            if (body.email && body.email !== existing.email) {
              const emailTaken = await prisma.clientUser.findUnique({
                where: { email: body.email },
              })
              if (emailTaken) {
                set.status = 409
                return { error: 'Email already in use' }
              }
            }

            const updateData: Record<string, unknown> = {}
            if (body.email !== undefined) updateData.email = body.email
            if (body.firstName !== undefined) updateData.first_name = body.firstName
            if (body.lastName !== undefined) updateData.last_name = body.lastName
            if (body.isActive !== undefined) updateData.is_active = body.isActive
            if (body.password !== undefined) {
              updateData.password_hash = await hashPassword(body.password)
            }

            const client = await prisma.clientUser.update({
              where: { id: params.id },
              data: updateData,
              include: {
                customer: { select: { id: true, name: true, email: true, phone: true } },
              },
            })
            return { client }
          },
          { body: updateClientUserSchema }
        )
        .delete('/api/clients/:id', async ({ params, set }) => {
          const existing = await prisma.clientUser.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Client not found' }
          }
          await prisma.clientUser.delete({ where: { id: params.id } })
          return { success: true }
        })

        // ─── ClientUpdateRequest endpoints ───────────────────────────────────
        .get(
          '/api/client-update-requests',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}

            if (
              query.status &&
              UPDATE_REQUEST_STATUSES.includes(query.status as UpdateRequestStatusValue)
            ) {
              where.status = query.status
            }

            if (query.clientUserId) {
              where.client_user_id = query.clientUserId
            }

            const [total, requests] = await Promise.all([
              prisma.clientUpdateRequest.count({ where }),
              prisma.clientUpdateRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  client_user: {
                    select: { id: true, first_name: true, last_name: true, email: true },
                  },
                  reviewer: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
            ])

            return {
              data: requests,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              clientUserId: t.Optional(t.String()),
            }),
          }
        )
        .get('/api/client-update-requests/:id', async ({ params, set }) => {
          const request = await prisma.clientUpdateRequest.findUnique({
            where: { id: params.id },
            include: {
              client_user: {
                select: { id: true, first_name: true, last_name: true, email: true },
              },
              reviewer: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!request) {
            set.status = 404
            return { error: 'Client update request not found' }
          }
          return { request }
        })
        .post(
          '/api/client-update-requests',
          async ({ body, set }) => {
            const request = await prisma.clientUpdateRequest.create({
              data: {
                entity_type: body.entityType,
                entity_id: body.entityId,
                client_user_id: body.clientUserId,
                requested_changes: body.requestedChanges,
                status: 'PENDING',
              },
              include: {
                client_user: {
                  select: { id: true, first_name: true, last_name: true, email: true },
                },
              },
            })
            set.status = 201
            return { request }
          },
          { body: createClientUpdateRequestSchema }
        )
        .put(
          '/api/client-update-requests/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.clientUpdateRequest.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { error: 'Client update request not found' }
            }

            const request = await prisma.clientUpdateRequest.update({
              where: { id: params.id },
              data: {
                status: body.status,
                reviewed_by: body.reviewedBy ?? null,
              },
              include: {
                client_user: {
                  select: { id: true, first_name: true, last_name: true, email: true },
                },
                reviewer: { select: { id: true, first_name: true, last_name: true } },
              },
            })
            return { request }
          },
          { body: updateClientUpdateRequestSchema }
        )
        .delete('/api/client-update-requests/:id', async ({ params, set }) => {
          const existing = await prisma.clientUpdateRequest.findUnique({
            where: { id: params.id },
          })
          if (!existing) {
            set.status = 404
            return { error: 'Client update request not found' }
          }
          await prisma.clientUpdateRequest.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
