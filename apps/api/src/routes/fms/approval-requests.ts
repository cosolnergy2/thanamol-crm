import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const requestInclude = {
  workflow: {
    select: { id: true, name: true, entity_type: true, steps: true },
  },
  requester: {
    select: { id: true, first_name: true, last_name: true },
  },
}

const createRequestSchema = t.Object({
  entityType: t.String({ minLength: 1 }),
  entityId: t.String({ minLength: 1 }),
  workflowId: t.String({ minLength: 1 }),
  requestedBy: t.String({ minLength: 1 }),
  notes: t.Optional(t.String()),
})

const approveSchema = t.Object({
  userId: t.String({ minLength: 1 }),
  notes: t.Optional(t.String()),
})

const rejectSchema = t.Object({
  userId: t.String({ minLength: 1 }),
  reason: t.String({ minLength: 1 }),
})

export const fmsApprovalRequestsRoutes = new Elysia({
  prefix: '/api/fms/approval-requests',
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
          '/pending',
          async ({ query }) => {
            const page = Math.max(1, Number(query.page ?? 1))
            const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
            const skip = (page - 1) * limit

            const where = {
              status: 'PENDING' as const,
              ...(query.entityType ? { entity_type: query.entityType } : {}),
            }

            const [total, data] = await Promise.all([
              prisma.approvalRequest.count({ where }),
              prisma.approvalRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: requestInclude,
              }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              entityType: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/',
          async ({ body, set }) => {
            const workflow = await prisma.approvalWorkflow.findUnique({
              where: { id: body.workflowId },
            })
            if (!workflow) {
              set.status = 404
              return { message: 'Workflow not found' }
            }
            if (!workflow.is_active) {
              set.status = 400
              return { message: 'Workflow is not active' }
            }

            const requester = await prisma.user.findUnique({
              where: { id: body.requestedBy },
            })
            if (!requester) {
              set.status = 404
              return { message: 'Requester not found' }
            }

            const request = await prisma.approvalRequest.create({
              data: {
                entity_type: body.entityType,
                entity_id: body.entityId,
                workflow_id: body.workflowId,
                requested_by: body.requestedBy,
                notes: body.notes,
                current_step: 0,
                status: 'PENDING',
                history: [],
              },
              include: requestInclude,
            })

            return { request }
          },
          { body: createRequestSchema }
        )
        .get(
          '/:id',
          async ({ params, set }) => {
            const request = await prisma.approvalRequest.findUnique({
              where: { id: params.id },
              include: requestInclude,
            })
            if (!request) {
              set.status = 404
              return { message: 'Approval request not found' }
            }
            return { request }
          },
          { params: t.Object({ id: t.String() }) }
        )
        .post(
          '/:id/approve',
          async ({ params, body, set }) => {
            const request = await prisma.approvalRequest.findUnique({
              where: { id: params.id },
              include: { workflow: true },
            })
            if (!request) {
              set.status = 404
              return { message: 'Approval request not found' }
            }
            if (request.status !== 'PENDING') {
              set.status = 400
              return { message: 'Request is no longer pending' }
            }

            const steps = request.workflow.steps as Array<{
              step: number
              role: string
              threshold?: number
            }>
            const nextStep = request.current_step + 1
            const historyEntry = {
              step: request.current_step,
              action: 'APPROVED',
              user: body.userId,
              date: new Date().toISOString(),
              notes: body.notes,
            }

            const isLastStep = nextStep >= steps.length
            const updated = await prisma.approvalRequest.update({
              where: { id: params.id },
              data: {
                current_step: nextStep,
                status: isLastStep ? 'APPROVED' : 'PENDING',
                history: {
                  push: historyEntry,
                },
              },
              include: requestInclude,
            })

            return { request: updated }
          },
          {
            params: t.Object({ id: t.String() }),
            body: approveSchema,
          }
        )
        .post(
          '/:id/reject',
          async ({ params, body, set }) => {
            const request = await prisma.approvalRequest.findUnique({
              where: { id: params.id },
            })
            if (!request) {
              set.status = 404
              return { message: 'Approval request not found' }
            }
            if (request.status !== 'PENDING') {
              set.status = 400
              return { message: 'Request is no longer pending' }
            }

            const historyEntry = {
              step: request.current_step,
              action: 'REJECTED',
              user: body.userId,
              date: new Date().toISOString(),
              notes: body.reason,
            }

            const updated = await prisma.approvalRequest.update({
              where: { id: params.id },
              data: {
                status: 'REJECTED',
                history: {
                  push: historyEntry,
                },
              },
              include: requestInclude,
            })

            return { request: updated }
          },
          {
            params: t.Object({ id: t.String() }),
            body: rejectSchema,
          }
        )
  )
