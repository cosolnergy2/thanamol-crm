import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin } from '../middleware/auth'

const createContactSchema = t.Object({
  customerId: t.String({ minLength: 1 }),
  firstName: t.String({ minLength: 1 }),
  lastName: t.String({ minLength: 1 }),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  position: t.Optional(t.String()),
  isPrimary: t.Optional(t.Boolean()),
})

const updateContactSchema = t.Object({
  firstName: t.Optional(t.String({ minLength: 1 })),
  lastName: t.Optional(t.String({ minLength: 1 })),
  email: t.Optional(t.String()),
  phone: t.Optional(t.String()),
  position: t.Optional(t.String()),
  isPrimary: t.Optional(t.Boolean()),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

async function unsetPrimaryContactsForCustomer(customerId: string, excludeId?: string) {
  const where: Record<string, unknown> = { customer_id: customerId, is_primary: true }
  if (excludeId) {
    where.id = { not: excludeId }
  }
  await prisma.contact.updateMany({ where, data: { is_primary: false } })
}

export const contactsRoutes = new Elysia({ prefix: '/api/contacts' })
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

            if (query.customerId) {
              where.customer_id = query.customerId
            }

            if (query.search) {
              where.OR = [
                { first_name: { contains: query.search, mode: 'insensitive' } },
                { last_name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, contacts] = await Promise.all([
              prisma.contact.count({ where }),
              prisma.contact.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return {
              data: contacts,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              customerId: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const contact = await prisma.contact.findUnique({
            where: { id: params.id },
            include: { customer: true },
          })
          if (!contact) {
            set.status = 404
            return { error: 'Contact not found' }
          }
          return { contact }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const customerExists = await prisma.customer.findUnique({
              where: { id: body.customerId },
            })
            if (!customerExists) {
              set.status = 404
              return { error: 'Customer not found' }
            }

            if (body.isPrimary) {
              await unsetPrimaryContactsForCustomer(body.customerId)
            }

            const contact = await prisma.contact.create({
              data: {
                customer_id: body.customerId,
                first_name: body.firstName,
                last_name: body.lastName,
                email: body.email,
                phone: body.phone,
                position: body.position,
                is_primary: body.isPrimary ?? false,
              },
            })
            set.status = 201
            return { contact }
          },
          { body: createContactSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.contact.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contact not found' }
            }

            if (body.isPrimary) {
              await unsetPrimaryContactsForCustomer(existing.customer_id, params.id)
            }

            const contact = await prisma.contact.update({
              where: { id: params.id },
              data: {
                first_name: body.firstName,
                last_name: body.lastName,
                email: body.email,
                phone: body.phone,
                position: body.position,
                is_primary: body.isPrimary,
              },
            })
            return { contact }
          },
          { body: updateContactSchema }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.contact.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Contact not found' }
          }
          await prisma.contact.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
