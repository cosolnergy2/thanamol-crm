import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

export const financeFixedAssetsRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/fixed-assets/register',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.projectId) where.project_id = query.projectId
            if (query.search) {
              where.OR = [
                { asset_number: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, data] = await Promise.all([
              prisma.asset.count({ where }),
              prisma.asset.findMany({
                where, skip, take: limit,
                include: {
                  project: { select: { id: true, name: true, code: true } },
                  category: { select: { id: true, name: true } },
                },
                orderBy: { asset_number: 'asc' },
              }),
            ])
            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()), limit: t.Optional(t.String()),
              projectId: t.Optional(t.String()), search: t.Optional(t.String()),
            }),
          }
        )
        .get('/fixed-assets/depreciation/:assetId', async ({ params, set }) => {
          const schedules = await prisma.depreciationSchedule.findMany({
            where: { asset_id: params.assetId },
            orderBy: { period: 'asc' },
          })
          const asset = await prisma.asset.findUnique({
            where: { id: params.assetId },
            select: { id: true, name: true, asset_number: true, purchase_cost: true },
          })
          if (!asset) { set.status = 404; return { error: 'Asset not found' } }
          return { asset, schedules }
        })
        .post(
          '/fixed-assets/depreciation/calculate',
          async ({ body, set }) => {
            const assets = await prisma.asset.findMany({
              where: { status: 'OPERATIONAL' },
              include: { depreciation_schedules: { orderBy: { period: 'desc' }, take: 1 } },
            })

            const results: Array<{ assetId: string; assetNumber: string; amount: number }> = []

            for (const asset of assets) {
              const cost = asset.purchase_cost ?? 0
              if (cost <= 0) continue

              // Default straight-line: cost / 60 months (5 years)
              const usefulLifeMonths = 60
              const monthlyDep = cost / usefulLifeMonths

              const lastSchedule = asset.depreciation_schedules[0]
              const accumulated = lastSchedule ? Number(lastSchedule.accumulated_total) : 0
              const remaining = cost - accumulated

              if (remaining <= 0) continue

              const depAmount = Math.min(monthlyDep, remaining)
              const newAccumulated = accumulated + depAmount
              const nbv = cost - newAccumulated

              await prisma.depreciationSchedule.create({
                data: {
                  asset_id: asset.id,
                  period: body.period,
                  depreciation_amount: depAmount,
                  accumulated_total: newAccumulated,
                  net_book_value: nbv,
                },
              })

              results.push({ assetId: asset.id, assetNumber: asset.asset_number, amount: depAmount })
            }

            return { calculated: results.length, results }
          },
          { body: t.Object({ period: t.String({ minLength: 1 }) }) }
        )
        .post(
          '/fixed-assets/depreciation/post',
          async ({ body }) => {
            const updated = await prisma.depreciationSchedule.updateMany({
              where: { period: body.period, is_posted: false },
              data: { is_posted: true },
            })
            return { posted: updated.count }
          },
          { body: t.Object({ period: t.String({ minLength: 1 }) }) }
        )
        // Asset Disposals
        .get('/asset-disposals', async ({ query }) => {
          const page = Number(query.page ?? 1)
          const limit = Number(query.limit ?? 20)
          const skip = (page - 1) * limit
          const [total, data] = await Promise.all([
            prisma.assetDisposal.count(),
            prisma.assetDisposal.findMany({
              skip, take: limit,
              include: {
                asset: { select: { id: true, asset_number: true, name: true } },
                creator: { select: { id: true, first_name: true, last_name: true } },
              },
              orderBy: { disposal_date: 'desc' },
            }),
          ])
          return { data, pagination: buildPagination(page, limit, total) }
        })
        .post(
          '/asset-disposals',
          async ({ body, authUser }) => {
            const prefix = 'DSP-'
            const count = await prisma.assetDisposal.count()
            const disposalNumber = `${prefix}${String(count + 1).padStart(4, '0')}`

            const disposal = await prisma.assetDisposal.create({
              data: {
                disposal_number: disposalNumber,
                asset_id: body.assetId,
                disposal_type: body.disposalType,
                disposal_date: new Date(body.disposalDate),
                disposal_amount: body.disposalAmount ?? 0,
                gain_loss: body.gainLoss ?? 0,
                buyer_info: body.buyerInfo,
                notes: body.notes,
                created_by: authUser!.id,
              },
              include: { asset: { select: { id: true, asset_number: true, name: true } } },
            })

            // Update asset status
            await prisma.asset.update({
              where: { id: body.assetId },
              data: { status: 'DISPOSED' },
            })

            return { disposal }
          },
          {
            body: t.Object({
              assetId: t.String({ minLength: 1 }),
              disposalType: t.String({ minLength: 1 }),
              disposalDate: t.String({ minLength: 1 }),
              disposalAmount: t.Optional(t.Number()),
              gainLoss: t.Optional(t.Number()),
              buyerInfo: t.Optional(t.String()),
              notes: t.Optional(t.String()),
            }),
          }
        )
        // Asset Transfers
        .get('/asset-transfers', async ({ query }) => {
          const page = Number(query.page ?? 1)
          const limit = Number(query.limit ?? 20)
          const skip = (page - 1) * limit
          const [total, data] = await Promise.all([
            prisma.assetTransfer.count(),
            prisma.assetTransfer.findMany({
              skip, take: limit,
              include: {
                asset: { select: { id: true, asset_number: true, name: true } },
                creator: { select: { id: true, first_name: true, last_name: true } },
              },
              orderBy: { transfer_date: 'desc' },
            }),
          ])
          return { data, pagination: buildPagination(page, limit, total) }
        })
        .post(
          '/asset-transfers',
          async ({ body, authUser }) => {
            const prefix = 'TRF-'
            const count = await prisma.assetTransfer.count()
            const transferNumber = `${prefix}${String(count + 1).padStart(4, '0')}`

            const transfer = await prisma.assetTransfer.create({
              data: {
                transfer_number: transferNumber,
                asset_id: body.assetId,
                from_site_id: body.fromSiteId,
                to_site_id: body.toSiteId,
                transfer_date: new Date(body.transferDate),
                reason: body.reason,
                created_by: authUser!.id,
              },
              include: { asset: { select: { id: true, asset_number: true, name: true } } },
            })

            // Update asset project
            if (body.toSiteId) {
              await prisma.asset.update({
                where: { id: body.assetId },
                data: { project_id: body.toSiteId },
              })
            }

            return { transfer }
          },
          {
            body: t.Object({
              assetId: t.String({ minLength: 1 }),
              fromSiteId: t.Optional(t.String()),
              toSiteId: t.Optional(t.String()),
              transferDate: t.String({ minLength: 1 }),
              reason: t.Optional(t.String()),
            }),
          }
        )
  )
