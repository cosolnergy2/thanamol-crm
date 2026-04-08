import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ClipboardList, CheckCircle, XCircle, AlertTriangle, HelpCircle, Calendar } from 'lucide-react'
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
import { useProjects } from '@/hooks/useProjects'
import { usePMComplianceReport } from '@/hooks/useFMSReports'
import type { PMCompliancePeriod } from '@thanamol/shared'

export const Route = createFileRoute(
  '/_authenticated/facility-management/reports/pm-compliance'
)({
  component: PMComplianceReportPage,
})

const PERIOD_OPTIONS: Array<{ value: PMCompliancePeriod; label: string }> = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '60d', label: 'Last 60 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
]

function ComplianceGauge({ percentage }: { percentage: number }) {
  const color =
    percentage >= 90 ? 'text-teal-600' : percentage >= 70 ? 'text-amber-600' : 'text-rose-600'
  const bg =
    percentage >= 90 ? 'bg-teal-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={`text-5xl font-light ${color}`}>{percentage}%</span>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`${bg} h-2 rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 font-light">Compliance Rate</span>
    </div>
  )
}

function PMComplianceReportPage() {
  const { data: projectsData } = useProjects({ limit: 50 })
  const projects = projectsData?.data ?? []
  const [projectId, setProjectId] = useState('')
  const [period, setPeriod] = useState<PMCompliancePeriod>('30d')

  const activeProjectId = projectId || projects[0]?.id || ''

  const { data, isLoading, isError } = usePMComplianceReport(activeProjectId, period)
  const report = data?.report

  const summaryCards = [
    {
      icon: ClipboardList,
      label: 'Total Active PMs',
      value: report?.total ?? 0,
      accent: 'bg-indigo-500',
      alert: false,
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: report?.completedCount ?? 0,
      accent: 'bg-teal-500',
      alert: false,
    },
    {
      icon: XCircle,
      label: 'Overdue',
      value: report?.overdueCount ?? 0,
      accent: (report?.overdueCount ?? 0) > 0 ? 'bg-rose-500' : 'bg-teal-500',
      alert: (report?.overdueCount ?? 0) > 0,
    },
    {
      icon: HelpCircle,
      label: 'No Due Date',
      value: report?.missedCount ?? 0,
      accent: (report?.missedCount ?? 0) > 0 ? 'bg-amber-500' : 'bg-teal-500',
      alert: false,
    },
  ]

  return (
    <div className="space-y-3">
      <PageHeader
        title="PM Compliance Report"
        subtitle="Preventive maintenance schedule compliance overview"
      />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
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

            <div className="space-y-1">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Time Period
              </span>
              <Select value={period} onValueChange={(v) => setPeriod(v as PMCompliancePeriod)}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
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
          Failed to load PM compliance report. Please try again.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
        <Card>
          <CardContent className="pt-6 pb-6 flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="h-20 w-36" />
            ) : (
              <ComplianceGauge percentage={report?.compliancePercentage ?? 100} />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className={card.alert ? 'ring-1 ring-rose-200' : ''}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${card.accent}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extralight text-slate-400 uppercase tracking-widest leading-tight">
                        {card.label}
                      </p>
                      {isLoading ? (
                        <Skeleton className="h-7 w-12 mt-1" />
                      ) : (
                        <p className="text-2xl font-light text-slate-800 mt-0.5">{card.value}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-light text-slate-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            PM Schedule Details
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100">
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  PM Schedule
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Site
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase">
                  Frequency
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Total
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Completed
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Overdue
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Scheduled
                </TableHead>
                <TableHead className="text-[10px] font-extralight text-slate-400 tracking-widest uppercase text-right">
                  Compliance
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (report?.scheduleDetails.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                    <CheckCircle className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                    No PM schedules found
                  </TableCell>
                </TableRow>
              ) : (
                report?.scheduleDetails.map((pm) => (
                  <TableRow key={pm.id} className="border-slate-100">
                    <TableCell className="text-[11px] font-light">
                      <span className="text-indigo-600 font-mono">{pm.pm_number}</span>
                      <span className="block text-slate-500 truncate max-w-[180px]">{pm.title}</span>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-600 font-light">{pm.site}</TableCell>
                    <TableCell className="text-[11px] font-light">
                      <Badge variant="outline" className="text-[9px] capitalize">
                        {pm.frequency.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-600 font-light">
                      {pm.total}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-teal-700 font-light">
                      {pm.completed}
                    </TableCell>
                    <TableCell className="text-right text-[11px] font-light">
                      {pm.overdue > 0 ? (
                        <span className="text-rose-600">{pm.overdue}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-[11px] text-slate-600 font-light">
                      {pm.scheduled}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          pm.compliancePct >= 90
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : pm.compliancePct >= 70
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {pm.compliancePct}%
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
