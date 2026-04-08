import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

async function generateWhtNumber(type: string): Promise<string> {
  const prefix = `WHT-${type}-`
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const fullPrefix = `${prefix}${yearMonth}-`
  const count = await prisma.withholdingTaxRecord.count({
    where: { wht_number: { startsWith: fullPrefix } },
  })
  return `${fullPrefix}${String(count + 1).padStart(4, '0')}`
}

export const financeWithholdingTaxRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/withholding-tax',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit
            const where: Record<string, unknown> = {}
            if (query.documentType && query.documentType !== 'all') where.document_type = query.documentType
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.fiscalYear) where.fiscal_year = Number(query.fiscalYear)
            if (query.fiscalMonth) where.fiscal_month = Number(query.fiscalMonth)
            if (query.search) {
              where.OR = [
                { wht_number: { contains: query.search, mode: 'insensitive' } },
                { vendor_name: { contains: query.search, mode: 'insensitive' } },
              ]
            }
            const [total, data] = await Promise.all([
              prisma.withholdingTaxRecord.count({ where }),
              prisma.withholdingTaxRecord.findMany({
                where, skip, take: limit,
                include: { vendor: { select: { id: true, name: true, vendor_code: true } } },
                orderBy: { created_at: 'desc' },
              }),
            ])
            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()), limit: t.Optional(t.String()),
              documentType: t.Optional(t.String()), status: t.Optional(t.String()),
              fiscalYear: t.Optional(t.String()), fiscalMonth: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .post(
          '/withholding-tax',
          async ({ body, authUser }) => {
            const whtNumber = await generateWhtNumber(body.documentType)
            const record = await prisma.withholdingTaxRecord.create({
              data: {
                wht_number: whtNumber,
                document_type: body.documentType as any,
                fiscal_year: body.fiscalYear,
                fiscal_month: body.fiscalMonth,
                vendor_id: body.vendorId,
                vendor_name: body.vendorName,
                tax_id: body.taxId,
                income_type: body.incomeType,
                gross_amount: body.grossAmount,
                wht_rate: body.whtRate,
                wht_amount: body.whtAmount,
                net_amount: body.netAmount,
                payment_date: body.paymentDate ? new Date(body.paymentDate) : null,
                created_by: authUser!.id,
              },
            })
            return { record }
          },
          {
            body: t.Object({
              documentType: t.String({ minLength: 1 }),
              fiscalYear: t.Number(),
              fiscalMonth: t.Number({ minimum: 1, maximum: 12 }),
              vendorId: t.Optional(t.String()),
              vendorName: t.String({ minLength: 1 }),
              taxId: t.Optional(t.String()),
              incomeType: t.Optional(t.String()),
              grossAmount: t.Number({ minimum: 0 }),
              whtRate: t.Number({ minimum: 0 }),
              whtAmount: t.Number({ minimum: 0 }),
              netAmount: t.Number({ minimum: 0 }),
              paymentDate: t.Optional(t.String()),
            }),
          }
        )
        .post('/withholding-tax/:id/issue', async ({ params, set }) => {
          const existing = await prisma.withholdingTaxRecord.findUnique({ where: { id: params.id } })
          if (!existing) { set.status = 404; return { error: 'Record not found' } }
          if (existing.status !== 'DRAFT') { set.status = 400; return { error: 'Only DRAFT records can be issued' } }
          const record = await prisma.withholdingTaxRecord.update({
            where: { id: params.id },
            data: { status: 'ISSUED', certificate_issued: true, certificate_date: new Date() },
          })
          return { record }
        })
        .get(
          '/tax-dashboard',
          async ({ query }) => {
            const now = new Date()
            const period = query.period ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

            const vatAgg = await prisma.vatTransaction.groupBy({
              by: ['transaction_type'],
              _sum: { vat_amount: true },
              where: { period },
            })

            const inputVat = Number(vatAgg.find((v) => v.transaction_type === 'INPUT')?._sum.vat_amount ?? 0)
            const outputVat = Number(vatAgg.find((v) => v.transaction_type === 'OUTPUT')?._sum.vat_amount ?? 0)

            const [yearStr, monthStr] = period.split('-')
            const whtAgg = await prisma.withholdingTaxRecord.aggregate({
              _sum: { wht_amount: true },
              where: { fiscal_year: Number(yearStr), fiscal_month: Number(monthStr), status: { not: 'CANCELLED' } },
            })

            return {
              input_vat: inputVat,
              output_vat: outputVat,
              net_vat: outputVat - inputVat,
              total_wht: Number(whtAgg._sum.wht_amount ?? 0),
              period,
            }
          },
          { query: t.Object({ period: t.Optional(t.String()) }) }
        )
  )
