import { Elysia, t } from 'elysia'
import { prisma } from '../../lib/prisma'
import { authPlugin } from '../../middleware/auth'
import { generateJournalNumber, validatePostingPeriod } from '../../services/journal-entry.service'

function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}

const journalInclude = {
  preparer: { select: { id: true, first_name: true, last_name: true } },
  reviewer: { select: { id: true, first_name: true, last_name: true } },
  approver: { select: { id: true, first_name: true, last_name: true } },
}

const journalDetailInclude = {
  ...journalInclude,
  lines: {
    include: {
      account: { select: { account_code: true, account_name_th: true, account_name_en: true } },
    },
    orderBy: { line_number: 'asc' as const },
  },
}

const lineSchema = t.Object({
  accountCode: t.String({ minLength: 1 }),
  debit: t.Number({ minimum: 0 }),
  credit: t.Number({ minimum: 0 }),
  description: t.Optional(t.String()),
  dimensionSite: t.Optional(t.String()),
  dimensionProject: t.Optional(t.String()),
  dimensionDept: t.Optional(t.String()),
})

const createJournalSchema = t.Object({
  journalType: t.String({ minLength: 1 }),
  journalDate: t.String({ minLength: 1 }),
  postingPeriod: t.String({ minLength: 1 }),
  referenceDocument: t.Optional(t.String()),
  narration: t.Optional(t.String()),
  sourceModule: t.Optional(t.String()),
  preparedBy: t.Optional(t.String()),
  lines: t.Array(lineSchema, { minItems: 2 }),
})

const updateJournalSchema = t.Object({
  journalType: t.Optional(t.String()),
  journalDate: t.Optional(t.String()),
  postingPeriod: t.Optional(t.String()),
  referenceDocument: t.Optional(t.String()),
  narration: t.Optional(t.String()),
  lines: t.Optional(t.Array(lineSchema, { minItems: 2 })),
})

