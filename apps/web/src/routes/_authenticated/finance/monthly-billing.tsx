import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { FileText, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import type { InvoiceStatus, Invoice } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/finance/monthly-billing')({
  component: MonthlyBillingPage,
})

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-blue-100 text-blue-700 border-blue-200',
  PARTIAL: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-rose-100 text-rose-700 border-rose-200',
  CANCELLED: 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PARTIAL: 'Partial',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
}

function MonthlyBillingPage() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  )

  const { data, isLoading } = useInvoices({ limit: 500 })
  const allInvoices: Invoice[] = data?.data ?? []

  const selectedStart = startOfMonth(parseISO(`${selectedMonth}-01`))
  const selectedEnd = endOfMonth(selectedStart)

  const monthInvoices: Invoice[] = allInvoices.filter((inv: Invoice) => {
    const created = new Date(inv.created_at)
    return created >= selectedStart && created <= selectedEnd
  })

  const totalBilled = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.total, 0)
  const totalTax = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.tax, 0)
  const totalSubtotal = monthInvoices.reduce((sum: number, inv: Invoice) => sum + inv.subtotal, 0)
  const totalPaid = monthInvoices
    .filter((inv: Invoice) => inv.status === 'PAID')
    .reduce((sum: number, inv: Invoice) => sum + inv.total, 0)
  const totalOutstanding = monthInvoices
    .filter((inv: Invoice) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .reduce((sum: number, inv: Invoice) => sum + inv.total, 0)

  const stats = [
    { label: 'Total Billed', value: `฿${totalBilled.toLocaleString()}`, color: 'text-indigo-600' },
    { label: 'Collected', value: `฿${totalPaid.toLocaleString()}`, color: 'text-emerald-600' },
    { label: 'Outstanding', value: `฿${totalOutstanding.toLocaleString()}`, color: 'text-rose-600' },
    { label: 'Invoices', value: monthInvoices.length, color: 'text-slate-600' },
  ]

  return (
    <div className="space-y-3">
      <PageHeader title="Monthly Billing" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-light tracking-wider text-slate-700">
            Billing Month
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-48"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <Card key={i} className="border border-slate-100 bg-white/90">
            <CardContent className="pt-5 pb-5 text-center">
              <p className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                {stat.label}
              </p>
              <p className={`text-3xl font-extralight mt-1.5 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-light tracking-wider text-slate-700">
            <span>
              Invoices for {format(selectedStart, 'MMMM yyyy')}
            </span>
            <div className="flex items-center gap-4 text-xs font-extralight text-slate-500">
              <span>Subtotal: ฿{totalSubtotal.toLocaleString()}</span>
              <span>VAT: ฿{totalTax.toLocaleString()}</span>
              <span className="text-indigo-600 font-light">Total: ฿{totalBilled.toLocaleString()}</span>
            </div>
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
                  Due Date
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Subtotal
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  VAT
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Total
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : monthInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">
                      No invoices for {format(selectedStart, 'MMMM yyyy')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                monthInvoices.map((invoice: Invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-slate-50/50 border-slate-100">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <span className="font-light text-slate-800 text-[11px]">
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-600 font-extralight py-3">
                      {invoice.customer_id}
                    </TableCell>
                    <TableCell className="py-3">
                      {invoice.due_date ? (
                        <span className="text-[10px] text-slate-500 font-extralight">
                          {format(new Date(invoice.due_date), 'd MMM yyyy')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] font-light text-slate-700 py-3">
                      <div className="flex items-center">
                        <DollarSign className="w-3 h-3 text-slate-400 mr-1" />
                        {invoice.subtotal.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] font-light text-slate-500 py-3">
                      ฿{invoice.tax.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-[11px] font-light text-slate-800 py-3">
                      ฿{invoice.total.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={`${STATUS_COLORS[invoice.status] ?? ''} text-[9px] h-4 px-1.5 font-extralight`}
                      >
                        {STATUS_LABELS[invoice.status]}
                      </Badge>
                    </TableCell>
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
