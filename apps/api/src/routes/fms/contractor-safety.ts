import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const contractorInclude = {
  project: { select: { id: true, name: true, code: true } },
}

const createContractorSchema = t.Object({
  contractorName: t.String({ minLength: 1 }),
  projectId: t.String({ minLength: 1 }),
  safetyInductionDate: t.Optional(t.String()),
  safetyCertUrl: t.Optional(t.String()),
  permitIds: t.Optional(t.Array(t.String())),
  isCleared: t.Optional(t.Boolean()),
  notes: t.Optional(t.String()),
})

const updateContractorSchema = t.Object({
  contractorName: t.Optional(t.String({ minLength: 1 })),
  safetyInductionDate: t.Optional(t.String()),
  safetyCertUrl: t.Optional(t.String()),
  permitIds: t.Optional(t.Array(t.String())),
  isCleared: t.Optional(t.Boolean()),
  notes: t.Optional(t.String()),
})

export const fmsContractorSafetyRoutes = new Elysia({ prefix: '/api/fms/contractor-safety' })
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
            if (query.isCleared !== undefined) {
              where.is_cleared = query.isCleared === 'true'
            }
            if (query.search) {
              where.OR = [
                { contractor_name: { contains: query.search, mode: 'insensitive' } },
                { notes: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, contractors] = await Promise.all([
              prisma.contractorSafety.count({ where }),
              prisma.contractorSafety.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: contractorInclude,
              }),
            ])

            return { data: contractors, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              isCleared: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const contractor = await prisma.contractorSafety.findUnique({
            where: { id: params.id },
            include: contractorInclude,
          })
          if (!contractor) {
            set.status = 404
            return { error: 'Contractor safety record not found' }
          }
          return { contractor }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const contractor = await prisma.contractorSafety.create({
              data: {
                contractor_name: body.contractorName,
                project_id: body.projectId,
                safety_induction_date: body.safetyInductionDate
                  ? new Date(body.safetyInductionDate)
                  : null,
                safety_cert_url: body.safetyCertUrl ?? null,
                permit_ids: body.permitIds ?? [],
                is_cleared: body.isCleared ?? false,
                notes: body.notes ?? null,
              },
              include: contractorInclude,
            })
            set.status = 201
            return { contractor }
          },
          { body: createContractorSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.contractorSafety.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contractor safety record not found' }
            }

            const contractor = await prisma.contractorSafety.update({
              where: { id: params.id },
              data: {
                ...(body.contractorName !== undefined && {
                  contractor_name: body.contractorName,
                }),
                ...(body.safetyInductionDate !== undefined && {
                  safety_induction_date: body.safetyInductionDate
                    ? new Date(body.safetyInductionDate)
                    : null,
                }),
                ...(body.safetyCertUrl !== undefined && {
                  safety_cert_url: body.safetyCertUrl ?? null,
                }),
                ...(body.permitIds !== undefined && { permit_ids: body.permitIds }),
                ...(body.isCleared !== undefined && { is_cleared: body.isCleared }),
                ...(body.notes !== undefined && { notes: body.notes ?? null }),
              },
              include: contractorInclude,
            })
            return { contractor }
          },
          { body: updateContractorSchema }
        )
        .patch(
          '/:id/toggle-clearance',
          async ({ params, set }) => {
            const existing = await prisma.contractorSafety.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Contractor safety record not found' }
            }
            const contractor = await prisma.contractorSafety.update({
              where: { id: params.id },
              data: { is_cleared: !existing.is_cleared },
              include: contractorInclude,
            })
            return { contractor }
          }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.contractorSafety.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Contractor safety record not found' }
          }
          await prisma.contractorSafety.delete({ where: { id: params.id } })
          return { success: true }
        })
  )
