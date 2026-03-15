import { createFileRoute } from '@tanstack/react-router'
import { differenceInDays } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/PageHeader'
import { useInvoices } from '@/hooks/useInvoices'
import type { Invoice } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/ar-aging')({
  component: ARAgingPage,
})

type AgingBucket = 'Current' | '1-30' | '31-60' | '61-90' | '90+'

type AgingRow = Invoice & {
  balanceDue: number
  daysOverdue: number
  bucket: AgingBucket
}

const AGING_BUCKETS: AgingBucket[] = ['Current', '1-30', '31-60', '61-90', '90+']

const BUCKET_COLORS: Record<AgingBucket, string> = {
  Current: 'text-slate-600',
  '1-30': 'text-amber-600',
  '31-60': 'text-orange-600',
  '61-90': 'text-rose-600',
  '90+': 'text-red-700',
}

const OVERDUE_DAY_COLORS = (days: number): string => {
  if (days > 90) return 'text-red-700'
  if (days > 60) return 'text-rose-600'
  if (days > 30) return 'text-orange-600'
  if (days > 0) return 'text-amber-600'
  return 'text-slate-600'
}

function classifyBucket(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 0) return 'Current'
  if (daysOverdue <= 30) return '1-30'
  if (daysOverdue <= 60) return '31-60'
  if (daysOverdue <= 90) return '61-90'
  return '90+'
}

function ARAgingPage() {
  const { data, isLoading } = useInvoices({ limit: 200 })

  const invoices = data?.data ?? []

  const unpaidInvoices = invoices.filter(
    (inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED' && inv.due_date,
  )

  const agingRows: AgingRow[] = unpaidInvoices.map((inv) => {
    const daysOverdue = inv.due_date
      ? differenceInDays(new Date(), new Date(inv.due_date))
      : 0
    const balanceDue = inv.total
    const bucket = classifyBucket(daysOverdue)

    return {
      ...inv,
      balanceDue,
      daysOverdue: Math.max(0, daysOverdue),
      bucket,
    }
  })

  const bucketSummary = AGING_BUCKETS.map((bucket) => {
    const rows = agingRows.filter((r: AgingRow) => r.bucket === bucket)
    const total = rows.reduce((sum: number, r: AgingRow) => sum + r.balanceDue, 0)
    return { bucket, count: rows.length, total }
  })

  const totalAR = agingRows.reduce((sum: number, r: AgingRow) => sum + r.balanceDue, 0)

  return (
    <div className="space-y-3">
      <PageHeader title="AR Aging" />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border border-slate-100 bg-white/90">
                <CardContent className="pt-5 pb-5">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))
          : bucketSummary.map((item) => (
              <Card key={item.bucket} className="border border-slate-100 bg-white/90">
                <CardContent className="pt-5 pb-5 text-center">
                  <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                    {item.bucket === 'Current' ? 'Current' : `${item.bucket} days`}
                  </p>
                  <p className={`text-3xl font-extralight mt-1.5 ${BUCKET_COLORS[item.bucket]}`}>
                    ฿{(item.total || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-extralight">
                    {item.count} {item.count === 1 ? 'invoice' : 'invoices'}
                  </p>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-light tracking-wider text-slate-700">
            <span>Unpaid Invoices</span>
            <span className="text-base font-extralight text-indigo-600">
              Total AR: ฿{totalAR.toLocaleString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Invoice No.
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Customer
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Balance Due
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Days Overdue
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Bucket
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : agingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                    <p className="text-slate-600">No outstanding invoices — AR is clear</p>
                  </TableCell>
                </TableRow>
              ) : (
                agingRows
                  .sort((a: AgingRow, b: AgingRow) => b.daysOverdue - a.daysOverdue)
                  .map((row: AgingRow) => (
                    <TableRow key={row.id} className="hover:bg-slate-50/50 border-slate-100">
                      <TableCell className="font-light text-[11px] py-3">
                        {row.invoice_number}
                      </TableCell>
                      <TableCell className="text-[11px] font-light py-3">
                        {row.customer_id}
                      </TableCell>
                      <TableCell className="font-light text-rose-600 text-[11px] py-3">
                        ฿{row.balanceDue.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={`text-[11px] font-light ${OVERDUE_DAY_COLORS(row.daysOverdue)}`}
                        >
                          {row.daysOverdue}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] font-light py-3">{row.bucket}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
