import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Factory } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useFMSAssetStatusReport } from '@/hooks/useFMSReports'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/asset-status'
)({
  component: AssetStatusReportPage,
})

const STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under Maintenance',
  OUT_OF_SERVICE: 'Out of Service',
  DISPOSED: 'Disposed',
  IN_STORAGE: 'In Storage',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  OPERATIONAL: 'bg-teal-400',
  UNDER_MAINTENANCE: 'bg-amber-400',
  OUT_OF_SERVICE: 'bg-rose-400',
  DISPOSED: 'bg-slate-300',
  IN_STORAGE: 'bg-sky-400',
}

function AssetStatusReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState('')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = useFMSAssetStatusReport(activeProjectId)
  const report = data?.report
  const rows = report?.rows ?? []
  const total = report?.total ?? 0

  return (
    <div className="space-y-3">
      <PageHeader title="Asset Status" subtitle="Asset distribution by operational status" />

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-500">Project</span>
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
        </CardContent>
      </Card>

      {isError && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2">
          Failed to load report. Please try again.
        </p>
      )}

      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500">
              <Factory className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest">
                Total Assets
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-light text-slate-800 mt-0.5">{total}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600">
            Status Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))
          ) : rows.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">No assets found</p>
          ) : (
            rows.map((row) => {
              const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
              const barColor = STATUS_BAR_COLORS[row.status] ?? 'bg-slate-400'
              return (
                <div key={row.status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-light text-slate-600">
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {row.count}{' '}
                      <span className="text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600">Detail Table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Count
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Share
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-400">
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
                  return (
                    <TableRow key={row.status} className="border-slate-100">
                      <TableCell className="text-[11px] text-slate-700 font-light">
                        {STATUS_LABELS[row.status] ?? row.status}
                      </TableCell>
                      <TableCell className="text-right text-[11px] text-slate-700 font-light">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right text-[11px] text-slate-500 font-light">
                        {pct}%
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
