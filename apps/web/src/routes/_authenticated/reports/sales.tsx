import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { TrendingUp, Trophy, Target, DollarSign } from 'lucide-react'
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
import { useSalesReport } from '@/hooks/useReports'

export const Route = createFileRoute('/_authenticated/reports/sales')({
  component: SalesReportPage,
})

const STAGE_LABELS: Record<string, string> = {
  PROSPECTING: 'Prospecting',
  QUALIFICATION: 'Qualification',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

const STAGE_STYLES: Record<string, string> = {
  CLOSED_WON: 'bg-teal-50 text-teal-700 border-teal-200',
  CLOSED_LOST: 'bg-rose-50 text-rose-700 border-rose-200',
  PROSPECTING: 'bg-slate-50 text-slate-700 border-slate-200',
  QUALIFICATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PROPOSAL: 'bg-amber-50 text-amber-700 border-amber-200',
  NEGOTIATION: 'bg-purple-50 text-purple-700 border-purple-200',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  isLoading,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
  isLoading: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
              {label}
            </p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-light text-slate-800 mt-0.5">{value}</p>
                {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SalesReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isError } = useSalesReport({
    from: from || undefined,
    to: to || undefined,
  })

  const summary = data?.summary
  const byStage = data?.byStage ?? []

  return (
    <div className="space-y-3">
      <PageHeader title="Sales Report" />

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
          Failed to load sales report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={TrendingUp}
          label="Total Deals"
          value={String(summary?.totalDeals ?? 0)}
          color="bg-indigo-500"
          isLoading={isLoading}
        />
        <StatCard
          icon={Trophy}
          label="Deals Won"
          value={String(summary?.dealsWon ?? 0)}
          sub={`Win rate: ${summary?.winRate ?? 0}%`}
          color="bg-teal-500"
          isLoading={isLoading}
        />
        <StatCard
          icon={DollarSign}
          label="Total Won Value"
          value={formatCurrency(summary?.totalWonValue ?? 0)}
          color="bg-emerald-500"
          isLoading={isLoading}
        />
        <StatCard
          icon={Target}
          label="Avg Deal Value"
          value={formatCurrency(summary?.avgDealValue ?? 0)}
          color="bg-amber-500"
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600">Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Stage
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Count
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Total Value
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : byStage.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-400">
                    No data for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                byStage.map((row: { stage: string; count: number; totalValue: number }) => (
                  <TableRow key={row.stage} className="border-slate-100">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-4 px-1.5 font-extralight ${STAGE_STYLES[row.stage] ?? ''}`}
                      >
                        {STAGE_LABELS[row.stage] ?? row.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {row.count}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {formatCurrency(row.totalValue)}
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
