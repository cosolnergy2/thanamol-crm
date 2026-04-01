import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { DollarSign, TrendingDown, TrendingUp, BarChart3, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/PageHeader'
import { useFMSBudgetOverviewReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute('/_authenticated/facility-management/budget/overview')({
  component: BudgetOverviewPage,
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

function BudgetOverviewPage() {
  const [fiscalYear, setFiscalYear] = useState<string>('')

  const { data, isLoading } = useFMSBudgetOverviewReport(
    fiscalYear ? Number(fiscalYear) : undefined
  )

  const report = data?.report

  const utilizationPct =
    report && report.totalApprovedAmount > 0
      ? Math.round((report.totalSpent / report.totalApprovedAmount) * 100)
      : 0

  const summaryCards = report
    ? [
        {
          label: 'Total Budgets',
          value: String(report.totalBudgets),
          icon: FileText,
          accent: 'text-indigo-600',
          bg: 'bg-indigo-50',
        },
        {
          label: 'Total Approved',
          value: formatCurrency(report.totalApprovedAmount),
          icon: TrendingUp,
          accent: 'text-teal-600',
          bg: 'bg-teal-50',
        },
        {
          label: 'Total Spent',
          value: formatCurrency(report.totalSpent),
          icon: DollarSign,
          accent: 'text-amber-600',
          bg: 'bg-amber-50',
        },
        {
          label: 'Total Remaining',
          value: formatCurrency(report.totalRemaining),
          icon: TrendingDown,
          accent: report.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600',
          bg: report.totalRemaining >= 0 ? 'bg-green-50' : 'bg-red-50',
        },
      ]
    : []

  return (
    <div className="space-y-4">
      <PageHeader title="Budget Overview" subtitle="Summary of all budgets across fiscal years" />

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

        <Link to="/facility-management/budget/reports">
          <span className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
            View Detailed Reports
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-7 w-32" />
                </CardContent>
              </Card>
            ))
          : summaryCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.label}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-500 font-extralight">{card.label}</p>
                        <p className="text-base font-light text-slate-700 mt-1">{card.value}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${card.bg}`}>
                        <Icon className={`w-4 h-4 ${card.accent}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-light text-slate-600">
                Budget Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-3xl font-light text-slate-700">{utilizationPct}%</span>
                <span className="text-xs text-slate-400 font-light mb-1">of total approved spent</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    utilizationPct > 90
                      ? 'bg-red-500'
                      : utilizationPct > 70
                        ? 'bg-amber-500'
                        : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-light text-slate-600">Budgets by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(report.byStatus).length === 0 ? (
                <p className="text-xs text-slate-400 font-light">No budget data</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(report.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="text-xs text-slate-600 font-light">{status}</span>
                      <span className="text-xs font-medium text-slate-700">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && !report && (
        <Card>
          <CardContent className="py-8 text-center">
            <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 font-light">No budget data found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
