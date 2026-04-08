import { Elysia, t } from 'elysia'
import { Prisma } from '../../../generated/prisma/client'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

const INCIDENT_SEVERITIES = ['MINOR', 'MODERATE', 'MAJOR', 'CRITICAL'] as const
const INCIDENT_STATUSES = ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const
type IncidentStatusValue = (typeof INCIDENT_STATUSES)[number]

async function generateIncidentNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INC-${yearMonth}-`

  const count = await prisma.incident.count({
    where: { incident_number: { startsWith: prefix } },
  })

  return `${prefix}${String(count + 1).padStart(4, '0')}`
}

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const incidentInclude = {
  project: { select: { id: true, name: true, code: true } },
  zone: { select: { id: true, name: true } },
  reporter: { select: { id: true, first_name: true, last_name: true } },
}

const createIncidentSchema = t.Object({
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  projectId: t.String({ minLength: 1 }),
  zoneId: t.Optional(t.String()),
  incidentDate: t.String({ minLength: 1 }),
  severity: t.Optional(t.String()),
  reportedBy: t.Optional(t.String()),
  investigationNotes: t.Optional(t.String()),
  rootCause: t.Optional(t.String()),
  correctiveActions: t.Optional(t.Array(t.Unknown())),
  workOrderId: t.Optional(t.String()),
  photos: t.Optional(t.Array(t.Unknown())),
  incidentType: t.Optional(t.String()),
  vendorInvolved: t.Optional(t.String()),
  siteId: t.Optional(t.String()),
  locationDetail: t.Optional(t.String()),
})

const updateIncidentSchema = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  zoneId: t.Optional(t.String()),
  incidentDate: t.Optional(t.String()),
  severity: t.Optional(t.String()),
  status: t.Optional(t.String()),
  investigationNotes: t.Optional(t.String()),
  rootCause: t.Optional(t.String()),
  correctiveActions: t.Optional(t.Array(t.Unknown())),
  workOrderId: t.Optional(t.String()),
  photos: t.Optional(t.Array(t.Unknown())),
  incidentType: t.Optional(t.String()),
  vendorInvolved: t.Optional(t.String()),
  siteId: t.Optional(t.String()),
  locationDetail: t.Optional(t.String()),
})

const VALID_STATUS_TRANSITIONS: Record<IncidentStatusValue, IncidentStatusValue[]> = {
  REPORTED: ['INVESTIGATING', 'CLOSED'],
  INVESTIGATING: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}

export const fmsIncidentsRoutes = new Elysia({ prefix: '/api/fms/incidents' })
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
            if (query.severity && query.severity !== 'all') where.severity = query.severity
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.search) {
              where.OR = [
                { incident_number: { contains: query.search, mode: 'insensitive' } },
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, incidents] = await Promise.all([
              prisma.incident.count({ where }),
              prisma.incident.findMany({
                where,
                skip,
                take: limit,
                orderBy: { incident_date: 'desc' },
                include: incidentInclude,
              }),
            ])

            return { data: incidents, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              projectId: t.Optional(t.String()),
              zoneId: t.Optional(t.String()),
              severity: t.Optional(t.String()),
              status: t.Optional(t.String()),
              search: t.Optional(t.String()),
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const incident = await prisma.incident.findUnique({
            where: { id: params.id },
            include: incidentInclude,
          })
          if (!incident) {
            set.status = 404
            return { error: 'Incident not found' }
          }
          return { incident }
        })
        .post(
          '/',
          async ({ body, set }) => {
            const incidentNumber = await generateIncidentNumber()

            const incident = await prisma.incident.create({
              data: {
                incident_number: incidentNumber,
                title: body.title,
                description: body.description ?? null,
                project_id: body.projectId,
                zone_id: body.zoneId ?? null,
                incident_date: new Date(body.incidentDate),
                severity: (body.severity as typeof INCIDENT_SEVERITIES[number]) ?? 'MINOR',
                reported_by: body.reportedBy ?? null,
                investigation_notes: body.investigationNotes ?? null,
                root_cause: body.rootCause ?? null,
                corrective_actions: (body.correctiveActions ?? []) as Prisma.InputJsonValue,
                work_order_id: body.workOrderId ?? null,
                photos: (body.photos ?? []) as Prisma.InputJsonValue,
                incident_type: body.incidentType ?? null,
                vendor_involved: body.vendorInvolved ?? null,
                site_id: body.siteId ?? null,
                location_detail: body.locationDetail ?? null,
              } as Prisma.IncidentUncheckedCreateInput,
              include: incidentInclude,
            })
            set.status = 201
            return { incident }
          },
          { body: createIncidentSchema }
        )
        .put(
          '/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.incident.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Incident not found' }
            }

            const updateData: Prisma.IncidentUncheckedUpdateInput = {}
            if (body.title !== undefined) updateData.title = body.title
            if (body.description !== undefined) updateData.description = body.description ?? null
            if (body.zoneId !== undefined) updateData.zone_id = body.zoneId ?? null
            if (body.incidentDate !== undefined) updateData.incident_date = new Date(body.incidentDate)
            if (body.severity !== undefined) updateData.severity = body.severity as typeof INCIDENT_SEVERITIES[number]
            if (body.status !== undefined) updateData.status = body.status as typeof INCIDENT_STATUSES[number]
            if (body.investigationNotes !== undefined) updateData.investigation_notes = body.investigationNotes ?? null
            if (body.rootCause !== undefined) updateData.root_cause = body.rootCause ?? null
            if (body.correctiveActions !== undefined) updateData.corrective_actions = body.correctiveActions as Prisma.InputJsonValue
            if (body.workOrderId !== undefined) updateData.work_order_id = body.workOrderId ?? null
            if (body.photos !== undefined) updateData.photos = body.photos as Prisma.InputJsonValue
            if (body.incidentType !== undefined) updateData.incident_type = body.incidentType ?? null
            if (body.vendorInvolved !== undefined) updateData.vendor_involved = body.vendorInvolved ?? null
            if (body.siteId !== undefined) updateData.site_id = body.siteId ?? null
            if (body.locationDetail !== undefined) updateData.location_detail = body.locationDetail ?? null

            const incident = await prisma.incident.update({
              where: { id: params.id },
              data: updateData,
              include: incidentInclude,
            })
            return { incident }
          },
          { body: updateIncidentSchema }
        )
        .patch(
          '/:id/investigate',
          async ({ params, set }) => {
            const incident = await prisma.incident.findUnique({ where: { id: params.id } })
            if (!incident) {
              set.status = 404
              return { error: 'Incident not found' }
            }
            const current = incident.status as IncidentStatusValue
            if (!VALID_STATUS_TRANSITIONS[current].includes('INVESTIGATING')) {
              set.status = 422
              return { error: `Cannot start investigation on incident with status ${incident.status}` }
            }
            const updated = await prisma.incident.update({
              where: { id: params.id },
              data: { status: 'INVESTIGATING' },
              include: incidentInclude,
            })
            return { incident: updated }
          }
        )
        .patch(
          '/:id/resolve',
          async ({ params, body, set }) => {
            const incident = await prisma.incident.findUnique({ where: { id: params.id } })
            if (!incident) {
              set.status = 404
              return { error: 'Incident not found' }
            }
            const current = incident.status as IncidentStatusValue
            if (!VALID_STATUS_TRANSITIONS[current].includes('RESOLVED')) {
              set.status = 422
              return { error: `Cannot resolve incident with status ${incident.status}` }
            }
            const resolveData: Prisma.IncidentUncheckedUpdateInput = { status: 'RESOLVED' }
            if (body.rootCause !== undefined) resolveData.root_cause = body.rootCause ?? null
            if (body.correctiveActions !== undefined) resolveData.corrective_actions = body.correctiveActions as Prisma.InputJsonValue

            const updated = await prisma.incident.update({
              where: { id: params.id },
              data: resolveData,
              include: incidentInclude,
            })
            return { incident: updated }
          },
          {
            body: t.Object({
              rootCause: t.Optional(t.String()),
              correctiveActions: t.Optional(t.Array(t.Unknown())),
            }),
          }
        )
        .patch(
          '/:id/close',
          async ({ params, set }) => {
            const incident = await prisma.incident.findUnique({ where: { id: params.id } })
            if (!incident) {
              set.status = 404
              return { error: 'Incident not found' }
            }
            const current = incident.status as IncidentStatusValue
            if (!VALID_STATUS_TRANSITIONS[current].includes('CLOSED')) {
              set.status = 422
              return { error: `Cannot close incident with status ${incident.status}` }
            }
            const updated = await prisma.incident.update({
              where: { id: params.id },
              data: { status: 'CLOSED' },
              include: incidentInclude,
            })
            return { incident: updated }
          }
        )
        .delete('/:id', async ({ params, set }) => {
          const existing = await prisma.incident.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Incident not found' }
          }
          await prisma.incident.delete({ where: { id: params.id } })
          return { success: true }
        })
  )

export { INCIDENT_SEVERITIES, INCIDENT_STATUSES }
