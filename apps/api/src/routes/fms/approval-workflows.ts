import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const workflowStepSchema = t.Object({
  step: t.Number({ minimum: 1 }),
  role: t.String({ minLength: 1 }),
  threshold: t.Optional(t.Number()),
})

const createWorkflowSchema = t.Object({
  entityType: t.String({ minLength: 1 }),
  name: t.String({ minLength: 1 }),
  steps: t.Array(workflowStepSchema, { minItems: 1 }),
  isActive: t.Optional(t.Boolean()),
})

const updateWorkflowSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  steps: t.Optional(t.Array(workflowStepSchema, { minItems: 1 })),
  isActive: t.Optional(t.Boolean()),
})

export const fmsApprovalWorkflowsRoutes = new Elysia({
  prefix: '/api/fms/approval-workflows',
})
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

            const where = {
              ...(query.entityType ? { entity_type: query.entityType } : {}),
              ...(query.isActive !== undefined
                ? { is_active: query.isActive === 'true' }
                : {}),
            }

            const [total, data] = await Promise.all([
              prisma.approvalWorkflow.count({ where }),
              prisma.approvalWorkflow.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
              }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              entityType: t.Optional(t.String()),
              isActive: t.Optional(t.String()),
            }),
          }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const workflow = await prisma.approvalWorkflow.findUnique({
              where: { id: params.id },
              include: { _count: { select: { requests: true } } },
            })
            if (!workflow) {
              set.status = 404
              return { message: 'Workflow not found' }
            }
            return { workflow }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .post(
          '/',
          async ({ body }) => {
            const workflow = await prisma.approvalWorkflow.create({
              data: {
                entity_type: body.entityType,
                name: body.name,
                steps: body.steps,
                is_active: body.isActive ?? true,
              },
            })
            return { workflow }
          },
          { body: createWorkflowSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.approvalWorkflow.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { message: 'Workflow not found' }
            }

            const workflow = await prisma.approvalWorkflow.update({
              where: { id: params.id },
              data: {
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.steps !== undefined ? { steps: body.steps } : {}),
                ...(body.isActive !== undefined ? { is_active: body.isActive } : {}),
              },
            })
            return { workflow }
          },
          {
            params: t.Object({ id: t.String() }),
            body: updateWorkflowSchema,
          }
        )
        .delete(
          '/:id',
          async ({ params, set }) => {
            const existing = await prisma.approvalWorkflow.findUnique({
              where: { id: params.id },
            })
            if (!existing) {
              set.status = 404
              return { message: 'Workflow not found' }
            }

            await prisma.approvalWorkflow.delete({ where: { id: params.id } })
            return { success: true }
          },
          { params: t.Object({ id: t.String() }) }
        )
  )
