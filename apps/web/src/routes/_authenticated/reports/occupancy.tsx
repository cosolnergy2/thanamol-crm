import { createFileRoute } from '@tanstack/react-router'
import { Building2, Home, CheckCircle, TrendingUp } from 'lucide-react'
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
import { PageHeader } from '@/components/PageHeader'
import { useOccupancyReport } from '@/hooks/useReports'
import type { ProjectOccupancy } from '@thanamol/shared'

export const Route = createFileRoute('/_authenticated/reports/occupancy')({
  component: OccupancyReportPage,
})

function OccupancyBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-full h-1.5 transition-all"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-600 w-8 text-right">{rate}%</span>
    </div>
  )
}

function OccupancyReportPage() {
  const { data, isLoading, isError } = useOccupancyReport()

  const summary = data?.summary
  const byProject = data?.byProject ?? []

  return (
    <div className="space-y-3">
      <PageHeader title="Occupancy Report" />

      {isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          Failed to load occupancy report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: Building2,
            label: 'Projects',
            value: String(summary?.totalProjects ?? 0),
            color: 'bg-indigo-500',
          },
          {
            icon: Home,
            label: 'Total Units',
            value: String(summary?.totalUnits ?? 0),
            color: 'bg-slate-500',
          },
          {
            icon: CheckCircle,
            label: 'Occupied',
            value: String(summary?.totalOccupied ?? 0),
            color: 'bg-teal-500',
          },
          {
            icon: TrendingUp,
            label: 'Overall Rate',
            value: `${summary?.overallOccupancyRate ?? 0}%`,
            color: 'bg-emerald-500',
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
                  <div>
                    <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                      {stat.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-7 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-light text-slate-800 mt-0.5">{stat.value}</p>
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
            Unit Status by Project
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Project
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Available
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Reserved
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Sold
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Rented
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Occupancy
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : byProject.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                    No projects found
                  </TableCell>
                </TableRow>
              ) : (
                byProject.map((row: ProjectOccupancy) => (
                  <TableRow key={row.projectId} className="border-slate-100">
                    <TableCell className="py-3">
                      <div>
                        <p className="text-[11px] font-light text-slate-800">{row.projectName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-slate-400">{row.projectCode}</span>
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 font-extralight bg-slate-50 text-slate-500 border-slate-200"
                          >
                            {row.projectStatus}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-teal-700 font-light">
                      {row.available}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-indigo-700 font-light">
                      {row.reserved}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-700 font-light">
                      {row.sold}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-emerald-700 font-light">
                      {row.rented}
                    </TableCell>
                    <TableCell className="min-w-32">
                      <OccupancyBar rate={row.occupancyRate} />
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
