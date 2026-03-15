import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { useRevenueReport } from '@/hooks/useReports'

export const Route = createFileRoute('/_authenticated/reports/revenue')({
  component: RevenueReportPage,
})

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
  PARTIAL: 'Partial',
}

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-teal-50 text-teal-700 border-teal-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  SENT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  DRAFT: 'bg-slate-50 text-slate-700 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function RevenueReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError } = useRevenueReport({
    from: from || undefined,
    to: to || undefined,
  })

  const summary = data?.summary
  const byStatus = data?.byStatus ?? []

  return (
    <div className="space-y-3">
      <PageHeader title="Revenue Report" />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-44"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          Failed to load revenue report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: DollarSign,
            label: 'Total Billed',
            value: formatCurrency(summary?.totalBilled ?? 0),
            color: 'bg-indigo-500',
          },
          {
            icon: CheckCircle,
            label: 'Collected',
            value: formatCurrency(summary?.totalCollected ?? 0),
            sub: `Rate: ${summary?.collectionRate ?? 0}%`,
            color: 'bg-teal-500',
          },
          {
            icon: TrendingUp,
            label: 'Outstanding',
            value: formatCurrency(summary?.totalOutstanding ?? 0),
            color: 'bg-amber-500',
          },
          {
            icon: AlertTriangle,
            label: 'Overdue',
            value: formatCurrency(summary?.totalOverdue ?? 0),
            color: 'bg-rose-500',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                      {stat.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-24 mt-1" />
                    ) : (
                      <>
                        <p className="text-lg font-light text-slate-800 mt-0.5">{stat.value}</p>
                        {'sub' in stat && stat.sub && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600">Revenue by Invoice Status</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Invoices
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : byStatus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                    No data for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                byStatus.map((row: { status: string; count: number; total: number }) => (
                  <TableRow key={row.status} className="border-slate-100">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 font-extralight ${STATUS_STYLES[row.status] ?? ''}`}
                      >
                        {STATUS_LABELS[row.status] ?? row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {formatCurrency(row.total)}
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
