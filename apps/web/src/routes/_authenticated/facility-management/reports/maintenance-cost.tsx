import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Wrench, DollarSign, BarChart3 } from 'lucide-react'
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
import { useFMSMaintenanceCostReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/maintenance-cost'
)({
  component: MaintenanceCostReportPage,
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

function MaintenanceCostReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []

  const [projectId, setProjectId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = useFMSMaintenanceCostReport({
    projectId: activeProjectId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  })

  const report = data?.report
  const rows = report?.rows ?? []

  return (
    <div className="space-y-3">
      <PageHeader title="Maintenance Cost" subtitle="Work order costs grouped by month" />

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
              <Label className="text-xs text-slate-500">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44 h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44 h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          Failed to load report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                  Total Cost
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-lg font-light text-slate-800 mt-0.5">
                    {formatCurrency(report?.totalCost ?? 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                  Work Orders
                </p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-light text-slate-800 mt-0.5">
                    {rows.reduce((sum, r) => sum + r.workOrderCount, 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Monthly Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Month
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Work Orders
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Total Cost
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-400 text-xs">
                    No data for the selected period
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.month} className="border-slate-100">
                    <TableCell className="text-[11px] text-slate-700 font-light">
                      {row.month}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {row.workOrderCount}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {formatCurrency(row.totalCost)}
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
