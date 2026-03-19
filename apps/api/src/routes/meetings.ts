import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { authPlugin, type AuthenticatedUser } from '../middleware/auth'
import { logActivity, getIpAddress } from '../lib/activity-logger'

const MEETING_STATUSES = ['DRAFT', 'FINALIZED', 'DISTRIBUTED'] as const
type MeetingStatusValue = (typeof MEETING_STATUSES)[number]

const meetingStatusUnion = t.Union([
  t.Literal('DRAFT'),
  t.Literal('FINALIZED'),
  t.Literal('DISTRIBUTED'),
])

const createMeetingSchema = t.Object({
  title: t.String({ minLength: 1 }),
  meetingDate: t.String({ minLength: 1 }),
  location: t.Optional(t.String()),
  attendees: t.Optional(t.Any()),
  agenda: t.Optional(t.Any()),
  minutes: t.Optional(t.Any()),
  actionItems: t.Optional(t.Any()),
  pdfUrl: t.Optional(t.String()),
  status: t.Optional(meetingStatusUnion),
})

const updateMeetingSchema = t.Object({
  title: t.Optional(t.String()),
  meetingDate: t.Optional(t.String()),
  location: t.Optional(t.String()),
  attendees: t.Optional(t.Any()),
  agenda: t.Optional(t.Any()),
  minutes: t.Optional(t.Any()),
  actionItems: t.Optional(t.Any()),
  pdfUrl: t.Optional(t.String()),
  status: t.Optional(meetingStatusUnion),
})

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export const meetingsRoutes = new Elysia({ prefix: '/api/meetings' })
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

            if (query.status && MEETING_STATUSES.includes(query.status as MeetingStatusValue)) {
              where.status = query.status
            }

            const [total, meetings] = await Promise.all([
              prisma.meetingMinute.count({ where }),
              prisma.meetingMinute.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                  creator: { select: { id: true, first_name: true, last_name: true } },
                },
              }),
            ])

            return {
              data: meetings,
              pagination: buildPagination(page, limit, total),
            }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
            }),
          }
        )
        .get('/:id', async ({ params, set }) => {
          const meeting = await prisma.meetingMinute.findUnique({
            where: { id: params.id },
            include: {
              creator: { select: { id: true, first_name: true, last_name: true } },
            },
          })
          if (!meeting) {
            set.status = 404
            return { error: 'Meeting not found' }
          }
          return { meeting }
        })
        .post(
          '/',
          async ({ body, authUser, headers, set }) => {
            const user = authUser as AuthenticatedUser

            const meeting = await prisma.meetingMinute.create({
              data: {
                title: body.title,
                meeting_date: new Date(body.meetingDate),
                location: body.location ?? null,
                attendees: body.attendees ?? [],
                agenda: body.agenda ?? [],
                minutes: body.minutes ?? {},
                action_items: body.actionItems ?? [],
                pdf_url: body.pdfUrl ?? null,
                status: body.status ?? 'DRAFT',
                created_by: user.id,
              },
            })

            logActivity({
              userId: user.id,
              action: 'CREATE',
              entityType: 'MeetingMinute',
              entityId: meeting.id,
              ipAddress: getIpAddress(headers),
            })

            set.status = 201
            return { meeting }
          },
          { body: createMeetingSchema }
        )
        .put(
          '/:id',
          async ({ params, body, authUser, headers, set }) => {
            const existing = await prisma.meetingMinute.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Meeting not found' }
            }

            const meeting = await prisma.meetingMinute.update({
              where: { id: params.id },
              data: {
                title: body.title,
                meeting_date: body.meetingDate ? new Date(body.meetingDate) : undefined,
                location: body.location,
                attendees: body.attendees,
                agenda: body.agenda,
                minutes: body.minutes,
                action_items: body.actionItems,
                pdf_url: body.pdfUrl,
                status: body.status,
              },
            })

            logActivity({
              userId: (authUser as AuthenticatedUser).id,
              action: 'UPDATE',
              entityType: 'MeetingMinute',
              entityId: params.id,
              ipAddress: getIpAddress(headers),
            })

            return { meeting }
          },
          { body: updateMeetingSchema }
        )
        .delete('/:id', async ({ params, authUser, headers, set }) => {
          const existing = await prisma.meetingMinute.findUnique({ where: { id: params.id } })
          if (!existing) {
            set.status = 404
            return { error: 'Meeting not found' }
          }

          await prisma.meetingMinute.delete({ where: { id: params.id } })

          logActivity({
            userId: (authUser as AuthenticatedUser).id,
            action: 'DELETE',
            entityType: 'MeetingMinute',
            entityId: params.id,
            ipAddress: getIpAddress(headers),
          })

          return { success: true }
        })
  )