export const financeJournalEntriesRoutes = new Elysia({ prefix: '/api/finance' })
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
          '/journal-entries',
          async ({ query }) => {
            const page = Number(query.page ?? 1)
            const limit = Number(query.limit ?? 20)
            const skip = (page - 1) * limit

            const where: Record<string, unknown> = {}
            if (query.journalType && query.journalType !== 'all') where.journal_type = query.journalType
            if (query.status && query.status !== 'all') where.status = query.status
            if (query.postingPeriod) where.posting_period = query.postingPeriod
            if (query.dateFrom || query.dateTo) {
              where.journal_date = {}
              if (query.dateFrom) (where.journal_date as Record<string, unknown>).gte = new Date(query.dateFrom)
              if (query.dateTo) (where.journal_date as Record<string, unknown>).lte = new Date(query.dateTo)
            }
            if (query.search) {
              where.OR = [
                { journal_number: { contains: query.search, mode: 'insensitive' } },
                { narration: { contains: query.search, mode: 'insensitive' } },
                { reference_document: { contains: query.search, mode: 'insensitive' } },
              ]
            }

            const [total, data] = await Promise.all([
              prisma.journalEntry.count({ where }),
              prisma.journalEntry.findMany({
                where,
                include: journalInclude,
                skip,
                take: limit,
                orderBy: [{ journal_date: 'desc' }, { created_at: 'desc' }],
              }),
            ])

            return { data, pagination: buildPagination(page, limit, total) }
          },
          {
            query: t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              journalType: t.Optional(t.String()),
              status: t.Optional(t.String()),
              postingPeriod: t.Optional(t.String()),
              dateFrom: t.Optional(t.String()),
              dateTo: t.Optional(t.String()),
              search: t.Optional(t.String()),
            }),
          }
        )
        .get('/journal-entries/:id', async ({ params, set }) => {
          const journal = await prisma.journalEntry.findUnique({
            where: { id: params.id },
            include: journalDetailInclude,
          })
          if (!journal) {
            set.status = 404
            return { error: 'Journal entry not found' }
          }
          return { journal }
        })
        .post(
          '/journal-entries',
          async ({ body, authUser, set }) => {
            const totalDebit = body.lines.reduce((sum, l) => sum + l.debit, 0)
            const totalCredit = body.lines.reduce((sum, l) => sum + l.credit, 0)

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
              set.status = 400
              return { error: `Debits (${totalDebit}) must equal credits (${totalCredit})` }
            }

            const periodCheck = await validatePostingPeriod(body.postingPeriod)
            if (!periodCheck.valid) {
              set.status = 400
              return { error: periodCheck.error }
            }

            for (const line of body.lines) {
              const account = await prisma.chartOfAccount.findUnique({
                where: { account_code: line.accountCode },
              })
              if (!account) {
                set.status = 400
                return { error: `Account ${line.accountCode} not found` }
              }
              if (!account.is_active) {
                set.status = 400
                return { error: `Account ${line.accountCode} is inactive` }
              }
            }

            const journalNumber = await generateJournalNumber(body.journalType)

            const journal = await prisma.journalEntry.create({
              data: {
                journal_number: journalNumber,
                journal_type: body.journalType as any,
                journal_date: new Date(body.journalDate),
                posting_period: body.postingPeriod,
                reference_document: body.referenceDocument,
                narration: body.narration,
                source_module: body.sourceModule,
                status: 'DRAFT',
                total_debit: totalDebit,
                total_credit: totalCredit,
                prepared_by: body.preparedBy ?? authUser!.id,
                lines: {
                  create: body.lines.map((l, i) => ({
                    line_number: i + 1,
                    account_code: l.accountCode,
                    debit: l.debit,
                    credit: l.credit,
                    description: l.description,
                    dimension_site: l.dimensionSite,
                    dimension_project: l.dimensionProject,
                    dimension_dept: l.dimensionDept,
                  })),
                },
              },
              include: journalDetailInclude,
            })

            return { journal }
          },
          { body: createJournalSchema }
        )
        .put(
          '/journal-entries/:id',
          async ({ params, body, set }) => {
            const existing = await prisma.journalEntry.findUnique({ where: { id: params.id } })
            if (!existing) {
              set.status = 404
              return { error: 'Journal entry not found' }
            }
            if (existing.status !== 'DRAFT') {
              set.status = 400
              return { error: 'Only DRAFT journal entries can be edited' }
            }

            const data: Record<string, unknown> = {}
            if (body.journalType) data.journal_type = body.journalType
            if (body.journalDate) data.journal_date = new Date(body.journalDate)
            if (body.postingPeriod) data.posting_period = body.postingPeriod
            if (body.referenceDocument !== undefined) data.reference_document = body.referenceDocument
            if (body.narration !== undefined) data.narration = body.narration

            if (body.lines) {
              const totalDebit = body.lines.reduce((sum, l) => sum + l.debit, 0)
              const totalCredit = body.lines.reduce((sum, l) => sum + l.credit, 0)
              if (Math.abs(totalDebit - totalCredit) > 0.01) {
                set.status = 400
                return { error: `Debits (${totalDebit}) must equal credits (${totalCredit})` }
              }
              data.total_debit = totalDebit
              data.total_credit = totalCredit

              await prisma.journalEntryLine.deleteMany({ where: { journal_entry_id: params.id } })
              await prisma.journalEntryLine.createMany({
                data: body.lines.map((l, i) => ({
                  journal_entry_id: params.id,
                  line_number: i + 1,
                  account_code: l.accountCode,
                  debit: l.debit,
                  credit: l.credit,
                  description: l.description,
                  dimension_site: l.dimensionSite,
                  dimension_project: l.dimensionProject,
                  dimension_dept: l.dimensionDept,
                })),
              })
            }

            const journal = await prisma.journalEntry.update({
              where: { id: params.id },
              data,
              include: journalDetailInclude,
            })

            return { journal }
          },
          { body: updateJournalSchema }
        )
        .post('/journal-entries/:id/submit', async ({ params, set }) => {
          const existing = await prisma.journalEntry.findUnique({ where: { id: params.id } })
          if (!existing) { set.status = 404; return { error: 'Journal entry not found' } }
          if (existing.status !== 'DRAFT') { set.status = 400; return { error: 'Only DRAFT entries can be submitted' } }

          const journal = await prisma.journalEntry.update({
            where: { id: params.id },
            data: { status: 'SUBMITTED' },
            include: journalDetailInclude,
          })
          return { journal }
        })
        .post(
          '/journal-entries/:id/approve',
          async ({ params, authUser, set }) => {
            const existing = await prisma.journalEntry.findUnique({ where: { id: params.id } })
            if (!existing) { set.status = 404; return { error: 'Journal entry not found' } }
            if (existing.status !== 'SUBMITTED') { set.status = 400; return { error: 'Only SUBMITTED entries can be approved' } }

            const journal = await prisma.journalEntry.update({
              where: { id: params.id },
              data: { status: 'APPROVED', approved_by: authUser!.id },
              include: journalDetailInclude,
            })
            return { journal }
          }
        )
        .post('/journal-entries/:id/post', async ({ params, set }) => {
          const existing = await prisma.journalEntry.findUnique({ where: { id: params.id } })
          if (!existing) { set.status = 404; return { error: 'Journal entry not found' } }
          if (existing.status !== 'APPROVED') { set.status = 400; return { error: 'Only APPROVED entries can be posted' } }

          const periodCheck = await validatePostingPeriod(existing.posting_period)
          if (!periodCheck.valid) { set.status = 400; return { error: periodCheck.error } }

          const journal = await prisma.journalEntry.update({
            where: { id: params.id },
            data: { status: 'POSTED', posted_at: new Date() },
            include: journalDetailInclude,
          })
          return { journal }
        })
        .post('/journal-entries/:id/cancel', async ({ params, set }) => {
          const existing = await prisma.journalEntry.findUnique({ where: { id: params.id } })
          if (!existing) { set.status = 404; return { error: 'Journal entry not found' } }
          if (existing.status === 'POSTED') { set.status = 400; return { error: 'Posted entries cannot be cancelled. Create a reversing entry instead.' } }
          if (existing.status === 'CANCELLED') { set.status = 400; return { error: 'Entry is already cancelled' } }

          const journal = await prisma.journalEntry.update({
            where: { id: params.id },
            data: { status: 'CANCELLED' },
            include: journalDetailInclude,
          })
          return { journal }
        })
        .post('/journal-entries/:id/reverse', async ({ params, authUser, set }) => {
          const existing = await prisma.journalEntry.findUnique({
            where: { id: params.id },
            include: { lines: true },
          })
          if (!existing) { set.status = 404; return { error: 'Journal entry not found' } }
          if (existing.status !== 'POSTED') { set.status = 400; return { error: 'Only POSTED entries can be reversed' } }

          const journalNumber = await generateJournalNumber('REV')
          const postingPeriod = new Date().toISOString().slice(0, 7)

          const periodCheck = await validatePostingPeriod(postingPeriod)
          if (!periodCheck.valid) { set.status = 400; return { error: periodCheck.error } }

          const reversal = await prisma.journalEntry.create({
            data: {
              journal_number: journalNumber,
              journal_type: 'REVERSING',
              journal_date: new Date(),
              posting_period: postingPeriod,
              reference_document: existing.journal_number,
              narration: `Reversal of ${existing.journal_number}`,
              source_module: existing.source_module,
              status: 'DRAFT',
              total_debit: Number(existing.total_credit),
              total_credit: Number(existing.total_debit),
              prepared_by: authUser!.id,
              lines: {
                create: existing.lines.map((l, i) => ({
                  line_number: i + 1,
                  account_code: l.account_code,
                  debit: Number(l.credit),
                  credit: Number(l.debit),
                  description: `Reversal: ${l.description ?? ''}`.trim(),
                  dimension_site: l.dimension_site,
                  dimension_project: l.dimension_project,
                  dimension_dept: l.dimension_dept,
                })),
              },
            },
            include: journalDetailInclude,
          })

          return { journal: reversal }
        })
  )
