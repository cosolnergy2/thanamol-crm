import { Elysia, t } from 'elysia'
import { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const PERMIT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ACTIVE', 'CLOSED', 'REJECTED'] as const
type PermitStatusValue = (typeof PERMIT_STATUSES)[number]

async function generatePermitNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `PTW-${yearMonth}-`

  const count = await prisma.permitToWork.count({
    where: { permit_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const permitInclude = {
  project: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true } },
  requester: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
}

const createPermitSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  permitType: t.Optional(t.String()),
  riskAssessment: t.Optional(t.Array(t.Unknown())),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  requestedBy: t.Optional(t.String()),
  contractorName: t.Optional(t.String()),
  safetyMeasures: t.Optional(t.Array(t.Unknown())),
})

const updatePermitSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  permitType: t.Optional(t.String()),
  riskAssessment: t.Optional(t.Array(t.Unknown())),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  contractorName: t.Optional(t.String()),
  safetyMeasures: t.Optional(t.Array(t.Unknown())),
})

const VALID_TRANSITIONS: Record<PermitStatusValue, PermitStatusValue[]> = {
  DRAFT: ['SUBMITTED', 'REJECTED'],
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
  REJECTED: ['DRAFT'],
}

export const fmsPermitsToWorkRoutes = new Elysia({ prefix: '/api/fms/permits-to-work' })
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

            if (query.projectId) where.project_id = query.projectId
            if (query.zoneId) where.zone_id = query.zoneId
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { permit_number: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
                { contractor_name: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, permits] = await Promise.all([
              prisma.permitToWork.count({ where }),
              prisma.permitToWork.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: permitInclude,
              }),
            ])

            return { data: permits, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              zoneId: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const permit = await prisma.permitToWork.findUnique({
            where: { id: params.id },
            include: permitInclude,
          })
          if (!permit) {
            set.status = 404
            return { error: 'Permit to work not found' }
          }
          return { permit }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const permitNumber = await generatePermitNumber()

            const permit = await prisma.permitToWork.create({
              data: {
                permit_number: permitNumber,
                title: body.title,
                description: body.description ?? null,
                project_id: body.projectId,
                zone_id: body.zoneId ?? null,
                permit_type: body.permitType ?? null,
                risk_assessment: (body.riskAssessment ?? []) as Prisma.InputJsonValue,
                start_date: body.startDate ? new Date(body.startDate) : null,
                end_date: body.endDate ? new Date(body.endDate) : null,
                requested_by: body.requestedBy ?? null,
                contractor_name: body.contractorName ?? null,
                safety_measures: (body.safetyMeasures ?? []) as Prisma.InputJsonValue,
              } as Prisma.PermitToWorkUncheckedCreateInput,
              include: permitInclude,
            })
            set.status = 201
            return { permit }
          },
          { body: createPermitSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.permitToWork.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Permit to work not found' }
            }

            const updateData: Prisma.PermitToWorkUncheckedUpdateInput = {}
            if (body.title !== undefined) updateData.title = body.title
            if (body.description !== undefined) updateData.description = body.description ?? null
            if (body.zoneId !== undefined) updateData.zone_id = body.zoneId ?? null
            if (body.permitType !== undefined) updateData.permit_type = body.permitType ?? null
            if (body.riskAssessment !== undefined) updateData.risk_assessment = body.riskAssessment as Prisma.InputJsonValue
            if (body.startDate !== undefined) updateData.start_date = body.startDate ? new Date(body.startDate) : null
            if (body.endDate !== undefined) updateData.end_date = body.endDate ? new Date(body.endDate) : null
            if (body.contractorName !== undefined) updateData.contractor_name = body.contractorName ?? null
            if (body.safetyMeasures !== undefined) updateData.safety_measures = body.safetyMeasures as Prisma.InputJsonValue

            const permit = await prisma.permitToWork.update({
              where: { id: params.id },
              data: updateData,
              include: permitInclude,
            })
            return { permit }
          },
          { body: updatePermitSchema }
        )
        .patch(
          '/:id/submit',
          async ({ params, authUser, set }) => {
            const permit = await prisma.permitToWork.findUnique({ where: { id: params.id } })
            if (!permit) {
              set.status = 404
              return { error: 'Permit to work not found' }
            }
            if (!VALID_TRANSITIONS[permit.status as PermitStatusValue].includes('SUBMITTED')) {
              set.status = 422
              return { error: `Cannot submit permit with status ${permit.status}` }
            }
            const updated = await prisma.permitToWork.update({
              where: { id: params.id },
              data: {
                status: 'SUBMITTED',
                requested_by: authUser!.id,
              },
              include: permitInclude,
            })
            return { permit: updated }
          }
        )
        .patch(
          '/:id/approve',
          async ({ params, authUser, set }) => {
            const permit = await prisma.permitToWork.findUnique({ where: { id: params.id } })
            if (!permit) {
              set.status = 404
              return { error: 'Permit to work not found' }
            }
            if (!VALID_TRANSITIONS[permit.status as PermitStatusValue].includes('APPROVED')) {
              set.status = 422
              return { error: `Cannot approve permit with status ${permit.status}` }
            }
            const updated = await prisma.permitToWork.update({
              where: { id: params.id },
              data: {
                status: 'APPROVED',
                approved_by: authUser!.id,
              },
              include: permitInclude,
            })
            return { permit: updated }
          }
        )
        .patch(
          '/:id/activate',
          async ({ params, set }) => {
            const permit = await prisma.permitToWork.findUnique({ where: { id: params.id } })
            if (!permit) {
              set.status = 404
              return { error: 'Permit to work not found' }
            }
            if (!VALID_TRANSITIONS[permit.status as PermitStatusValue].includes('ACTIVE')) {
              set.status = 422
              return { error: `Cannot activate permit with status ${permit.status}` }
            }
            const updated = await prisma.permitToWork.update({
              where: { id: params.id },
              data: { status: 'ACTIVE' },
              include: permitInclude,
            })
            return { permit: updated }
          }
        )
        .patch(
          '/:id/close',
          async ({ params, set }) => {
            const permit = await prisma.permitToWork.findUnique({ where: { id: params.id } })
            if (!permit) {
              set.status = 404
              return { error: 'Permit to work not found' }
            }
            if (!VALID_TRANSITIONS[permit.status as PermitStatusValue].includes('CLOSED')) {
              set.status = 422
              return { error: `Cannot close permit with status ${permit.status}` }
            }
            const updated = await prisma.permitToWork.update({
              where: { id: params.id },
              data: { status: 'CLOSED' },
              include: permitInclude,
            })
            return { permit: updated }
          }
        )
        .patch(
          '/:id/reject',
          async ({ params, body, set }) => {
            const permit = await prisma.permitToWork.findUnique({ where: { id: params.id } })
            if (!permit) {
              set.status = 404
              return { error: 'Permit to work not found' }
            }
            if (!VALID_TRANSITIONS[permit.status as PermitStatusValue].includes('REJECTED')) {
              set.status = 422
              return { error: `Cannot reject permit with status ${permit.status}` }
            }
            const updated = await prisma.permitToWork.update({
              where: { id: params.id },
              data: {
                status: 'REJECTED',
                ...(body.reason !== undefined && { description: body.reason ?? null }),
              },
              include: permitInclude,
            })
            return { permit: updated }
          },
          {
            body: t.Object({
              reason: t.Optional(t.String()),
            }),
          }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.permitToWork.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Permit to work not found' }
          }
          await prisma.permitToWork.delete({ where: { id: params.id } })
          return { success: true }
        })
  )

export { PERMIT_STATUSES }
