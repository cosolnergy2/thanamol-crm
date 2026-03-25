import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useProjects } from '@/hooks/useProjects'
import { useFMSBudgetVarianceReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/budget-variance'
)({
  component: BudgetVarianceReportPage,
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function BudgetVarianceReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []

  const [projectId, setProjectId] = useState('')
  const [fiscalYear, setFiscalYear] = useState('')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = useFMSBudgetVarianceReport({
    projectId: activeProjectId,
    fiscalYear: fiscalYear ? Number(fiscalYear) : undefined,
  })

  const report = data?.report
  const rows = report?.rows ?? []

  const currentYear = new Date().getFullYear()
  const fiscalYearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-3">
      <PageHeader title="Budget Variance" subtitle="Approved vs actual spend by budget line" />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Project</Label>
              <Select value={activeProjectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-56 h-8 text-xs">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Fiscal Year</Label>
              <Select
                value={fiscalYear || String(currentYear)}
                onValueChange={(v) => setFiscalYear(v)}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">
                    All years
                  </SelectItem>
                  {fiscalYearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          Failed to load budget variance report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: DollarSign,
            label: 'Total Approved',
            value: formatCurrency(report?.totalApproved ?? 0),
            accent: 'bg-indigo-500',
          },
          {
            icon: DollarSign,
            label: 'Total Actual',
            value: formatCurrency(report?.totalActual ?? 0),
            accent: 'bg-amber-500',
          },
          {
            icon: (report?.totalVariance ?? 0) >= 0 ? TrendingDown : TrendingUp,
            label: 'Total Variance',
            value: formatCurrency(Math.abs(report?.totalVariance ?? 0)),
            accent: (report?.totalVariance ?? 0) >= 0 ? 'bg-teal-500' : 'bg-rose-500',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${stat.accent}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                      {stat.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-6 w-20 mt-1" />
                    ) : (
                      <p className="text-sm font-light text-slate-800 mt-0.5">{stat.value}</p>
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
          <CardTitle className="text-sm font-light text-slate-600">
            Budget Line Variance
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Category
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Approved
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Actual
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Variance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-xs text-slate-400">
                    No budget data found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="border-slate-100">
                    <TableCell>
                      <div>
                        <p className="text-[11px] text-slate-700 font-light">{row.category}</p>
                        {row.description && (
                          <p className="text-[10px] text-slate-400 font-extralight">
                            {row.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {formatCurrency(row.approvedAmount)}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {formatCurrency(row.actualAmount)}
                    </TableCell>
                    <TableCell
                      className={`text-right text-[11px] font-light ${
                        row.variance >= 0 ? 'text-teal-600' : 'text-rose-600'
                      }`}
                    >
                      {row.variance >= 0 ? '+' : ''}
                      {formatCurrency(row.variance)}
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
