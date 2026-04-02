import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/PageHeader'
import { useFMSBudgetVsActualReport, useFMSCostReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute('/_authenticated/facility-management/budget/reports')({
  component: BudgetReportsPage,
})

const CURRENT_YEAR = new Date().getFullYear()
const FISCAL_YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i)

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-500',
}

function BudgetReportsPage() {
  const [fiscalYear, setFiscalYear] = useState<string>('')

  const activeFiscalYear = fiscalYear ? Number(fiscalYear) : undefined

  const { data: vsActualData, isLoading: vsLoading } = useFMSBudgetVsActualReport(activeFiscalYear)
  const { data: costData, isLoading: costLoading } = useFMSCostReport(activeFiscalYear)

  const vsActualReport = vsActualData?.report
  const costReport = costData?.report

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Reports"
        subtitle="Budget vs actual spend and cost breakdown by category"
      />

      <div className="flex items-center gap-3">
        <Select
          value={fiscalYear || 'all'}
          onValueChange={(v) => setFiscalYear(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Fiscal Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fiscal Years</SelectItem>
            {FISCAL_YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                FY {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Budget vs Actual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {vsLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !vsActualReport || vsActualReport.rows.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-light">No budget data found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">FY</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Approved</TableHead>
                    <TableHead className="text-xs text-right">Actual</TableHead>
                    <TableHead className="text-xs text-right">Variance</TableHead>
                    <TableHead className="text-xs text-right">Util %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vsActualReport.rows.map((row) => {
                    const isOverBudget = row.variance < 0
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {row.budgetCode}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700">
                          {row.title}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">{row.fiscalYear}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${STATUS_BADGE[row.status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-600">
                          {formatCurrency(row.totalApproved)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-600">
                          {formatCurrency(row.totalActual)}
                        </TableCell>
                        <TableCell
                          className={`text-xs text-right font-medium ${
                            isOverBudget ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          <span className="flex items-center justify-end gap-1">
                            {isOverBudget ? (
                              <TrendingDown className="w-3 h-3" />
                            ) : (
                              <TrendingUp className="w-3 h-3" />
                            )}
                            {formatCurrency(Math.abs(row.variance))}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-600">
                          {row.utilizationPct}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="border-t bg-slate-50 px-4 py-3 flex flex-wrap gap-6 text-xs text-slate-600">
                <span>
                  Total Approved:{' '}
                  <span className="font-medium">
                    {formatCurrency(vsActualReport.totals.totalApproved)}
                  </span>
                </span>
                <span>
                  Total Actual:{' '}
                  <span className="font-medium">
                    {formatCurrency(vsActualReport.totals.totalActual)}
                  </span>
                </span>
                <span
                  className={
                    vsActualReport.totals.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  Total Variance:{' '}
                  <span className="font-medium">
                    {formatCurrency(vsActualReport.totals.totalVariance)}
                  </span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-500" />
            Cost Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {costLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !costReport || costReport.rows.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-light">No cost data found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Approved</TableHead>
                    <TableHead className="text-xs text-right">Committed</TableHead>
                    <TableHead className="text-xs text-right">Actual Spent</TableHead>
                    <TableHead className="text-xs text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costReport.rows.map((row) => {
                    const pct =
                      costReport.totalActual > 0
                        ? Math.round((row.actual / costReport.totalActual) * 1000) / 10
                        : 0
                    return (
                      <TableRow key={row.category}>
                        <TableCell className="text-xs font-medium text-slate-700">
                          {row.category}
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-500">
                          {formatCurrency(row.approved)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-500">
                          {formatCurrency(row.committed)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-slate-700">
                          {formatCurrency(row.actual)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-slate-500">{pct}%</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="border-t bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Total Actual Spend:{' '}
                <span className="font-medium">{formatCurrency(costReport.totalActual)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
