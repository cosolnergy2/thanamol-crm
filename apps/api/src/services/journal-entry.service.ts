import { prisma } from '../lib/prisma'

export async function generateJournalNumber(type: string): Promise<string> {
  const prefix = `JE-${type.substring(0, 3)}-`
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const fullPrefix = `${prefix}${yearMonth}-`
  const count = await prisma.journalEntry.count({
    where: { journal_number: { startsWith: fullPrefix } },
  })
  return `${fullPrefix}${String(count + 1).padStart(4, '0')}`
}

export async function validatePostingPeriod(postingPeriod: string): Promise<{ valid: boolean; error?: string }> {
  const [yearStr, monthStr] = postingPeriod.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (!year || !month || month < 1 || month > 12) {
    return { valid: false, error: 'Invalid posting period format. Use YYYY-MM' }
  }

  const period = await prisma.accountingPeriod.findUnique({
    where: { year_month: { year, month } },
  })

  if (!period) {
    return { valid: true }
  }

  if (period.status === 'HARD_CLOSED') {
    return { valid: false, error: `Period ${postingPeriod} is hard closed. No posting allowed.` }
  }

  if (period.status === 'SOFT_CLOSED') {
    return { valid: false, error: `Period ${postingPeriod} is soft closed. Approval required.` }
  }

  return { valid: true }
}
