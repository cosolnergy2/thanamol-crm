import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CheckCircle, AlertTriangle, Clock, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/PageHeader'
import { useCollectionReport } from '@/hooks/useReports'

export const Route = createFileRoute('/_authenticated/reports/collection')({
  component: CollectionReportPage,
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function CollectionReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError } = useCollectionReport({
    from: from || undefined,
    to: to || undefined,
  })

  const summary = data?.summary

  const stats = [
    {
      icon: CreditCard,
      label: 'Total Invoices',
      value: String(summary?.totalInvoices ?? 0),
      sub: undefined,
      color: 'bg-indigo-500',
    },
    {
      icon: CheckCircle,
      label: 'Paid On Time',
      value: String(summary?.paidOnTime ?? 0),
      sub: `On-time rate: ${summary?.onTimePaymentRate ?? 0}%`,
      color: 'bg-teal-500',
    },
    {
      icon: AlertTriangle,
      label: 'Paid Overdue',
      value: String(summary?.paidOverdue ?? 0),
      sub: undefined,
      color: 'bg-rose-500',
    },
    {
      icon: Clock,
      label: 'Pending',
      value: String(summary?.pending ?? 0),
      sub: undefined,
      color: 'bg-amber-500',
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader title="Collection Report" />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">From (due date)</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">To (due date)</Label>
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
          Failed to load collection report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => {
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
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                      <>
                        <p className="text-2xl font-light text-slate-800 mt-0.5">{stat.value}</p>
                        {stat.sub && (
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
              Total Collected
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-light text-teal-700">
                {formatCurrency(summary?.totalCollected ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest mb-1">
              Total Overdue Amount
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-light text-rose-700">
                {formatCurrency(summary?.totalOverdue ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
