import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

export const financeAccountingPeriodsRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/accounting-periods',
          async ({ query }) => {
            const year = query.year ? Number(query.year) : new Date().getFullYear()

            const periods = await prisma.accountingPeriod.findMany({
              where: { year },
              include: {
                closer: { select: { id: true, first_name: true, last_name: true } },
              },
              orderBy: { month: 'asc' },
            })

            return { data: periods, year }
          },
          {
            query: t.Object({
              year: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/accounting-periods/initialize',
          async ({ body, set }) => {
            const year = body.year

            const existing = await prisma.accountingPeriod.findMany({
              where: { year },
            })
            if (existing.length > 0) {
              set.status = 409
              return { error: `Periods for year ${year} already exist` }
            }

            const periods = await prisma.accountingPeriod.createMany({
              data: Array.from({ length: 12 }, (_, i) => ({
                year,
                month: i + 1,
                status: 'OPEN' as const,
              })),
            })

            const created = await prisma.accountingPeriod.findMany({
              where: { year },
              orderBy: { month: 'asc' },
            })

            return { data: created, count: periods.count }
          },
          {
            body: t.Object({
              year: t.Number({ minimum: 2000, maximum: 2100 }),
            }),
          }
        )
        .patch(
          '/accounting-periods/:id/status',
          async ({ params, body, authUser, set }) => {
            const period = await prisma.accountingPeriod.findUnique({
              where: { id: params.id },
            })
            if (!period) {
              set.status = 404
              return { error: 'Period not found' }
            }

            if (period.status === 'HARD_CLOSED' && body.status !== 'HARD_CLOSED') {
              set.status = 400
              return { error: 'Cannot reopen a hard-closed period' }
            }

            const updated = await prisma.accountingPeriod.update({
              where: { id: params.id },
              data: {
                status: body.status as any,
                closed_by: body.status !== 'OPEN' ? authUser!.id : null,
                closed_at: body.status !== 'OPEN' ? new Date() : null,
              },
              include: {
                closer: { select: { id: true, first_name: true, last_name: true } },
              },
            })

            return { period: updated }
          },
          {
            body: t.Object({
              status: t.String({ minLength: 1 }),
            }),
          }
        )
  )
